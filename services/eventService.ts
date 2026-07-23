import { rtdb } from './firebase';
import type { LimitedEvent, Bird } from '../types';
import firebase from 'firebase/compat/app';
import { BIRD_DEFINITIONS } from '../constants';

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

export const updateEventProgress = async (uid: string, outcome: 'win' | 'loss' | 'draw', damageDealt: number) => {
  const eventsSnapshot = await rtdb.ref('limitedEvents').once('value');
  if (!eventsSnapshot.exists()) return;

  const now = Date.now();
  const updates: { [key: string]: number } = {};

  eventsSnapshot.forEach(child => {
    const event = { id: child.key!, ...child.val() } as LimitedEvent;
    if (event.startTime <= now && event.endTime >= now && event.active && event.condition) {
      const progressRef = `users/${uid}/eventProgress/${event.id}`;
      let increment = 0;
      if (event.condition.type === 'matches') increment = 1;
      else if (event.condition.type === 'wins' && outcome === 'win') increment = 1;
      else if (event.condition.type === 'damage') increment = damageDealt;

      if (increment > 0) {
        rtdb.ref(progressRef).transaction(current => (current || 0) + increment);
      }
    }
  });
};

export const claimEventReward = async (uid: string, eventId: string, event: LimitedEvent) => {
  const userRef = rtdb.ref(`users/${uid}`);
  const claimedRef = rtdb.ref(`eventClaims/${uid}/${eventId}`);

  const claimedSnapshot = await claimedRef.once('value');
  if (claimedSnapshot.exists()) throw new Error('Event reward already claimed.');

  const progressSnapshot = await rtdb.ref(`users/${uid}/eventProgress/${eventId}`).once('value');
  const progress = progressSnapshot.val() || 0;
  if (event.condition && progress < event.condition.target) {
    throw new Error('Condition not met yet.');
  }

  const { committed } = await userRef.transaction(player => {
    if (!player) return;
    if (event.reward) {
      switch (event.reward.type) {
        case 'coins': player.coins = (player.coins || 0) + (event.reward.amount || 0); break;
        case 'gems': player.gems = (player.gems || 0) + (event.reward.amount || 0); break;
        case 'bird': {
          const birdId = event.reward.itemId;
          if (birdId && BIRD_DEFINITIONS[birdId]) {
            const def = BIRD_DEFINITIONS[birdId];
            if (!player.ownedBirds) player.ownedBirds = {};
            if (!player.ownedBirds[birdId]) {
              player.ownedBirds[birdId] = {
                id: def.id, name: def.name, rarity: def.rarity,
                skillDescription: def.skillDescription, skillPower: def.baseAttackPower,
                level: 1, xp: 0, xpToNextLevel: def.baseXpToNextLevel, icon: def.icon,
                maxHealth: def.baseHealth, powerLevel: 1, healthLevel: 1,
                abilityType: def.abilityType,
                abilityValue: def.abilityValue,
                abilityCooldown: def.abilityCooldown,
                abilityDescription: def.abilityDescription,
              } as Bird;
            }
          }
          break;
        }
        case 'insect': {
          const insectId = event.reward.itemId || 'I001';
          if (!player.ownedInsects) player.ownedInsects = {};
          player.ownedInsects[insectId] = (player.ownedInsects[insectId] || 0) + (event.reward.amount || 1);
          break;
        }
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
