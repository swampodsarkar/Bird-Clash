import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import type { RoyalePassTier } from '../../types';
import { toast } from 'react-toastify';
import { CURRENT_ROYALE_PASS_SEASON } from '../../constants';
import Button from '../common/Button';
import { Spinner } from '../common/Spinner';

const initialFormState: Omit<RoyalePassTier, 'id'> = {
    level: 1,
    xp: 0,
    freeReward: undefined,
    premiumReward: undefined,
};

const RoyalePassManagement: React.FC = () => {
    const [tiers, setTiers] = useState<RoyalePassTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [seasonName, setSeasonName] = useState(CURRENT_ROYALE_PASS_SEASON);
    const [savingSeason, setSavingSeason] = useState(false);

    const passTiersRef = rtdb.ref(`royale_pass_definitions/${CURRENT_ROYALE_PASS_SEASON}/tiers`);

    useEffect(() => {
        const listener = passTiersRef.on('value', snapshot => {
            const data: RoyalePassTier[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            setTiers(data.sort((a, b) => a.level - b.level));
            setLoading(false);
        });
        return () => passTiersRef.off('value', listener);
    }, []);

    const handleSaveSeason = async () => {
        if (!seasonName.trim()) { toast.error('Season name required'); return; }
        setSavingSeason(true);
        try {
            await rtdb.ref('royale_pass_definitions/_config').set({
                seasonId: seasonName.trim(),
                updatedAt: Date.now(),
            });
            toast.success(`Season set to "${seasonName}"! Reload to see changes.`);
        } catch (e: any) { toast.error(e.message); }
        finally { setSavingSeason(false); }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    };

    const handleRewardChange = (type: 'freeReward' | 'premiumReward', value: string) => {
        try {
            if (value.trim() === '') {
                setFormState(prev => ({...prev, [type]: undefined}));
                return;
            }
            const parsed = JSON.parse(value);
            setFormState(prev => ({...prev, [type]: parsed}));
        } catch {
            // Ignore invalid JSON
        }
    };

    const setRewardPreset = (type: 'freeReward' | 'premiumReward', rewardType: string) => {
        const presets: Record<string, any> = {
            coins_100: { type: 'coins', amount: 100, icon: '💰' },
            coins_500: { type: 'coins', amount: 500, icon: '💰' },
            gems_10: { type: 'gems', amount: 10, icon: '💎' },
            gems_50: { type: 'gems', amount: 50, icon: '💎' },
            gems_100: { type: 'gems', amount: 100, icon: '💎' },
            bird_common: { type: 'bird', itemId: 'tappy', icon: '🐦' },
            bird_rare: { type: 'bird', itemId: 'blaze', icon: '🔥' },
            bird_epic: { type: 'bird', itemId: 'shadow', icon: '👻' },
            bird_legendary: { type: 'bird', itemId: 'phoenix', icon: '🦅' },
            insect: { type: 'insect', amount: 10, icon: '🪲' },
            emote: { type: 'emote', icon: '😎' },
            duo_card: { type: 'duo_card', icon: '💌' },
            name_change: { type: 'name_change_card', icon: '🏷️' },
        };
        const preset = presets[rewardType];
        if (preset) setFormState(prev => ({...prev, [type]: preset}));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await passTiersRef.child(editingId).update(formState);
                toast.success("Tier updated!");
            } else {
                await passTiersRef.push(formState);
                toast.success("Tier added!");
            }
            setFormState(initialFormState);
            setEditingId(null);
        } catch(err: any) {
            toast.error(err.message);
        }
    };
    
    const handleEdit = (tier: RoyalePassTier) => {
        setEditingId(tier.id);
        setFormState(tier);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this tier?")) return;
        try {
            await passTiersRef.child(id).remove();
            toast.success("Tier deleted.");
        } catch(err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Season Config Section */}
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Season Config</h2>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm text-gray-400 mb-1">Season ID / Name</label>
                        <input value={seasonName} onChange={e => setSeasonName(e.target.value)}
                            placeholder="e.g. season_2" className="w-full p-2 bg-gray-900 border-2 border-black text-white rounded" />
                    </div>
                    <Button onClick={handleSaveSeason} disabled={savingSeason} className="!py-2">
                        {savingSeason ? 'Saving...' : 'Save Season'}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Current hardcoded: <span className="text-yellow-400">{CURRENT_ROYALE_PASS_SEASON}</span>. Saved to Firebase <code>royale_pass_definitions/_config/seasonId</code>.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Tier' : 'Add New Tier'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div className="flex gap-4">
                        <input name="level" type="number" value={formState.level} onChange={handleInputChange} placeholder="Level" className="pixel-input"/>
                        <input name="xp" type="number" value={formState.xp} onChange={handleInputChange} placeholder="Total XP to Unlock" className="pixel-input"/>
                    </div>
                    <div>
                        <label className="block mb-1 text-gray-400">Free Reward</label>
                        <div className="flex gap-2 mb-2 flex-wrap">
                            <button type="button" onClick={() => setRewardPreset('freeReward', 'coins_100')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">💰100</button>
                            <button type="button" onClick={() => setRewardPreset('freeReward', 'gems_10')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">💎10</button>
                            <button type="button" onClick={() => setRewardPreset('freeReward', 'insect')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">🪲10</button>
                            <button type="button" onClick={() => setRewardPreset('freeReward', 'bird_common')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">🐦Bird</button>
                            <button type="button" onClick={() => setRewardPreset('freeReward', 'emote')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">😎Emote</button>
                            <button type="button" onClick={() => setFormState(prev => ({...prev, freeReward: undefined}))} className="px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-xs">Clear</button>
                        </div>
                        <textarea value={formState.freeReward ? JSON.stringify(formState.freeReward, null, 2) : ''} onChange={e => handleRewardChange('freeReward', e.target.value)} placeholder={`{\n  "type": "coins",\n  "amount": 100,\n  "icon": "💰"\n}`} rows={3} className="pixel-input font-mono text-xs"/>
                    </div>
                     <div>
                        <label className="block mb-1 text-gray-400">Premium Reward</label>
                        <div className="flex gap-2 mb-2 flex-wrap">
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'coins_500')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">💰500</button>
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'gems_50')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">💎50</button>
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'gems_100')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">💎100</button>
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'bird_rare')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">🔥Rare</button>
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'bird_epic')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">👻Epic</button>
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'bird_legendary')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">🦅Legend</button>
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'duo_card')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">💌Duo</button>
                            <button type="button" onClick={() => setRewardPreset('premiumReward', 'name_change')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">🏷️Name</button>
                            <button type="button" onClick={() => setFormState(prev => ({...prev, premiumReward: undefined}))} className="px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-xs">Clear</button>
                        </div>
                        <textarea value={formState.premiumReward ? JSON.stringify(formState.premiumReward, null, 2) : ''} onChange={e => handleRewardChange('premiumReward', e.target.value)} placeholder={`{\n  "type": "gems",\n  "amount": 10,\n  "icon": "💎"\n}`} rows={3} className="pixel-input font-mono text-xs"/>
                    </div>
                    <div className="flex gap-4">
                        <Button type="submit">{editingId ? 'Update' : 'Add'}</Button>
                        {editingId && <Button type="button" onClick={() => { setEditingId(null); setFormState(initialFormState);}} variant="secondary">Cancel</Button>}
                    </div>
                </form>
            </div>

            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                 <h2 className="text-lg font-semibold mb-4">Current Tiers for: <span className="text-yellow-400">{CURRENT_ROYALE_PASS_SEASON}</span></h2>
                 {loading ? <Spinner /> : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {tiers.map(tier => (
                            <div key={tier.id} className="p-3 bg-gray-900 border-2 border-black">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">Level {tier.level} <span className="text-xs text-gray-400">({tier.xp} XP)</span></p>
                                        <p className="text-xs text-yellow-300">Free: {tier.freeReward?.icon || 'N/A'}</p>
                                        <p className="text-xs text-purple-300">Premium: {tier.premiumReward?.icon || 'N/A'}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 ml-2">
                                        <Button onClick={() => handleEdit(tier)} className="!py-1 !px-2 !text-xs">Edit</Button>
                                        <Button onClick={() => handleDelete(tier.id)} variant="danger" className="!py-1 !px-2 !text-xs">Del</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
        </div>
        </div>
    );
};

export default RoyalePassManagement;
