
import React, { useState, useEffect, useRef } from 'react';
import type { Player, Clan, RankTier } from '../types';
import { rtdb } from '../services/firebase';
import type firebase from 'firebase/compat/app';
import { Spinner } from './common/Spinner';
import PlayerAvatar from './common/PlayerAvatar';
import { getRankInfo } from '../utils/helpers';
import { FALLBACK_BOT_NAMES } from '../constants';
import { toast } from 'react-toastify';
import { Trophy, Medal, Crown, Zap, Users, Clock, Bot } from 'lucide-react';

type LeaderboardTab = 'players' | 'clans';
type PlayerFilter = 'all-time' | 'weekly' | 'daily';

interface LeaderboardProps {
  onViewProfile: (uid: string) => void;
}

const generateBotPlayers = (): Player[] => {
  const bots: Player[] = [];
  const shuffledNames = [...FALLBACK_BOT_NAMES].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < 100; i++) {
    let rankPoints = 0;
    if (i < 3) {
      rankPoints = 4000 + Math.floor(Math.random() * 500); // Grandmaster
    } else if (i < 10) {
      rankPoints = 3600 + Math.floor(Math.random() * 400); // Master
    } else if (i < 25) {
      rankPoints = 3200 + Math.floor(Math.random() * 400); // Heroic
    } else if (i < 50) {
      rankPoints = 2500 + Math.floor(Math.random() * 700); // Diamond
    } else {
      rankPoints = 1200 + Math.floor(Math.random() * 1300); // Silver/Gold
    }

    const botName = shuffledNames[i % shuffledNames.length];
    const botUid = `bot_${i}_${botName}_${rankPoints}`;

    bots.push({
      uid: botUid,
      displayName: botName,
      photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${botUid}`,
      rankPoints,
      coins: Math.floor(Math.random() * 10000),
      gems: Math.floor(Math.random() * 500),
      level: Math.floor(Math.random() * 50) + 10,
      xp: 0,
      xpToNextLevel: 100,
      clanId: null,
      lastLogin: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7),
      email: null,
      mineCapacity: 0,
      mineLastCollected: 0,
      mineRate: 0,
      nfts: [],
      hasCompletedTutorial: true,
    });
  }
  return bots;
};

const Leaderboard: React.FC<LeaderboardProps> = ({ onViewProfile }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('players');
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('all-time');
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [topClans, setTopClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let ref: firebase.database.Query;
    let listener: (snapshot: firebase.database.DataSnapshot) => void;

    if (activeTab === 'players') {
      const orderBy = playerFilter === 'daily' ? 'dailyRankPoints' : playerFilter === 'weekly' ? 'weeklyRankPoints' : 'rankPoints';
      ref = rtdb.ref('users').orderByChild(orderBy).limitToLast(100);
      listener = (snapshot: firebase.database.DataSnapshot) => {
        const realPlayers: Player[] = [];
        if(snapshot.exists()) {
            snapshot.forEach(child => {
                const player = child.val() as Player;
                if ((player[orderBy as keyof Player] as number || 0) > 0) {
                   realPlayers.push(player);
                }
            });
        }
        
        if (playerFilter === 'all-time') {
            const botPlayers = generateBotPlayers();
            const allPlayers = [...realPlayers, ...botPlayers];
            allPlayers.sort((a, b) => (b.rankPoints || 0) - (a.rankPoints || 0));
            setTopPlayers(allPlayers.slice(0, 100));
        } else {
            realPlayers.sort((a, b) => (b[orderBy as keyof Player] as number || 0) - (a[orderBy as keyof Player] as number || 0));
            setTopPlayers(realPlayers);
        }
        setLoading(false);
      };
    } else { // activeTab === 'clans'
      ref = rtdb.ref('clans').orderByChild('totalRankPoints').limitToLast(10);
      listener = (snapshot: firebase.database.DataSnapshot) => {
        const clans: Clan[] = [];
         if(snapshot.exists()) {
            snapshot.forEach(child => {
                clans.push(child.val());
            });
        }
        setTopClans(clans.reverse());
        setLoading(false);
      };
    }
    
    ref.on('value', listener, (err: Error) => {
        console.error("Leaderboard listener failed:", err);
        setError(`Could not load ${activeTab} leaderboard due to a permission issue.`);
        setLoading(false);
    });
    
    return () => ref.off('value', listener);
  }, [activeTab, playerFilter]);
  
  const renderPlayerList = () => {
    const orderBy = playerFilter === 'daily' ? 'dailyRankPoints' : playerFilter === 'weekly' ? 'weeklyRankPoints' : 'rankPoints';
    const medalIcons = ['🥇', '🥈', '🥉'];
    const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
    
    if (topPlayers.length === 0) return <p className="text-center text-gray-400 py-8">No players found.</p>;

    return (
        <div className="space-y-1">
        {topPlayers.map((player, index) => {
            const { rankName, tier } = getRankInfo(player.rankPoints);
            const score = (player[orderBy as keyof Player] as number) || 0;
            const isBot = player.uid.startsWith('bot_');
            const isTop3 = index < 3;
            const lastActive = player.lastLogin ? Date.now() - player.lastLogin : Infinity;
            const isOnline = !isBot && lastActive < 60000;
            return (
                <div 
                    key={player.uid} 
                    className={`flex items-center justify-between p-2 text-xs transition-all duration-200 cursor-pointer border animate-slide-up
                        ${isTop3 
                            ? 'bg-gradient-to-r from-yellow-900/30 via-yellow-800/20 to-transparent border-yellow-600/30 hover:border-yellow-500/50' 
                            : 'bg-gray-900/80 border-gray-700/50 hover:bg-gray-800 hover:border-gray-500'
                        } ${index === 0 ? 'animate-pulse-glow' : ''}`}
                    onClick={() => onViewProfile(player.uid)}
                    style={{ animationDelay: `${index * 30}ms` }}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs flex-shrink-0
                            ${isTop3 ? 'text-white' : 'text-gray-400'}`}
                            style={isTop3 ? { background: `linear-gradient(135deg, ${['#FFD700', '#C0C0C0', '#CD7F32'][index]}, ${['#FFA500', '#A0A0A0', '#8B4513'][index]})` } : {}}
                        >
                            {index + 1}
                        </div>
                        <PlayerAvatar 
                            photoURL={player.photoURL}
                            uid={player.uid}
                            activeBadge={player.activeBadge}
                            sizeClassName="w-7 h-7"
                            imgClassName="bg-gray-700 border border-black rounded-full"
                            displayName={player.displayName}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <span className="font-bold truncate text-white text-xs">{player.displayName || 'Anonymous'}</span>
                                {isBot && <Bot size={10} className="text-orange-400 flex-shrink-0" title="Bot" />}
                                {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="Online"></span>}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <span>{tier.icon}</span>
                                <span className="truncate">{rankName}</span>
                                <span className="text-gray-600">•</span>
                                <span>Lvl {player.level || 1}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <div className="text-right">
                            <p className="font-bold text-blue-400 text-xs">{score.toLocaleString()}</p>
                            <p className="text-[9px] text-gray-500">RP</p>
                        </div>
                        {isTop3 && <Medal size={16} className={rankColors[index]} />}
                    </div>
                </div>
            );
        })}
        </div>
    );
  };
  
  const renderClanList = () => (
      <ul className="space-y-1">
      {topClans.map((clan, index) => (
        <li key={clan.id} className="flex items-center justify-between p-2 bg-gray-900 border border-gray-700 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`font-bold text-xs w-6 text-center ${index < 3 ? 'text-yellow-400 text-sm' : 'text-gray-400'}`}>{index + 1}</span>
            <div>
                 <p className="font-bold">{clan.name} <span className="text-gray-400">[{clan.tag}]</span></p>
                 <p className="text-[10px] text-gray-500">{clan.memberCount} members</p>
            </div>
          </div>
          <span className="font-semibold text-blue-400 flex items-center gap-1"><Trophy size={12} /> {clan.totalRankPoints} RP</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000]">
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(255,215,0,0.2); }
          50% { box-shadow: 0 0 15px rgba(255,215,0,0.4); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out both; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>
      {/* Tabs Header */}
      <div className="flex-shrink-0 border-b-2 border-black">
          <div className="flex">
            <button 
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'players' ? 'bg-yellow-400 text-black' : 'bg-[#1a1a2e] text-white hover:bg-gray-800'}`}
            >
                Players
            </button>
            <button 
            onClick={() => setActiveTab('clans')}
            className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'clans' ? 'bg-yellow-400 text-black' : 'bg-[#1a1a2e] text-white hover:bg-gray-800'}`}
            >
                Clans
            </button>
          </div>

        {activeTab === 'players' && (
            <div className="flex border-t border-black bg-black/20">
                {['all-time', 'weekly', 'daily'].map((filter) => (
                    <button 
                        key={filter}
                        onClick={() => setPlayerFilter(filter as PlayerFilter)} 
                        className={`flex-1 py-1.5 font-bold text-[10px] sm:text-xs uppercase transition-colors ${playerFilter === filter ? 'text-yellow-400 bg-black/40' : 'text-gray-400 hover:bg-black/20'}`}
                    >
                        {filter}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto p-2">
        {error && <div className="text-center text-red-400 text-sm">{error}</div>}
        {loading ? (
            <div className="flex justify-center p-4"><Spinner /></div>
        ) : !error ? (
            activeTab === 'players' ? renderPlayerList() : renderClanList()
        ) : null}
      </div>
    </div>
  );
};

export default Leaderboard;
