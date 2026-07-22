import React from 'react';
import Button from './Button';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardType: 'coins' | 'gems' | 'title';
  rewardAmount?: number;
  rewardTitle?: string;
  condition: (stats: { totalMatches: number; totalWins: number; totalDamage: number; rankPoints: number; ownedBirdsCount: number; consecutiveWins: number; totalSpins: number }) => boolean;
}

interface Props {
  achievement: Achievement;
  onClose: () => void;
}

const AchievementModal: React.FC<Props> = ({ achievement, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm p-6 bg-gradient-to-br from-[#16213e] to-[#0f0c29] border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] text-center space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl animate-bounce">{achievement.icon}</div>
        <h2 className="font-pixel text-2xl text-white">Achievement Unlocked!</h2>
        <div className="p-4 bg-black/50 border-2 border-yellow-500/50 rounded-lg space-y-2">
          <h3 className="text-xl font-bold text-yellow-400">{achievement.title}</h3>
          <p className="text-gray-300 text-sm">{achievement.description}</p>
          <div className="text-lg font-bold">
            {achievement.rewardType === 'coins' && <span className="text-yellow-400">+{achievement.rewardAmount} Coins</span>}
            {achievement.rewardType === 'gems' && <span className="text-purple-400">+{achievement.rewardAmount} Gems</span>}
            {achievement.rewardType === 'title' && <span className="text-blue-400">Title: {achievement.rewardTitle}</span>}
          </div>
        </div>
        <Button onClick={onClose} className="w-full">Awesome!</Button>
      </div>
    </div>
  );
};

export default AchievementModal;
