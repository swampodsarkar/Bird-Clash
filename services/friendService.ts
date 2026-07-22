// Fix: remove 'db' from import as it's not exported from firebase.ts
import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, Friend, UserPresence } from '../types';

export const sendFriendRequest = async (fromPlayer: Player, toPlayer: Player) => {
    const updates: { [key: string]: any } = {};

    updates[`/friends/${fromPlayer.uid}/${toPlayer.uid}`] = {
        uid: toPlayer.uid,
        displayName: toPlayer.displayName,
        photoURL: toPlayer.photoURL,
        // Fix: Use rankPoints instead of trophies
        rankPoints: toPlayer.rankPoints,
        status: 'pending_sent',
    };
    updates[`/friends/${toPlayer.uid}/${fromPlayer.uid}`] = {
        uid: fromPlayer.uid,
        displayName: fromPlayer.displayName,
        photoURL: fromPlayer.photoURL,
        // Fix: Use rankPoints instead of trophies
        rankPoints: fromPlayer.rankPoints,
        status: 'pending_received',
    };
    
    await rtdb.ref().update(updates);
};

export const acceptFriendRequest = async (accepterUid: string, senderUid: string) => {
    const updates: { [key: string]: any } = {};
    updates[`/friends/${accepterUid}/${senderUid}/status`] = 'friends';
    updates[`/friends/${senderUid}/${accepterUid}/status`] = 'friends';
    await rtdb.ref().update(updates);
};

export const declineOrRemoveFriend = async (userUid1: string, userUid2: string) => {
    const updates: { [key: string]: any } = {};
    updates[`/friends/${userUid1}/${userUid2}`] = null;
    updates[`/friends/${userUid2}/${userUid1}`] = null;
    await rtdb.ref().update(updates);
};

export const listenToFriends = (uid: string, callback: (friends: Friend[]) => void): (() => void) => {
    const friendsRef = rtdb.ref(`friends/${uid}`);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const friends: Friend[] = [];
        if (snapshot.exists()) {
            const friendData = snapshot.val();
            for (const key in friendData) {
                friends.push(friendData[key]);
            }
        }
        callback(friends);
    };
    friendsRef.on('value', listener);
    return () => friendsRef.off('value', listener);
};

// --- Presence System ---

export const setupPresence = (uid: string) => {
    const userStatusDatabaseRef = rtdb.ref(`/status/${uid}`);
    const isOfflineForDatabase = {
        isOnline: false,
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
        inMatch: null
    };
    const isOnlineForDatabase = {
        isOnline: true,
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
        inMatch: null
    };

    rtdb.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === false) {
            return;
        }
        userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
            userStatusDatabaseRef.set(isOnlineForDatabase);
        });
    });
};

export const updateUserMatchStatus = (uid: string, matchId: string | null) => {
    const userStatusDatabaseRef = rtdb.ref(`/status/${uid}`);
    userStatusDatabaseRef.update({ inMatch: matchId });
};


export const goOffline = (uid: string) => {
    const userStatusDatabaseRef = rtdb.ref(`/status/${uid}`);
    userStatusDatabaseRef.update({ 
        isOnline: false, 
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
    });
};

export const listenToFriendsPresence = (
    friendUids: string[], 
    callback: (statuses: { [uid: string]: UserPresence }) => void
): (() => void) => {
    const listeners: { ref: firebase.database.Reference; listener: (snapshot: firebase.database.DataSnapshot) => void }[] = [];
    const statuses: { [uid: string]: UserPresence } = {};

    friendUids.forEach(uid => {
        const ref = rtdb.ref(`/status/${uid}`);
        const listener = (snapshot: firebase.database.DataSnapshot) => {
            statuses[uid] = snapshot.val();
            callback({ ...statuses });
        };
        ref.on('value', listener);
        listeners.push({ ref, listener });
    });

    return () => {
        listeners.forEach(({ ref, listener }) => ref.off('value', listener));
    };
};