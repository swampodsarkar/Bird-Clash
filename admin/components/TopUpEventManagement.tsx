
import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { BIRD_DEFINITIONS } from '../../constants';

interface TopUpEvent {
    id: string;
    diamondAmount: number;
    rewardType: 'bird' | 'emote';
    rewardItemId: string;
    rewardName: string;
    rewardIcon: string;
    expiresAt: number;
    createdAt: number;
}

const TopUpEventManagement: React.FC = () => {
    const [events, setEvents] = useState<TopUpEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [diamondAmount, setDiamondAmount] = useState(100);
    const [rewardType, setRewardType] = useState<'bird' | 'emote'>('bird');
    const [rewardItemId, setRewardItemId] = useState('');
    const [expiryDays, setExpiryDays] = useState(7);
    const [expiryHours, setExpiryHours] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const eventsRef = rtdb.ref('topUpEvents');
        const listener = eventsRef.on('value', snapshot => {
            const data: TopUpEvent[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            data.sort((a, b) => b.createdAt - a.createdAt);
            setEvents(data);
            setLoading(false);
        });
        return () => eventsRef.off('value', listener);
    }, []);

    const birdOptions = Object.entries(BIRD_DEFINITIONS).map(([id, def]) => ({
        id,
        name: def.name,
        icon: def.icon,
        rarity: def.rarity,
    }));

    const emoteOptions = [
        { id: 'emote_angry', name: 'Angry', icon: '😠' },
        { id: 'emote_laugh', name: 'Laugh', icon: '😂' },
        { id: 'emote_cry', name: 'Cry', icon: '😭' },
        { id: 'emote_love', name: 'Love', icon: '😍' },
        { id: 'emote_wow', name: 'Wow', icon: '😮' },
        { id: 'emote_clap', name: 'Clap', icon: '👏' },
    ];

    const selectedRewardName = rewardType === 'bird'
        ? birdOptions.find(b => b.id === rewardItemId)?.name || ''
        : emoteOptions.find(e => e.id === rewardItemId)?.name || '';

    const selectedRewardIcon = rewardType === 'bird'
        ? birdOptions.find(b => b.id === rewardItemId)?.icon || ''
        : emoteOptions.find(e => e.id === rewardItemId)?.icon || '';

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!diamondAmount || diamondAmount <= 0) {
            toast.error('Please enter a valid diamond amount.');
            return;
        }
        if (!rewardItemId) {
            toast.error('Please select a reward.');
            return;
        }

        const expiresAt = Date.now() + expiryDays * 86400000 + expiryHours * 3600000;

        setSaving(true);
        try {
            await rtdb.ref('topUpEvents').push({
                diamondAmount,
                rewardType,
                rewardItemId,
                rewardName: selectedRewardName,
                rewardIcon: selectedRewardIcon,
                expiresAt,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
            });
            toast.success('Top-Up event created!');
            setDiamondAmount(100);
            setRewardType('bird');
            setRewardItemId('');
            setExpiryDays(7);
            setExpiryHours(0);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('Delete this top-up event?')) return;
        try {
            await rtdb.ref(`topUpEvents/${id}`).remove();
            toast.success('Event deleted.');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const getTimeRemaining = (expiresAt: number): string => {
        const diff = expiresAt - Date.now();
        if (diff <= 0) return 'Expired';
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Create Top-Up Event</h2>
                <form onSubmit={handleAddEvent} className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-300 block mb-1">Diamond Amount to Top-Up</label>
                        <input
                            type="number"
                            value={diamondAmount}
                            onChange={e => setDiamondAmount(Number(e.target.value))}
                            min={1}
                            className="pixel-input w-full"
                            placeholder="e.g., 100"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-300 block mb-1">Reward Type</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setRewardType('bird'); setRewardItemId(''); }}
                                className={`px-4 py-2 rounded-md font-bold text-sm border-2 transition-all ${
                                    rewardType === 'bird'
                                        ? 'bg-indigo-600 border-indigo-400 text-white'
                                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                🐦 Bird
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRewardType('emote'); setRewardItemId(''); }}
                                className={`px-4 py-2 rounded-md font-bold text-sm border-2 transition-all ${
                                    rewardType === 'emote'
                                        ? 'bg-indigo-600 border-indigo-400 text-white'
                                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                😀 Emote
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-300 block mb-1">
                            Select {rewardType === 'bird' ? 'Bird' : 'Emote'}
                        </label>
                        {rewardType === 'bird' ? (
                            <select
                                value={rewardItemId}
                                onChange={e => setRewardItemId(e.target.value)}
                                className="pixel-input w-full"
                            >
                                <option value="">-- Select Bird --</option>
                                {birdOptions.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.icon} {b.name} ({b.rarity})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={rewardItemId}
                                onChange={e => setRewardItemId(e.target.value)}
                                className="pixel-input w-full"
                            >
                                <option value="">-- Select Emote --</option>
                                {emoteOptions.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.icon} {e.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-300 block mb-1">Expiry (Days)</label>
                            <input
                                type="number"
                                value={expiryDays}
                                onChange={e => setExpiryDays(Math.max(1, Number(e.target.value)))}
                                min={1}
                                className="pixel-input w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-300 block mb-1">Expiry (Hours)</label>
                            <input
                                type="number"
                                value={expiryHours}
                                onChange={e => setExpiryHours(Math.max(0, Math.min(23, Number(e.target.value))))}
                                min={0}
                                max={23}
                                className="pixel-input w-full"
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={saving}>
                        {saving ? 'Creating...' : 'Create Event'}
                    </Button>
                </form>
            </div>

            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Active Top-Up Events</h2>
                {loading ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                ) : events.length === 0 ? (
                    <p className="text-gray-400">No top-up events created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {events.map(event => {
                            const isExpired = event.expiresAt <= Date.now();
                            return (
                                <div
                                    key={event.id}
                                    className={`p-4 border-2 border-black rounded-lg flex items-center justify-between ${
                                        isExpired ? 'bg-gray-900/50 opacity-60' : 'bg-gray-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{event.rewardIcon}</span>
                                        <div>
                                            <p className="font-semibold">
                                                Top-Up {event.diamondAmount} 💎
                                            </p>
                                            <p className="text-sm text-gray-300">
                                                Reward: {event.rewardName} ({event.rewardType})
                                            </p>
                                            <p className={`text-xs ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                                                {isExpired ? 'Expired' : `${getTimeRemaining(event.expiresAt)} remaining`}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        variant="danger"
                                        className="!py-1 !px-2 !text-xs"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopUpEventManagement;
