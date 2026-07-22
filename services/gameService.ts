
import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
// Fix: Removed 'Team' from import as it is not an exported member of types.ts and duo matchmaking is deprecated.
import type { Match, Player, Invite, Clan, PowerUpType, Bird, MatchPlayer } from '../types';
import { updateUserMatchStatus } from './friendService';
import { BIRD_DEFINITIONS, RANK_TIERS } from '../constants';
import { getRankInfo } from '../utils/helpers';


const FALLBACK_BOT_NAMES = [
    'Abdullah', 'Abir', 'Adnan', 'Afnan', 'Ahmed', 'Ahnaf', 'Akash', 'Alif', 'Amin', 'Anik', 'Anis', 'Arafat', 'Arham', 'Arif', 'Arifin', 'Arman', 'Asif', 'Atik', 'Ayan', 'Ayon', 'Azmain', 'Bappy', 'Bashar', 'Bilal', 'Dipu', 'Emon', 'Enamul', 'Fahad', 'Fahim', 'Faisal', 'Farhan', 'Faruque', 'Habib', 'Hamid', 'Hasan', 'Hasib', 'Hridoy', 'Ibrahim', 'Imran', 'Iqbal', 'Irfan', 'Ishraq', 'Jahid', 'Jamal', 'Jamil', 'Jisan', 'Joy', 'Kabir', 'Kamal', 'Karim', 'Khalid', 'Mahbub', 'Mahfuz', 'Mahmud', 'Masud', 'Mehedi', 'Minhaj', 'Mizan', 'Mohammad', 'Mohsin', 'Monir', 'Morshed', 'Mushfiqur', 'Nabil', 'Nadim', 'Nafis', 'Nahid', 'Nayeem', 'Nazmul', 'Nibir', 'Parvez', 'Rafan', 'Rafiq', 'Rafsan', 'Rahim', 'Rahman', 'Rahat', 'Rajib', 'Raju', 'Rakib', 'Rashed', 'Riad', 'Rifat', 'Rohan', 'Rubel', 'Sabbir', 'Sadman', 'Saiful', 'Sakib', 'Shakib', 'Salman', 'Sameer', 'Shanto', 'Shihab', 'Shuvo', 'Siam', 'Sumon', 'Tahsin', 'Tamim', 'Tanvir', 'Tariq'
];


const getClanTag = async (clanId: string | null): Promise<string | null> => {
    if (!clanId) return null;
    try {
        const clanSnapshot = await rtdb.ref(`clans/${clanId}`).once('value');
        return clanSnapshot.exists() ? (clanSnapshot.val() as Clan).tag : null;
    } catch {
        return null;
    }
}

// Helper to normalize bird stats to Level 10 for fair play
const getNormalizedBird = (originalBird: Bird): Bird => {
    const def = BIRD_DEFINITIONS[originalBird.id];
    if (!def) return originalBird;

    const normalizedLevel = 10;
    return {
        ...originalBird,
        level: normalizedLevel,
        skillPower: def.baseAttackPower + (def.attackPowerPerLevel * (normalizedLevel - 1)),
        maxHealth: def.baseHealth + (def.healthPerLevel * (normalizedLevel - 1)),
        // Ignore training upgrades (powerLevel/healthLevel) for fair play
    };
};

