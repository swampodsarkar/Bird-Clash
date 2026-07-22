import React, { useState } from 'react';
import type { Player } from '../types';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { spinGoldRoyale, spinDiamondRoyale } from '../services/playerService';
import { rtdb } from '../services/firebase';
import firebase from 'firebase/compat/app';
import { Spinner } from './common/Spinner';
import { Coins, Gem, Gift } from 'lucide-react';

interface LuckRoyaleScreenProps {
  player: Player;
}

const FREE_REWARDS = [
  { icon: '💰', label: '100 Coins', amount: 100, type: 'coins' as const, color: '#f59e0b' },
  { icon: '💎', label: '5 Gems', amount: 5, type: 'gems' as const, color: '#8b5cf6' },
  { icon: '💰', label: '200 Coins', amount: 200, type: 'coins' as const, color: '#10b981' },
  { icon: '🐛', label: 'Worm x3', amount: 3, type: 'insect' as const, insectId: 'I001', color: '#ef4444' },
  { icon: '💰', label: '50 Coins', amount: 50, type: 'coins' as const, color: '#3b82f6' },
  { icon: '💎', label: '10 Gems', amount: 10, type: 'gems' as const, color: '#ec4899' },
  { icon: '✨', label: 'Glow Worm x2', amount: 2, type: 'insect' as const, insectId: 'I002', color: '#14b8a6' },
  { icon: '💰', label: '500 Coins', amount: 500, type: 'coins' as const, color: '#f97316' },
];

