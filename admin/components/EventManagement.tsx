
import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import type { LimitedEvent } from '../../types';

const defaultForm = {
    title: '',
    description: '',
    icon: '🎉',
    type: 'special_battle' as LimitedEvent['type'],
    rewardType: 'coins' as LimitedEvent['reward']['type'],
    rewardAmount: 100,
    rewardItemId: '',
    conditionType: 'matches' as LimitedEvent['condition']['type'],
    conditionTarget: 5,
    startDate: '',
    endDate: '',
    active: true,
};

const EventManagement: React.FC = () => {
    const [events, setEvents] = useState<LimitedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const ref = rtdb.ref('limitedEvents');
        const listener = ref.on('value', snapshot => {
            const data: LimitedEvent[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            data.sort((a, b) => b.startTime - a.startTime);
            setEvents(data);
            setLoading(false);
        });
        return () => ref.off('value', listener);
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.startDate || !form.endDate) {
            toast.error('Title, start date, and end date are required.');
            return;
        }
        const startTime = new Date(form.startDate).getTime();
        const endTime = new Date(form.endDate).getTime();
        if (endTime <= startTime) {
            toast.error('End time must be after start time.');
            return;
        }
        setSaving(true);
        try {
            await rtdb.ref('limitedEvents').push({
                title: form.title,
                description: form.description,
                icon: form.icon,
                type: form.type,
                startTime,
                endTime,
                active: form.active,
                reward: {
                    type: form.rewardType,
                    amount: form.rewardType !== 'bird' ? form.rewardAmount : undefined,
                    itemId: form.rewardItemId || undefined,
                },
                condition: {
                    type: form.conditionType,
                    target: form.conditionTarget,
                },
                createdAt: firebase.database.ServerValue.TIMESTAMP,
            });
            toast.success('Event created!');
            setForm(defaultForm);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await rtdb.ref(`limitedEvents/${id}`).remove();
            await rtdb.ref(`eventClaims`).child(id).remove();
            toast.success('Event deleted.');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleToggleActive = async (event: LimitedEvent) => {
        try {
            await rtdb.ref(`limitedEvents/${event.id}/active`).set(!event.active);
            toast.success(`Event ${event.active ? 'deactivated' : 'activated'}.`);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const isExpired = (endTime: number) => endTime <= Date.now();

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-gray-800 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Create Limited Event</h2>
                <form onSubmit={handleCreate} className="space-y-3 text-sm">
                    <input name="title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event Title" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <textarea name="description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Event Description" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="grid grid-cols-2 gap-2">
                        <input name="icon" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="Icon (emoji)" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <select name="type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="special_battle">Special Battle</option>
                            <option value="bonus_coins">Bonus Coins</option>
                            <option value="bonus_gems">Bonus Gems</option>
                            <option value="double_xp">Double XP</option>
                            <option value="special_bird">Special Bird</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Start Date/Time</label>
                            <input type="datetime-local" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">End Date/Time</label>
                            <input type="datetime-local" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                        </div>
                    </div>
                    <fieldset className="p-2 border border-gray-600">
                        <legend className="text-xs px-1">Condition (what player must do)</legend>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <select value={form.conditionType} onChange={e => setForm(p => ({ ...p, conditionType: e.target.value as any }))} className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md">
                                <option value="matches">Play Matches</option>
                                <option value="wins">Win Matches</option>
                                <option value="damage">Deal Damage</option>
                            </select>
                            <input type="number" value={form.conditionTarget} onChange={e => setForm(p => ({ ...p, conditionTarget: Number(e.target.value) }))} min={1} placeholder="Target" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md" />
                        </div>
                    </fieldset>
                    <fieldset className="p-2 border border-gray-600">
                        <legend className="text-xs px-1">Reward</legend>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            <select value={form.rewardType} onChange={e => setForm(p => ({ ...p, rewardType: e.target.value as any, rewardItemId: '' }))} className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md">
                                <option value="coins">Coins</option>
                                <option value="gems">Gems</option>
                                <option value="bird">Bird</option>
                                <option value="insect">Insect</option>
                            </select>
                            {form.rewardType !== 'bird' && (
                                <input type="number" value={form.rewardAmount} onChange={e => setForm(p => ({ ...p, rewardAmount: Number(e.target.value) }))} min={1} placeholder="Amount" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md col-span-2" />
                            )}
                            {form.rewardType === 'bird' && (
                                <input value={form.rewardItemId} onChange={e => setForm(p => ({ ...p, rewardItemId: e.target.value }))} placeholder="Bird ID (e.g. B005)" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md col-span-2" />
                            )}
                        </div>
                    </fieldset>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="w-4 h-4" />
                        <span className="text-sm">Active on creation</span>
                    </label>
                    <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Event'}</Button>
                </form>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">All Limited Events</h2>
                {loading ? <Spinner /> : events.length === 0 ? (
                    <p className="text-gray-400">No events created yet.</p>
                ) : (
                    <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2">
                        {events.map(event => {
                            const expired = isExpired(event.endTime);
                            const now = Date.now();
                            const isActive = event.active && !expired && event.startTime <= now;
                            return (
                                <div key={event.id} className={`p-3 rounded-md ${isActive ? 'bg-gray-700 border-l-4 border-green-500' : expired ? 'bg-gray-800/50 opacity-60' : 'bg-gray-700'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{event.icon}</span>
                                            <div>
                                                <p className="font-semibold text-sm">{event.title}</p>
                                                <p className="text-xs text-gray-400">{event.condition?.type} x{event.condition?.target} → {event.reward?.amount || event.reward?.itemId} {event.reward?.type}</p>
                                                <p className={`text-xs ${expired ? 'text-red-400' : 'text-green-400'}`}>
                                                    {expired ? 'Expired' : new Date(event.endTime).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleToggleActive(event)} className={`px-2 py-1 text-xs rounded ${event.active ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
                                                {event.active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => handleDelete(event.id)} className="px-2 py-1 text-xs bg-red-600 rounded hover:bg-red-500">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventManagement;
