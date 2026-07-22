import React, { useState } from 'react';
import Button from './Button';

interface RewardSlot {
  icon: string;
  label: string;
  amount: number;
  type: 'coins' | 'gems' | 'insect';
  insectId?: string;
  color: string;
}

const REWARDS: RewardSlot[] = [
  { icon: '💰', label: 'Coins', amount: 100, type: 'coins', color: '#f59e0b' },
  { icon: '💎', label: 'Gems', amount: 5, type: 'gems', color: '#8b5cf6' },
  { icon: '💰', label: 'Coins', amount: 200, type: 'coins', color: '#10b981' },
  { icon: '🐛', label: 'Worm x3', amount: 3, type: 'insect', insectId: 'I001', color: '#ef4444' },
  { icon: '💰', label: 'Coins', amount: 50, type: 'coins', color: '#3b82f6' },
  { icon: '💎', label: 'Gems', amount: 10, type: 'gems', color: '#ec4899' },
  { icon: '✨', label: 'Glow Worm x2', amount: 2, type: 'insect', insectId: 'I002', color: '#14b8a6' },
  { icon: '💰', label: 'Coins', amount: 500, type: 'coins', color: '#f97316' },
];

interface Props {
  onSpin: () => Promise<{ reward: RewardSlot; index: number }>;
  freeSpinAvailable: boolean;
  onClose: () => void;
}

const RewardWheel: React.FC<Props> = ({ onSpin, freeSpinAvailable, onClose }) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ reward: RewardSlot; index: number } | null>(null);
  const [rotation, setRotation] = useState(0);

  const handleSpin = async () => {
    if (spinning || !freeSpinAvailable) return;
    setSpinning(true);
    setResult(null);

    const res = await onSpin();
    const sectorAngle = 360 / REWARDS.length;
    const targetIndex = res.index;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const totalRotation = rotation + (extraSpins * 360) + (targetIndex * sectorAngle) + 360 - (rotation % 360);
    setRotation(totalRotation);

    setTimeout(() => {
      setResult(res);
      setSpinning(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gradient-to-br from-[#16213e] to-[#0f0c29] border-2 border-yellow-400 p-4 text-center space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-pixel text-xl text-white">🎡 Daily Free Spin</h2>

        <div className="relative w-64 h-64 mx-auto">
          <div
            className="w-full h-full rounded-full border-4 border-yellow-400 relative overflow-hidden transition-all duration-[3000ms] ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {REWARDS.map((r, i) => {
              const angle = (360 / REWARDS.length) * i;
              return (
                <div
                  key={i}
                  className="absolute inset-0 flex items-center justify-start pl-4"
                  style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50% 50%' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white"
                    style={{ background: r.color }}
                    title={r.label}
                  >
                    {r.icon}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full border-4 border-yellow-400 flex items-center justify-center text-2xl shadow-lg z-10">
            🎯
          </div>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-400 z-10" />
        </div>

        {result && !spinning && (
          <div className="p-3 bg-black/50 border-2 border-green-500 rounded-lg animate-pulse">
            <p className="text-green-400 font-bold text-lg">
              {result.reward.icon} {result.reward.amount > 0 ? `+${result.reward.amount} ` : ''}{result.reward.label}!
            </p>
          </div>
        )}

        <Button onClick={handleSpin} disabled={spinning || !freeSpinAvailable} className="w-full">
          {spinning ? 'Spinning...' : freeSpinAvailable ? '🎡 SPIN!' : 'Come back tomorrow!'}
        </Button>

        <button onClick={onClose} className="text-gray-400 text-sm underline">Close</button>
      </div>
    </div>
  );
};

export { REWARDS };
export type { RewardSlot };
export default RewardWheel;
