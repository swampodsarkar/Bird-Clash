
import React, { useState } from 'react';
import type { Player } from '../types';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { spinGoldRoyale, spinDiamondRoyale } from '../services/playerService';
import { Spinner } from './common/Spinner';
import { Coins, Gem } from 'lucide-react';

interface LuckRoyaleScreenProps {
  player: Player;
}

const LuckRoyaleScreen: React.FC<LuckRoyaleScreenProps> = ({ player }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState<'gold' | 'diamond'>('gold');
  
  const handleSpin = async () => {
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

  return (
    <div className="w-full h-full flex flex-col space-y-2">
      <style>{`
        @keyframes flash-in {
            0% { opacity: 0; transform: scale(0.8); filter: brightness(3); }
            50% { opacity: 1; transform: scale(1.1); filter: brightness(1.5); }
            100% { opacity: 1; transform: scale(1); filter: brightness(1); }
        }
        .animate-flash-in { animation: flash-in 0.6s ease-out; }
      `}</style>

      {/* Tabs */}
      <div className="flex border-b-2 border-black flex-shrink-0">
        <button 
          onClick={() => setActiveTab('gold')}
          className={`flex-1 py-2 font-bold text-sm transition-colors ${activeTab === 'gold' ? 'bg-yellow-400 text-black' : 'bg-[#1a1a2e] text-white hover:bg-gray-800'}`}
        >
            Gold Royale
        </button>
        <button 
          onClick={() => setActiveTab('diamond')}
          className={`flex-1 py-2 font-bold text-sm transition-colors ${activeTab === 'diamond' ? 'bg-purple-400 text-black' : 'bg-[#1a1a2e] text-white hover:bg-gray-800'}`}
        >
            Diamond Royale
        </button>
      </div>

      <div className="flex-grow flex flex-col sm:flex-row gap-4 p-2 bg-gradient-to-br from-[#16213e] to-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20 opacity-50 pointer-events-none"></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none ${activeTab === 'gold' ? 'bg-yellow-500' : 'bg-purple-500'}`}></div>

        {/* Left Side: Wheel */}
        <div className="flex-1 flex items-center justify-center relative z-10 min-h-[200px]">
             <div 
              className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 shadow-lg flex items-center justify-center transition-transform duration-[4000ms] ease-out ${activeTab === 'gold' ? 'border-yellow-400 bg-yellow-900/50' : 'border-purple-400 bg-purple-900/50'}`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
                <div className={`absolute w-full h-full rounded-full bg-gradient-conic animate-spin ${activeTab === 'gold' ? 'from-yellow-500 via-orange-500 to-yellow-600' : 'from-purple-500 via-pink-500 to-blue-500'}`} style={{ animationDuration: activeTab === 'gold' ? '5s' : '3s' }}></div>
                <span className="z-10 drop-shadow-lg flex items-center justify-center">{activeTab === 'gold' ? <Coins size={64} className="text-yellow-400" /> : <Gem size={64} className="text-purple-400" />}</span>
            </div>
        </div>

        {/* Right Side: Info & Controls */}
        <div className="flex-1 flex flex-col justify-center space-y-4 relative z-10">
            <div className="text-center sm:text-left">
                <h3 className={`text-xl font-bold ${activeTab === 'gold' ? 'text-yellow-400' : 'text-purple-400'}`}>
                    {activeTab === 'gold' ? 'Gold Royale' : 'Diamond Royale'}
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                    {activeTab === 'gold' 
                        ? 'Spin for coins! Guaranteed Epic Bird every 1000 spins.' 
                        : 'Spin for exclusive prizes! Champion NFT Card every 25 spins.'}
                </p>
            </div>

            {/* Progress */}
            <div className="w-full">
                <div className="flex justify-between text-xs mb-1">
                    <span>Milestone Progress</span>
                    <span>{currentProgressCount} / {maxProgress}</span>
                </div>
                <div className="w-full bg-black h-4 border-2 border-black p-0.5">
                    <div className={`h-full ${activeTab === 'gold' ? 'bg-yellow-400' : 'bg-purple-400'}`} style={{width: `${progress}%`}}></div>
                </div>
            </div>

            {/* Action */}
            <div className="space-y-2">
                <Button onClick={handleSpin} disabled={isSpinning} className="w-full !py-3 !text-lg flex items-center justify-center gap-2">
                    {isSpinning ? <Spinner/> : <>Spin for {activeTab === 'gold' ? <Coins size={20} /> : <Gem size={20} />} {currentCost}</>}
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
