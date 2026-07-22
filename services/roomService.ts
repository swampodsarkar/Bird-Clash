import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, CustomRoom, RoomInvite, Match } from '../types';
import { getPlayerEquippedBird } from './gameService';
import { toast } from 'react-toastify';

const roomsRef = rtdb.ref('custom_rooms');
const invitesRef = rtdb.ref('room_invites');

// Create a new room
export const createRoom = async (player: Player, roomType: 'normal' | 'esports'): Promise<CustomRoom> => {
    const cardType = roomType === 'esports' ? 'droneCustomCards' : 'normalCustomCards';
    if ((player[cardType] || 0) < 1) {
        throw new Error(`You need a ${roomType === 'normal' ? 'Normal' : 'Esports'} Card to create this room.`);
    }

    const newRoomRef = roomsRef.push();
    const roomId = newRoomRef.key;
    if (!roomId) throw new Error("Could not create room ID.");

    const newRoom: CustomRoom = {
        id: roomId,
        hostUid: player.uid,
        hostDisplayName: player.displayName || 'Host',
        hostPhotoURL: player.photoURL,
        guestUid: null,
        guestDisplayName: null,
        guestPhotoURL: null,
        status: 'waiting',
        roomType,
        matchId: null,
        createdAt: firebase.database.ServerValue.TIMESTAMP as number,
    };

    const updates: { [key: string]: any } = {};
    updates[`custom_rooms/${roomId}`] = newRoom;
    updates[`users/${player.uid}/${cardType}`] = firebase.database.ServerValue.increment(-1);

    await rtdb.ref().update(updates);
    
    // Set onDisconnect for the host
    roomsRef.child(roomId).onDisconnect().remove();

    return newRoom;
};

// Join an existing room
export const joinRoom = async (player: Player, roomId: string): Promise<CustomRoom> => {
    const roomRef = roomsRef.child(roomId);
    
    const { committed, snapshot } = await roomRef.transaction(room => {
        if (!room) {
            // Room doesn't exist
            return;
        }
        if (room.status !== 'waiting') {
            // Room is full or already started
            return;
        }
        if (room.hostUid === player.uid) {
            // Host is rejoining, that's fine.
            return room;
        }

        room.guestUid = player.uid;
        room.guestDisplayName = player.displayName;
        room.guestPhotoURL = player.photoURL;
        room.status = 'full';
        return room;
    });

    if (!committed || !snapshot.exists()) {
        throw new Error("Could not join room. It might be full, closed, or does not exist.");
    }
    
    // Set onDisconnect for the guest
    roomRef.child('guestUid').onDisconnect().set(null);
    roomRef.child('guestDisplayName').onDisconnect().set(null);
    roomRef.child('guestPhotoURL').onDisconnect().set(null);
    roomRef.child('status').onDisconnect().set('waiting');

    return snapshot.val() as CustomRoom;
};

// Leave a room
export const leaveRoom = async (player: Player, roomId: string): Promise<void> => {
    const roomRef = roomsRef.child(roomId);
    const roomSnapshot = await roomRef.once('value');
    if (!roomSnapshot.exists()) return;

    const room = roomSnapshot.val() as CustomRoom;

    if (player.uid === room.hostUid) {
        // Host leaves, room is deleted
        await roomRef.remove();
    } else if (player.uid === room.guestUid) {
        // Guest leaves, room becomes waiting again
        await roomRef.update({
            guestUid: null,
            guestDisplayName: null,
            guestPhotoURL: null,
            status: 'waiting',
        });
    }
};

// Start the match from a room
export const startMatch = async (room: CustomRoom): Promise<void> => {
    if (room.status !== 'full' || !room.guestUid) {
        throw new Error("Cannot start match. Waiting for another player.");
    }

    const hostSnapshot = await rtdb.ref(`users/${room.hostUid}`).once('value');
    const guestSnapshot = await rtdb.ref(`users/${room.guestUid}`).once('value');

    if (!hostSnapshot.exists() || !guestSnapshot.exists()) {
        throw new Error("One of the players could not be found.");
    }

    const hostPlayer = hostSnapshot.val() as Player;
    const guestPlayer = guestSnapshot.val() as Player;

    const hostBird = getPlayerEquippedBird(hostPlayer);
    const guestBird = getPlayerEquippedBird(guestPlayer);

    const matchId = `match_custom_${room.id}`;
    const newMatch: Match = {
        id: matchId,
        player1: { uid: hostPlayer.uid, displayName: hostPlayer.displayName, photoURL: hostPlayer.photoURL, damageDealt: 0, rankPoints: hostPlayer.rankPoints, clanId: hostPlayer.clanId, selectedBird: hostBird, currentHealth: hostBird.maxHealth, activeBadge: hostPlayer.activeBadge, equippedEmotes: hostPlayer.equippedEmotes, abilityCooldownLeft: 0, abilityUsesLeft: 2, activeEffects: {}, healUsesLeft: 2 },
        player2: { uid: guestPlayer.uid, displayName: guestPlayer.displayName, photoURL: guestPlayer.photoURL, damageDealt: 0, rankPoints: guestPlayer.rankPoints, clanId: guestPlayer.clanId, selectedBird: guestBird, currentHealth: guestBird.maxHealth, activeBadge: guestPlayer.activeBadge, equippedEmotes: guestPlayer.equippedEmotes, abilityCooldownLeft: 0, abilityUsesLeft: 2, activeEffects: {}, healUsesLeft: 2 },
        status: 'active',
        winner: null,
        createdAt: Date.now(),
        startTime: Date.now(),
        // Fix: Map the room type 'normal' to the match type 'classic' to resolve type incompatibility.
        matchType: room.roomType === 'normal' ? 'classic' : room.roomType,
        turn: 1,
        currentTurnPlayerUid: hostPlayer.uid,
        log: [],
    };
    
    const updates: { [key: string]: any } = {};
    updates[`matches/${matchId}`] = newMatch;
    updates[`custom_rooms/${room.id}/matchId`] = matchId;

    await rtdb.ref().update(updates);
};

// Listen to room changes
export const listenToRoom = (roomId: string, callback: (room: CustomRoom | null) => void): (() => void) => {
    const roomRef = roomsRef.child(roomId);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        callback(snapshot.val() as CustomRoom | null);
    };
    roomRef.on('value', listener);
    return () => roomRef.off('value', listener);
};

// Invite a friend to a room
export const inviteToRoom = async (fromPlayer: Player, toPlayerUid: string, roomId: string): Promise<void> => {
    const invite: RoomInvite = {
        roomId,
        from: fromPlayer.displayName || 'A player',
        photoURL: fromPlayer.photoURL || '',
        activeBadge: fromPlayer.activeBadge,
    };
    // Send a temporary invite that auto-deletes after 30 seconds
    const inviteRef = invitesRef.child(toPlayerUid);
    await inviteRef.set(invite);
    setTimeout(() => {
        // Only remove if the invite is still the same one we sent
        inviteRef.once('value', snapshot => {
            if (snapshot.exists() && snapshot.val().roomId === roomId) {
                inviteRef.remove();
            }
        });
    }, 30000);
};

// Listen for room invites
export const listenForRoomInvites = (uid: string, callback: (invite: RoomInvite | null) => void): (() => void) => {
    const inviteRef = invitesRef.child(uid);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        callback(snapshot.val() as RoomInvite | null);
    };
    inviteRef.on('value', listener);
    return () => inviteRef.off('value', listener);
};