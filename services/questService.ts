import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, Quest } from '../types';
import { DAILY_QUESTS } from '../constants';

// Helper to get the start of the current UTC day as a timestamp
const getStartOfUTCDay = (): number => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

const getInitialQuestProgress = () => {
    const progress: Player['quests']['progress'] = {};
    DAILY_QUESTS.forEach(q => {
        progress[q.id] = { progress: 0, claimed: false };
    });
    return progress;
}

// This function is the core logic. It checks if quests need to be reset and does so if necessary.
// It should be called before any quest progress is read or written.
export const checkAndResetQuests = async (userId: string): Promise<void> => {
    const questRef = rtdb.ref(`users/${userId}/quests`);
    const todayStart = getStartOfUTCDay();

    await questRef.transaction(questData => {
        if (!questData || questData.lastReset < todayStart) {
            // If no quest data exists or it's from a previous day, reset it.
            return {
                lastReset: todayStart,
                progress: getInitialQuestProgress()
            };
        }
        // If data is from today, do nothing.
        return questData;
    });
};

// Fix: Added 'drone' to matchType to allow drone matches to update quest progress (e.g., for damage quests).
export const updateQuestProgress = async (userId: string, matchType: 'rank' | 'classic' | 'war' | 'drone', damageDealt: number): Promise<void> => {
    // First, ensure quests are up-to-date
    await checkAndResetQuests(userId);

    const progressRef = rtdb.ref(`users/${userId}/quests/progress`);

    // Find quests to update based on match results
    const updates: { [key: string]: any } = {};
    DAILY_QUESTS.forEach(quest => {
        let shouldUpdate = false;
        let increment = 0;

        if (quest.type === 'playRanked' && matchType === 'rank') {
            shouldUpdate = true;
            increment = 1;
        } else if (quest.type === 'playClassic' && matchType === 'classic') {
            shouldUpdate = true;
            increment = 1;
        } else if (quest.type === 'dealDamage') {
            shouldUpdate = true;
            increment = damageDealt;
        }

        if (shouldUpdate) {
            updates[`${quest.id}/progress`] = firebase.database.ServerValue.increment(increment);
        }
    });

    if (Object.keys(updates).length > 0) {
        await progressRef.update(updates);
    }
};

export const claimQuestReward = async (userId: string, quest: Quest): Promise<void> => {
    const userRef = rtdb.ref(`users/${userId}`);

    const { committed, snapshot } = await userRef.transaction(player => {
        if (!player || !player.quests || !player.quests.progress[quest.id]) {
            return; // Abort: Player or quest data missing
        }

        const questProgress = player.quests.progress[quest.id];

        if (questProgress.progress < quest.target) {
            return; // Abort: Quest not completed
        }
        if (questProgress.claimed) {
            return; // Abort: Already claimed
        }

        // Mark as claimed
        questProgress.claimed = true;

        // Add reward
        if (quest.reward.type === 'coins') {
            player.coins = (player.coins || 0) + quest.reward.amount;
        }
        // Can add other reward types here later (e.g., gems)

        return player;
    });

    if (!committed) {
        const player = snapshot.val();
        if (player?.quests?.progress[quest.id]?.claimed) {
            throw new Error("Reward already claimed.");
        }
        if ((player?.quests?.progress[quest.id]?.progress || 0) < quest.target) {
            throw new Error("Quest not yet complete.");
        }
        throw new Error("Failed to claim reward. Please try again.");
    }
};