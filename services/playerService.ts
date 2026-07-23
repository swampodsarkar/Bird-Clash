// Fix: remove 'db' from import as it's not exported from firebase.ts
import { rtdb, auth } from './firebase';
import firebase from 'firebase/compat/app'; // Needed for ServerValue
// Fix: Add StoreItem to type import.
import type { Player, Match, MatchResult, MatchHistoryEntry, RoyalePassReward, Bird, Report, MailItem, StoreItem, MatchPlayer, GiftPayload } from '../types';
import { CURRENT_ROYALE_PASS_SEASON, BIRD_DEFINITIONS, INSECT_DEFINITIONS } from '../constants';
import { checkAndResetQuests, updateQuestProgress } from './questService';
import { toast } from 'react-toastify';

const TITLES = [
    { name: 'Bronze Clasher', condition: (p: Player) => p.rankPoints >= 100 },
    { name: 'Silver Clasher', condition: (p: Player) => p.rankPoints >= 500 },
    { name: 'Gold Clasher', condition: (p: Player) => p.rankPoints >= 1000 },
    { name: 'Platinum Clasher', condition: (p: Player) => p.rankPoints >= 1900 },
    { name: 'Diamond Clasher', condition: (p: Player) => p.rankPoints >= 2500 },
    { name: 'Coin Collector', condition: (p: Player) => p.coins >= 10000 },
    { name: 'High Roller', condition: (p: Player) => p.coins >= 50000 },
    { name: 'Coin Master', condition: (p: Player) => p.coins >= 100000 },
    { name: 'Eagle Eye Owner', condition: (p: Player) => !!p.ownedBirds?.['B005'] },
    { name: 'Serial Spinner', condition: (p: Player) => (p.goldSpins || 0) >= 100 },
    { name: 'Royale King', condition: (p: Player) => (p.goldSpins || 0) >= 500 },
    { name: 'Battle Legend', condition: (p: Player) => p.rankPoints >= 3600 },
    { name: 'Avian Collector', condition: (p: Player) => p.ownedBirds ? Object.keys(p.ownedBirds).length >= 10 : false },
    { name: 'Grandmaster', condition: (p: Player) => p.rankPoints >= 4000 },
];

const initializeRoyalePass = () => ({
    seasonId: CURRENT_ROYALE_PASS_SEASON,
    level: 1,
    xp: 0,
    hasPremium: false,
    claimedRewards: {},
});

