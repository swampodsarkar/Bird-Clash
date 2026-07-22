import React, { useState, useEffect } from 'react';
import type { Player, ChatMessage } from '../types';
import FriendsScreen from './FriendsScreen';
import ClanScreen from './ClanScreen';
import ChatScreen from './ChatScreen';
import { listenToMessages } from '../services/chatService';

interface SocialScreenProps {
  player: Player;
  onStartSpectating: (matchId: string) => void;
  onViewProfile: (uid: string) => void;
}

type SocialTab = 'FRIENDS' | 'CLAN' | 'CHAT';

const SocialScreen: React.FC<SocialScreenProps> = (props) => {
  const { player } = props;
  const [activeTab, setActiveTab] = useState<SocialTab>('FRIENDS');

  const [globalChatMessages, setGlobalChatMessages] = useState<ChatMessage[]>([]);
  const [globalChatLoading, setGlobalChatLoading] = useState(true);
  const [globalChatError, setGlobalChatError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToMessages((newMessages) => {
        setGlobalChatMessages(newMessages);
        setGlobalChatLoading(false);
    }, (err) => {
        setGlobalChatError("Could not load chat messages.");
        setGlobalChatLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'FRIENDS':
        return <FriendsScreen player={props.player} onStartSpectating={props.onStartSpectating} onViewProfile={props.onViewProfile} />;
      case 'CLAN':
        return <ClanScreen player={player} />;
      case 'CHAT':
        return <ChatScreen player={player} messages={globalChatMessages} loading={globalChatLoading} chatError={globalChatError} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-center font-bold text-yellow-400">Social Hub</h2>
      <div className="flex border-b-2 border-black mb-4">
        <button
          onClick={() => setActiveTab('FRIENDS')}
          className={`w-1/3 py-2 font-bold text-sm transition-colors ${activeTab === 'FRIENDS' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('CLAN')}
          className={`w-1/3 py-2 font-bold text-sm transition-colors ${activeTab === 'CLAN' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
          Clan
        </button>
        <button
          onClick={() => setActiveTab('CHAT')}
          className={`w-1/3 py-2 font-bold text-sm transition-colors ${activeTab === 'CHAT' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
          Global Chat
        </button>
      </div>
      {renderContent()}
    </div>
  );
};

export default SocialScreen;