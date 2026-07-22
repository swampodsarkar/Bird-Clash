import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, Clan, ClanMember, ChatMessage, FoodRequest } from '../types';
import { INSECT_DEFINITIONS } from '../constants';

export const createClan = async (player: Player, name: string, tag: string, description: string, clanCreateCost: number): Promise<void> => {
    if (player.clanId) {
        throw new Error("You are already in a clan.");
    }
    if (player.coins < clanCreateCost) {
        throw new Error(`You need ${clanCreateCost} coins to create a clan.`);
    }

    const clanRef = rtdb.ref('clans').push();
    const clanId = clanRef.key;
    if (!clanId) throw new Error("Could not generate a clan ID.");

    const leaderMember: ClanMember = {
        uid: player.uid,
        displayName: player.displayName,
        photoURL: player.photoURL,
        // Fix: Use rankPoints instead of trophies
        rankPoints: player.rankPoints,
    };

    if (player.activeBadge) {
        leaderMember.activeBadge = player.activeBadge;
    }

    const newClan: Clan = {
        id: clanId,
        name,
        tag,
        description,
        leaderId: player.uid,
        members: {
            [player.uid]: leaderMember,
        },
        memberCount: 1,
        // Fix: Use totalRankPoints and player.rankPoints
        totalRankPoints: player.rankPoints,
        createdAt: Date.now(),
    };
    
    const updates: { [key: string]: any } = {};
    updates[`/clans/${clanId}`] = newClan;
    updates[`/users/${player.uid}/clanId`] = clanId;
    updates[`/users/${player.uid}/coins`] = firebase.database.ServerValue.increment(-clanCreateCost);

    await rtdb.ref().update(updates);
};

export const joinClan = async (player: Player, clanId: string): Promise<void> => {
    if (player.clanId) {
        throw new Error("You are already in a clan.");
    }

    const clanRef = rtdb.ref(`clans/${clanId}`);
    const clanSnapshot = await clanRef.once('value');
    if (!clanSnapshot.exists()) {
        throw new Error("Clan not found.");
    }

    const newMember: ClanMember = {
        uid: player.uid,
        displayName: player.displayName,
        photoURL: player.photoURL,
        // Fix: Use rankPoints instead of trophies
        rankPoints: player.rankPoints,
    };
    if (player.activeBadge) {
        newMember.activeBadge = player.activeBadge;
    }

    const updates: { [key: string]: any } = {};
    updates[`/clans/${clanId}/members/${player.uid}`] = newMember;
    updates[`/clans/${clanId}/memberCount`] = firebase.database.ServerValue.increment(1);
    // Fix: Use totalRankPoints and player.rankPoints
    updates[`/clans/${clanId}/totalRankPoints`] = firebase.database.ServerValue.increment(player.rankPoints);
    updates[`/users/${player.uid}/clanId`] = clanId;

    await rtdb.ref().update(updates);
};

export const leaveClan = async (player: Player): Promise<void> => {
    if (!player.clanId) {
        throw new Error("You are not in a clan.");
    }

    const clanRef = rtdb.ref(`clans/${player.clanId}`);
    const clanSnapshot = await clanRef.once('value');

    const updates: { [key: string]: any } = {};
    updates[`/users/${player.uid}/clanId`] = null;

    if (clanSnapshot.exists()) {
        const clanData = clanSnapshot.val() as Clan;
        updates[`/clans/${player.clanId}/members/${player.uid}`] = null;
        updates[`/clans/${player.clanId}/memberCount`] = firebase.database.ServerValue.increment(-1);
        // Fix: Use totalRankPoints and player.rankPoints
        updates[`/clans/${player.clanId}/totalRankPoints`] = firebase.database.ServerValue.increment(-player.rankPoints);

        // If the leader leaves, disband the clan
        if (clanData.leaderId === player.uid) {
            updates[`/clans/${player.clanId}`] = null;
            // This leaves other members with a stale clanId. A cloud function would be better for cleanup.
        }
    }

    await rtdb.ref().update(updates);
};

export const searchClans = async (query: string): Promise<Clan[]> => {
    const clans: Clan[] = [];
    if (!query) return clans;

    const snapshot = await rtdb.ref('clans')
        .orderByChild('name')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limitToFirst(10)
        .once('value');
        
    if(snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            clans.push(childSnapshot.val());
        });
    }
    return clans;
};

export const listenToClan = (clanId: string, callback: (clan: Clan | null) => void) => {
    const clanRef = rtdb.ref(`clans/${clanId}`);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        callback(snapshot.val() as Clan | null);
    };
    clanRef.on('value', listener);
    return () => clanRef.off('value', listener);
};