// Create or update player profile on login
export const createPlayerProfile = async (user: firebase.User, dailyLoginBonusCoins: number) => {
  const userRef = rtdb.ref(`users/${user.uid}`);
  const snapshot = await userRef.once('value');

  if (!snapshot.exists()) {
    // New player
    // Create the default Tappy bird for the new player
    const tappyDef = BIRD_DEFINITIONS['B001'];
    const tappyBird: Bird = {
        id: tappyDef.id,
        name: tappyDef.name,
        rarity: tappyDef.rarity,
        skillDescription: tappyDef.skillDescription,
        skillPower: tappyDef.baseAttackPower,
        level: 1,
        xp: 0,
        xpToNextLevel: tappyDef.baseXpToNextLevel,
        icon: tappyDef.icon,
        maxHealth: tappyDef.baseHealth,
        powerLevel: 1,
        healthLevel: 1,
        abilityType: tappyDef.abilityType,
        abilityValue: tappyDef.abilityValue,
        abilityCooldown: tappyDef.abilityCooldown,
        abilityDescription: tappyDef.abilityDescription,
    };

    const now = Date.now();
    const newPlayer: Player = {
      uid: user.uid,
      displayName: user.displayName || `Player${Math.floor(Math.random() * 1000)}`,
      email: user.email,
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
      coins: 100,
      gems: 5,
      rankPoints: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      clanId: null,
      lastLogin: now,
      mineCapacity: 0, // Obsolete, but kept for schema stability
      mineLastCollected: 0, // Obsolete
      mineRate: 0, // Obsolete
      nfts: [],
      unlockedTitles: ['Newbie Tapper'],
      activeTitle: 'Newbie Tapper',
      royalePass: initializeRoyalePass(),
      ownedBirds: {
          [tappyBird.id]: tappyBird,
      },
      equippedBirdId: tappyBird.id,
      inventory: { insects: {} },
      goldSpins: 0,
      diamondSpins: 0,
      quests: {
        lastReset: 0,
        progress: {}
      },
      lastRankReset: now,
      statusMessage: 'New Bird Clasher!',
      nameChangeCards: 0,
      hasCompletedTutorial: false,
      dailyRankPoints: 0,
      weeklyRankPoints: 0,
      lastDailyReset: now,
      lastWeeklyReset: now,
      consecutiveLosses: 0,
    };
    await userRef.set(newPlayer);
    await checkAndResetQuests(user.uid);
  } else {
    // Existing player
    const playerData = snapshot.val() as Player;
    const updates: any = {};
    const now = Date.now();

    if (playerData.level === undefined) {
        updates.level = 1;
        updates.xp = 0;
        updates.xpToNextLevel = 100;
    }
    if (playerData.consecutiveLosses === undefined) {
        updates.consecutiveLosses = 0;
    }

    // --- Daily/Weekly Leaderboard Reset Logic ---
    const todayUTC = new Date(now);
    todayUTC.setUTCHours(0, 0, 0, 0);
    const todayTimestamp = todayUTC.getTime();

    const dayOfWeek = todayUTC.getUTCDay(); // Sun=0, Mon=1
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const weekStartUTC = new Date(todayTimestamp);
    weekStartUTC.setUTCDate(weekStartUTC.getUTCDate() - daysSinceMonday);
    const weekTimestamp = weekStartUTC.getTime();

    if (!playerData.lastDailyReset || playerData.lastDailyReset < todayTimestamp) {
        updates.dailyRankPoints = 0;
        updates.lastDailyReset = now;
        if (playerData.lastDailyReset) {
            toast.info("Daily leaderboard rank has been reset.");
        }
    }
    if (!playerData.lastWeeklyReset || playerData.lastWeeklyReset < weekTimestamp) {
        updates.weeklyRankPoints = 0;
        updates.lastWeeklyReset = now;
        if (playerData.lastWeeklyReset) {
            toast.info("Weekly leaderboard rank has been reset.");
        }
    }
    
    // --- Rank Season Reset Logic ---
    const twoMonthsInMillis = 60 * 24 * 60 * 60 * 1000; // Approx 60 days
    if (!playerData.lastRankReset || (now - playerData.lastRankReset > twoMonthsInMillis)) {
        const currentRp = playerData.rankPoints;
        let newRp = 0;

        if (currentRp >= 3200) newRp = 2500;       // Heroic+ -> Diamond I
        else if (currentRp >= 2500) newRp = 1900; // Diamond -> Plat I
        else if (currentRp >= 1900) newRp = 1500; // Plat -> Gold I
        else if (currentRp >= 1500) newRp = 1200; // Gold -> Silver I
        else if (currentRp >= 1200) newRp = 1100; // Silver -> Bronze III
        else newRp = 0;                          // Bronze -> Bronze I
        
        if (newRp !== currentRp) {
            const rankPointChange = newRp - currentRp;
            // This function call is async but we can't await it here.
            // So we'll add its updates manually to our updates object.
            updates.rankPoints = firebase.database.ServerValue.increment(rankPointChange);
            if (playerData.clanId) {
                updates[`clans/${playerData.clanId}/totalRankPoints`] = firebase.database.ServerValue.increment(rankPointChange);
            }
            updates.lastRankReset = now;
            toast.info('A new rank season has begun! Your rank has been reset.');
        } else {
            // If their rank is already at the reset floor, just update the timestamp
            updates.lastRankReset = now;
        }
    }


    // Check for daily login bonus
    const lastLogin = new Date(playerData.lastLogin || 0);
    const today = new Date();
    const isDailyRewardDue = lastLogin.toDateString() !== today.toDateString();
    
    if (isDailyRewardDue) {
        // Signal to the UI that a reward is available
        try { // Use try-catch for environments where sessionStorage is blocked
            sessionStorage.setItem('dailyRewardDue', 'true');
        } catch (e) {
            console.warn('Could not set sessionStorage for daily reward.');
            // Fallback: grant reward immediately with a toast if storage fails
            updates.coins = firebase.database.ServerValue.increment(dailyLoginBonusCoins);
            updates.lastLogin = Date.now();
            toast.success(`+${dailyLoginBonusCoins} coins for daily login!`);
        }
    } else {
        // No reward due, just update login time if not granting a reward
        if (!updates.lastLogin) {
            updates.lastLogin = Date.now();
        }
        try {
            sessionStorage.removeItem('dailyRewardDue');
        } catch (e) {}
    }


    if (playerData.royalePass?.seasonId !== CURRENT_ROYALE_PASS_SEASON) {
        updates.royalePass = initializeRoyalePass();
    }
    
    if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
    }
    await checkAndResetQuests(user.uid);
  }
};

export const updatePlayerPhotoURL = async (uid: string, newPhotoURL: string) => {
    const user = auth.currentUser;
    if (user && user.uid === uid) {
        await user.updateProfile({ photoURL: newPhotoURL });
    }

    const updates: { [key: string]: any } = {};
    updates[`users/${uid}/photoURL`] = newPhotoURL;

    // Also update clan member data if in a clan
    const playerSnapshot = await rtdb.ref(`users/${uid}`).once('value');
    if (playerSnapshot.exists()) {
        const playerData = playerSnapshot.val() as Player;
        if (playerData.clanId) {
            updates[`clans/${playerData.clanId}/members/${uid}/photoURL`] = newPhotoURL;
        }
    }

    await rtdb.ref().update(updates);
};


export const listenToPlayer = (uid: string, callback: (player: Player | null) => void, onError: (error: Error) => void) => {
  const userRef = rtdb.ref(`users/${uid}`);
  const listener = (snapshot: firebase.database.DataSnapshot) => {
    callback(snapshot.val());
  };
  userRef.on('value', listener, (error: Error) => {
      console.error("Listener on player failed:", error);
      onError(error);
  });
  return () => userRef.off('value', listener);
};

export const completeTutorial = async (uid: string) => {
    const userRef = rtdb.ref(`users/${uid}/hasCompletedTutorial`);
    await userRef.set(true);
};

export const updatePlayerCoins = async (uid: string, amount: number) => {
  const userRef = rtdb.ref(`users/${uid}/coins`);
  await userRef.set(firebase.database.ServerValue.increment(amount));
};

export const updatePlayerGems = async (uid: string, amount: number) => {
  const userRef = rtdb.ref(`users/${uid}/gems`);
  await userRef.set(firebase.database.ServerValue.increment(amount));
};


