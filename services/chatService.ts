import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, ChatMessage } from '../types';

export const sendMessage = async (player: Player, text: string) => {
  if (!text.trim()) return;

  await rtdb.ref('chat').push({
    uid: player.uid,
    displayName: player.displayName,
    photoURL: player.photoURL,
    activeBadge: player.activeBadge || null,
    text: text,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
};

export const listenToMessages = (callback: (messages: ChatMessage[]) => void, onError: (error: Error) => void) => {
  const chatRef = rtdb.ref('chat').orderByChild('timestamp').limitToLast(50);
  
  const listener = (snapshot: firebase.database.DataSnapshot) => {
    const messages: ChatMessage[] = [];
    if(snapshot.exists()){
        snapshot.forEach(childSnapshot => {
            messages.push({ id: childSnapshot.key!, ...childSnapshot.val() });
        });
    }
    callback(messages);
  }

  chatRef.on('value', listener, (err) => {
      console.error("Listen to messages failed:", err);
      onError(err);
  });

  return () => chatRef.off('value', listener);
};