export const listenToClanLeaderboard = (callback: (clans: Clan[]) => void) => {
    // Fix: Use totalRankPoints instead of totalTrophies
    const ref = rtdb.ref('clans').orderByChild('totalRankPoints').limitToLast(20);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const clans: Clan[] = [];
        if (snapshot.exists()){
            snapshot.forEach(childSnapshot => {
                clans.push(childSnapshot.val());
            });
        }
        callback(clans.reverse()); // Reverse to get descending order
    };
    ref.on('value', listener);
    return () => ref.off('value', listener);
};

export const sendClanMessage = async (clanId: string, player: Player, text: string) => {
  if (!text.trim()) return;

  // NOTE: Gemini-powered content moderation was removed as it requires an API key
  // which is not configured in this environment, causing messages to fail.
  
  await rtdb.ref(`clan_chat/${clanId}`).push({
    uid: player.uid,
    displayName: player.displayName,
    photoURL: player.photoURL,
    activeBadge: player.activeBadge || null,
    text: text,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
};

export const listenToClanMessages = (clanId: string, callback: (messages: ChatMessage[]) => void, onError: (error: Error) => void) => {
  const chatRef = rtdb.ref(`clan_chat/${clanId}`).orderByChild('timestamp').limitToLast(50);
  
  const listener = (snapshot: firebase.database.DataSnapshot) => {
      const messages: ChatMessage[] = [];
      if(snapshot.exists()){
          snapshot.forEach(childSnapshot => {
              messages.push({ id: childSnapshot.key!, ...childSnapshot.val() });
          });
      }
      callback(messages);
  };

  chatRef.on('value', listener, (err: Error) => {
      console.error("Listen to clan messages failed:", err);
      onError(err);
  });

  return () => chatRef.off('value', listener);
};

export const giftInsectToClanMember = async (senderPlayer: Player, receiverUid: string, insectId: string) => {
    if (senderPlayer.uid === receiverUid) {
        throw new Error("You cannot gift items to yourself.");
    }
    if (!senderPlayer.clanId) {
        throw new Error("You are not in a clan.");
    }

    const insectDef = INSECT_DEFINITIONS[insectId];
    if (!insectDef) {
        throw new Error("Invalid insect selected for gift.");
    }

    const cost = insectDef.giftCost;
    if (senderPlayer.coins < cost) {
        throw new Error(`Not enough coins. You need ${cost} to send this gift.`);
    }

    const usersRef = rtdb.ref('users');
    
    const { committed } = await usersRef.transaction(usersData => {
        if (!usersData) {
            return usersData; // Abort if users node doesn't exist
        }

        const sender = usersData[senderPlayer.uid];
        const receiver = usersData[receiverUid];

        // Sanity checks inside the transaction
        if (!sender || !receiver) {
            return; // Abort: one of the users doesn't exist
        }
        if (sender.clanId !== receiver.clanId || sender.clanId !== senderPlayer.clanId) {
            return; // Abort: not in the same clan
        }
        if ((sender.coins || 0) < cost) {
            return; // Abort: not enough coins
        }

        // Apply changes
        sender.coins -= cost;

        if (typeof receiver.inventory !== 'object' || receiver.inventory === null) {
            receiver.inventory = { insects: {} };
        }
        if (typeof receiver.inventory.insects !== 'object' || receiver.inventory.insects === null) {
            receiver.inventory.insects = {};
        }
        
        const currentInsectCount = receiver.inventory.insects[insectId];
        if (typeof currentInsectCount === 'number') {
            receiver.inventory.insects[insectId] += 1;
        } else {
            receiver.inventory.insects[insectId] = 1;
        }

        return usersData;
    });

    if (!committed) {
        // Re-check conditions after failure to provide a more specific error message.
        const senderRef = rtdb.ref(`users/${senderPlayer.uid}`);
        const receiverRef = rtdb.ref(`users/${receiverUid}`);

        const [senderSnapshot, receiverSnapshot] = await Promise.all([senderRef.once('value'), receiverRef.once('value')]);

        if (!senderSnapshot.exists() || !receiverSnapshot.exists()) {
             throw new Error("Could not find sender or receiver. The gift cannot be sent.");
        }
        
        const freshSenderData = senderSnapshot.val() as Player;
        if (freshSenderData.coins < cost) {
            throw new Error("Your coin balance is too low.");
        }
        
        const freshReceiverData = receiverSnapshot.val() as Player;
        if (freshSenderData.clanId !== freshReceiverData.clanId) {
            throw new Error("The recipient is no longer in your clan, or you have left the clan.");
        }
        
        // Final fallback if no other condition is met. Highly likely to be a data contention issue.
        throw new Error("Failed to send gift due to high server traffic. Please try again in a moment.");
    }
};

export const listenToClanFoodRequests = (clanId: string, callback: (requests: FoodRequest[]) => void): (() => void) => {
    const requestsRef = rtdb.ref(`clan_food_requests/${clanId}`).orderByChild('timestamp').limitToLast(10);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const requests: FoodRequest[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const req = child.val();
                if (req.status === 'active') {
                    requests.push({ id: child.key!, ...req });
                }
            });
        }
        callback(requests.reverse());
    };
    requestsRef.on('value', listener);
    return () => requestsRef.off('value', listener);
}

