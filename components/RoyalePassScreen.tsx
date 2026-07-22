
import React, { useState, useMemo } from 'react';
import type { Player, RoyalePassTier } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useContentConfig } from '../hooks/useContentConfig';
import { activateRoyalePass, claimRoyalePassReward } from '../services/playerService';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import { toast } from 'react-toastify';

interface RoyalePassScreenProps {
    player: Player;
}

const RoyalePassScreen: React.FC<RoyalePassScreenProps> = ({ player }) => {
    const { user } = useAuth();
    const { royalePassTiers, loading: contentLoading } = useContentConfig();
    const [loadingAction, setLoadingAction] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    const playerPass = player.royalePass;

    const handleActivatePass = async () => {
        if (!user) return;
        if (!window.confirm("Activate the premium Royale Pass for 500 gems?")) return;
        setLoadingAction(true);
        try {
            await activateRoyalePass(user.uid);
            toast.success("Royale Pass Activated!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoadingAction(false);
        }
    };

    const handleClaim = async (tier: RoyalePassTier, rewardType: 'free' | 'premium') => {
        if (!user) return;
        const reward = rewardType === 'free' ? tier.freeReward : tier.premiumReward;
        if (!reward) return;

        setClaimingId(`${tier.id}-${rewardType}`);
        try {
            await claimRoyalePassReward(user.uid, tier.level, reward, rewardType);
            toast.success(`Claimed ${reward.name || 'reward'}!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setClaimingId(null);
        }
    };
    
    const { currentLevel, totalXpForNextLevel, xpInCurrentLevel, xpForNextLevel } = useMemo(() => {
        if (!playerPass || royalePassTiers.length === 0) {
            return { currentLevel: 1, xpForNextLevel: 100, xpInCurrentLevel: 0, totalXpForNextLevel: 100 };
        }
        
        let level = 1;
        let totalXpForLevel = 0;
        for (const tier of royalePassTiers) {
            if (playerPass.xp >= tier.xp) {
                level = tier.level;
                totalXpForLevel = tier.xp;
            } else {
                break;
            }
        }
        
        const nextTier = royalePassTiers.find(t => t.level === level + 1);
        const totalXpForNext = nextTier ? nextTier.xp : totalXpForLevel;
        const xpForLevelVal = totalXpForNext - totalXpForLevel;
        const xpInLevel = playerPass.xp - totalXpForLevel;

        return { currentLevel: level, xpForNextLevel: xpForLevelVal, xpInCurrentLevel: xpInLevel, totalXpForNextLevel: totalXpForNext };
    }, [playerPass, royalePassTiers]);
    

    if (contentLoading) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }
    
    if (!playerPass) {
        return <div className="p-8 text-center">Royale Pass data not available. Please try again later.</div>
    }

    const progressPercent = totalXpForNextLevel > playerPass.xp ? (xpInCurrentLevel / xpForNextLevel) * 100 : 100;

    return (
        <div className="w-full h-full flex flex-col space-y-2">
            <h2 className="text-xl text-center font-bold text-yellow-400 flex-shrink-0" style={{ textShadow: '2px 2px 0 #000' }}>Royale Pass</h2>
            
            {/* Progress and Activation - Fixed at top */}
            <div className="p-2 sm:p-3 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <span className="px-2 py-1 bg-black border-2 border-yellow-400 text-sm font-bold">LVL {currentLevel}</span>
                    {!playerPass.hasPremium ? (
                        <Button onClick={handleActivatePass} disabled={loadingAction} variant="success" className="!py-1 !px-2 !text-xs">
                            {loadingAction ? <Spinner /> : 'Activate 💎 500'}
                        </Button>
                    ) : <span className="text-purple-300 font-bold text-sm">PREMIUM ACTIVE</span>}
                </div>
                <div className="w-full bg-black h-4 border-2 border-black p-0.5">
                    <div className="h-full bg-yellow-400 transition-all duration-500 relative" style={{ width: `${progressPercent}%` }}>
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black text-[9px] font-bold whitespace-nowrap">{playerPass.xp} / {totalXpForNextLevel} XP</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Tiers List */}
            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                {royalePassTiers.map(tier => {
                    const isUnlocked = playerPass.xp >= tier.xp;
                    const isFreeClaimed = playerPass.claimedRewards?.[tier.level]?.includes('free');
                    const isPremiumClaimed = playerPass.claimedRewards?.[tier.level]?.includes('premium');
                    const canClaimFree = isUnlocked && tier.freeReward && !isFreeClaimed;
                    const canClaimPremium = isUnlocked && tier.premiumReward && !isPremiumClaimed && playerPass.hasPremium;

                    return (
                        <div key={tier.id} className={`p-1 border-2 border-black grid grid-cols-6 items-center gap-1 ${isUnlocked ? 'bg-gray-800/80' : 'bg-gray-900/50'}`}>
                            <div className="col-span-1 text-center font-bold text-sm p-1 bg-black border border-gray-600">
                                {tier.level}
                            </div>
                            {/* Free Reward */}
                            <div className={`col-span-2 p-1 border border-black text-center ${isUnlocked ? 'bg-yellow-800/30' : 'bg-gray-800/30'}`}>
                                <p className="text-[9px] text-yellow-300 uppercase">Free</p>
                                {tier.freeReward ? (
                                    <div className="flex flex-col items-center">
                                        <p className="text-xl">{tier.freeReward.icon}</p>
                                        <Button onClick={() => handleClaim(tier, 'free')} disabled={!canClaimFree || !!claimingId} className="!text-[9px] !py-0.5 !px-1 mt-1 w-full max-w-[60px]">
                                            {claimingId === `${tier.id}-free` ? <Spinner/> : isFreeClaimed ? 'Claimed' : 'Claim'}
                                        </Button>
                                    </div>
                                ) : <p className="text-gray-500 text-[9px] py-1">Empty</p>}
                            </div>
                            {/* Premium Reward */}
                            <div className={`col-span-3 p-1 border border-black text-center ${playerPass.hasPremium ? 'border-purple-400 bg-purple-900/30' : 'bg-gray-800/30'}`}>
                                <p className="text-[9px] text-purple-300 uppercase">Premium</p>
                                {tier.premiumReward ? (
                                     <div className="flex flex-col items-center">
                                        <p className="text-xl">{tier.premiumReward.icon}</p>
                                        <Button onClick={() => handleClaim(tier, 'premium')} disabled={!canClaimPremium || !!claimingId} className="!text-[9px] !py-0.5 !px-1 mt-1 w-full max-w-[60px]">
                                            {claimingId === `${tier.id}-premium` ? <Spinner/> : isPremiumClaimed ? 'Claimed' : playerPass.hasPremium ? 'Claim' : 'Locked'}
                                        </Button>
                                    </div>
                                ) : <p className="text-gray-500 text-[9px] py-1">Empty</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RoyalePassScreen;