export const updatePlayerRankPointsAndClan = async (uid: string, amount: number) => {
    const userRef = rtdb.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    if (!userSnapshot.exists()) return;
    const player = userSnapshot.val() as Player;
    const updates: { [key: string]: any } = {};
    updates[`users/${uid}/rankPoints`] = firebase.database.ServerValue.increment(amount);
    
    // Update streak logic
    if (amount > 0) {
        updates[`users/${uid}/consecutiveLosses`] = 0; // Win resets streak
    } else if (amount < 0) {
        updates[`users/${uid}/consecutiveLosses`] = firebase.database.ServerValue.increment(1);
    }

    if (amount !== 0) {
        updates[`users/${uid}/dailyRankPoints`] = firebase.database.ServerValue.increment(amount);
        updates[`users/${uid}/weeklyRankPoints`] = firebase.database.ServerValue.increment(amount);
    }

    if (player.clanId) {
        updates[`clans/${player.clanId}/totalRankPoints`] = firebase.database.ServerValue.increment(amount);
    }
    await rtdb.ref().update(updates);
};

export const recordMatchHistory = async (uid: string, match: Match, result: MatchResult, rankPointChange: number) => {
  const opponent = match.player1.uid === uid ? match.player2 : match.player1;
  const historyRef = rtdb.ref(`matchHistory/${uid}`).push();
  const historyEntry: MatchHistoryEntry = {
    matchId: match.id,
    opponentDisplayName: opponent.displayName || 'Opponent',
    opponentPhotoURL: opponent.photoURL || '',
    myDamageDealt: result.myDamageDealt,
    opponentDamageDealt: result.opponentDamageDealt,
    outcome: result.outcome,
    matchType: result.matchType,
    rankPointChange: rankPointChange,
    timestamp: Date.now(),
  };
  await historyRef.set(historyEntry);

  if (result.outcome === 'win' || result.outcome === 'loss') {
      await updateQuestProgress(uid, result.matchType, result.myDamageDealt);
  }
};

export const checkAndAwardTitles = async (uid: string) => {
    const playerRef = rtdb.ref(`users/${uid}`);
    const snapshot = await playerRef.once('value');
    if (!snapshot.exists()) return;

    const player = snapshot.val() as Player;
    const currentTitles = new Set(player.unlockedTitles || []);
    let changed = false;

    TITLES.forEach(title => {
        if (!currentTitles.has(title.name) && title.condition(player)) {
            currentTitles.add(title.name);
            changed = true;
            toast.info(`🏆 Title Unlocked: ${title.name}`);
        }
    });

    if (changed) {
        await playerRef.child('unlockedTitles').set(Array.from(currentTitles));
    }
};

export const setActiveTitle = async (uid: string, title: string | null) => {
    await rtdb.ref(`users/${uid}/activeTitle`).set(title);
};

export const setActiveBadge = async (uid: string, badge: 'Owner' | 'Moderator' | 'Content Creator' | null) => {
    await rtdb.ref(`users/${uid}/activeBadge`).set(badge);
}

export const addRoyalePassXp = async (uid: string, xp: number) => {
    const passRef = rtdb.ref(`users/${uid}/royalePass`);
    await passRef.child('xp').set(firebase.database.ServerValue.increment(xp));
};

export const activateRoyalePass = async (uid: string) => {
    const userRef = rtdb.ref(`users/${uid}`);
    const { committed, snapshot } = await userRef.transaction(player => {
        if (player) {
            if ((player.gems || 0) < 500) {
                return; // Abort
            }
            player.gems -= 500;
            if (player.royalePass) {
                player.royalePass.hasPremium = true;
            } else {
                player.royalePass = initializeRoyalePass();
                player.royalePass.hasPremium = true;
            }
        }
        return player;
    });
    if (!committed) {
        throw new Error("Not enough gems to activate Royale Pass.");
    }
};

export const claimRoyalePassReward = async (uid: string, level: number, reward: RoyalePassReward, type: 'free' | 'premium') => {
    const userRef = rtdb.ref(`users/${uid}`);
    let rewardApplied = false;

    const { committed } = await userRef.transaction(player => {
        if (player && player.royalePass) {
            if (!player.royalePass.claimedRewards) {
                player.royalePass.claimedRewards = {};
            }
            if (!player.royalePass.claimedRewards[level]) {
                player.royalePass.claimedRewards[level] = [];
            }
            if (player.royalePass.claimedRewards[level].includes(type)) {
                return; // Abort, already claimed
            }

            // Apply reward
            switch (reward.type) {
                case 'coins': player.coins = (player.coins || 0) + (reward.amount || 0); break;
                case 'gems': player.gems = (player.gems || 0) + (reward.amount || 0); break;
                case 'item': 
                    if (reward.itemId) {
                         if (!player.inventory) player.inventory = { insects: {} };
                         if (!player.inventory.insects) player.inventory.insects = {};
                         player.inventory.insects[reward.itemId] = (player.inventory.insects[reward.itemId] || 0) + (reward.amount || 1);
                    }
                    break;
                case 'bird':
                     if (reward.itemId) {
                         const birdDef = BIRD_DEFINITIONS[reward.itemId];
                         if (birdDef && (!player.ownedBirds || !player.ownedBirds[reward.itemId])) {
                            if (!player.ownedBirds) player.ownedBirds = {};
                             player.ownedBirds[reward.itemId] = {
                                id: birdDef.id, name: birdDef.name, rarity: birdDef.rarity,
                                skillDescription: birdDef.skillDescription, skillPower: birdDef.baseAttackPower,
                                level: 1, xp: 0, xpToNextLevel: birdDef.baseXpToNextLevel, icon: birdDef.icon,
                                maxHealth: birdDef.baseHealth,
                                powerLevel: 1, healthLevel: 1,
                                abilityType: birdDef.abilityType,
                                abilityValue: birdDef.abilityValue,
                                abilityCooldown: birdDef.abilityCooldown,
                                abilityDescription: birdDef.abilityDescription,
                             };
                         }
                     }
                    break;
            }
            
            player.royalePass.claimedRewards[level].push(type);
            rewardApplied = true;
        }
        return player;
    });

    if (!committed || !rewardApplied) {
        throw new Error("Failed to claim reward. It might be already claimed or conditions not met.");
    }
};