export const createFoodRequest = async (clanId: string, player: Player, insectId: string, amount: number) => {
    // 1. Check for existing active requests from this user
    const existingRequestSnapshot = await rtdb.ref(`clan_food_requests/${clanId}`)
        .orderByChild('requesterUid')
        .equalTo(player.uid)
        .once('value');

    let hasActiveRequest = false;
    if (existingRequestSnapshot.exists()) {
        existingRequestSnapshot.forEach(child => {
            if (child.val().status === 'active') {
                hasActiveRequest = true;
            }
        });
    }
    if (hasActiveRequest) {
        throw new Error("You already have an active food request.");
    }
    
    const insectDef = INSECT_DEFINITIONS[insectId];
    if (!insectDef) throw new Error("Invalid insect.");

    // 2. Create the request object
    const requestRef = rtdb.ref(`clan_food_requests/${clanId}`).push();
    const requestId = requestRef.key;
    if (!requestId) throw new Error("Could not generate request ID.");

    const newRequest: Omit<FoodRequest, 'id'> = {
        requesterUid: player.uid,
        requesterName: player.displayName || 'Player',
        requesterPhotoURL: player.photoURL,
        insectId: insectId,
        insectName: insectDef.name,
        insectIcon: insectDef.icon,
        requestedAmount: amount,
        donatedAmount: 0,
        donators: {},
        timestamp: firebase.database.ServerValue.TIMESTAMP as number,
        status: 'active',
    };

    // 3. Create the chat message object
    const chatMessage = {
        uid: player.uid,
        displayName: player.displayName,
        photoURL: player.photoURL,
        activeBadge: player.activeBadge || null,
        text: `requests ${amount} x ${insectDef.icon} ${insectDef.name}!`,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'food_request' as const,
        foodRequestId: requestId,
    };
    
    // 4. Perform multi-path update
    const updates: { [key: string]: any } = {};
    updates[`/clan_food_requests/${clanId}/${requestId}`] = newRequest;
    
    const chatRef = rtdb.ref(`clan_chat/${clanId}`).push();
    updates[`/clan_chat/${clanId}/${chatRef.key}`] = chatMessage;

    await rtdb.ref().update(updates);
}

export const donateToFoodRequest = async (
    clanId: string, 
    request: FoodRequest, 
    donator: Player, 
    amount: number
) => {
    if (donator.uid === request.requesterUid) {
        throw new Error("You cannot donate to your own request.");
    }
    if (amount <= 0) {
        throw new Error("Donation amount must be positive.");
    }
    const donatorInsectCount = donator.inventory?.insects?.[request.insectId] || 0;
    if (donatorInsectCount < amount) {
        throw new Error("You don't have enough insects to donate.");
    }
    const remainingNeeded = request.requestedAmount - request.donatedAmount;
    if (amount > remainingNeeded) {
        throw new Error(`They only need ${remainingNeeded} more.`);
    }

    const newDonatedAmount = request.donatedAmount + amount;
    const isCompleted = newDonatedAmount >= request.requestedAmount;

    const updates: { [key: string]: any } = {};
    
    updates[`/clan_food_requests/${clanId}/${request.id}/donatedAmount`] = firebase.database.ServerValue.increment(amount);
    updates[`/clan_food_requests/${clanId}/${request.id}/donators/${donator.uid}`] = firebase.database.ServerValue.increment(amount);
    if (isCompleted) {
        updates[`/clan_food_requests/${clanId}/${request.id}/status`] = 'completed';
    }

    updates[`/users/${donator.uid}/inventory/insects/${request.insectId}`] = firebase.database.ServerValue.increment(-amount);
    updates[`/users/${request.requesterUid}/inventory/insects/${request.insectId}`] = firebase.database.ServerValue.increment(amount);
    
    await rtdb.ref().update(updates);
};