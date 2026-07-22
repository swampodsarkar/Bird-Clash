import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Tournament, TournamentBracket, BracketMatch, Player } from '../types';

export const createBracket = async (tournament: Tournament): Promise<TournamentBracket[]> => {
  const playerUids = Object.keys(tournament.players);
  const shuffled = playerUids.sort(() => Math.random() - 0.5);
  const brackets: TournamentBracket[] = [];
  const totalRounds = Math.ceil(Math.log2(shuffled.length));

  let round = 1;
  let currentPlayers = [...shuffled];

  while (round <= totalRounds) {
    const bracket: TournamentBracket = {
      id: `${tournament.id}_R${round}`,
      tournamentId: tournament.id,
      round,
      matches: [],
    };

    for (let i = 0; i < currentPlayers.length; i += 2) {
      const p1 = currentPlayers[i];
      const p2 = currentPlayers[i + 1];
      if (p2) {
        const p1Data = tournament.players[p1];
        const p2Data = tournament.players[p2];
        bracket.matches.push({
          matchId: `${tournament.id}_R${round}_M${Math.floor(i / 2)}`,
          player1Uid: p1,
          player1Name: p1Data?.displayName || 'Unknown',
          player2Uid: p2,
          player2Name: p2Data?.displayName || 'Unknown',
          winnerUid: null,
          status: 'pending',
        });
      } else {
        currentPlayers[i] = p1;
      }
    }

    brackets.push(bracket);
    await rtdb.ref(`tournamentBrackets/${tournament.id}/rounds/${round}`).set(bracket);

    currentPlayers = bracket.matches.map(m => m.winnerUid || '').filter(Boolean);
    round++;
  }

  await rtdb.ref(`tournaments/${tournament.id}/status`).set('active');
  return brackets;
};

export const updateBracketMatch = async (tournamentId: string, round: number, matchIndex: number, winnerUid: string) => {
  const matchKey = `${tournamentId}_R${round}_M${matchIndex}`;
  const matchPath = `tournamentBrackets/${tournamentId}/rounds/${round}/matches/${matchIndex}`;
  
  await rtdb.ref(matchPath).update({ winnerUid, status: 'finished' });

  if (round === 1) {
    const nextRoundKey = `${tournamentId}_R${round + 1}`;
    const nextRound = await rtdb.ref(`tournamentBrackets/${tournamentId}/rounds/${round + 1}`).once('value');
    if (nextRound.exists()) {
      const bracket = nextRound.val() as TournamentBracket;
      const matchToUpdate = bracket.matches.find(m => m.player1Uid === matchKey || m.player2Uid === matchKey);
      if (matchToUpdate) {
        if (matchToUpdate.player1Uid === matchKey) {
          matchToUpdate.player1Uid = winnerUid;
        } else {
          matchToUpdate.player2Uid = winnerUid;
        }
        await rtdb.ref(`tournamentBrackets/${tournamentId}/rounds/${round + 1}`).set(bracket);
      }
    }
  }
};

export const getBrackets = async (tournamentId: string): Promise<TournamentBracket[]> => {
  const snapshot = await rtdb.ref(`tournamentBrackets/${tournamentId}/rounds`).once('value');
  const brackets: TournamentBracket[] = [];
  if (snapshot.exists()) {
    snapshot.forEach(child => {
      brackets.push({ id: child.key!, ...child.val() });
    });
  }
  return brackets.sort((a, b) => a.round - b.round);
};