export const purchaseBird = async (uid: string, birdId: string, cost: { coins?: number, gems?: number }) => {
    const userRef = rtdb.ref(`users/${uid}`);

    const { committed } = await userRef.transaction(player => {
        if (player) {
            if (player.ownedBirds && player.ownedBirds[birdId]) return; // Already owns
            if (cost.coins && (player.coins || 0) < cost.coins) return;
            if (cost.gems && (player.gems || 0) < cost.gems) return;

            const birdDef = BIRD_DEFINITIONS[birdId];
            if (!birdDef) return; // Bird doesn't exist
            
            if (cost.coins) player.coins -= cost.coins;
            if (cost.gems) player.gems -= cost.gems;
            
            if (!player.ownedBirds) player.ownedBirds = {};
            player.ownedBirds[birdId] = {
                id: birdDef.id, name: birdDef.name, rarity: birdDef.rarity,
                skillDescription: birdDef.skillDescription, skillPower: birdDef.baseAttackPower,
                level: 1, xp: 0, xpToNextLevel: birdDef.baseXpToNextLevel, icon: birdDef.icon,
                maxHealth: birdDef.baseHealth, powerLevel: 1, healthLevel: 1,
                abilityType: birdDef.abilityType,
                abilityValue: birdDef.abilityValue,
                abilityCooldown: birdDef.abilityCooldown,
                abilityDescription: birdDef.abilityDescription,
            };
        }
        return player;
    });
    if (!committed) throw new Error("Purchase failed. Check your balance or if you already own this bird.");
};

export const purchaseInsect = async (uid: string, insectId: string, cost: { coins?: number, gems?: number }) => {
    const userRef = rtdb.ref(`users/${uid}`);
     const { committed } = await userRef.transaction(player => {
        if (player) {
            if (cost.coins && (player.coins || 0) < cost.coins) return;
            if (cost.gems && (player.gems || 0) < cost.gems) return;

            if (cost.coins) player.coins -= cost.coins;
            if (cost.gems) player.gems -= cost.gems;

            if (!player.inventory) player.inventory = { insects: {} };
            if (!player.inventory.insects) player.inventory.insects = {};
            player.inventory.insects[insectId] = (player.inventory.insects[insectId] || 0) + 1;
        }
        return player;
    });
    if (!committed) throw new Error("Purchase failed. Check your balance.");
};

export const purchaseCurrency = async (uid: string, currency: 'coins' | 'gems', amount: number) => {
    const currencyRef = rtdb.ref(`users/${uid}/${currency}`);
    await currencyRef.set(firebase.database.ServerValue.increment(amount));
};

export const feedBird = async (uid: string, birdId: string, insectId: string) => {
    const userRef = rtdb.ref(`users/${uid}`);
    const insectDef = INSECT_DEFINITIONS[insectId];
    if (!insectDef) throw new Error("Invalid insect.");

    const { committed } = await userRef.transaction(player => {
        if (player) {
            const insectCount = player.inventory?.insects?.[insectId] || 0;
            const bird = player.ownedBirds?.[birdId];
            if (insectCount < 1 || !bird) return; // Abort

            // Consume insect
            player.inventory!.insects![insectId] -= 1;
            if (player.inventory!.insects![insectId] === 0) {
                delete player.inventory!.insects![insectId];
            }

            // Grant XP
            bird.xp += insectDef.xpValue;

            // Level up logic
            while(bird.xp >= bird.xpToNextLevel) {
                bird.xp -= bird.xpToNextLevel;
                bird.level += 1;
                bird.xpToNextLevel = Math.floor(bird.xpToNextLevel * 1.2); // Increase next level XP requirement
                const birdDef = BIRD_DEFINITIONS[bird.id];
                if (birdDef) {
                    bird.skillPower += birdDef.attackPowerPerLevel;
                    bird.maxHealth += birdDef.healthPerLevel;
                }
            }
        }
        return player;
    });
    if (!committed) throw new Error("Failed to feed bird. Check your inventory.");
};


export const equipBird = async (uid: string, birdId: string) => {
    await rtdb.ref(`users/${uid}/equippedBirdId`).set(birdId);
};


const LEVEL_UP_REWARDS: { [level: number]: { coins?: number; gems?: number } } = {
    2:  { coins: 500 },
    3:  { coins: 1000 },
    4:  { coins: 1500 },
    5:  { coins: 2000, gems: 10 },
    6:  { coins: 2500 },
    7:  { coins: 3000 },
    8:  { coins: 4000, gems: 15 },
    9:  { coins: 5000 },
    10: { coins: 6000, gems: 20 },
    12: { coins: 8000, gems: 25 },
    15: { coins: 10000, gems: 30 },
    20: { coins: 15000, gems: 50 },
    25: { coins: 20000, gems: 75 },
    30: { coins: 30000, gems: 100 },
    40: { coins: 50000, gems: 150 },
    50: { coins: 100000, gems: 300 },
};

export interface LevelUpResult {
    newLevel: number;
    rewards: { coins?: number; gems?: number };
    leveledUp: boolean;
}