export const findMatch = async (
  player: Player,
  onMatchFound: (match: Match) => void,
  onError: (error: Error) => void,
  matchType: 'rank' | 'classic',
  entryFee: number,
  selectedBird: Bird,
  matchMode: '1v1' | '2v2' = '1v1'
) => {
  const playerDocRef = rtdb.ref(`users/${player.uid}`);
  const queueRef = rtdb.ref(`queue/${matchType}_${matchMode}`);
  const userQueueRef = rtdb.ref(`queue/${matchType}_${matchMode}/${player.uid}`);

  try {
    const playerData = player;

    if ((playerData.coins ?? 0) < entryFee) {
      throw new Error(`Not enough coins to join. You need ${entryFee}.`);
    }

    // Deduct entry fee before starting matchmaking
    if (entryFee > 0) {
      await playerDocRef.child('coins').set(firebase.database.ServerValue.increment(-entryFee));
    }
    
    // Set onDisconnect here. If we find a match or cancel, we'll remove it.
    userQueueRef.onDisconnect().remove();

    let foundOpponents: any[] = [];

    const transaction = await queueRef.transaction((queue) => {
      foundOpponents = [];
      
      if (queue === null) {
        queue = {};
      }

      const requiredPlayers = matchMode === '2v2' ? 3 : 1;
      let opponentIds: string[] = [];
      
      // Simplified matchmaking for now
      for (const uid in queue) {
          if (Object.prototype.hasOwnProperty.call(queue, uid) && uid !== player.uid) {
              opponentIds.push(uid);
              if (opponentIds.length === requiredPlayers) break;
          }
      }

      if (opponentIds.length === requiredPlayers) {
        // Found opponents, capture their data and remove them from the queue
        opponentIds.forEach(id => {
            foundOpponents.push(queue[id]);
            delete queue[id];
        });
      } else {
        // No opponent, add myself to the queue
        queue[player.uid] = { 
          uid: player.uid,
          playerData,
          selectedBird,
          timestamp: firebase.database.ServerValue.TIMESTAMP 
        };
      }
      return queue;
    });

    if (!transaction.committed) {
      throw new Error("Matchmaking failed due to high server load. Please try again.");
    }

    if (foundOpponents.length > 0) {
      // We found a match, now create it.
      const isNormalized = matchType === 'rank';
      let myBird = selectedBird;
      if (isNormalized) {
          myBird = getNormalizedBird(myBird);
      }
      const myClanTag = await getClanTag(playerData.clanId);

      const matchId = `match_${Date.now()}`;
      
      let newMatch: Match;

      if (matchMode === '1v1') {
          const opponentData = foundOpponents[0].playerData as Player;
          let opponentBird = foundOpponents[0].selectedBird as Bird;
          if (isNormalized) opponentBird = getNormalizedBird(opponentBird);
          const opponentClanTag = await getClanTag(opponentData.clanId);

          newMatch = {
            id: matchId,
            player1: { uid: player.uid, displayName: player.displayName, photoURL: player.photoURL, damageDealt: 0, rankPoints: playerData.rankPoints, clanId: playerData.clanId || null, clanTag: myClanTag, selectedBird: myBird, currentHealth: myBird.maxHealth, activeBadge: playerData.activeBadge || null, equippedEmotes: player.equippedEmotes || [], ultimateCooldownLeft: myBird.ultimateCooldown || 0, potions: playerData.inventory?.potions || {} },
            player2: { uid: opponentData.uid, displayName: opponentData.displayName, photoURL: opponentData.photoURL, damageDealt: 0, rankPoints: opponentData.rankPoints, clanId: opponentData.clanId || null, clanTag: opponentClanTag, selectedBird: opponentBird, currentHealth: opponentBird.maxHealth, activeBadge: opponentData.activeBadge || null, equippedEmotes: opponentData.equippedEmotes || [], ultimateCooldownLeft: opponentBird.ultimateCooldown || 0, potions: opponentData.inventory?.potions || {} },
            status: 'active',
            winner: null,
            createdAt: Date.now(),
            startTime: Date.now(),
            matchType: matchType,
            matchMode: '1v1',
            turn: 1,
            currentTurnPlayerUid: player.uid,
            log: [`Match between ${player.displayName || 'P1'} and ${opponentData.displayName || 'P2'} begins!`],
            isNormalized,
            turnTimer: {
                currentTurnStartTime: Date.now(),
                turnDuration: 30,
            },
          };
          await rtdb.ref(`player_matches/${opponentData.uid}`).set(matchId);
      } else {
          // 2v2
          const p2Data = foundOpponents[0].playerData as Player;
          let p2Bird = foundOpponents[0].selectedBird as Bird;
          if (isNormalized) p2Bird = getNormalizedBird(p2Bird);
          const p2ClanTag = await getClanTag(p2Data.clanId);

          const p3Data = foundOpponents[1].playerData as Player;
          let p3Bird = foundOpponents[1].selectedBird as Bird;
          if (isNormalized) p3Bird = getNormalizedBird(p3Bird);
          const p3ClanTag = await getClanTag(p3Data.clanId);

          const p4Data = foundOpponents[2].playerData as Player;
          let p4Bird = foundOpponents[2].selectedBird as Bird;
          if (isNormalized) p4Bird = getNormalizedBird(p4Bird);
          const p4ClanTag = await getClanTag(p4Data.clanId);

          newMatch = {
            id: matchId,
            player1: { uid: player.uid, displayName: player.displayName, photoURL: player.photoURL, damageDealt: 0, rankPoints: playerData.rankPoints, clanId: playerData.clanId || null, clanTag: myClanTag, selectedBird: myBird, currentHealth: myBird.maxHealth, activeBadge: playerData.activeBadge || null, equippedEmotes: player.equippedEmotes || [], ultimateCooldownLeft: myBird.ultimateCooldown || 0, potions: playerData.inventory?.potions || {} },
            player2: { uid: p2Data.uid, displayName: p2Data.displayName, photoURL: p2Data.photoURL, damageDealt: 0, rankPoints: p2Data.rankPoints, clanId: p2Data.clanId || null, clanTag: p2ClanTag, selectedBird: p2Bird, currentHealth: p2Bird.maxHealth, activeBadge: p2Data.activeBadge || null, equippedEmotes: p2Data.equippedEmotes || [], ultimateCooldownLeft: p2Bird.ultimateCooldown || 0, potions: p2Data.inventory?.potions || {} },
            player3: { uid: p3Data.uid, displayName: p3Data.displayName, photoURL: p3Data.photoURL, damageDealt: 0, rankPoints: p3Data.rankPoints, clanId: p3Data.clanId || null, clanTag: p3ClanTag, selectedBird: p3Bird, currentHealth: p3Bird.maxHealth, activeBadge: p3Data.activeBadge || null, equippedEmotes: p3Data.equippedEmotes || [], ultimateCooldownLeft: p3Bird.ultimateCooldown || 0, potions: p3Data.inventory?.potions || {} },
            player4: { uid: p4Data.uid, displayName: p4Data.displayName, photoURL: p4Data.photoURL, damageDealt: 0, rankPoints: p4Data.rankPoints, clanId: p4Data.clanId || null, clanTag: p4ClanTag, selectedBird: p4Bird, currentHealth: p4Bird.maxHealth, activeBadge: p4Data.activeBadge || null, equippedEmotes: p4Data.equippedEmotes || [], ultimateCooldownLeft: p4Bird.ultimateCooldown || 0, potions: p4Data.inventory?.potions || {} },
            team1_uids: [player.uid, p2Data.uid],
            team2_uids: [p3Data.uid, p4Data.uid],
            status: 'active',
            winner: null,
            createdAt: Date.now(),
            startTime: Date.now(),
            matchType: matchType,
            matchMode: '2v2',
            turn: 1,
            currentTurnPlayerUid: player.uid, // Player 1 starts
            turnOrder: [player.uid, p3Data.uid, p2Data.uid, p4Data.uid], // Alternating teams
            log: [`2v2 Match begins! Team 1: ${player.displayName}, ${p2Data.displayName} vs Team 2: ${p3Data.displayName}, ${p4Data.displayName}`],
            isNormalized // Flag to show in UI
          };
          await rtdb.ref(`player_matches/${p2Data.uid}`).set(matchId);
          await rtdb.ref(`player_matches/${p3Data.uid}`).set(matchId);
          await rtdb.ref(`player_matches/${p4Data.uid}`).set(matchId);
      }

      await rtdb.ref(`matches/${matchId}`).set(newMatch);
      await rtdb.ref(`player_matches/${player.uid}`).set(matchId);
      
      userQueueRef.onDisconnect().cancel();
    }

  } catch (error: any) {
    console.error("Error during matchmaking process:", error);
    if(entryFee > 0) {
      await playerDocRef.child('coins').set(firebase.database.ServerValue.increment(entryFee));
    }
    userQueueRef.onDisconnect().cancel();
    await userQueueRef.remove();
    throw error;
  }

  const playerMatchRef = rtdb.ref(`player_matches/${player.uid}`);
  playerMatchRef.on('value', async (snapshot) => {
    if (snapshot.exists()) {
      const matchId = snapshot.val();
      const matchDataRef = rtdb.ref(`matches/${matchId}`);
      const matchSnapshot = await matchDataRef.get();
      if (matchSnapshot.exists()){
         onMatchFound(matchSnapshot.val());
         playerMatchRef.off();
         userQueueRef.remove();
         userQueueRef.onDisconnect().cancel();
         playerMatchRef.remove();
      }
    }
  }, (error: Error) => {
    console.error("Match listener failed:", error);
    onError(error);
  });
};

