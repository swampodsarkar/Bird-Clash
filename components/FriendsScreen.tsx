import React, { useState, useEffect, useMemo } from 'react';
import type { Player, Friend, UserPresence, GiftPayload } from '../types';
import * as friendService from '../services/friendService';
import * as playerService from '../services/playerService';
import { searchPlayers, sendGiftToPlayer } from '../services/playerService';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import { useAuth } from '../hooks/useAuth';
import PlayerAvatar from './common/PlayerAvatar';
import { rtdb } from '../services/firebase';
import firebase from 'firebase/compat/app';
import { toast } from 'react-toastify';
import { Heart, Gift } from 'lucide-react';
import { BIRD_DEFINITIONS, INSECT_DEFINITIONS } from '../constants';

interface FriendsScreenProps {
  player: Player;
  onStartSpectating: (matchId: string) => void;
  onViewProfile: (uid: string) => void;
}

type FriendsTab = 'LIST' | 'REQUESTS' | 'ADD';

const FriendsScreen: React.FC<FriendsScreenProps> = ({ player, onStartSpectating, onViewProfile }) => {
  const [activeTab, setActiveTab] = useState<FriendsTab>('LIST');

  const renderContent = () => {
    switch (activeTab) {
      case 'LIST':
        return <FriendList player={player} onStartSpectating={onStartSpectating} onViewProfile={onViewProfile} />;
      case 'REQUESTS':
        return <FriendRequests />;
      case 'ADD':
        return <AddFriend player={player} onViewProfile={onViewProfile} />;
      default:
        return <FriendList player={player} onStartSpectating={onStartSpectating} onViewProfile={onViewProfile}/>;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-center font-bold text-yellow-400">Friends</h2>
      <div className="flex border-b-2 border-black mb-4">
        <button 
          onClick={() => setActiveTab('LIST')}
          className={`w-1/3 py-2 font-bold text-sm transition-colors ${activeTab === 'LIST' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
            My Friends
        </button>
        <button 
          onClick={() => setActiveTab('REQUESTS')}
          className={`w-1/3 py-2 font-bold text-sm transition-colors ${activeTab === 'REQUESTS' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
            Requests
        </button>
        <button 
          onClick={() => setActiveTab('ADD')}
          className={`w-1/3 py-2 font-bold text-sm transition-colors ${activeTab === 'ADD' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
            Add Friend
        </button>
      </div>
      {renderContent()}
    </div>
  );
};

const useFriends = (uid: string) => {
    const [allFriends, setAllFriends] = useState<Friend[]>([]);
    const [presence, setPresence] = useState<{ [uid: string]: UserPresence }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setAllFriends([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = friendService.listenToFriends(uid, (friends) => {
            setAllFriends(friends);
            setLoading(false);
        });
        return () => unsub();
    }, [uid]);

    useEffect(() => {
        const friendUids = allFriends.filter(f => f.status === 'friends').map(f => f.uid);
        if (friendUids.length > 0) {
            const unsubPresence = friendService.listenToFriendsPresence(friendUids, (statuses) => {
                setPresence(statuses);
            });
            return () => unsubPresence();
        }
    }, [allFriends]);

     // Listen for badge updates
    useEffect(() => {
        const friendUids = allFriends.map(f => f.uid);
        if (friendUids.length === 0) return;

        const listeners: { ref: firebase.database.Reference; listener: (s: firebase.database.DataSnapshot) => void }[] = [];

        friendUids.forEach(friendUid => {
            const ref = rtdb.ref(`users/${friendUid}/activeBadge`);
            const listener = (snapshot: firebase.database.DataSnapshot) => {
                const badge = snapshot.val();
                setAllFriends(prev => prev.map(f => f.uid === friendUid ? { ...f, activeBadge: badge } : f));
            };
            ref.on('value', listener);
            listeners.push({ ref, listener });
        });
        
        return () => listeners.forEach(({ ref, listener }) => ref.off('value', listener));
    }, [allFriends.length]); // Re-attach listeners only when friend count changes
    
    const friendList = useMemo(() => allFriends.filter(f => f.status === 'friends'), [allFriends]);
    const requests = useMemo(() => allFriends.filter(f => f.status === 'pending_received'), [allFriends]);

    return { friendList, requests, presence, loading };
}

interface FriendListProps {
    player: Player;
    onStartSpectating: (matchId: string) => void;
    onViewProfile: (uid: string) => void;
}


const FriendList: React.FC<FriendListProps> = ({ player, onStartSpectating, onViewProfile }) => {
    const { friendList, presence, loading } = useFriends(player.uid);
    const [duoLoading, setDuoLoading] = useState<string | null>(null);
    const [giftTarget, setGiftTarget] = useState<Friend | null>(null);

    const handleFormDuo = async (friend: Friend) => {
        if (player.dynamicDuo) {
            toast.info("You already have a duo or a pending request.");
            return;
        }
        if ((player.dynamicDuoCards || 0) < 1) {
             toast.error("You need to buy a Dynamic Duo Card from the store first!");
             return;
        }
        if (!window.confirm(`Are you sure you want to form a Dynamic Duo with ${friend.displayName}? This will use one Dynamic Duo Card.`)) {
            return;
        }
        setDuoLoading(friend.uid);
        try {
            await playerService.sendDuoRequest(player, friend.uid);
            toast.success(`Duo request sent to ${friend.displayName}!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setDuoLoading(null);
        }
    };
    
    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
    if (friendList.length === 0) return <p className="text-center text-gray-400 p-8">You have no friends yet. Go to the 'Add Friend' tab to find players!</p>

    return (
        <><div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-2">
            {friendList.map(friend => {
                const friendPresence = presence[friend.uid];
                const isOnline = friendPresence?.isOnline;
                const inMatch = friendPresence?.inMatch;
                return (
                    <div key={friend.uid} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black text-xs">
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <PlayerAvatar 
                                    photoURL={friend.photoURL}
                                    uid={friend.uid}
                                    activeBadge={friend.activeBadge}
                                    sizeClassName="w-10 h-10"
                                    imgClassName="bg-gray-700 border-2 border-black"
                                />
                                {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>}
                            </div>
                            <div>
                                <p className="font-bold">{friend.displayName}</p>
                                <p className="text-blue-400 font-semibold">{friend.rankPoints} RP</p>
                                {inMatch && <p className="text-red-400 font-bold text-[10px] uppercase animate-pulse">In Battle</p>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => onViewProfile(friend.uid)} variant="secondary" className="!py-1 !px-2 !text-xs">Visit</Button>
                            {inMatch && (
                                <Button onClick={() => onStartSpectating(inMatch)} className="!py-1 !px-2 !text-xs bg-purple-600 hover:bg-purple-700">Spectate</Button>
                            )}
                            <Button 
                                onClick={() => handleFormDuo(friend)} 
                                disabled={!!player.dynamicDuo || !!duoLoading} 
                                variant="secondary" 
                                className="!py-1 !px-2 !text-xs !bg-pink-600 hover:!bg-pink-700"
                                title={player.dynamicDuo ? 'You are already in a duo/have a request' : 'Form a Dynamic Duo'}
                            >
                                {duoLoading === friend.uid ? <Spinner /> : <span className="flex items-center gap-1"><Heart size={12} fill="currentColor" /> Duo</span>}
                            </Button>
                            <Button onClick={() => setGiftTarget(friend)} className="!py-1 !px-2 !text-xs !bg-green-600 hover:!bg-green-700" title="Send a gift">
                                <Gift size={12} />
                            </Button>
                            <Button onClick={() => friendService.declineOrRemoveFriend(player.uid, friend.uid)} variant="danger" className="!py-1 !px-2 !text-xs">Remove</Button>
                        </div>
                    </div>
                );
            })}
        </div>
        {giftTarget && (
            <FriendGiftModal
                sender={player}
                recipientUid={giftTarget.uid}
                recipientDisplayName={giftTarget.displayName}
                onClose={() => setGiftTarget(null)}
            />
        )}</>
    );
};

const FriendGiftModal: React.FC<{ sender: Player; recipientUid: string; recipientDisplayName: string; onClose: () => void }> = ({ sender, recipientUid, recipientDisplayName, onClose }) => {
    const [tab, setTab] = useState<'coins' | 'gems' | 'bird' | 'insect'>('coins');
    const [giftCoinsAmount, setGiftCoinsAmount] = useState(100);
    const [giftGemsAmount, setGiftGemsAmount] = useState(10);
    const [birdItemId, setBirdItemId] = useState('B001');
    const [insectItemId, setInsectItemId] = useState('I001');
    const [insectAmount, setInsectAmount] = useState(1);
    const [sending, setSending] = useState(false);

    const birdDefs = Object.values(BIRD_DEFINITIONS);
    const insectDefs = Object.values(INSECT_DEFINITIONS);

    const handleSend = async () => {
        setSending(true);
        try {
            let giftPayload: GiftPayload;
            let cost: { coins?: number; gems?: number } = {};
            switch (tab) {
                case 'coins':
                    if (giftCoinsAmount <= 0) throw new Error('Invalid amount');
                    giftPayload = { type: 'coins', amount: giftCoinsAmount, name: `${giftCoinsAmount} Coins`, icon: '💰' };
                    cost = { coins: giftCoinsAmount };
                    break;
                case 'gems':
                    if (giftGemsAmount <= 0) throw new Error('Invalid amount');
                    giftPayload = { type: 'gems', amount: giftGemsAmount, name: `${giftGemsAmount} Gems`, icon: '💎' };
                    cost = { gems: giftGemsAmount };
                    break;
                case 'bird': {
                    const birdDef = BIRD_DEFINITIONS[birdItemId];
                    if (!birdDef) throw new Error('Invalid bird');
                    giftPayload = { type: 'bird', itemId: birdItemId, name: birdDef.name, icon: birdDef.icon };
                    cost = { coins: 1000 };
                    break;
                }
                case 'insect': {
                    const insectDef = INSECT_DEFINITIONS[insectItemId];
                    if (!insectDef) throw new Error('Invalid insect');
                    giftPayload = { type: 'insect', itemId: insectItemId, amount: insectAmount, name: `${insectAmount}x ${insectDef.name}`, icon: insectDef.icon };
                    cost = { coins: insectDef.giftCost * insectAmount };
                    break;
                }
                default:
                    throw new Error('Invalid gift type');
            }
            await sendGiftToPlayer(sender, recipientUid, giftPayload, cost);
            toast.success(`Gift sent to ${recipientDisplayName}!`);
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="w-full max-w-md p-4 bg-[#1a1a2e] border-2 border-black shadow-[6px_6px_0px_#000000] space-y-3" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center">Send Gift to {recipientDisplayName}</h3>
                <div className="flex border-b-2 border-black">
                    {(['coins', 'gems', 'bird', 'insect'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`w-1/4 py-1 font-bold text-xs transition-colors uppercase ${tab === t ? 'bg-green-600 text-white' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}>
                            {t === 'coins' ? '💰 Coins' : t === 'gems' ? '💎 Gems' : t === 'bird' ? '🐦 Bird' : '🐛 Insect'}
                        </button>
                    ))}
                </div>
                <div className="space-y-2">
                    {tab === 'coins' && (
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Your Balance: {sender.coins}</p>
                            <input type="number" value={giftCoinsAmount} onChange={e => setGiftCoinsAmount(Math.max(1, parseInt(e.target.value) || 0))} className="pixel-input w-full" min={1} max={sender.coins} />
                            <p className="text-[10px] text-green-400 mt-1">Cost: {giftCoinsAmount} Gold</p>
                        </div>
                    )}
                    {tab === 'gems' && (
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Your Balance: {sender.gems} Gems</p>
                            <input type="number" value={giftGemsAmount} onChange={e => setGiftGemsAmount(Math.max(1, parseInt(e.target.value) || 0))} className="pixel-input w-full" min={1} max={sender.gems} />
                            <p className="text-[10px] text-green-400 mt-1">Cost: {giftGemsAmount} Gems</p>
                        </div>
                    )}
                    {tab === 'bird' && (
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Select Bird:</p>
                            <select value={birdItemId} onChange={e => setBirdItemId(e.target.value)} className="pixel-input w-full">
                                {birdDefs.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name} ({b.rarity})</option>)}
                            </select>
                            <p className="text-[10px] text-green-400 mt-1">Cost: 1000 Gold</p>
                        </div>
                    )}
                    {tab === 'insect' && (
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Select Insect:</p>
                            <select value={insectItemId} onChange={e => setInsectItemId(e.target.value)} className="pixel-input w-full mb-1">
                                {insectDefs.map(i => <option key={i.id} value={i.id}>{i.icon} {i.name} ({i.giftCost} Gold each)</option>)}
                            </select>
                            <input type="number" value={insectAmount} onChange={e => setInsectAmount(Math.max(1, parseInt(e.target.value) || 0))} className="pixel-input w-full" min={1} />
                            <p className="text-[10px] text-green-400 mt-1">Cost: {INSECT_DEFINITIONS[insectItemId]?.giftCost * insectAmount} Gold</p>
                        </div>
                    )}
                </div>
                <div className="flex gap-4 pt-2">
                    <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                    <Button onClick={handleSend} disabled={sending} className="w-full !bg-green-600 hover:!bg-green-700">
                        {sending ? <Spinner /> : "Send Gift"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const FriendRequests: React.FC = () => {
    const { user } = useAuth();
    const playerUid = user?.uid;
    
    const { requests, loading } = useFriends(playerUid || '');

    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
    if (requests.length === 0) return <p className="text-center text-gray-400 p-8">No new friend requests.</p>;
    
    return (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-2">
            {requests.map(req => (
                 <div key={req.uid} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black text-xs">
                    <div className="flex items-center space-x-2">
                         <PlayerAvatar 
                            photoURL={req.photoURL}
                            uid={req.uid}
                            activeBadge={req.activeBadge}
                            sizeClassName="w-10 h-10"
                            imgClassName="bg-gray-700 border-2 border-black"
                        />
                        <div>
                            <p className="font-bold">{req.displayName}</p>
                            <p className="text-blue-400 font-semibold">{req.rankPoints} RP</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => playerUid && friendService.acceptFriendRequest(playerUid, req.uid)} variant="success" className="!py-1 !px-2 !text-xs">Accept</Button>
                        <Button onClick={() => playerUid && friendService.declineOrRemoveFriend(playerUid, req.uid)} variant="danger" className="!py-1 !px-2 !text-xs">Decline</Button>
                    </div>
                 </div>
            ))}
        </div>
    );
};

const AddFriend: React.FC<{ player: Player; onViewProfile: (uid: string) => void; }> = ({ player, onViewProfile }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Player[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { friendList } = useFriends(player.uid);
    const friendUids = useMemo(() => new Set(friendList.map(f => f.uid)), [friendList]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setMessage('');
        const players = await searchPlayers(query, player.uid);
        setResults(players);
        if (players.length === 0) {
            setMessage('No players found.');
        }
        setLoading(false);
    };

    const handleSendRequest = async (toPlayer: Player) => {
        try {
            await friendService.sendFriendRequest(player, toPlayer);
            alert(`Friend request sent to ${toPlayer.displayName}!`);
            setResults(results.filter(r => r.uid !== toPlayer.uid)); // Remove from results after sending
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    return (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Enter player name or email..."
                    className="pixel-input"
                />
                <Button type="submit" disabled={loading} className="!px-4">{loading ? <Spinner /> : 'Search'}</Button>
            </form>
            {loading ? <Spinner /> : (
                <div className="space-y-2">
                    {results.map(p => (
                        <div key={p.uid} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black text-xs">
                             <div className="flex items-center space-x-2">
                                 <PlayerAvatar 
                                    photoURL={p.photoURL}
                                    uid={p.uid}
                                    activeBadge={p.activeBadge}
                                    sizeClassName="w-10 h-10"
                                    imgClassName="bg-gray-700 border-2 border-black"
                                />
                                <div>
                                    <p className="font-bold">{p.displayName}</p>
                                    {p.activeTitle ? (
                                        <p className="text-yellow-300 text-xs">{p.activeTitle}</p>
                                    ) : (
                                        <p className="text-gray-400 text-xs">No active title</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={() => onViewProfile(p.uid)} variant="secondary" className="!py-1 !px-2 !text-xs">Visit</Button>
                                <Button onClick={() => handleSendRequest(p)} disabled={friendUids.has(p.uid)} className="!py-1 !px-2 !text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500">
                                    {friendUids.has(p.uid) ? 'Friends' : 'Add'}
                                </Button>
                            </div>
                        </div>
                    ))}
                    {message && <p className="text-center text-gray-400 p-4">{message}</p>}
                </div>
            )}
        </div>
    );
};

export default FriendsScreen;