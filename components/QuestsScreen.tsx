
import React, { useState, useEffect } from 'react';
import type { Player } from '../types';
import { useAuth } from '../hooks/useAuth';
import { DAILY_QUESTS } from '../constants';
import * as questService from '../services/questService';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import { toast } from 'react-toastify';
import { Coins } from 'lucide-react';

interface QuestsScreenProps {
  player: Player;
}

const CountdownTimer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
            const diff = endOfDay.getTime() - now.getTime();
            
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return <span className="font-mono text-xs sm:text-sm">{timeLeft}</span>;
}


const QuestsScreen: React.FC<QuestsScreenProps> = ({ player }) => {
    const { user } = useAuth();
    const [claimingId, setClaimingId] = useState<string | null>(null);

    const handleClaim = async (questId: string) => {
        if (!user) return;
        const quest = DAILY_QUESTS.find(q => q.id === questId);
        if (!quest) return;

        setClaimingId(questId);
        try {
            await questService.claimQuestReward(user.uid, quest);
            toast.success(`Claimed ${quest.reward.amount} coins!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setClaimingId(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-col space-y-2">
            <div className="flex justify-between items-center p-2 bg-[#2c2c54] border-2 border-black flex-shrink-0">
                <h2 className="text-base sm:text-lg font-bold text-yellow-400">Daily Missions</h2>
                <div className="text-right">
                    <p className="text-[10px] text-gray-300">Resets in:</p>
                    <CountdownTimer />
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                {DAILY_QUESTS.map(quest => {
                    const progressData = player.quests?.progress[quest.id];
                    const currentProgress = progressData?.progress || 0;
                    const isClaimed = progressData?.claimed || false;
                    const isComplete = currentProgress >= quest.target;
                    const canClaim = isComplete && !isClaimed;
                    const progressPercent = Math.min((currentProgress / quest.target) * 100, 100);

                    return (
                        <div key={quest.id} className="p-3 bg-[#2c2c54] border-2 border-black shadow-[2px_2px_0px_#000000] space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-xs sm:text-sm">{quest.description}</p>
                                <p className="text-xs text-yellow-300 font-bold flex items-center gap-1">{quest.reward.amount} <Coins size={12} /></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-grow w-full bg-black h-4 border-2 border-black p-0.5 relative">
                                    <div 
                                      className="h-full bg-green-500 transition-all duration-300" 
                                      style={{ width: `${progressPercent}%`}}
                                    ></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white" style={{textShadow:'1px 1px 0 #000'}}>{currentProgress} / {quest.target}</span>
                                </div>
                                <Button
                                    onClick={() => handleClaim(quest.id)}
                                    disabled={!canClaim || !!claimingId}
                                    variant={isClaimed ? 'secondary' : 'success'}
                                    className="!py-1 !px-3 !text-[10px] sm:!text-xs min-w-[70px]"
                                >
                                    {claimingId === quest.id ? <Spinner /> : isClaimed ? 'Claimed' : 'Claim'}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuestsScreen;