// Beginner Bot Protection: first 10 matches = bot match
export const shouldUseBotProtection = (player: Player): boolean => {
  const totalMatches = player.totalMatches || 0;
  return totalMatches < 10;
};

export const createBotMatch = async (player: Player, selectedBird: Bird): Promise<Match> => {
    // 1. Determine Bot Difficulty
    const { tier } = getRankInfo(player.rankPoints);
    let botLevel: number;
    let availableRarities: ('Common' | 'Rare' | 'Epic' | 'Legendary')[];

    if (player.rankPoints < 1200) { // Bronze
        botLevel = Math.floor(Math.random() * 10) + 1;
        availableRarities = ['Common', 'Rare'];
    } else if (player.rankPoints < 1900) { // Silver
        botLevel = Math.floor(Math.random() * 10) + 10;
        availableRarities = ['Common', 'Rare', 'Epic'];
    } else if (player.rankPoints < 2500) { // Gold
        botLevel = Math.floor(Math.random() * 10) + 20;
        availableRarities = ['Rare', 'Epic'];
    } else { // Platinum+
        botLevel = Math.floor(Math.random() * 10) + 30;
        availableRarities = ['Epic', 'Legendary'];
    }

    // 2. Select Bot's Bird
    const availableBirds = Object.values(BIRD_DEFINITIONS).filter(b => availableRarities.includes(b.rarity));
    const botBirdDef = availableBirds[Math.floor(Math.random() * availableBirds.length)];
    
    // 3. Calculate Bot Bird's Stats — spread BIRD_DEFINITIONS to copy ability/ultimate fields
    let botBird: Bird = {
        ...botBirdDef,
        level: botLevel,
        xp: 0,
        xpToNextLevel: 0, // Not needed for bot
        skillPower: botBirdDef.baseAttackPower + (botBirdDef.attackPowerPerLevel * (botLevel - 1)),
        maxHealth: botBirdDef.baseHealth + (botBirdDef.healthPerLevel * (botLevel - 1)),
    };
    
    // 4. Generate Bot Name from the provided list
    const botName = FALLBACK_BOT_NAMES[Math.floor(Math.random() * FALLBACK_BOT_NAMES.length)];
    
    // 5. Create Bot Player Object
    const botUid = `bot_${player.rankPoints}_${Date.now()}`;
    const botPlayer: MatchPlayer = {
        uid: botUid,
        displayName: botName,
        photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${botUid}`,
        damageDealt: 0,
        rankPoints: player.rankPoints,
        selectedBird: botBird,
        currentHealth: botBird.maxHealth,
        isBot: true,
        equippedEmotes: ['🤖', '🔥', '💀', '👎'],
    };

    const myClanTag = await getClanTag(player.clanId);
    
    // --- FAIR PLAY NORMALIZATION FOR RANKED ---
    // Bot matches generated this way are usually for Ranked fallback
    let myBird = selectedBird;
    
    // Normalize both for consistency in Ranked mode
    const isNormalized = true;
    botBird = getNormalizedBird(botBird);
    botPlayer.selectedBird = botBird;
    botPlayer.currentHealth = botBird.maxHealth;
    myBird = getNormalizedBird(myBird);

    // 6. Create Match Object
    const matchId = `match_bot_${Date.now()}`;
    const newMatch: Match = {
        id: matchId,
        player1: { uid: player.uid, displayName: player.displayName, photoURL: player.photoURL, damageDealt: 0, rankPoints: player.rankPoints, clanId: player.clanId || null, clanTag: myClanTag, selectedBird: myBird, currentHealth: myBird.maxHealth, activeBadge: player.activeBadge || null, equippedEmotes: player.equippedEmotes || [], ultimateCooldownLeft: myBird.ultimateCooldown || 0, potions: player.inventory?.potions || {} },
        player2: { ...botPlayer, ultimateCooldownLeft: botBird.ultimateCooldown || 0, potions: {} },
        status: 'active',
        winner: null,
        createdAt: Date.now(),
        startTime: Date.now(),
        matchType: 'rank',
        turn: 1,
        currentTurnPlayerUid: player.uid,
        log: [`Match against bot ${botName} begins!`],
        isNormalized,
        turnTimer: {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        },
    };

    // 7. Save to Firebase and Return
    await rtdb.ref(`matches/${matchId}`).set(newMatch);
    
    return newMatch;
};


export const cancelMatchmaking = (userId: string, matchType: 'rank' | 'classic', entryFee: number) => {
  const userQueueRef = rtdb.ref(`queue/${matchType}/${userId}`);
  userQueueRef.remove();
  
  if (entryFee > 0) {
    const playerDocRef = rtdb.ref(`users/${userId}`);
    playerDocRef.child('coins').set(firebase.database.ServerValue.increment(entryFee))
        .catch(error => {
            console.error(`Failed to refund ${entryFee} coins to user ${userId} after cancelling matchmaking.`, error);
        });
  }

  const playerMatchRef = rtdb.ref(`player_matches/${userId}`);
  playerMatchRef.off();
};

export const createWarMatch = async (warId: string, battleIndex: number, p1: MatchPlayer, p2: MatchPlayer): Promise<Match> => {
    const matchId = `match_war_${warId}_${battleIndex}`;
    const newMatch: Match = {
        id: matchId,
        player1: p1,
        player2: p2,
        status: 'active',
        winner: null,
        createdAt: Date.now(),
        startTime: Date.now(),
        matchType: 'war',
        warContext: { warId, battleIndex },
        turn: 1,
        currentTurnPlayerUid: p1.uid,
        log: [`War match between ${p1.displayName} and ${p2.displayName} begins!`],
        turnTimer: {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        },
    };
    await rtdb.ref(`matches/${matchId}`).set(newMatch);
    return newMatch;
}

// --- Private Matches ---

// Helper to get equipped bird or fallback
// Fix: Export the helper function
export const getPlayerEquippedBird = (player: Player): Bird => {
    if (player.ownedBirds && player.equippedBirdId && player.ownedBirds[player.equippedBirdId]) {
        return player.ownedBirds[player.equippedBirdId];
    }
    // Fallback to first owned bird if equipped one isn't found
    if (player.ownedBirds && Object.values(player.ownedBirds).length > 0) {
        return Object.values(player.ownedBirds)[0];
    }
    // Final fallback to Tappy if no birds are owned (shouldn't happen for existing players)
    const tappyDef = BIRD_DEFINITIONS['B001'];
    return {
        ...tappyDef,
        skillPower: tappyDef.baseAttackPower,
        level: 1,
        xp: 0,
        xpToNextLevel: tappyDef.baseXpToNextLevel,
        maxHealth: tappyDef.baseHealth,
        powerLevel: 1,
        healthLevel: 1,
    };
};

export const handleBlockAction = async (matchId: string, userId: string) => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    await matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active' || currentData.currentTurnPlayerUid !== userId) return;
        const meKey = currentData.player1.uid === userId ? 'player1' : 'player2';
        if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
        currentData[meKey].activeEffects.blocking = true;
        if (!currentData.log) currentData.log = [];
        currentData.log.push(`${currentData[meKey].displayName} takes a defensive stance!`);
        const opponentKey = meKey === 'player1' ? 'player2' : 'player1';
        currentData.turn += 1;
        currentData.currentTurnPlayerUid = currentData[opponentKey].uid;
        currentData.turnTimer = {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        };
        return currentData;
    });
};

export const forfeitMatch = async (matchId: string, userId: string) => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    await matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active') return;
        const forfeiterKey = currentData.player1.uid === userId ? 'player1' : 'player2';
        currentData.winner = forfeiterKey === 'player1' ? currentData.player2.uid : currentData.player1.uid;
        currentData.status = 'finished';
        if (!currentData.log) currentData.log = [];
        currentData.log.push(`${currentData[forfeiterKey].displayName} forfeited the match.`);
        return currentData;
    });
};

export const listenForReconnect = (matchId: string, callback: (match: Match | null) => void): (() => void) => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        callback(snapshot.val());
    };
    matchRef.on('value', listener);
    return () => matchRef.off('value', listener);
};

export const autoPassTurn = async (matchId: string) => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    await matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active') return;
        const currentUid = currentData.currentTurnPlayerUid;
        const meKey = currentData.player1.uid === currentUid ? 'player1' : 'player2';
        const opponentKey = meKey === 'player1' ? 'player2' : 'player1';
        if (!currentData.log) currentData.log = [];
        currentData.log.push(`${currentData[meKey].displayName}'s turn timed out!`);
        if (currentData.turn >= 10) {
            currentData.status = 'finished';
            const p1Health = currentData.player1.currentHealth;
            const p2Health = currentData.player2.currentHealth;
            if (p1Health > p2Health) currentData.winner = currentData.player1.uid;
            else if (p2Health > p1Health) currentData.winner = currentData.player2.uid;
            else currentData.winner = 'draw';
            currentData.log.push("Time's up! Winner by health.");
            return currentData;
        }
        currentData.turn += 1;
        currentData.currentTurnPlayerUid = currentData[opponentKey].uid;
        currentData.turnTimer = {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        };
        return currentData;
    });
};

