import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, CustomRoom, RoomInvite, Match, RoomSpectator } from '../types';
import { getPlayerEquippedBird } from './gameService';

const roomsRef = rtdb.ref('custom_rooms');
const invitesRef = rtdb.ref('room_invites');
const spectatorsRef = rtdb.ref('room_spectators');

// Create a new room
export const createRoom = async (player: Player, roomType: 'normal' | 'esports', password?: string): Promise<CustomRoom> => {
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
    if (password) newRoom.password = password;

    const updates: { [key: string]: any } = {};
    updates[`custom_rooms/${roomId}`] = newRoom;
    updates[`users/${player.uid}/${cardType}`] = firebase.database.ServerValue.increment(-1);

    await rtdb.ref().update(updates);
    
    roomsRef.child(roomId).onDisconnect().remove();

    return newRoom;
};

// Join an existing room
export const joinRoom = async (player: Player, roomId: string, password?: string): Promise<CustomRoom> => {
    const roomRef = roomsRef.child(roomId);

    const snap = await roomRef.once('value');
    if (!snap.exists()) {
        throw new Error("Room not found. Check the Room ID.");
    }
    const room = snap.val() as CustomRoom;
    if (room.status !== 'waiting') {
        throw new Error("Room is closed or already has a guest.");
    }
    if (room.hostUid === player.uid) {
        return room;
    }
    if (room.guestUid) {
        throw new Error("Room already has a guest.");
    }
    if (room.password && room.password !== password) {
        throw new Error("Wrong password.");
    }

    await roomRef.update({
        guestUid: player.uid,
        guestDisplayName: player.displayName,
        guestPhotoURL: player.photoURL,
        status: 'full',
    });

    roomRef.child('guestUid').onDisconnect().set(null);
    roomRef.child('guestDisplayName').onDisconnect().set(null);
    roomRef.child('guestPhotoURL').onDisconnect().set(null);
    roomRef.child('status').onDisconnect().set('waiting');

    const updatedSnap = await roomRef.once('value');
    return updatedSnap.val() as CustomRoom;
};

// Leave a room
export const leaveRoom = async (player: Player, roomId: string): Promise<void> => {
    const roomRef = roomsRef.child(roomId);
    const roomSnapshot = await roomRef.once('value');
    if (!roomSnapshot.exists()) return;

    const room = roomSnapshot.val() as CustomRoom;

    // Also clean up spectator entry if any
    spectatorsRef.child(roomId).child(player.uid).remove().catch(() => {});

    if (player.uid === room.hostUid) {
        await roomRef.remove();
        // Clean up all spectators for this room
        spectatorsRef.child(roomId).remove().catch(() => {});
    } else if (player.uid === room.guestUid) {
        // Promote first spectator or set waiting
        const specSnap = await spectatorsRef.child(roomId).once('value');
        const specs: RoomSpectator[] = [];
        if (specSnap.exists()) {
            specSnap.forEach(child => {
                specs.push(child.val());
            });
        }
        const nextSpec = specs.length > 0 ? specs[0] : null;
        if (nextSpec) {
            await roomRef.update({
                guestUid: nextSpec.uid,
                guestDisplayName: nextSpec.displayName,
                guestPhotoURL: nextSpec.photoURL,
                status: 'full',
            });
            // Remove promoted spectator from list
            await spectatorsRef.child(roomId).child(nextSpec.uid).remove();
        } else {
            await roomRef.update({
                guestUid: null,
                guestDisplayName: null,
                guestPhotoURL: null,
                status: 'waiting',
            });
        }
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
        player1: { uid: hostPlayer.uid, displayName: hostPlayer.displayName, photoURL: hostPlayer.photoURL, damageDealt: 0, rankPoints: hostPlayer.rankPoints, clanId: hostPlayer.clanId || null, selectedBird: hostBird, currentHealth: hostBird.maxHealth, activeBadge: hostPlayer.activeBadge || null, equippedEmotes: hostPlayer.equippedEmotes || [], abilityCooldownLeft: 0, abilityUsesLeft: 2, wins: 0, activeEffects: {}, healUsesLeft: 2 },
        player2: { uid: guestPlayer.uid, displayName: guestPlayer.displayName, photoURL: guestPlayer.photoURL, damageDealt: 0, rankPoints: guestPlayer.rankPoints, clanId: guestPlayer.clanId || null, selectedBird: guestBird, currentHealth: guestBird.maxHealth, activeBadge: guestPlayer.activeBadge || null, equippedEmotes: guestPlayer.equippedEmotes || [], abilityCooldownLeft: 0, abilityUsesLeft: 2, wins: 0, activeEffects: {}, healUsesLeft: 2 },
        status: 'active',
        winner: null,
        createdAt: Date.now(),
        startTime: Date.now(),
        matchType: room.roomType === 'normal' ? 'classic' : room.roomType,
        turn: 1,
        currentRound: 1,
        rounds: [],
        currentTurnPlayerUid: hostPlayer.uid,
        log: [],
    };
    
    const updates: { [key: string]: any } = {};
    updates[`matches/${matchId}`] = newMatch;
    updates[`custom_rooms/${room.id}/matchId`] = matchId;
    updates[`custom_rooms/${room.id}/status`] = 'in_game';

    await rtdb.ref().update(updates);
};