const LuckRoyaleScreen: React.FC<LuckRoyaleScreenProps> = ({ player }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState<'free' | 'gold' | 'diamond'>('free');

  const today = new Date().toISOString().split('T')[0];
  const freeSpinAvailable = player.lastFreeSpinDate !== today;

  const handleFreeSpin = async () => {
    if (!user || isSpinning || !freeSpinAvailable) return;
    setIsSpinning(true);
    setLoading(true);
    setError('');
    setResult('');

    const randomIndex = Math.floor(Math.random() * FREE_REWARDS.length);
    const reward = FREE_REWARDS[randomIndex];
    const sectorAngle = 360 / FREE_REWARDS.length;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const totalRotation = rotation + (extraSpins * 360) + (randomIndex * sectorAngle) + 360 - (rotation % 360);
    setRotation(totalRotation);

    setTimeout(async () => {
      try {
        const updates: { [key: string]: any } = {};
        updates[`users/${user.uid}/lastFreeSpinDate`] = today;
        if (reward.type === 'coins') updates[`users/${user.uid}/coins`] = firebase.database.ServerValue.increment(reward.amount);
        else if (reward.type === 'gems') updates[`users/${user.uid}/gems`] = firebase.database.ServerValue.increment(reward.amount);
        else if (reward.type === 'insect' && reward.insectId) updates[`users/${user.uid}/inventory/insects/${reward.insectId}`] = firebase.database.ServerValue.increment(reward.amount);
        await rtdb.ref().update(updates);
        setResult(`You won ${reward.label}! ${reward.icon}`);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
        setIsSpinning(false);
      }
    }, 4000);
  };

  const handlePaidSpin = async () => {
    if (!user || isSpinning) return;
    const spinFunction = activeTab === 'gold' ? spinGoldRoyale : spinDiamondRoyale;
    const cost = activeTab === 'gold' ? 100 : 9 * Math.pow(2, player.diamondSpins || 0);
    const currency = activeTab === 'gold' ? 'coins' : 'gems';

    if (player[currency] < cost) {
      setError(`Not enough ${currency}! You need ${cost}.`);
      return;
    }

    setIsSpinning(true);
    setLoading(true);
    setError('');
    setResult('');

    const fullSpins = Math.floor(Math.random() * 3) + 5;
    const newRotation = rotation + (fullSpins * 360);
    setRotation(newRotation);

    setTimeout(async () => {
      try {
        const spinResult = await spinFunction(user.uid);
        setResult(spinResult.message);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
        setIsSpinning(false);
      }
    }, 4000);
  };

  const goldSpins = player.goldSpins || 0;
  const diamondSpins = player.diamondSpins || 0;
  const currentCost = activeTab === 'gold' ? 100 : 9 * Math.pow(2, diamondSpins);
  const progress = activeTab === 'gold' ? (goldSpins % 1000) / 10 : (diamondSpins % 25) * 4;
  const maxProgress = activeTab === 'gold' ? 1000 : 25;
  const currentProgressCount = activeTab === 'gold' ? goldSpins % 1000 : diamondSpins % 25;

  const wheelColors = activeTab === 'free' ? 'from-green-400 via-emerald-500 to-teal-600' : activeTab === 'gold' ? 'from-yellow-500 via-orange-500 to-yellow-600' : 'from-purple-500 via-pink-500 to-blue-500';
  const themeColor = activeTab === 'free' ? 'text-green-400' : activeTab === 'gold' ? 'text-yellow-400' : 'text-purple-400';
  const borderColor = activeTab === 'free' ? 'border-green-400' : activeTab === 'gold' ? 'border-yellow-400' : 'border-purple-400';

  return (
    <div className="w-full h-full flex flex-col space-y-2">
      <style>{`
        @keyframes flash-in {
            0% { opacity: 0; transform: scale(0.8); filter: brightness(3); }
            50% { opacity: 1; transform: scale(1.1); filter: brightness(1.5); }
            100% { opacity: 1; transform: scale(1); filter: brightness(1); }
        }
        .animate-flash-in { animation: flash-in 0.6s ease-out; }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 5px rgba(74,222,128,0.3); }
            50% { box-shadow: 0 0 20px rgba(74,222,128,0.6); }
        }
        .glow-free { animation: pulse-glow 2s infinite; }
      `}</style>

      {/* Tabs */}
      <div className="flex border-b-2 border-black flex-shrink-0">
        <button
          onClick={() => setActiveTab('free')}
          className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'free' ? 'bg-green-400 text-black' : 'bg-[#1a1a2e] text-white hover:bg-gray-800'}`}
        >
          🎡 Daily Free
        </button>
        <button
          onClick={() => setActiveTab('gold')}
          className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'gold' ? 'bg-yellow-400 text-black' : 'bg-[#1a1a2e] text-white hover:bg-gray-800'}`}
        >
          Gold Royale
        </button>
        <button
          onClick={() => setActiveTab('diamond')}
          className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'diamond' ? 'bg-purple-400 text-black' : 'bg-[#1a1a2e] text-white hover:bg-gray-800'}`}
        >
          Diamond Royale
        </button>
      </div>

      <div className={`flex-grow flex flex-col sm:flex-row gap-4 p-2 bg-gradient-to-br from-[#16213e] to-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] relative overflow-hidden ${activeTab === 'free' && freeSpinAvailable ? 'glow-free' : ''}`}>
        <div className="absolute inset-0 bg-black/20 opacity-50 pointer-events-none"></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none ${activeTab === 'free' ? 'bg-green-500' : activeTab === 'gold' ? 'bg-yellow-500' : 'bg-purple-500'}`}></div>

        {/* Left: Wheel */}
        <div className="flex-1 flex items-center justify-center relative z-10 min-h-[200px]">
          <div
            className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 ${borderColor} shadow-lg flex items-center justify-center transition-transform duration-[4000ms] ease-out ${activeTab === 'free' ? 'bg-green-900/50' : activeTab === 'gold' ? 'bg-yellow-900/50' : 'bg-purple-900/50'}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {activeTab === 'free' ? (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {FREE_REWARDS.map((r, i) => {
                  const angle = (360 / FREE_REWARDS.length) * i;
                  return (
                    <div key={i} className="absolute inset-0 flex items-center justify-start pl-3 sm:pl-4" style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50% 50%' }}>
                      <span className="text-xl sm:text-2xl drop-shadow-lg">{r.icon}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`absolute w-full h-full rounded-full bg-gradient-conic ${wheelColors}`} style={{ animationDuration: activeTab === 'gold' ? '5s' : '3s' }}></div>
            )}
            <span className="z-10 drop-shadow-lg flex items-center justify-center">
              {activeTab === 'free' ? <Gift size={48} className="text-green-400" /> : activeTab === 'gold' ? <Coins size={64} className="text-yellow-400" /> : <Gem size={64} className="text-purple-400" />}
            </span>
            {/* Arrow indicator */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-white z-10 drop-shadow-lg" />
          </div>
        </div>

        {/* Right: Info & Controls */}
        <div className="flex-1 flex flex-col justify-center space-y-3 relative z-10">
          <div className="text-center sm:text-left">
            <h3 className={`text-xl font-bold ${themeColor}`}>
              {activeTab === 'free' ? '🎡 Daily Free Spin' : activeTab === 'gold' ? 'Gold Royale' : 'Diamond Royale'}
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              {activeTab === 'free'
                ? 'Free spin every day! Win coins, gems & insects.'
                : activeTab === 'gold'
                  ? 'Spin for coins! Guaranteed Epic Bird every 1000 spins.'
                  : 'Spin for exclusive prizes! Champion NFT Card every 25 spins.'}
            </p>
          </div>

          {/* Free spin: show rewards table */}
          {activeTab === 'free' && (
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {FREE_REWARDS.map((r, i) => (
                <div key={i} className="flex items-center gap-1 bg-black/40 p-1 rounded border border-green-500/20">
                  <span>{r.icon}</span>
                  <span className="text-gray-300">{r.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Progress bar for paid spins */}
          {activeTab !== 'free' && (
            <div className="w-full">
              <div className="flex justify-between text-xs mb-1">
                <span>Milestone Progress</span>
                <span>{currentProgressCount} / {maxProgress}</span>
              </div>
              <div className="w-full bg-black h-4 border-2 border-black p-0.5">
                <div className={`h-full ${activeTab === 'gold' ? 'bg-yellow-400' : 'bg-purple-400'}`} style={{width: `${progress}%`}}></div>
              </div>
            </div>
          )}

          {/* Action */}
          <div className="space-y-2">
            <Button
              onClick={activeTab === 'free' ? handleFreeSpin : handlePaidSpin}
              disabled={isSpinning || (activeTab === 'free' && !freeSpinAvailable)}
              className={`w-full !py-3 !text-lg flex items-center justify-center gap-2 ${activeTab === 'free' && freeSpinAvailable ? '!bg-green-600 !border-green-400 hover:!bg-green-700' : ''}`}
            >
              {isSpinning ? <Spinner /> : activeTab === 'free'
                ? (freeSpinAvailable ? '🎡 FREE SPIN' : '✅ Come back tomorrow!')
                : <>Spin for {activeTab === 'gold' ? <Coins size={20} /> : <Gem size={20} />} {currentCost}</>}
            </Button>

            <div className="h-8 flex items-center justify-center">
              {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
              {result && !loading && <p className="text-green-300 text-sm font-semibold animate-flash-in">{result}</p>}
              {loading && isSpinning && <p className="text-gray-400 text-xs">Spinning...</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuckRoyaleScreen;
