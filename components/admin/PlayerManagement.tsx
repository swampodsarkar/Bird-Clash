import React, { useState, useCallback, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import type { Player, GiftPayload, MailItem } from '../../types';
import { toast } from 'react-toastify';
import firebase from 'firebase/compat/app';
import Button from '../common/Button';
import { Spinner } from '../common/Spinner';
import { BIRD_DEFINITIONS, INSECT_DEFINITIONS } from '../../constants';

const BADGES_INFO: { [key in 'Owner' | 'Moderator' | 'Content Creator']: { icon: string } } = {
  'Owner': { icon: '👑' },
  'Moderator': { icon: '🛡️' },
  'Content Creator': { icon: '🎥' },
};

const PlayerManagement: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    const [giftingPlayer, setGiftingPlayer] = useState<Player | null>(null);
    const [editAmounts, setEditAmounts] = useState<{ [uid: string]: { coins: string; gems: string } }>({});

    const searchPlayers = useCallback(async () => {
        if (!searchTerm.trim()) {
            setPlayers([]);
            return;
        }
        setLoading(true);
        try {
            const ref = rtdb.ref('users');
            const snapshot = await ref.orderByChild('displayName').startAt(searchTerm).endAt(searchTerm + '\uf8ff').limitToFirst(10).once('value');
            const foundPlayers: Player[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    foundPlayers.push(child.val());
                });
            }
            setPlayers(foundPlayers);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    const handleAmountChange = (uid: string, currency: 'coins' | 'gems', value: string) => {
        setEditAmounts(prev => ({
            ...prev,
            [uid]: {
                ...(prev[uid] || { coins: '', gems: '' }),
                [currency]: value,
            }
        }));
    };

    const handleAdjustBalance = async (uid: string, currency: 'coins' | 'gems') => {
        const amountStr = editAmounts[uid]?.[currency] || '0';
        const amount = parseInt(amountStr, 10);
        if (isNaN(amount)) {
            toast.error("Invalid amount");
            return;
        }
        try {
            await rtdb.ref(`users/${uid}/${currency}`).set(firebase.database.ServerValue.increment(amount));
            toast.success(`Adjusted ${currency} by ${amount}.`);
            // Clear input after adjusting
            handleAmountChange(uid, currency, '');
            searchPlayers(); // Refresh data
        } catch(e: any) {
            toast.error(e.message);
        }
    };
    
    const handleToggleBan = async (uid: string, isBanned: boolean) => {
        try {
            await rtdb.ref(`users/${uid}/isBanned`).set(!isBanned);
            toast.success(`Player ${!isBanned ? 'banned' : 'unbanned'}.`);
            searchPlayers();
        } catch(e: any) {
            toast.error(e.message);
        }
    };

    const handleToggleBlacklist = async (uid: string, isBlacklisted: boolean) => {
        try {
            await rtdb.ref(`users/${uid}/isBlacklisted`).set(!isBlacklisted);
            toast.success(`Player ${!isBlacklisted ? 'blacklisted from ranked' : 'un-blacklisted'}.`);
            searchPlayers();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSetBadge = async (uid: string, badge: string) => {
        const badgeValue = badge === 'None' ? null : badge;
        try {
            await rtdb.ref(`users/${uid}/activeBadge`).set(badgeValue);
            toast.success(`Badge updated for player.`);
            searchPlayers(); // Refresh data to show the change
        } catch(e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Player Management</h2>
            <div className="flex gap-4 mb-4">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by player name..."
                    className="pixel-input"
                />
                <Button onClick={searchPlayers} disabled={loading}>Search</Button>
            </div>

            {loading ? <Spinner /> : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {players.map(player => (
                        <div key={player.uid} className="p-4 bg-gray-900 border-2 border-black space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold">{player.displayName} {player.activeBadge && BADGES_INFO[player.activeBadge].icon}</p>
                                    <p className="text-xs text-gray-400">{player.email}</p>
                                    {player.isBanned && <p className="text-xs text-red-500 font-bold">STATUS: BANNED</p>}
                                    {player.isBlacklisted && <p className="text-xs text-orange-400 font-bold">STATUS: BLACKLISTED (RANKED)</p>}
                                </div>
                                <div className="text-right text-sm">
                                    <p>💰 {player.coins}</p>
                                    <p>💎 {player.gems}</p>
                                    <p>🏅 {player.rankPoints}</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-700 space-y-3 text-sm">
                                {/* Currency Adjustment */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <div className="flex items-center gap-2">
                                        <label htmlFor={`coins-${player.uid}`} className="sr-only">Adjust Coins</label>
                                        <input id={`coins-${player.uid}`} type="number" placeholder="+/- Coins" value={editAmounts[player.uid]?.coins || ''} onChange={e => handleAmountChange(player.uid, 'coins', e.target.value)} className="pixel-input !py-1 !px-2 !text-xs w-28"/>
                                        <Button onClick={() => handleAdjustBalance(player.uid, 'coins')} className="!py-1 !px-3 !text-xs">Update 💰</Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label htmlFor={`gems-${player.uid}`} className="sr-only">Adjust Gems</label>
                                        <input id={`gems-${player.uid}`} type="number" placeholder="+/- Gems" value={editAmounts[player.uid]?.gems || ''} onChange={e => handleAmountChange(player.uid, 'gems', e.target.value)} className="pixel-input !py-1 !px-2 !text-xs w-28"/>
                                        <Button onClick={() => handleAdjustBalance(player.uid, 'gems')} className="!py-1 !px-3 !text-xs">Update 💎</Button>
                                    </div>
                                </div>
                                {/* Other Actions */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={player.activeBadge || 'None'}
                                        onChange={(e) => handleSetBadge(player.uid, e.target.value)}
                                        className="pixel-input !text-xs !py-2 !px-2 bg-gray-700 border-gray-500"
                                        aria-label="Set Badge"
                                    >
                                        <option>None</option>
                                        <option>Owner</option>
                                        <option>Moderator</option>
                                        <option>Content Creator</option>
                                    </select>
                                    <Button onClick={() => setGiftingPlayer(player)} variant="secondary" className="!py-2 !px-3 !text-xs">Gift</Button>
                                    <Button onClick={() => handleToggleBlacklist(player.uid, !!player.isBlacklisted)} className={`!py-2 !px-3 !text-xs ${player.isBlacklisted ? 'bg-green-600' : 'bg-orange-600'}`}>
                                        {player.isBlacklisted ? 'Un-blacklist' : 'Blacklist'}
                                    </Button>
                                    <Button onClick={() => handleToggleBan(player.uid, !!player.isBanned)} variant={player.isBanned ? 'success' : 'danger'} className="!py-2 !px-3 !text-xs">
                                        {player.isBanned ? 'Unban' : 'Ban'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {giftingPlayer && (
                <GiftModal player={giftingPlayer} onClose={() => setGiftingPlayer(null)} />
            )}
        </div>
    );
};

// --- Gift Modal ---
interface GiftModalProps {
    player: Player;
    onClose: () => void;
}

const GiftModal: React.FC<GiftModalProps> = ({ player, onClose }) => {
    const [giftType, setGiftType] = useState<GiftPayload['type']>('coins');
    const [amount, setAmount] = useState(100);
    const [itemId, setItemId] = useState('');
    const [badgeName, setBadgeName] = useState<'Owner' | 'Moderator' | 'Content Creator'>('Moderator');
    const [message, setMessage] = useState('A gift from the admins!');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (giftType === 'bird') setItemId('B001');
        else if (giftType === 'insect') setItemId('I001');
        else setItemId('');
    }, [giftType]);

    const handleSendGift = async () => {
        setLoading(true);
        try {
            let gift: GiftPayload = { type: giftType };

            switch(giftType) {
                case 'coins': gift = { ...gift, amount, name: `${amount} Coins`, icon: '💰' }; break;
                case 'gems': gift = { ...gift, amount, name: `${amount} Gems`, icon: '💎' }; break;
                case 'badge': gift = { ...gift, badgeName, name: `${badgeName} Badge`, icon: BADGES_INFO[badgeName].icon }; break;
                case 'bird': 
                    if (!itemId) throw new Error("Please select a bird.");
                    gift = { ...gift, itemId, name: BIRD_DEFINITIONS[itemId]?.name, icon: BIRD_DEFINITIONS[itemId]?.icon };
                    break;
                case 'insect':
                    if (!itemId) throw new Error("Please select an insect.");
                    gift = { ...gift, itemId, amount, name: `${amount}x ${INSECT_DEFINITIONS[itemId]?.name}`, icon: INSECT_DEFINITIONS[itemId]?.icon };
                    break;
                case 'drone_custom_card':
                    gift = { ...gift, amount, name: `${amount}x Esports Card`, icon: '🏆' };
                    break;
            }

            const mailItem: Omit<MailItem, 'id'> = {
                type: 'gift',
                message,
                timestamp: firebase.database.ServerValue.TIMESTAMP as any,
                status: 'unread',
                gift
            };
            
            await rtdb.ref(`mail/${player.uid}`).push(mailItem);
            toast.success(`Gift sent to ${player.displayName}!`);
            onClose();

        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-md p-4 bg-[#1a1a2e] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3">Send Gift to {player.displayName}</h3>
                <div className="space-y-3">
                    <select value={giftType} onChange={e => setGiftType(e.target.value as any)} className="pixel-input">
                        <option value="coins">Coins</option>
                        <option value="gems">Gems</option>
                        <option value="bird">Bird</option>
                        <option value="insect">Insect</option>
                        <option value="badge">Badge</option>
                        <option value="drone_custom_card">Esports Card</option>
                    </select>

                    { (giftType === 'coins' || giftType === 'gems' || giftType === 'insect' || giftType === 'drone_custom_card') && (
                        <input type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value))} placeholder="Amount" className="pixel-input"/>
                    )}
                    { giftType === 'bird' && (
                        <select value={itemId} onChange={e => setItemId(e.target.value)} className="pixel-input">
                            {Object.values(BIRD_DEFINITIONS).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                     { giftType === 'insect' && (
                        <select value={itemId} onChange={e => setItemId(e.target.value)} className="pixel-input">
                            {Object.values(INSECT_DEFINITIONS).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    )}
                    { giftType === 'badge' && (
                        <select value={badgeName} onChange={e => setBadgeName(e.target.value as any)} className="pixel-input">
                            <option>Moderator</option>
                            <option>Content Creator</option>
                             <option>Owner</option>
                        </select>
                    )}
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" className="pixel-input" rows={2}/>

                    <div className="flex gap-4 pt-2">
                        <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                        <Button onClick={handleSendGift} disabled={loading} className="w-full">
                            {loading ? <Spinner /> : "Send Gift"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerManagement;