import React, { useState, useEffect } from 'react';
import type { Player, Match, MatchPlayer } from '../types';
import Button from './common/Button';
import PlayerAvatar from './common/PlayerAvatar';
import PlayerRankDisplay from './common/PlayerRankDisplay';

interface MatchmakingScreenProps {
  playerData: Player;
  onCancelMatchmaking: () => void;
  foundMatch: Match | null;
  onMatchConfirmed: (match: Match) => void;
}

const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({ playerData, onCancelMatchmaking, foundMatch, onMatchConfirmed }) => {
  const [time, setTime] = useState(0);
  const [matchStage, setMatchStage] = useState<'searching' | 'found'>('searching');

  // Timer for searching
  useEffect(() => {
    if (matchStage !== 'searching') return;
    const timer = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [matchStage]);

  // Effect to handle when a match is found
  useEffect(() => {
    if (foundMatch && matchStage === 'searching') {
      setMatchStage('found');
      // After animations, transition to game
      setTimeout(() => {
        onMatchConfirmed(foundMatch);
      }, 4000); // 4 second VS screen
    }
  }, [foundMatch, onMatchConfirmed, matchStage]);


  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  if (matchStage === 'found' && foundMatch) {
    const opponent = foundMatch.player1.uid === playerData.uid ? foundMatch.player2 : foundMatch.player1;
    return (
        <div className="w-full h-full flex items-center justify-around p-4 relative matchmaking-bg overflow-hidden">
             <style>{`
                @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes vsZoomIn { 
                    0% { transform: scale(0) rotate(-45deg); opacity: 0; }
                    70% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                .animate-slide-in-left { animation: slideInLeft 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                .animate-slide-in-right { animation: slideInRight 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                .animate-vs-zoom { animation: vsZoomIn 1s ease-out 0.5s forwards; opacity: 0; }
             `}</style>
             <div className="matchmaking-grid"></div>

             <div className="relative z-10 flex flex-col items-center animate-slide-in-left">
                <PlayerAvatar 
                    photoURL={playerData.photoURL}
                    uid={playerData.uid}
                    activeBadge={playerData.activeBadge}
                    sizeClassName="w-32 h-32 sm:w-48 sm:h-48"
                    imgClassName="border-4 border-blue-400"
                />
                <h2 className="font-pixel text-xl sm:text-2xl text-blue-300 mt-4">{playerData.displayName}</h2>
                <PlayerRankDisplay player={playerData} className="mt-2" />
             </div>

             <div className="relative z-10 animate-vs-zoom">
                <h1 className="font-pixel text-6xl sm:text-8xl text-white" style={{WebkitTextStroke: '2px #ef4444', textShadow: '0 0 15px #ef4444'}}>VS</h1>
             </div>

              <div className="relative z-10 flex flex-col items-center animate-slide-in-right">
                <PlayerAvatar 
                    photoURL={opponent.photoURL}
                    uid={opponent.uid}
                    activeBadge={opponent.activeBadge}
                    sizeClassName="w-32 h-32 sm:w-48 sm:h-48"
                    imgClassName="border-4 border-red-500"
                />
                <h2 className="font-pixel text-xl sm:text-2xl text-red-400 mt-4">{opponent.displayName}</h2>
                <PlayerRankDisplay player={opponent as Player} className="mt-2" />
             </div>
        </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative matchmaking-bg overflow-hidden">
      <style>{`
            @keyframes radar-sweep {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .radar-sweep::before {
                content: '';
                position: absolute;
                left: 50%;
                top: 50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(to top, transparent 0%, rgba(0, 255, 255, 0.3) 50%, transparent 50%);
                transform-origin: 0% 0%;
                animation: radar-sweep 4s linear infinite;
                z-index: 0;
            }
        `}</style>
      <div className="matchmaking-grid"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center text-center w-full h-full">
        <div className="flex-grow flex flex-col items-center justify-center">
            <h1 className="font-pixel text-2xl sm:text-4xl text-white tracking-wider mb-8 animate-pulse" style={{ textShadow: '0 0 10px #0ff, 0 0 20px #0ff' }}>
                SEARCHING FOR OPPONENT
            </h1>

            <div className="relative flex items-center justify-center mb-6">
                <div className="hexagon radar-sweep overflow-hidden">
                    <div className="hexagon-content">
                        <PlayerAvatar 
                            photoURL={playerData.photoURL}
                            uid={playerData.uid}
                            activeBadge={playerData.activeBadge}
                            sizeClassName="w-24 h-24"
                            imgClassName="border-4 border-black"
                        />
                    </div>
                </div>
            </div>

            <h2 className="font-pixel text-xl text-yellow-300">{playerData.displayName}</h2>
            <PlayerRankDisplay player={playerData} className="mt-2" />

            <div className="mt-8 flex items-baseline gap-6 font-pixel text-lg">
                <div className="text-center">
                    <p className="text-sm text-gray-400">TIME ELAPSED</p>
                    <p className="text-3xl text-white">{formatTime(time)}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-400">ESTIMATED TIME</p>
                    <p className="text-3xl text-gray-500">~00:25</p>
                </div>
            </div>
        </div>

        <div className="w-full max-w-xs pb-8">
            <Button onClick={onCancelMatchmaking} variant="danger" className="w-full !py-4 !text-xl">
                CANCEL
            </Button>
        </div>
      </div>
    </div>
  );
};

export default MatchmakingScreen;