export const addPlayerXpAndLevelUp = async (uid: string, xpToAdd: number): Promise<LevelUpResult | null> => {
    const userRef = rtdb.ref(`users/${uid}`);
    let result: LevelUpResult | null = null;
    await userRef.transaction(player => {
        if (player) {
            player.xp = (player.xp || 0) + xpToAdd;
            let gainedLevels: number[] = [];
            while (player.xp >= player.xpToNextLevel) {
                player.xp -= player.xpToNextLevel;
                player.level += 1;
                gainedLevels.push(player.level);
                player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.1);
            }
            if (gainedLevels.length > 0) {
                const topLevel = gainedLevels[gainedLevels.length - 1];
                let totalCoins = 0;
                let totalGems = 0;
                for (const lvl of gainedLevels) {
                    const r = LEVEL_UP_REWARDS[lvl];
                    if (r) {
                        totalCoins += r.coins || 0;
                        totalGems += r.gems || 0;
                    }
                }
                if (totalCoins > 0) player.coins = (player.coins || 0) + totalCoins;
                if (totalGems > 0) player.gems = (player.gems || 0) + totalGems;
                result = {
                    newLevel: topLevel,
                    rewards: { coins: totalCoins || undefined, gems: totalGems || undefined },
                    leveledUp: true,
                };
            }
        }
        return player;
    });
    return result;
};

export const submitReport = async (
    reporter: Player, 
    category: string, 
    details: string, 
    reportedPlayer?: MatchPlayer | null, 
    matchId?: string | null
) => {
    const reportRef = rtdb.ref('reports').push();
    const newReport: Report = {
        reporterUid: reporter.uid,
        reporterName: reporter.displayName,
        reportedUid: reportedPlayer?.uid || 'N/A',
        reportedName: reportedPlayer?.displayName || 'N/A',
        matchId: matchId || 'N/A',
        category,
        details,
        timestamp: Date.now(),
        status: 'new',
    };
    await reportRef.set(newReport);
};

export const listenToMail = (uid: string, callback: (mail: MailItem[]) => void) => {
    const mailRef = rtdb.ref(`mail/${uid}`).orderByChild('timestamp').limitToLast(20);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const mail: MailItem[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                mail.push({ id: child.key!, ...child.val() });
            });
        }
        callback(mail.reverse());
    };
    mailRef.on('value', listener);
    return () => mailRef.off('value', listener);
};

export const sendGiftToPlayer = async (sender: Player, recipientUid: string, giftPayload: GiftPayload, cost: { coins?: number; gems?: number }) => {
    // Deduct cost from sender
    const senderRef = rtdb.ref(`users/${sender.uid}`);
    const { committed } = await senderRef.transaction(player => {
        if (!player) return;
        if (cost.coins && (player.coins || 0) < cost.coins) return;
        if (cost.gems && (player.gems || 0) < cost.gems) return;
        if (cost.coins) player.coins -= cost.coins;
        if (cost.gems) player.gems -= cost.gems;
        return player;
    });
    if (!committed) throw new Error("Not enough coins/gems to send gift.");

    // Send mail to recipient
    const mailItem: Omit<MailItem, 'id'> = {
        type: 'gift',
        message: `${sender.displayName} sent you a gift!`,
        timestamp: Date.now(),
        status: 'unread',
        gift: giftPayload
    };
    await rtdb.ref(`mail/${recipientUid}`).push(mailItem);
};

