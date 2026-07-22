import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
// Fix: Import 'Match' type to resolve the 'Cannot find name' error.
import type { Player, Clan, ClanWar, Bird, ClanMember, Battle, MatchPlayer, ClanWarParticipant, Match } from '../types';
import * as gameService from './gameService';

const PREPARATION_DURATION = 2 * 24 * 60 * 60 * 1000; // 2 days
const BATTLE_DAY_DURATION = 1 * 24 * 60 * 60 * 1000; // 1 day

export const setWarRoster = async (clan: Clan, leaderUid: string, selectedMemberUids: string[]) => {
    if (clan.leaderId !== leaderUid) throw new Error("Only the clan leader can set the war roster.");

    const newRoster: { [uid: string]: { status: 'selected'; displayName: string | null; photoURL: string | null; rankPoints: number; } } = {};
    
    selectedMemberUids.forEach(uid => {
        const member = clan.members[uid];
        if (member) {
            newRoster[uid] = {
                status: 'selected',
                displayName: member.displayName,
                photoURL: member.photoURL,
                rankPoints: member.rankPoints
            };
        }
    });

    await rtdb.ref(`clans/${clan.id}/warRoster`).set(newRoster);
};

export const confirmWarParticipation = async (clanId: string, playerUid: string, bird: Bird) => {
    if (!clanId) throw new Error("Not in a clan.");
    const rosterRef = rtdb.ref(`clans/${clanId}/warRoster/${playerUid}`);
    const snapshot = await rosterRef.once('value');
    if (!snapshot.exists() || snapshot.val().status !== 'selected') {
        throw new Error("You have not been selected for this war or have already confirmed.");
    }
    const currentEntry = snapshot.val();
    await rosterRef.update({
        status: 'confirmed',
        bird: bird,
    });
};