export const createPrivateMatch = async (inviter: Player, inviteeUid: string): Promise<Match> => {
    const inviteeSnapshot = await rtdb.ref(`users/${inviteeUid}`).once('value');
    if (!inviteeSnapshot.exists()) {
        throw new Error("Invited player not found.");
    }
    const invitee = inviteeSnapshot.val() as Player;

    const matchId = `match_${Date.now()}`;
    const matchRef = rtdb.ref(`matches/${matchId}`);
    
    const inviterBird = getPlayerEquippedBird(inviter);
    const inviteeBird = getPlayerEquippedBird(invitee);

    const newMatch: Match = {
        id: matchId,
        player1: { uid: inviter.uid, displayName: inviter.displayName, photoURL: inviter.photoURL, damageDealt: 0, rankPoints: inviter.rankPoints, clanId: inviter.clanId || null, clanTag: null, selectedBird: inviterBird, currentHealth: inviterBird.maxHealth, activeBadge: inviter.activeBadge || null, equippedEmotes: inviter.equippedEmotes || [], ultimateCooldownLeft: inviterBird.ultimateCooldown || 0, potions: inviter.inventory?.potions || {} },
        player2: { uid: invitee.uid, displayName: invitee.displayName, photoURL: invitee.photoURL, damageDealt: 0, rankPoints: invitee.rankPoints, clanId: invitee.clanId || null, clanTag: null, selectedBird: inviteeBird, currentHealth: inviteeBird.maxHealth, activeBadge: invitee.activeBadge || null, equippedEmotes: invitee.equippedEmotes || [], ultimateCooldownLeft: inviteeBird.ultimateCooldown || 0, potions: invitee.inventory?.potions || {} },
        status: 'invited',
        winner: null,
        createdAt: Date.now(),
        startTime: 0,
        matchType: 'classic',
        turn: 1,
        currentTurnPlayerUid: inviter.uid,
        log: [],
        turnTimer: {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        },
    };

    await matchRef.set(newMatch);
    await rtdb.ref(`player_invites/${inviteeUid}`).set({ 
        matchId,
        from: inviter.displayName,
        photoURL: inviter.photoURL,
        activeBadge: inviter.activeBadge || null,
    });
    
    return newMatch;
};

export const acceptPrivateMatch = async (matchId: string, accepterUid: string): Promise<Match> => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    const matchSnapshot = await matchRef.get();
    if (!matchSnapshot.exists()) {
        throw new Error("Match not found.");
    }
    const match = matchSnapshot.val() as Match;
    
    await matchRef.update({ status: 'active', startTime: Date.now() });
    
    await rtdb.ref(`player_invites/${accepterUid}`).remove();
    
    updateUserMatchStatus(accepterUid, matchId);

    return { ...match, status: 'active', startTime: Date.now() };
};

export const declinePrivateMatch = async (matchId: string, inviteeUid: string) => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    await matchRef.update({ status: 'declined' });
    await rtdb.ref(`player_invites/${inviteeUid}`).remove();
};

export const listenForInvites = (uid: string, callback: (invite: Invite | null) => void): (() => void) => {
    const inviteRef = rtdb.ref(`player_invites/${uid}`);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        callback(snapshot.val());
    };
    inviteRef.on('value', listener);
    return () => inviteRef.off('value', listener);
};
