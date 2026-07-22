import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player } from '../types';
import { toast } from 'react-toastify';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardType: 'coins' | 'gems' | 'title';
  rewardAmount?: number;
  rewardTitle?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'First Blood', description: 'Win your first match!', icon: '🩸', rewardType: 'coins', rewardAmount: 500 },
  { id: 'win_10', title: 'Rising Star', description: 'Win 10 matches', icon: '⭐', rewardType: 'coins', rewardAmount: 2000 },
  { id: 'win_50', title: 'Battle Hardened', description: 'Win 50 matches', icon: '⚔️', rewardType: 'gems', rewardAmount: 50 },
  { id: 'win_100', title: 'War Legend', description: 'Win 100 matches', icon: '👑', rewardType: 'gems', rewardAmount: 200 },
  { id: 'match_50', title: 'Dedicated Player', description: 'Play 50 matches', icon: '🎮', rewardType: 'coins', rewardAmount: 3000 },
  { id: 'damage_10k', title: 'Heavy Hitter', description: 'Deal 10,000 total damage', icon: '💥', rewardType: 'coins', rewardAmount: 5000 },
  { id: 'damage_50k', title: 'Destroyer', description: 'Deal 50,000 total damage', icon: '☄️', rewardType: 'gems', rewardAmount: 100 },
  { id: 'collector_5', title: 'Bird Collector', description: 'Collect 5 different birds', icon: '🐦', rewardType: 'gems', rewardAmount: 50 },
  { id: 'collector_10', title: 'Avian Archive', description: 'Collect 10 different birds', icon: '🦅', rewardType: 'gems', rewardAmount: 150 },
  { id: 'rank_silver', title: 'Silver Clasher', description: 'Reach Silver rank', icon: '🥈', rewardType: 'coins', rewardAmount: 3000 },
  { id: 'rank_gold', title: 'Gold Warrior', description: 'Reach Gold rank', icon: '🥇', rewardType: 'gems', rewardAmount: 100 },
  { id: 'rank_platinum', title: 'Platinum Elite', description: 'Reach Platinum rank', icon: '💠', rewardType: 'gems', rewardAmount: 200 },
  { id: 'rank_diamond', title: 'Diamond Master', description: 'Reach Diamond rank', icon: '💎', rewardType: 'title', rewardTitle: 'Diamond Master' },
  { id: 'rank_grandmaster', title: 'Grandmaster', description: 'Reach Grandmaster rank', icon: '👑', rewardType: 'title', rewardTitle: 'Grandmaster' },
  { id: 'consecutive_5', title: 'On Fire!', description: 'Win 5 matches in a row', icon: '🔥', rewardType: 'coins', rewardAmount: 5000 },
  { id: 'consecutive_10', title: 'Unstoppable', description: 'Win 10 matches in a row', icon: '💪', rewardType: 'gems', rewardAmount: 300 },
  { id: 'spin_50', title: 'Lucky Spinner', description: 'Spin Gold Royale 50 times', icon: '🎰', rewardType: 'coins', rewardAmount: 10000 },
];

export const checkAchievements = async (uid: string, player: Player): Promise<Achievement[]> => {
  const unlocked = new Set(player.unlockedAchievements || []);
  const newlyUnlocked: Achievement[] = [];

  const stats = {
    totalMatches: player.totalMatches || 0,
    totalWins: player.totalWins || 0,
    totalDamage: player.totalDamage || 0,
    ownedBirdsCount: player.ownedBirds ? Object.keys(player.ownedBirds).length : 0,
    rankPoints: player.rankPoints,
    consecutiveWins: player.consecutiveWins || 0,
    totalSpins: player.goldSpins || 0,
  };

  const conditions: { [key: string]: boolean } = {
    first_win: stats.totalWins >= 1,
    win_10: stats.totalWins >= 10,
    win_50: stats.totalWins >= 50,
    win_100: stats.totalWins >= 100,
    match_50: stats.totalMatches >= 50,
    damage_10k: stats.totalDamage >= 10000,
    damage_50k: stats.totalDamage >= 50000,
    collector_5: stats.ownedBirdsCount >= 5,
    collector_10: stats.ownedBirdsCount >= 10,
    rank_silver: stats.rankPoints >= 1200,
    rank_gold: stats.rankPoints >= 1500,
    rank_platinum: stats.rankPoints >= 1900,
    rank_diamond: stats.rankPoints >= 2500,
    rank_grandmaster: stats.rankPoints >= 4000,
    consecutive_5: stats.consecutiveWins >= 5,
    consecutive_10: stats.consecutiveWins >= 10,
    spin_50: stats.totalSpins >= 50,
  };

  for (const achievement of ACHIEVEMENTS) {
    if (!unlocked.has(achievement.id) && conditions[achievement.id]) {
      newlyUnlocked.push(achievement);
      unlocked.add(achievement.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    const updates: { [key: string]: any } = {};
    updates[`users/${uid}/unlockedAchievements`] = Array.from(unlocked);

    let totalCoins = 0;
    let totalGems = 0;
    for (const a of newlyUnlocked) {
      if (a.rewardType === 'coins') totalCoins += a.rewardAmount || 0;
      if (a.rewardType === 'gems') totalGems += a.rewardAmount || 0;
      if (a.rewardType === 'title' && a.rewardTitle) {
        const titlesRef = rtdb.ref(`users/${uid}/unlockedTitles`);
        const snap = await titlesRef.once('value');
        const existingTitles: string[] = snap.val() || [];
        if (!existingTitles.includes(a.rewardTitle)) {
          existingTitles.push(a.rewardTitle);
          updates[`users/${uid}/unlockedTitles`] = existingTitles;
        }
      }
    }
    if (totalCoins > 0) updates[`users/${uid}/coins`] = firebase.database.ServerValue.increment(totalCoins);
    if (totalGems > 0) updates[`users/${uid}/gems`] = firebase.database.ServerValue.increment(totalGems);

    await rtdb.ref().update(updates);

    for (const a of newlyUnlocked) {
      toast.success(`🏆 Achievement Unlocked: ${a.title}!`);
    }
  }

  return newlyUnlocked;
};

export const updateMatchStats = async (uid: string, isWin: boolean, damageDealt: number) => {
  const updates: { [key: string]: any } = {};
  updates[`users/${uid}/totalMatches`] = firebase.database.ServerValue.increment(1);
  updates[`users/${uid}/totalDamage`] = firebase.database.ServerValue.increment(damageDealt);
  if (isWin) {
    updates[`users/${uid}/totalWins`] = firebase.database.ServerValue.increment(1);
    updates[`users/${uid}/consecutiveWins`] = firebase.database.ServerValue.increment(1);
  } else {
    updates[`users/${uid}/consecutiveWins`] = 0;
  }
  await rtdb.ref().update(updates);
};
