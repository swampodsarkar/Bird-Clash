import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, LoginStreak } from '../types';
import { STREAK_REWARDS } from '../constants';

export const checkAndUpdateStreak = async (player: Player): Promise<{ streak: LoginStreak; reward: { coins: number; gems: number } | null }> => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  let streak: LoginStreak = player.loginStreak || {
    currentStreak: 0,
    longestStreak: 0,
    lastClaimDate: '',
    nextRewardDay: 1,
  };

  let reward: { coins: number; gems: number } | null = null;

  if (streak.lastClaimDate === todayStr) {
    return { streak, reward };
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (streak.lastClaimDate === yesterdayStr) {
    streak.currentStreak += 1;
  } else if (streak.lastClaimDate !== todayStr) {
    streak.currentStreak = 1;
  }

  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  const rewardDay = Math.min(streak.currentStreak, 7);
  const dayReward = STREAK_REWARDS[rewardDay];
  if (dayReward) {
    reward = { coins: dayReward.coins, gems: dayReward.gems };
  }

  streak.lastClaimDate = todayStr;
  streak.nextRewardDay = Math.min(streak.currentStreak + 1, 7);

  const updates: { [key: string]: any } = {};
  updates[`users/${player.uid}/loginStreak`] = streak;
  if (reward) {
    if (reward.coins > 0) updates[`users/${player.uid}/coins`] = firebase.database.ServerValue.increment(reward.coins);
    if (reward.gems > 0) updates[`users/${player.uid}/gems`] = firebase.database.ServerValue.increment(reward.gems);
  }

  await rtdb.ref().update(updates);
  return { streak, reward };
};