export const claimMailItem = async (uid: string, mailId: string) => {
    const userRef = rtdb.ref(`users/${uid}`);
    const mailItemRef = rtdb.ref(`mail/${uid}/${mailId}`);

    const { committed } = await userRef.transaction(player => {
        if (!player) return;

        const mailItemSnapshot = mailItemsForTransaction[mailId];
        if (!mailItemSnapshot || mailItemSnapshot.status !== 'unread' || !mailItemSnapshot.gift) {
            return;
        }

        // Apply reward
        const gift = mailItemSnapshot.gift;
        switch (gift.type) {
            case 'coins': player.coins = (player.coins || 0) + (gift.amount || 0); break;
            case 'gems': player.gems = (player.gems || 0) + (gift.amount || 0); break;
            case 'bird':
                if (gift.itemId && !player.ownedBirds?.[gift.itemId]) {
                    const birdDef = BIRD_DEFINITIONS[gift.itemId];
                    if (birdDef) {
                        if (!player.ownedBirds) player.ownedBirds = {};
                        player.ownedBirds[gift.itemId] = {
                            id: birdDef.id, name: birdDef.name, rarity: birdDef.rarity,
                            skillDescription: birdDef.skillDescription, skillPower: birdDef.baseAttackPower,
                            level: 1, xp: 0, xpToNextLevel: birdDef.baseXpToNextLevel, icon: birdDef.icon,
                            maxHealth: birdDef.baseHealth, powerLevel: 1, healthLevel: 1,
                        };
                    }
                }
                break;
            case 'insect':
                if (gift.itemId) {
                    if (!player.inventory) player.inventory = {};
                    if (!player.inventory.insects) player.inventory.insects = {};
                    player.inventory.insects[gift.itemId] = (player.inventory.insects[gift.itemId] || 0) + (gift.amount || 1);
                }
                break;
            case 'badge':
                 if (gift.badgeName) {
                    if (!player.unlockedBadges) player.unlockedBadges = [];
                    if (!player.unlockedBadges.includes(gift.badgeName)) {
                        player.unlockedBadges.push(gift.badgeName);
                    }
                 }
                break;
            case 'drone_custom_card':
                player.droneCustomCards = (player.droneCustomCards || 0) + (gift.amount || 0);
                break;
        }
        
        // Mark as claimed in a separate object to update mail node later
        mailItemsToUpdate[mailId] = { ...mailItemSnapshot, status: 'claimed' };

        return player;
    });
    
    // This part is tricky without cloud functions. Let's do a multi-path update.
    const mailSnapshot = await mailItemRef.once('value');
    if (!mailSnapshot.exists() || mailSnapshot.val().status !== 'unread') {
        throw new Error("Gift already claimed or does not exist.");
    }
    const mailItem = mailSnapshot.val() as MailItem;
    if (!mailItem.gift) throw new Error("This mail does not contain a gift.");

    const updates: { [key: string]: any } = {};
    const gift = mailItem.gift;
    switch (gift.type) {
        case 'coins': updates[`users/${uid}/coins`] = firebase.database.ServerValue.increment(gift.amount || 0); break;
        case 'gems': updates[`users/${uid}/gems`] = firebase.database.ServerValue.increment(gift.amount || 0); break;
        // Bird/Insect require reading first to not overwrite, so transaction is better.
        // Let's retry with a simpler approach for now.
    }
    
    // We can't do a real transaction across multiple paths easily from the client.
    // So, we update the user first, then the mail status. There's a small risk of inconsistency.
    const userUpdates: {[key: string]: any} = {};
    
    const userSnapshot = await userRef.once('value');
    const player = userSnapshot.val() as Player;

    switch (gift.type) {
        case 'coins': userUpdates['coins'] = (player.coins || 0) + (gift.amount || 0); break;
        case 'gems': userUpdates['gems'] = (player.gems || 0) + (gift.amount || 0); break;
        case 'bird':
            if (gift.itemId && !player.ownedBirds?.[gift.itemId]) {
                const birdDef = BIRD_DEFINITIONS[gift.itemId];
                if (birdDef) {
                    const newBird = {
                        id: birdDef.id, name: birdDef.name, rarity: birdDef.rarity,
                        skillDescription: birdDef.skillDescription, skillPower: birdDef.baseAttackPower,
                        level: 1, xp: 0, xpToNextLevel: birdDef.baseXpToNextLevel, icon: birdDef.icon,
                        maxHealth: birdDef.baseHealth, powerLevel: 1, healthLevel: 1,
                        abilityType: birdDef.abilityType,
                        abilityValue: birdDef.abilityValue,
                        abilityCooldown: birdDef.abilityCooldown,
                        abilityDescription: birdDef.abilityDescription,
                    };
                    userUpdates[`ownedBirds/${gift.itemId}`] = newBird;
                }
            }
            break;
        case 'insect':
            if (gift.itemId) {
                userUpdates[`inventory/insects/${gift.itemId}`] = (player.inventory?.insects?.[gift.itemId] || 0) + (gift.amount || 1);
            }
            break;
         case 'badge':
            if (gift.badgeName) {
                const newBadges = new Set(player.unlockedBadges || []);
                newBadges.add(gift.badgeName);
                userUpdates['unlockedBadges'] = Array.from(newBadges);
            }
            break;
        case 'drone_custom_card':
            userUpdates['droneCustomCards'] = (player.droneCustomCards || 0) + (gift.amount || 0);
            break;
    }
    
    await userRef.update(userUpdates);
    await mailItemRef.update({ status: 'claimed' });
};

// Dummy variables to make the transaction logic pass type-checking.
// This part is complex to implement correctly on the client and is simplified.
const mailItemsForTransaction: { [key: string]: MailItem } = {};
const mailItemsToUpdate: { [key: string]: MailItem } = {};


export const purchaseEmote = async (uid: string, item: StoreItem) => {
    const userRef = rtdb.ref(`users/${uid}`);
    const { committed } = await userRef.transaction(player => {
        if (player) {
            if (player.ownedEmotes?.includes(item.payload.emote)) return;
            if (item.cost.gems && (player.gems || 0) < item.cost.gems) return;

            if (item.cost.gems) player.gems -= item.cost.gems;

            if (!player.ownedEmotes) player.ownedEmotes = [];
            player.ownedEmotes.push(item.payload.emote);
        }
        return player;
    });
    if (!committed) throw new Error("Purchase failed. Check your balance or if you already own this emote.");
}

export const equipEmotes = async (uid: string, emotes: string[]) => {
    await rtdb.ref(`users/${uid}/equippedEmotes`).set(emotes);
};

export const purchaseDuoCard = async (uid: string, item: StoreItem) => {
    const userRef = rtdb.ref(`users/${uid}/dynamicDuoCards`);
    const gemsRef = rtdb.ref(`users/${uid}/gems`);

    const gemsSnapshot = await gemsRef.once('value');
    if ((gemsSnapshot.val() || 0) < (item.cost.gems || 0)) {
        throw new Error("Not enough gems.");
    }

    await gemsRef.set(firebase.database.ServerValue.increment(-(item.cost.gems || 0)));
    await userRef.set(firebase.database.ServerValue.increment(1));
};

export const sendDuoRequest = async (player: Player, partnerUid: string) => {
    const partnerRef = rtdb.ref(`users/${partnerUid}`);
    const partnerSnapshot = await partnerRef.once('value');
    if (!partnerSnapshot.exists()) throw new Error("Player not found.");
    const partner = partnerSnapshot.val() as Player;

    if (partner.dynamicDuo) throw new Error(`${partner.displayName} is already in a duo or has a pending request.`);
    if ((player.dynamicDuoCards || 0) < 1) throw new Error("You don't have a Dynamic Duo Card.");

    const now = Date.now();
    const updates: { [key: string]: any } = {};
    updates[`users/${player.uid}/dynamicDuo`] = { partnerUid, partnerDisplayName: partner.displayName, status: 'pending_sent' };
    updates[`users/${player.uid}/dynamicDuoCards`] = firebase.database.ServerValue.increment(-1);

    const mailItem: Omit<MailItem, 'id'> = {
        type: 'duo_request',
        message: `${player.displayName} wants to form a Dynamic Duo with you!`,
        timestamp: now,
        status: 'unread',
        duoRequest: { fromUid: player.uid, fromDisplayName: player.displayName || '' }
    };
    const mailRef = rtdb.ref(`mail/${partnerUid}`).push();
    updates[`mail/${partnerUid}/${mailRef.key}`] = mailItem;

    await rtdb.ref().update(updates);
}

