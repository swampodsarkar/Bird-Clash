import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Player, ChatMessage } from '../types';
import { sendMessage } from '../services/chatService';
import { Spinner } from './common/Spinner';
import Button from './common/Button';
import PlayerAvatar from './common/PlayerAvatar';

interface ChatScreenProps {
  player: Player;
  messages: ChatMessage[];
  loading: boolean;
  chatError: string | null;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ player, messages, loading, chatError }) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || sending || player.isBanned) return;

    setSendError(null);
    setSending(true);
    try {
      // NOTE: Gemini-powered content moderation was removed as it requires an API key
      // which is not configured in this environment, causing messages to fail.
      await sendMessage(player, newMessage);
      setNewMessage('');
    } catch (err: any) {
        console.error("Error sending message:", err);
        if (err.message && err.message.toLowerCase().includes('permission')) {
          setSendError("Permission denied. You may be banned from chat.");
        } else {
          setSendError("Failed to send message. Please try again.");
        }
    } finally {
        setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e]">
      <h2 className="text-2xl text-center font-bold text-yellow-400 mb-4 flex-shrink-0">Global Chat</h2>
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000]">
        {loading ? (
          <div className="flex justify-center items-center h-full"><Spinner /></div>
        ) : chatError && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-red-400 text-center">{chatError}</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.uid === user?.uid;
            return (
              <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <PlayerAvatar 
                  photoURL={msg.photoURL}
                  uid={msg.uid}
                  activeBadge={msg.activeBadge}
                  sizeClassName="w-8 h-8"
                  imgClassName="border-2 border-black bg-gray-700 mt-1"
                />
                <div className={`max-w-xs md:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                   <p className="text-xs text-gray-400 px-1">{msg.displayName || 'Player'}</p>
                   <div className={`px-3 py-2 text-sm border-2 border-black shadow-[2px_2px_0px_#000] ${isMe ? 'bg-blue-800' : 'bg-gray-800'}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="bg-[#1a1a2e] border-t-2 border-black mt-4">
        {sendError && !player.isBanned && <p className="text-red-400 text-center text-xs px-4 pt-2">{sendError}</p>}
        {player.isBanned ? (
            <div className="p-6 text-center">
                <p className="text-red-500 text-sm font-bold">
                    You are banned and cannot send messages.
                </p>
            </div>
        ) : (
          <form onSubmit={handleSendMessage} className="p-4 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="pixel-input flex-grow"
              disabled={sending}
            />
            <Button type="submit" disabled={sending} className="!px-4 !py-3">
              {sending ? <Spinner /> : 'Send'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatScreen;