export const findWar = async (clan: Clan) => {
    if (!clan.warRoster) throw new Error("No war roster found.");
    
    const confirmedParticipants = Object.entries(clan.warRoster)
        .filter(([, data]) => data.status === 'confirmed')
        .map(([uid, data]) => ({ uid, ...data }));
        
    if (confirmedParticipants.length < 3) {
        throw new Error("At least 3 members must confirm their participation to start a war.");
    }
        
    const warQueueRef = rtdb.ref('clan_war_queue');
    const clanInQueueRef = warQueueRef.child(clan.id);
    
    const snapshot = await warQueueRef.orderByChild('participantCount').equalTo(confirmedParticipants.length).limitToFirst(1).once('value');
    
    let opponentClanData: { id: string, data: any } | null = null;
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            if (child.key !== clan.id) {
                opponentClanData = { id: child.key!, data: child.val() };
            }
        });
    }

    if (opponentClanData) {
        await rtdb.ref(`clan_wars/${clan.id}/status`).set('searching');
        // Found opponent, create war
        const clan1Participants = confirmedParticipants.reduce((acc, p) => {
            if (p.bird) {
                acc[p.uid] = { uid: p.uid, displayName: p.displayName, photoURL: p.photoURL, rankPoints: p.rankPoints, selectedBird: p.bird, hasAttacked: false, starsEarned: 0 };
            }
            return acc;
        }, {} as {[uid: string]: ClanWarParticipant});

        const clan2Participants = Object.values(opponentClanData.data.participants).reduce((acc, p: any) => {
             if (p.bird) {
                 acc[p.uid] = { uid: p.uid, displayName: p.displayName, photoURL: p.photoURL, rankPoints: p.rankPoints, selectedBird: p.bird, hasAttacked: false, starsEarned: 0 };
             }
            return acc;
        }, {} as {[uid: string]: ClanWarParticipant});

        await startWar(
            { id: clan.id, name: clan.name, tag: clan.tag, participants: clan1Participants },
            { id: opponentClanData.id, name: opponentClanData.data.name, tag: opponentClanData.data.tag, participants: clan2Participants }
        );
        // Clean up queue
        await warQueueRef.child(clan.id).remove();
        await warQueueRef.child(opponentClanData.id).remove();

    } else {
        // No opponent, add to queue
        const participantPayload = confirmedParticipants.reduce((acc, p) => {
            acc[p.uid] = { uid: p.uid, bird: p.bird, displayName: p.displayName, photoURL: p.photoURL, rankPoints: p.rankPoints };
            return acc;
        }, {} as any);

        await clanInQueueRef.set({
            name: clan.name,
            tag: clan.tag,
            participantCount: confirmedParticipants.length,
            participants: participantPayload,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        await rtdb.ref(`clans/${clan.id}/currentWarId`).set('searching');
    }
}

export const startWar = async (clan1: any, clan2: any) => {
    const warRef = rtdb.ref('clan_wars').push();
    const warId = warRef.key;
    if (!warId) throw new Error("Could not create war ID.");

    // Create battle pairings
    const p1 = Object.values(clan1.participants) as ClanWarParticipant[];
    const p2 = Object.values(clan2.participants) as ClanWarParticipant[];
    const battles: Battle[] = [];
    for(let i=0; i < p1.length; i++) {
        battles.push({
            clan1ParticipantUid: p1[i].uid,
            clan2ParticipantUid: p2[i].uid,
            matchId: null,
            winnerUid: null,
            stars: 0,
            status: 'pending',
        });
    }

    const now = Date.now();
    const newWar: ClanWar = {
        id: warId,
        status: 'preparation',
        clan1: { clanId: clan1.id, clanName: clan1.name, clanTag: clan1.tag, participants: clan1.participants, score: 0 },
        clan2: { clanId: clan2.id, clanName: clan2.name, clanTag: clan2.tag, participants: clan2.participants, score: 0 },
        preparationEndTime: now + PREPARATION_DURATION,
        battleDayEndTime: now + PREPARATION_DURATION + BATTLE_DAY_DURATION,
        battles: battles,
        winnerClanId: null,
        createdAt: now
    };

    const updates: {[key: string]: any} = {};
    updates[`clan_wars/${warId}`] = newWar;
    updates[`clans/${clan1.id}/currentWarId`] = warId;
    updates[`clans/${clan2.id}/currentWarId`] = warId;
    updates[`clans/${clan1.id}/warRoster`] = null; // Clear roster
    updates[`clans/${clan2.id}/warRoster`] = null;

    Object.keys(clan1.participants).forEach(uid => {
        updates[`users/${uid}/currentWarId`] = warId;
    });
    Object.keys(clan2.participants).forEach(uid => {
        updates[`users/${uid}/currentWarId`] = warId;
    });

    await rtdb.ref().update(updates);
}

export const listenToClanWar = (warId: string, callback: (war: ClanWar | null) => void): (() => void) => {
    const warRef = rtdb.ref(`clan_wars/${warId}`);
    const listener = warRef.on('value', snapshot => {
        callback(snapshot.val());
    });
    return () => warRef.off('value', listener);
};

export const updateWarState = async (warId: string, status: 'battle_day' | 'finished') => {
    await rtdb.ref(`clan_wars/${warId}/status`).set(status);
}

export const initiateWarAttack = async (warId: string, battleIndex: number, clan: Clan, player: Player): Promise<Match> => {
    const warRef = rtdb.ref(`clan_wars/${warId}`);
    const warSnapshot = await warRef.once('value');
    if (!warSnapshot.exists()) throw new Error("War not found.");

    const war = warSnapshot.val() as ClanWar;
    const battle = war.battles?.[battleIndex];
    if (!battle) throw new Error("Battle not found.");

    const myClanKey = war.clan1.clanId === clan.id ? 'clan1' : 'clan2';
    const opponentClanKey = myClanKey === 'clan1' ? 'clan2' : 'clan1';

    if (!war[myClanKey] || !war[opponentClanKey]) throw new Error("War data is incomplete.");

    const me = war[myClanKey].participants[player.uid];
    // Fix: Correctly assign opponent UID based on which clan the attacker is in.
    const opponentUid = myClanKey === 'clan1' ? battle.clan2ParticipantUid : battle.clan1ParticipantUid;
    const opponent = war[opponentClanKey].participants[opponentUid];
    
    if (!me || !opponent) throw new Error("Could not find participants for this battle.");
    if (me.hasAttacked) throw new Error("You have already used your attack.");

    const p1: MatchPlayer = {
        uid: me.uid,
        displayName: me.displayName,
        photoURL: me.photoURL,
        damageDealt: 0,
        rankPoints: me.rankPoints,
        selectedBird: me.selectedBird,
        currentHealth: me.selectedBird.maxHealth,
        clanId: war[myClanKey].clanId,
        clanTag: war[myClanKey].clanTag,
    };
     const p2: MatchPlayer = {
        uid: opponent.uid,
        displayName: opponent.displayName,
        photoURL: opponent.photoURL,
        damageDealt: 0,
        rankPoints: opponent.rankPoints,
        selectedBird: opponent.selectedBird,
        currentHealth: opponent.selectedBird.maxHealth,
        clanId: war[opponentClanKey].clanId,
        clanTag: war[opponentClanKey].clanTag,
    };

    const match = await gameService.createWarMatch(warId, battleIndex, p1, p2);

    const updates: {[key: string]: any} = {};
    updates[`clan_wars/${warId}/battles/${battleIndex}/status`] = 'active';
    updates[`clan_wars/${warId}/battles/${battleIndex}/matchId`] = match.id;
    await rtdb.ref().update(updates);

    return match;
};

export const recordWarAttackResult = async (warId: string, battleIndex: number, winnerUid: string, outcome: 'win' | 'loss' | 'draw') => {
    const warRef = rtdb.ref(`clan_wars/${warId}`);

    // Fix: Add explicit type for the 'war' object in the transaction for better type safety.
    const { committed } = await warRef.transaction((war: ClanWar | null) => {
        if (!war || !war.clan1 || !war.clan2) return;

        const battle = war.battles?.[battleIndex];
        if (!battle || battle.status === 'finished') return;

        battle.status = 'finished';
        battle.winnerUid = winnerUid;
        
        const isClan1Winner = Object.prototype.hasOwnProperty.call(war.clan1.participants, winnerUid);
        
        if (outcome === 'win') {
            battle.stars = 3;
            const winnerClanKey = isClan1Winner ? 'clan1' : 'clan2';
            const loserClanKey = isClan1Winner ? 'clan2' : 'clan1';
            const loserUid = battle.clan1ParticipantUid === winnerUid ? battle.clan2ParticipantUid : battle.clan1ParticipantUid;
            
            war[winnerClanKey].score += 3;
            war[winnerClanKey].participants[winnerUid].starsEarned = 3;
            war[winnerClanKey].participants[winnerUid].hasAttacked = true;
            // Also mark loser as attacked since their battle is over
            if (war[loserClanKey].participants[loserUid]) {
                 war[loserClanKey].participants[loserUid].hasAttacked = true;
            }

        } else if (outcome === 'loss') {
             // This logic is tricky. The winner is the *opponent*.
             // The 'winnerUid' passed in is the actual winner from the match.
             battle.stars = 3;
             const winnerClanKey = isClan1Winner ? 'clan1' : 'clan2';
             const loserClanKey = isClan1Winner ? 'clan2' : 'clan1';
             const loserUid = battle.clan1ParticipantUid === winnerUid ? battle.clan2ParticipantUid : battle.clan1ParticipantUid;

             war[winnerClanKey].score += 3;
             war[winnerClanKey].participants[winnerUid].starsEarned = 3;
             war[winnerClanKey].participants[winnerUid].hasAttacked = true;

             if (war[loserClanKey].participants[loserUid]) {
                 war[loserClanKey].participants[loserUid].hasAttacked = true;
             }
        } else { // Draw
            battle.stars = 1;
            // Mark both as attacked
            if (war.clan1.participants[battle.clan1ParticipantUid]) war.clan1.participants[battle.clan1ParticipantUid].hasAttacked = true;
            if (war.clan2.participants[battle.clan2ParticipantUid]) war.clan2.participants[battle.clan2ParticipantUid].hasAttacked = true;
            war.clan1.score += 1;
            war.clan2.score += 1;
        }
        
        return war;
    });

    if (!committed) {
        console.error("Failed to commit war result transaction.");
    }
};
