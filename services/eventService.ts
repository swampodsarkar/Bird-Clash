import { rtdb } from './firebase';
import type { LimitedEvent } from '../types';
import firebase from 'firebase/compat/app';

export const listenToEvents = (callback: (events: LimitedEvent[]) => void) => {
  const eventsRef = rtdb.ref('limitedEvents');
  const listener = (snapshot: firebase.database.DataSnapshot) => {
    const events: LimitedEvent[] = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const event = { id: child.key!, ...child.val() } as LimitedEvent;
        const now = Date.now();
        if (event.startTime <= now && event.endTime >= now && event.active) {
          events.push(event);
        }
      });
    }
    callback(events);
  };
  eventsRef.on('value', listener);
  return () => eventsRef.off('value', listener);
};

export const claimEventReward = async (uid: string, eventId: string, event: LimitedEvent) => {
  const userRef = rtdb.ref(`users/${uid}`);
  const claimedRef = rtdb.ref(`eventClaims/${uid}/${eventId}`);

  const claimedSnapshot = await claimedRef.once('value');
  if (claimedSnapshot.exists()) throw new Error('Event reward already claimed.');

  const { committed } = await userRef.transaction(player => {
    if (!player) return;
    if (event.condition) {
      const progress = player.quests?.progress?.[eventId]?.progress || 0;
      if (progress < event.condition.target) return;
    }
    if (event.reward) {
      switch (event.reward.type) {
        case 'coins': player.coins = (player.coins || 0) + (event.reward.amount || 0); break;
        case 'gems': player.gems = (player.gems || 0) + (event.reward.amount || 0); break;
      }
    }
    return player;
  });

  if (!committed) throw new Error('Cannot claim event reward.');
  await claimedRef.set({ claimedAt: Date.now() });
};

export const getActiveEvents = async (): Promise<LimitedEvent[]> => {
  const snapshot = await rtdb.ref('limitedEvents').once('value');
  const events: LimitedEvent[] = [];
  if (snapshot.exists()) {
    snapshot.forEach(child => {
      const event = { id: child.key!, ...child.val() } as LimitedEvent;
      const now = Date.now();
      if (event.startTime <= now && event.endTime >= now && event.active) {
        events.push(event);
      }
    });
  }
  return events;
};
