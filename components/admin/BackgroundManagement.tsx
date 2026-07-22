import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import { Spinner } from '../common/Spinner';

const BackgroundManagement: React.FC = () => {
    const [lobbyBg, setLobbyBg] = useState('');
    const [battleBg, setBattleBg] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<'lobby' | 'battle' | null>(null);

    const bgRef = rtdb.ref('contentConfig/backgroundImages');

    useEffect(() => {
        const listener = bgRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            setLobbyBg(data.lobby || '');
            setBattleBg(data.battle || '');
            setLoading(false);
        });
        return () => bgRef.off('value', listener);
    }, []);

    const handleSave = async (type: 'lobby' | 'battle') => {
        setSaving(type);
        try {
            const url = type === 'lobby' ? lobbyBg : battleBg;
            await bgRef.child(type).set(url);
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} background updated!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <Spinner />;
    }

    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Lobby Background */}
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg space-y-4">
                <h2 className="text-lg font-semibold">Lobby Background</h2>
                <img src={lobbyBg} alt="Lobby Preview" className="w-full h-48 object-cover bg-gray-900 border-2 border-black" />
                <input
                    type="url"
                    value={lobbyBg}
                    onChange={e => setLobbyBg(e.target.value)}
                    placeholder="Image URL for lobby..."
                    className="pixel-input"
                />
                <Button onClick={() => handleSave('lobby')} disabled={!!saving}>
                    {saving === 'lobby' ? <Spinner /> : 'Save Lobby Image'}
                </Button>
            </div>

            {/* Battle Background */}
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg space-y-4">
                <h2 className="text-lg font-semibold">Battle Arena Background</h2>
                <img src={battleBg} alt="Battle Preview" className="w-full h-48 object-cover bg-gray-900 border-2 border-black" />
                <input
                    type="url"
                    value={battleBg}
                    onChange={e => setBattleBg(e.target.value)}
                    placeholder="Image URL for battle arena..."
                    className="pixel-input"
                />
                <Button onClick={() => handleSave('battle')} disabled={!!saving}>
                    {saving === 'battle' ? <Spinner /> : 'Save Battle Image'}
                </Button>
            </div>
        </div>
    );
};

export default BackgroundManagement;