export const acceptDuoRequest = async (player: Player, mailItem: MailItem) => {
    if (player.dynamicDuo) throw new Error("You are already in a duo or have a pending request.");
    if (!mailItem.duoRequest) throw new Error("Invalid request mail.");

    const fromUid = mailItem.duoRequest.fromUid;
    const fromPlayerRef = rtdb.ref(`users/${fromUid}`);
    const fromPlayerSnapshot = await fromPlayerRef.once('value');
    if (!fromPlayerSnapshot.exists()) throw new Error("The requesting player could not be found.");
    
    const fromPlayer = fromPlayerSnapshot.val() as Player;
    if (fromPlayer.dynamicDuo?.status !== 'pending_sent' || fromPlayer.dynamicDuo?.partnerUid !== player.uid) {
        throw new Error("This request has expired or was cancelled.");
    }
    
    const now = Date.now();
    const updates: { [key: string]: any } = {};
    // Update both players to active
    updates[`users/${player.uid}/dynamicDuo`] = { partnerUid: fromUid, partnerDisplayName: fromPlayer.displayName, status: 'active', since: now };
    updates[`users/${fromUid}/dynamicDuo`] = { partnerUid: player.uid, partnerDisplayName: player.displayName, status: 'active', since: now };
    // Mark mail as claimed
    updates[`mail/${player.uid}/${mailItem.id}/status`] = 'claimed';
    
    await rtdb.ref().update(updates);
};

export const declineDuoRequest = async (myUid: string, mailItem: MailItem) => {
    if (!mailItem.duoRequest) throw new Error("Invalid request mail.");
    const fromUid = mailItem.duoRequest.fromUid;
    
    const updates: { [key: string]: any } = {};
    // Refund card to sender and clear their pending status
    updates[`users/${fromUid}/dynamicDuo`] = null;
    updates[`users/${fromUid}/dynamicDuoCards`] = firebase.database.ServerValue.increment(1);
    // Mark mail as claimed (to remove it)
    updates[`mail/${myUid}/${mailItem.id}/status`] = 'claimed';
    
    await rtdb.ref().update(updates);
}

export const cancelDuoRequest = async (player: Player) => {
    if (player.dynamicDuo?.status !== 'pending_sent') throw new Error("No pending request to cancel.");
    
    const updates: { [key: string]: any } = {};
    updates[`users/${player.uid}/dynamicDuo`] = null;
    updates[`users/${player.uid}/dynamicDuoCards`] = firebase.database.ServerValue.increment(1);
    // Note: This doesn't delete the mail from the other player's inbox, but it will be invalid if they try to accept.
    
    await rtdb.ref().update(updates);
};

export const breakDuo = async (player: Player) => {
    if (player.dynamicDuo?.status !== 'active') throw new Error("You are not in an active duo.");
    const partnerUid = player.dynamicDuo.partnerUid;
    
    const updates: { [key: string]: any } = {};
    updates[`users/${player.uid}/dynamicDuo`] = null;
    updates[`users/${partnerUid}/dynamicDuo`] = null;
    
    await rtdb.ref().update(updates);
}

export const purchaseNameChangeCard = async (uid: string, item: StoreItem) => {
     const userRef = rtdb.ref(`users/${uid}`);
     const { committed } = await userRef.transaction(player => {
        if (player) {
            if (item.cost.gems && (player.gems || 0) < item.cost.gems) return;

            if (item.cost.gems) player.gems -= item.cost.gems;
            player.nameChangeCards = (player.nameChangeCards || 0) + 1;
        }
        return player;
     });
     if (!committed) throw new Error("Purchase failed. Check your balance.");
};

// Fix: Add the missing purchaseCustomCard function to handle purchases of custom room cards from the store.
export const purchaseCustomCard = async (uid: string, item: StoreItem) => {
    const userRef = rtdb.ref(`users/${uid}`);
    const { committed } = await userRef.transaction(player => {
       if (player) {
           if (item.cost.coins && (player.coins || 0) < item.cost.coins) return;
           if (item.cost.gems && (player.gems || 0) < item.cost.gems) return;

           if (item.cost.coins) player.coins -= item.cost.coins;
           if (item.cost.gems) player.gems -= item.cost.gems;

           if (item.type === 'normal_custom_card') {
               player.normalCustomCards = (player.normalCustomCards || 0) + 1;
           } else if (item.type === 'drone_custom_card') {
               player.droneCustomCards = (player.droneCustomCards || 0) + 1;
           }
       }
       return player;
    });
    if (!committed) throw new Error("Purchase failed. Check your balance.");
};

export const updatePlayerName = async (uid: string, newName: string) => {
    if (newName.length < 3 || newName.length > 15) throw new Error("Name must be between 3 and 15 characters.");

    const userRef = rtdb.ref(`users/${uid}`);
    const { committed } = await userRef.transaction(player => {
        if (player) {
            if ((player.nameChangeCards || 0) < 1) return; // Abort if no cards
            
            player.nameChangeCards -= 1;
            player.displayName = newName;
        }
        return player;
    });

    if (!committed) throw new Error("Failed to change name. Make sure you have a Name Change Card.");
};

export const updateStatusMessage = async (uid: string, message: string) => {
    if (message.length > 50) throw new Error("Status message cannot exceed 50 characters.");
    await rtdb.ref(`users/${uid}/statusMessage`).set(message);
};