// --- Spectator functions (stored in room_spectators/{roomId}/{uid}) ---

// Join as spectator (anyone can write their own UID to room_spectators)
export const joinAsSpectator = async (player: Player, roomId: string): Promise<void> => {
    const roomSnap = await roomsRef.child(roomId).once('value');
    if (!roomSnap.exists()) throw new Error("Room not found.");
    const room = roomSnap.val() as CustomRoom;
    if (room.hostUid === player.uid || room.guestUid === player.uid) {
        return; // Already a player
    }
    const specData: RoomSpectator = {
        uid: player.uid,
        displayName: player.displayName || 'Spectator',
        photoURL: player.photoURL,
    };
    await spectatorsRef.child(roomId).child(player.uid).set(specData);
};

// Leave as spectator
export const leaveAsSpectator = async (playerUid: string, roomId: string): Promise<void> => {
    await spectatorsRef.child(roomId).child(playerUid).remove();
};

// Host swaps a player with a spectator
export const swapPlayer = async (hostUid: string, roomId: string, currentPlayerUid: string, spectatorUid: string): Promise<void> => {
    const roomRef = roomsRef.child(roomId);
    const snap = await roomRef.once('value');
    if (!snap.exists()) throw new Error("Room not found.");
    const room = snap.val() as CustomRoom;
    if (room.hostUid !== hostUid) throw new Error("Only the host can swap players.");
    if (room.status === 'in_game') throw new Error("Match already started.");

    const specSnap = await spectatorsRef.child(roomId).child(spectatorUid).once('value');
    if (!specSnap.exists()) throw new Error("Spectator not found.");
    const spec = specSnap.val() as RoomSpectator;

    if (currentPlayerUid === room.hostUid) {
        const updates: any = {
            hostUid: spec.uid,
            hostDisplayName: spec.displayName,
            hostPhotoURL: spec.photoURL,
        };
        await roomRef.update(updates);
        // Old host becomes spectator
        await spectatorsRef.child(roomId).child(hostUid).set({
            uid: hostUid, displayName: room.hostDisplayName, photoURL: room.hostPhotoURL,
        });
    } else if (currentPlayerUid === room.guestUid) {
        const updates: any = {
            guestUid: spec.uid,
            guestDisplayName: spec.displayName,
            guestPhotoURL: spec.photoURL,
        };
        await roomRef.update(updates);
        // Old guest becomes spectator
        if (room.guestDisplayName) {
            await spectatorsRef.child(roomId).child(currentPlayerUid).set({
                uid: currentPlayerUid, displayName: room.guestDisplayName, photoURL: room.guestPhotoURL,
            });
        }
    } else {
        throw new Error("Player not found in room.");
    }
    // Remove promoted spectator
    await spectatorsRef.child(roomId).child(spectatorUid).remove();
};

// Host kicks a spectator
export const kickSpectator = async (hostUid: string, roomId: string, spectatorUid: string): Promise<void> => {
    const snap = await roomsRef.child(roomId).once('value');
    if (!snap.exists()) throw new Error("Room not found.");
    const room = snap.val() as CustomRoom;
    if (room.hostUid !== hostUid) throw new Error("Only the host can kick spectators.");
    await spectatorsRef.child(roomId).child(spectatorUid).remove();
};

// Listen to spectators for a room
export const listenToSpectators = (roomId: string, callback: (spectators: RoomSpectator[]) => void): (() => void) => {
    const ref = spectatorsRef.child(roomId);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const list: RoomSpectator[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                list.push(child.val() as RoomSpectator);
            });
        }
        callback(list);
    };
    ref.on('value', listener);
    return () => ref.off('value', listener);
};

// Listen to room changes
export const deleteRoom = async (roomId: string): Promise<void> => {
    await roomsRef.child(roomId).remove();
    await spectatorsRef.child(roomId).remove().catch(() => {});
};

export const listenToRoom = (roomId: string, callback: (room: CustomRoom | null) => void): (() => void) => {
    const roomRef = roomsRef.child(roomId);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        callback(snapshot.val() as CustomRoom | null);
    };
    roomRef.on('value', listener);
    return () => roomRef.off('value', listener);
};

// Get all available rooms
export const listenToAllRooms = (callback: (rooms: CustomRoom[]) => void): (() => void) => {
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const rooms: CustomRoom[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const room = child.val() as CustomRoom;
                room.id = child.key || room.id;
                if (room.status === 'waiting' || room.status === 'full') {
                    rooms.push(room);
                }
            });
        }
        callback(rooms);
    };
    roomsRef.on('value', listener);
    return () => roomsRef.off('value', listener);
};

// Invite a friend to a room
export const inviteToRoom = async (fromPlayer: Player, toPlayerUid: string, roomId: string): Promise<void> => {
    const invite: RoomInvite = {
        roomId,
        from: fromPlayer.displayName || 'A player',
        photoURL: fromPlayer.photoURL || '',
        activeBadge: fromPlayer.activeBadge,
    };
    const inviteRef = invitesRef.child(toPlayerUid);
    await inviteRef.set(invite);
    setTimeout(() => {
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
