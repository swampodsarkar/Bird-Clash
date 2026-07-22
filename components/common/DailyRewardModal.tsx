import React from 'react';
import Button from './Button';
import { Confetti } from './Confetti';

interface DailyRewardModalProps {
  onClaim: () => void;
  amount: number;
}

const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ onClaim, amount }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
        <Confetti />
        <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes bounce { 
                0%, 100% { transform: translateY(-15%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
                50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
            }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
            .animate-bounce { animation: bounce 1.5s infinite; }
        `}</style>
      <div 
        className="w-full max-w-sm p-6 bg-gradient-to-br from-[#16213e] to-[#0f0c29] border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] text-center space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl drop-shadow-lg animate-bounce">🎁</div>
        
        <h2 className="font-pixel text-3xl text-white" style={{ textShadow: '0 0 10px #fff' }}>
            Daily Reward!
        </h2>
        
        <p className="text-gray-300 text-lg">
            Welcome back! Here's your daily login bonus.
        </p>

        <div className="p-4 bg-black/50 border-2 border-yellow-500/50 rounded-lg">
            <p className="font-pixel text-4xl text-yellow-400">
                + {amount} 💰
            </p>
        </div>
        
        <div className="pt-4">
            <Button onClick={onClaim} className="w-full">
                Claim & Play!
            </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyRewardModal;