export const claimTopUpEventReward = async (uid: string) => {
    const userRef = rtdb.ref(`users/${uid}`);
    const { committed } = await userRef.transaction(player => {
        if (player) {
            if ((player.eventGemsToppedUp || 0) < 100) return; // Not met
            if (player.eventTopUpRewardClaimed) return; // Already claimed

            player.eventTopUpRewardClaimed = true;
            if (!player.ownedEmotes) player.ownedEmotes = [];
            if (!player.ownedEmotes.includes('😡')) {
                player.ownedEmotes.push('😡');
            }
        }
        return player;
    });

    if (!committed) throw new Error("Cannot claim reward. Requirements not met or already claimed.");
};

// Fix: Add missing functions for Luck Royale spins and player search.
export const spinGoldRoyale = async (uid: string): Promise<{ message: string }> => {
    const userRef = rtdb.ref(`users/${uid}`);
    let resultMessage = "Spin failed. Please try again.";

    const { committed, snapshot } = await userRef.transaction(player => {
        if (!player) return; // Abort
        if ((player.coins || 0) < 100) return; // Abort, not enough coins

        player.coins -= 100;
        player.goldSpins = (player.goldSpins || 0) + 1;

        if (player.goldSpins % 1000 === 0) {
            // Milestone reward: guaranteed Epic Bird
            const epicBirdId = 'B005'; // Eagle Eye
            const birdDef = BIRD_DEFINITIONS[epicBirdId];
            if (birdDef) {
                if (!player.ownedBirds) player.ownedBirds = {};
                if (!player.ownedBirds[epicBirdId]) {
                    player.ownedBirds[epicBirdId] = {
                        id: birdDef.id, name: birdDef.name, rarity: birdDef.rarity,
                        skillDescription: birdDef.skillDescription, skillPower: birdDef.baseAttackPower,
                        level: 1, xp: 0, xpToNextLevel: birdDef.baseXpToNextLevel, icon: birdDef.icon,
                        maxHealth: birdDef.baseHealth, powerLevel: 1, healthLevel: 1,
                        abilityType: birdDef.abilityType,
                        abilityValue: birdDef.abilityValue,
                        abilityCooldown: birdDef.abilityCooldown,
                        abilityDescription: birdDef.abilityDescription,
                    };
                    resultMessage = `Milestone! You won an Epic Bird: ${birdDef.name}!`;
                } else {
                    // Already owns bird, give coins instead
                    player.coins += 1000;
                    resultMessage = `Milestone! You already own ${birdDef.name}, so you get 1000 coins!`;
                }
            }
        } else {
            // Regular reward
            const prize = Math.floor(Math.random() * 451) + 50; // 50 to 500 coins
            player.coins += prize;
            resultMessage = `You won ${prize} coins!`;
        }

        return player;
    });

    if (!committed) {
        throw new Error("Not enough coins to spin Gold Royale.");
    }

    return { message: resultMessage };
};

export const spinDiamondRoyale = async (uid: string): Promise<{ message: string }> => {
    const userRef = rtdb.ref(`users/${uid}`);
    let resultMessage = "Spin failed. Please try again.";
    let cost = 0;

    const { committed, snapshot } = await userRef.transaction(player => {
        if (!player) return; // Abort

        cost = 20;
        if ((player.gems || 0) < cost) return;

        player.gems -= cost;
        player.diamondSpins = (player.diamondSpins || 0) + 1;

        if (player.diamondSpins % 25 === 0) {
            // Milestone reward: Champion NFT Card
            if (!player.nfts) player.nfts = [];
            const nftName = 'Diamond Royale Champion';
            player.nfts.push(nftName);
            resultMessage = `Milestone! You won a ${nftName} NFT Card!`;
        } else {
            // Regular reward
            const prize = Math.floor(Math.random() * 951) + 50; // 50 to 1000 coins
            player.coins = (player.coins || 0) + prize;
            resultMessage = `You won ${prize} coins!`;
        }
        return player;
    });
    
    if (!committed) {
        throw new Error(`Not enough gems. You need 20 gems to spin Diamond Royale.`);
    }

    return { message: resultMessage };
};

export const searchPlayers = async (query: string, excludeUid: string): Promise<Player[]> => {
    const players: Player[] = [];
    if (!query) return players;

    const ref = rtdb.ref('users');
    const snapshot = await ref
        .orderByChild('displayName')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limitToFirst(10)
        .once('value');
        
    if(snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const player = childSnapshot.val() as Player;
            if (player.uid !== excludeUid) {
                players.push(player);
            }
        });
    }
    return players;
};

export const upgradeBirdStat = async (uid: string, birdId: string, stat: 'skillPower' | 'maxHealth') => {
    const userRef = rtdb.ref(`users/${uid}`);

    const { committed } = await userRef.transaction(player => {
        if (!player) return;
        const bird = player.ownedBirds?.[birdId];
        if (!bird) return;

        const isPower = stat === 'skillPower';
        const levelKey = isPower ? 'powerLevel' : 'healthLevel';
        const currentLevel = bird[levelKey] || 1;
        const cost = Math.floor(250 * Math.pow(currentLevel, 1.2));
        
        if ((player.coins || 0) < cost) return;

        player.coins -= cost;
        bird[levelKey] = currentLevel + 1;
        
        if (isPower) {
            bird.skillPower += 5; // Flat increase for now
        } else {
            bird.maxHealth += 20; // Flat increase
        }

        return player;
    });

    if (!committed) throw new Error("Upgrade failed. Check your coin balance.");
}