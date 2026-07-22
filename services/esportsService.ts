import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, Tournament, TournamentPlayer } from '../types';
import { toast } from 'react-toastify';

// Admin function
export const createTournament = async (tournamentData: Omit<Tournament, 'id' | 'players' | 'playerCount' | 'createdAt'>) => {
    const ref = rtdb.ref('tournaments').push();
    const newTournament: Omit<Tournament, 'id'> = {
        ...tournamentData,
        players: {},
        playerCount: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP as any,
    };
    await ref.set(newTournament);
};

// Admin function
export const deleteTournament = async (tournamentId: string) => {
    await rtdb.ref(`tournaments/${tournamentId}`).remove();
};

// Client function
export const listenToTournaments = (callback: (tournaments: Tournament[]) => void): (() => void) => {
    const tournamentsRef = rtdb.ref('tournaments').orderByChild('createdAt');
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const tournaments: Tournament[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                tournaments.push({ id: child.key!, ...child.val() });
            });
        }
        callback(tournaments.reverse()); // Show newest first
    };
    tournamentsRef.on('value', listener);
    return () => tournamentsRef.off('value', listener);
};

// Client function
export const registerForTournament = async (player: Player, tournament: Tournament) => {
    const tournamentRef = rtdb.ref(`tournaments/${tournament.id}`);

    // Pre-transaction checks
    if (tournament.status !== 'upcoming') {
        throw new Error("Registration for this tournament is closed.");
    }
    if ((tournament.playerCount || 0) >= tournament.maxPlayers) {
        throw new Error("This tournament is already full.");
    }
    if (tournament.players && tournament.players[player.uid]) {
        throw new Error("You are already registered for this tournament.");
    }
    if (tournament.entryFee.coins && player.coins < tournament.entryFee.coins) {
        throw new Error(`Not enough coins. You need ${tournament.entryFee.coins}.`);
    }
    if (tournament.entryFee.gems && player.gems < tournament.entryFee.gems) {
        throw new Error(`Not enough gems. You need ${tournament.entryFee.gems}.`);
    }

    // Step 1: Deduct fee first. Not atomic with registration, but necessary without a backend function.
    const userRef = rtdb.ref(`users/${player.uid}`);
    try {
        const feeUpdates: {[key: string]: any} = {};
        if (tournament.entryFee.coins) {
            feeUpdates['coins'] = firebase.database.ServerValue.increment(-tournament.entryFee.coins);
        }
        if (tournament.entryFee.gems) {
            feeUpdates['gems'] = firebase.database.ServerValue.increment(-tournament.entryFee.gems);
        }
        if(Object.keys(feeUpdates).length > 0) {
            await userRef.update(feeUpdates);
        }
    } catch (error) {
        throw new Error("Failed to process entry fee. Please check your balance and connection.");
    }

    // Step 2: Add player to tournament. Use a transaction to handle concurrency on playerCount.
    try {
        const { committed } = await tournamentRef.transaction(currentTournament => {
            if (!currentTournament) return; // Tournament deleted, abort
            
            // Re-check conditions inside transaction for safety
            if (currentTournament.status !== 'upcoming') return;
            if ((currentTournament.playerCount || 0) >= currentTournament.maxPlayers) return;
            if (currentTournament.players && currentTournament.players[player.uid]) return;

            if (!currentTournament.players) {
                currentTournament.players = {};
            }

            currentTournament.players[player.uid] = {
                uid: player.uid,
                displayName: player.displayName,
                photoURL: player.photoURL,
                // Fix: Use rankPoints instead of trophies
                rankPoints: player.rankPoints
            };
            currentTournament.playerCount = (currentTournament.playerCount || 0) + 1;
            
            return currentTournament;
        });

        if (!committed) {
             throw new Error("Registration failed. The tournament might be full or registration has closed.");
        }
    } catch (error: any) {
        // Step 3: If registration fails, attempt to refund the fee.
        console.error("Tournament registration failed, attempting to refund fee.", error);
        const refundUpdates: {[key: string]: any} = {};
        if (tournament.entryFee.coins) {
            refundUpdates['coins'] = firebase.database.ServerValue.increment(tournament.entryFee.coins);
        }
        if (tournament.entryFee.gems) {
            refundUpdates['gems'] = firebase.database.ServerValue.increment(tournament.entryFee.gems);
        }
         if(Object.keys(refundUpdates).length > 0) {
            await userRef.update(refundUpdates);
        }
        // Re-throw the original error to inform the user.
        throw error;
    }
};


// Admin function
export const awardTournamentPrize = async (tournament: Tournament, winner: TournamentPlayer) => {
    if (!tournament.prizePool) {
        throw new Error("Tournament has no prize pool defined.");
    }
    
    const updates: { [key: string]: any } = {};
    
    // 1. Update winner's account with prizes
    if (tournament.prizePool.coins) {
        updates[`users/${winner.uid}/coins`] = firebase.database.ServerValue.increment(tournament.prizePool.coins);
    }
    if (tournament.prizePool.gems) {
        updates[`users/${winner.uid}/gems`] = firebase.database.ServerValue.increment(tournament.prizePool.gems);
    }
    if (tournament.prizePool.nftCard) {
        // This is a read-then-write, but acceptable for an infrequent admin action.
        const playerNftsRef = rtdb.ref(`users/${winner.uid}/nfts`);
        const snapshot = await playerNftsRef.once('value');
        const nfts = snapshot.val() || [];
        nfts.push(`${tournament.prizePool.nftCard} ${tournament.name} Winner`);
        updates[`users/${winner.uid}/nfts`] = nfts;
    }

    // 2. Update tournament status and winner
    updates[`tournaments/${tournament.id}/status`] = 'finished';
    updates[`tournaments/${tournament.id}/winnerUid`] = winner.uid;
    updates[`tournaments/${tournament.id}/winnerDisplayName`] = winner.displayName;

    await rtdb.ref().update(updates);
};