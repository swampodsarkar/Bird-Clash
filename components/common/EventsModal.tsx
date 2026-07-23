import React, { useState, useEffect } from 'react';
import type { Player, LimitedEvent } from '../../types';
import Button from './Button';
import { Spinner } from './Spinner';
import * as playerService from '../../services/playerService';
import * as eventService from '../../services/eventService';
import { toast } from 'react-toastify';
import { rtdb } from '../../services/firebase';

interface EventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

const Countdown: React.FC<{ endTime: number }> = ({ endTime }) => {
    const [display, setDisplay] = useState('');
    useEffect(() => {
        const update = () => {
            const diff = endTime - Date.now();
            if (diff <= 0) { setDisplay('Ended'); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if (d > 0) setDisplay(`${d}d ${h}h`);
            else if (h > 0) setDisplay(`${h}h ${m}m`);
            else setDisplay(`${m}m ${s}s`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [endTime]);
    return <span className="text-xs text-yellow-300 font-bold">{display}</span>;
};

const EventsModal: React.FC<EventsModalProps> = ({ isOpen, onClose, player }) => {
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [events, setEvents] = useState<LimitedEvent[]>([]);
    const [eventProgress, setEventProgress] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (!isOpen) return;
        const unsub = eventService.listenToEvents(fetched => setEvents(fetched));
        const progressRef = rtdb.ref(`users/${player.uid}/eventProgress`);
        const progressListener = progressRef.on('value', snapshot => {
            if (snapshot.exists()) {
                setEventProgress(snapshot.val());
            }
        });
        return () => {
            unsub();
            progressRef.off('value', progressListener);
        };
    }, [isOpen, player.uid]);

    if (!isOpen) return null;

    const gemsToppedUp = player.eventGemsToppedUp || 0;
    const topUpProgress = Math.min((gemsToppedUp / 100) * 100, 100);
    const canClaimTopUp = gemsToppedUp >= 100 && !player.eventTopUpRewardClaimed;

    const handleClaimTopUp = async () => {
        setClaimingId('topup');
        try {
            await playerService.claimTopUpEventReward(player.uid);
            toast.success("Angry emote claimed! Check your collection.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setClaimingId(null);
        }
    };

    const handleClaimEvent = async (event: LimitedEvent) => {
        setClaimingId(event.id);
        try {
            await eventService.claimEventReward(player.uid, event.id, event);
            toast.success(`Reward claimed: ${event.title}!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setClaimingId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="w-full max-w-4xl h-auto max-h-[85vh] bg-[var(--ff-bg)] border-2 border-[var(--ff-border)] shadow-2xl flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 flex-shrink-0 border-b border-[var(--ff-border)] flex justify-between items-center">
                    <h2 className="font-pixel text-2xl text-yellow-400">EVENTS</h2>
                    <button onClick={onClose} className="text-3xl hover:text-yellow-400">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto main-content-area p-4 space-y-4">
                    {events.length === 0 && !canClaimTopUp && (
                        <p className="text-center text-gray-400 py-8">No active events right now.</p>
                    )}

                    {/* Top-Up Event Card */}
                    <div className="w-full max-w-lg mx-auto p-6 bg-gradient-to-br from-blue-900 to-indigo-900 border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-center space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="font-pixel text-2xl text-white" style={{ textShadow: '0 0 10px #fff, 0 0 20px #60a5fa' }}>
                                Top-Up Event
                            </h2>
                            <span className="text-yellow-300 text-sm font-bold">🔥 Permanent</span>
                        </div>
                        <div className="p-4 bg-black/50 border-2 border-blue-500/50 rounded-lg">
                            <p className="text-blue-200">
                                Top-up a total of <span className="font-bold text-white">100 Gems</span> to receive an exclusive <span className="font-bold text-white">Angry Emote!</span>
                            </p>
                            <div className="text-6xl my-4">😡</div>
                        </div>
                        <div className="w-full bg-black border-2 border-gray-500 p-1">
                            <div className="h-6 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 relative flex items-center justify-center" style={{ width: `${topUpProgress}%` }}>
                                <span className="text-white font-bold text-sm absolute" style={{ textShadow: '1px 1px 2px #000' }}>{gemsToppedUp} / 100</span>
                            </div>
                        </div>
                        <div className="pt-4">
                            <Button onClick={handleClaimTopUp} disabled={!canClaimTopUp || claimingId === 'topup'} className="w-full" variant={player.eventTopUpRewardClaimed ? 'secondary' : 'primary'}>
                                {claimingId === 'topup' ? <Spinner /> : player.eventTopUpRewardClaimed ? 'Claimed' : 'Claim Reward'}
                            </Button>
                        </div>
                    </div>

                    {/* Limited Events */}
                    {events.map(event => {
                        const progress = eventProgress[event.id] || 0;
                        const target = event.condition?.target || 1;
                        const pct = Math.min((progress / target) * 100, 100);
                        const claimed = false; // Will be checked by claim function
                        const rewardLabel = event.reward?.type === 'coins' ? `${event.reward.amount} Coins` :
                            event.reward?.type === 'gems' ? `${event.reward.amount} Gems` :
                            event.reward?.type === 'bird' ? `${event.reward.itemId} Bird` :
                            event.reward?.type === 'insect' ? `${event.reward.amount}x ${event.reward.itemId}` : 'Reward';

                        return (
                            <div key={event.id} className="w-full max-w-lg mx-auto p-5 bg-gradient-to-br from-purple-900 to-indigo-900 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] rounded-lg space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl">{event.icon}</span>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{event.title}</h3>
                                            <p className="text-xs text-purple-200">{event.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Countdown endTime={event.endTime} />
                                        <p className="text-[10px] text-gray-400">left</p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-purple-200">
                                    <span>Activity: {event.condition?.type} x{target}</span>
                                    <span>Reward: {rewardLabel}</span>
                                </div>
                                <div className="w-full bg-black border-2 border-gray-600 p-1">
                                    <div className="h-5 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 relative flex items-center justify-center" style={{ width: `${pct}%` }}>
                                        <span className="text-white font-bold text-[10px] absolute drop-shadow-md">{progress} / {target}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleClaimEvent(event)}
                                    disabled={progress < target || claimingId === event.id}
                                    className="w-full"
                                    variant={claimed ? 'secondary' : 'primary'}
                                >
                                    {claimingId === event.id ? <Spinner /> : progress >= target ? 'Claim Reward' : 'In Progress'}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default EventsModal;