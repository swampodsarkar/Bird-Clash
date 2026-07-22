import React, { useState } from 'react';
import type { Player } from '../../types';
import Button from './Button';
import { Spinner } from './Spinner';
import * as playerService from '../../services/playerService';
import { toast } from 'react-toastify';

interface EventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

const EventsModal: React.FC<EventsModalProps> = ({ isOpen, onClose, player }) => {
    const [claiming, setClaiming] = useState(false);

    if (!isOpen) return null;
    
    const gemsToppedUp = player.eventGemsToppedUp || 0;
    const progress = Math.min((gemsToppedUp / 100) * 100, 100);
    const canClaim = gemsToppedUp >= 100 && !player.eventTopUpRewardClaimed;

    const handleClaim = async () => {
        setClaiming(true);
        try {
            await playerService.claimTopUpEventReward(player.uid);
            toast.success("Angry emote claimed! Check your collection.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setClaiming(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="w-full max-w-4xl h-auto max-h-[85vh] bg-[var(--ff-bg)] border-2 border-[var(--ff-border)] shadow-2xl flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 flex-shrink-0 border-b border-[var(--ff-border)] flex justify-between items-center">
                    <h2 className="font-pixel text-2xl text-yellow-400">EVENTS</h2>
                    <button onClick={onClose} className="text-3xl hover:text-yellow-400">&times;</button>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-grow overflow-y-auto main-content-area p-4">
                    {/* Top-Up Event Card */}
                    <div className="w-full max-w-lg mx-auto p-6 bg-gradient-to-br from-blue-900 to-indigo-900 border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-center space-y-4">
                        <h2 className="font-pixel text-3xl text-white" style={{ textShadow: '0 0 10px #fff, 0 0 20px #60a5fa' }}>
                            Top-Up Event
                        </h2>
                        
                        <div className="p-4 bg-black/50 border-2 border-blue-500/50 rounded-lg">
                            <p className="text-blue-200">
                                Top-up a total of <span className="font-bold text-white">100 Gems</span> to receive an exclusive <span className="font-bold text-white">Angry Emote!</span>
                            </p>
                            <div className="text-6xl my-4">😡</div>
                        </div>

                        <div className="w-full bg-black border-2 border-gray-500 p-1">
                            <div className="h-6 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 relative flex items-center justify-center" style={{ width: `${progress}%` }}>
                                <span className="text-white font-bold text-sm absolute" style={{ textShadow: '1px 1px 2px #000' }}>{gemsToppedUp} / 100</span>
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <Button onClick={handleClaim} disabled={!canClaim || claiming} className="w-full" variant={player.eventTopUpRewardClaimed ? 'secondary' : 'primary'}>
                                {claiming ? <Spinner /> : player.eventTopUpRewardClaimed ? 'Claimed' : 'Claim Reward'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventsModal;