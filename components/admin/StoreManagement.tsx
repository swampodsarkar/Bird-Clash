import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import type { StoreItem } from '../../types';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import { Spinner } from '../common/Spinner';

const initialFormState: Omit<StoreItem, 'id'> = {
    name: '',
    tier: 'Common',
    description: '',
    cost: { coins: 0 },
    type: 'upgrade',
    payload: {},
    icon: '❓',
};

const StoreManagement: React.FC = () => {
    const [items, setItems] = useState<StoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const itemsRef = rtdb.ref('store_items');
        const listener = itemsRef.on('value', snapshot => {
            const data: StoreItem[] = [];
            if(snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            setItems(data);
            setLoading(false);
        });
        return () => itemsRef.off('value', listener);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleCostChange = (currency: 'coins' | 'gems', value: string) => {
        const newCost = currency === 'coins' ? { coins: parseInt(value) || 0 } : { gems: parseInt(value) || 0 };
        setFormState(prev => ({ ...prev, cost: newCost }));
    };

    const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        try {
            const parsed = JSON.parse(e.target.value);
            setFormState(prev => ({...prev, payload: parsed}));
        } catch {
            // Ignore invalid JSON for now
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await rtdb.ref(`store_items/${editingId}`).update(formState);
                toast.success("Item updated!");
            } else {
                await rtdb.ref('store_items').push(formState);
                toast.success("Item added!");
            }
            setFormState(initialFormState);
            setEditingId(null);
        } catch(err: any) {
            toast.error(err.message);
        }
    };
    
    const handleEdit = (item: StoreItem) => {
        setEditingId(item.id);
        setFormState(item);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            await rtdb.ref(`store_items/${id}`).remove();
            toast.success("Item deleted.");
        } catch(err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Item' : 'Add New Store Item'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <input name="name" value={formState.name} onChange={handleInputChange} placeholder="Item Name" className="pixel-input"/>
                    <textarea name="description" value={formState.description} onChange={handleInputChange} placeholder="Description" className="pixel-input"/>
                    <div className="flex gap-4">
                        <select name="tier" value={formState.tier} onChange={handleInputChange} className="pixel-input">
                            <option>Common</option><option>Rare</option><option>Epic</option><option>Currency</option>
                        </select>
                        <select name="type" value={formState.type} onChange={handleInputChange} className="pixel-input">
                            <option value="upgrade">Upgrade</option><option value="currency">Currency</option>
                        </select>
                    </div>
                    <input name="icon" value={formState.icon} onChange={handleInputChange} placeholder="Icon (e.g. 💰)" className="pixel-input"/>
                    <div className="flex items-center gap-4">
                        <input type="number" value={formState.cost.coins ?? ''} onChange={e => handleCostChange('coins', e.target.value)} placeholder="Coin Cost" className="pixel-input"/>
                        <span className="text-gray-400">OR</span>
                         <input type="number" value={formState.cost.gems ?? ''} onChange={e => handleCostChange('gems', e.target.value)} placeholder="Gem Cost" className="pixel-input"/>
                    </div>
                    <textarea value={JSON.stringify(formState.payload, null, 2)} onChange={handlePayloadChange} placeholder="Payload (JSON)" rows={4} className="pixel-input font-mono text-xs"/>
                    <div className="flex gap-4">
                        <Button type="submit">{editingId ? 'Update' : 'Add'}</Button>
                        {editingId && <Button type="button" onClick={() => { setEditingId(null); setFormState(initialFormState);}} variant="secondary">Cancel</Button>}
                    </div>
                </form>
            </div>

            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                 <h2 className="text-lg font-semibold mb-4">Current Store Items</h2>
                 {loading ? <Spinner /> : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {items.map(item => (
                            <div key={item.id} className="p-3 bg-gray-900 border-2 border-black">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{item.icon} {item.name} <span className="text-xs text-gray-400">({item.tier})</span></p>
                                        <p className="text-xs text-gray-300">{item.description}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 ml-2">
                                        <Button onClick={() => handleEdit(item)} className="!py-1 !px-2 !text-xs">Edit</Button>
                                        <Button onClick={() => handleDelete(item.id)} variant="danger" className="!py-1 !px-2 !text-xs">Del</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
        </div>
    );
};

export default StoreManagement;
