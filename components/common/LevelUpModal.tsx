import React, { useEffect, useState } from 'react';
import Button from './Button';

interface LevelUpModalProps {
    newLevel: number;
    rewards: { coins?: number; gems?: number };
    onClose: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ newLevel, rewards, onClose }) => {
    const [stage, setStage] = useState<'level' | 'rewards' | 'done'>('level');

    const hasRewards = (rewards.coins ?? 0) > 0 || (rewards.gems ?? 0) > 0;

    useEffect(() => {
        if (!hasRewards) { setStage('done'); return; }
        const t1 = setTimeout(() => setStage('rewards'), 1500);
        const t2 = setTimeout(() => setStage('done'), 3000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [hasRewards]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-gradient-to-b from-yellow-600 to-yellow-900 border-4 border-yellow-400 rounded-2xl p-6 sm:p-10 text-center max-w-sm w-full shadow-[0_0_60px_rgba(250,204,21,0.3)]">
                {stage === 'level' && (
                    <div className="animate-bounce">
                        <span className="text-6xl block mb-4">🎉</span>
                        <h2 className="text-3xl font-black text-white font-pixel" style={{ textShadow: '2px 2px 0 #000' }}>
                            LEVEL UP!
                        </h2>
                        <p className="text-5xl font-black text-yellow-300 mt-2 font-pixel" style={{ textShadow: '3px 3px 0 #000' }}>
                            {newLevel}
                        </p>
                    </div>
                )}
                {stage === 'rewards' && (rewards.coins || rewards.gems) && (
                    <div className="animate-fade-in">
                        <span className="text-5xl block mb-2">🎁</span>
                        <h2 className="text-xl font-bold text-white mb-4 font-pixel">REWARDS</h2>
                        <div className="space-y-2">
                            {rewards.coins !== undefined && rewards.coins > 0 && (
                                <div className="flex items-center justify-center gap-3 bg-yellow-800/60 border border-yellow-500 rounded-xl p-3">
                                    <span className="text-2xl">🪙</span>
                                    <span className="text-2xl font-bold text-yellow-300">+{rewards.coins}</span>
                                </div>
                            )}
                            {rewards.gems !== undefined && rewards.gems > 0 && (
                                <div className="flex items-center justify-center gap-3 bg-purple-800/60 border border-purple-500 rounded-xl p-3">
                                    <span className="text-2xl">💎</span>
                                    <span className="text-2xl font-bold text-purple-300">+{rewards.gems}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {stage === 'done' && (
                    <div>
                        <span className="text-5xl block mb-2">🔥</span>
                        <h2 className="text-lg font-bold text-white mb-4 font-pixel">Keep Climbing!</h2>
                        <Button onClick={onClose} className="w-full !py-3 !text-lg !font-bold">Continue</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LevelUpModal;