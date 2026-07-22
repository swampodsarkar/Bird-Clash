import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, ReferralData } from '../types';
import { REFERRAL_REWARDS } from '../constants';
import { toast } from 'react-toastify';

export const generateReferralCode = (uid: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = uid.slice(-4).toUpperCase();
  while (code.length < 8) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const initializeReferral = async (uid: string) => {
  const referralRef = rtdb.ref(`users/${uid}/referral`);
  const snapshot = await referralRef.once('value');
  if (!snapshot.exists()) {
    const referralData: ReferralData = {
      referralCode: generateReferralCode(uid),
      referredBy: undefined,
      referrals: {},
      referralRewardsClaimed: 0,
    };
    await referralRef.set(referralData);
  }
};

export const applyReferralCode = async (uid: string, code: string) => {
  if (!code || code.length < 4) throw new Error('Invalid referral code.');

  const usersRef = rtdb.ref('users');
  const snapshot = await usersRef.once('value');
  if (!snapshot.exists()) throw new Error('Invalid referral code.');

  let referrerUid: string | null = null;
  snapshot.forEach(child => {
    const player = child.val() as Player;
    if (player.referral?.referralCode === code.toUpperCase()) {
      referrerUid = child.key;
    }
  });

  if (!referrerUid) throw new Error('Invalid referral code.');
  if (referrerUid === uid) throw new Error('You cannot refer yourself.');

  const myRef = rtdb.ref(`users/${uid}/referral`);
  const mySnapshot = await myRef.once('value');
  if (mySnapshot.exists() && mySnapshot.val().referredBy) {
    throw new Error('You have already used a referral code.');
  }

  const now = Date.now();
  const updates: { [key: string]: any } = {};

  updates[`users/${uid}/referral/referredBy`] = referrerUid;

  updates[`users/${referrerUid}/referral/referrals/${uid}`] = { timestamp: now, rewarded: true };
  updates[`users/${referrerUid}/referral/referralRewardsClaimed`] = firebase.database.ServerValue.increment(1);
  updates[`users/${referrerUid}/gems`] = firebase.database.ServerValue.increment(REFERRAL_REWARDS.INVITER_GEMS);
  updates[`users/${referrerUid}/coins`] = firebase.database.ServerValue.increment(REFERRAL_REWARDS.INVITER_COINS);
  updates[`users/${uid}/gems`] = firebase.database.ServerValue.increment(REFERRAL_REWARDS.REFERRED_GEMS);
  updates[`users/${uid}/coins`] = firebase.database.ServerValue.increment(REFERRAL_REWARDS.REFERRED_COINS);

  await rtdb.ref().update(updates);
  toast.success(`Referral applied! You got ${REFERRAL_REWARDS.REFERRED_GEMS} gems and ${REFERRAL_REWARDS.REFERRED_COINS} coins!`);
};

export const getReferralLink = (referralCode: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}?ref=${referralCode}`;
};

export const getReferralCount = (player: Player): number => {
  if (!player.referral?.referrals) return 0;
  return Object.keys(player.referral.referrals).length;
};
