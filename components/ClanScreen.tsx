

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Player, Clan, ClanMember, ChatMessage, FoodRequest } from '../types';
import { useAuth } from '../hooks/useAuth';
import * as clanService from '../services/clanService';
import { rtdb } from '../services/firebase';
import firebase from 'firebase/compat/app';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import { useGameConfig } from '../hooks/useGameConfig';
import { toast } from 'react-toastify';
import { INSECT_DEFINITIONS } from '../constants';
import ClanWarScreen from './ClanWarScreen';
import PlayerAvatar from './common/PlayerAvatar';
import { Trophy, Coins } from 'lucide-react';

interface ClanScreenProps {
  player: Player;
}

const ClanScreen: React.FC<ClanScreenProps> = ({ player }) => {
  const [clan, setClan] = useState<Clan | null>(null);
  const [leaderboard, setLeaderboard] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player.clanId) {
      const unsubscribe = clanService.listenToClan(player.clanId, (clanData) => {
        setClan(clanData);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setClan(null);
      setLoading(false);
    }
  }, [player.clanId]);

  useEffect(() => {
    const unsub = clanService.listenToClanLeaderboard(setLeaderboard);
    return () => unsub();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center p-8"><Spinner /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-center font-bold text-yellow-400">Clans</h2>
      {error && <p className="text-red-400 text-center text-sm bg-red-900/50 p-2 border border-red-500">{error}</p>}
      {player.clanId && clan ? (
        <MyClanView player={player} clan={clan} setError={setError} leaderboard={leaderboard} />
      ) : (
        <NoClanView player={player} setError={setError} leaderboard={leaderboard} />
      )}
    </div>
  );
};

const ClanLeaderboardView: React.FC<{
  leaderboard: Clan[];
  player: Player;
  setError: (e: string | null) => void;
}> = ({ leaderboard, player, setError }) => {
  const handleJoin = async (clanId: string) => {
    try {
      setError(null);
      await clanService.joinClan(player, clanId);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000]">
      <h4 className="text-lg font-bold text-center mb-3">Top Clans</h4>
      <ul className="space-y-2 max-h-80 overflow-y-auto">
        {leaderboard.map((clan, index) => (
          <li key={clan.id} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base w-6 text-center">{index + 1}</span>
              <div>
                <p className="font-bold">{clan.name} <span className="text-gray-400">[{clan.tag}]</span></p>
                {/* Fix: Use totalRankPoints instead of totalTrophies */}
                <p className="text-blue-400 font-semibold flex items-center gap-1"><Trophy size={14} /> {clan.totalRankPoints}</p>
              </div>
            </div>
            {!player.clanId && (
              <Button onClick={() => handleJoin(clan.id)} className="!py-1 !px-2 !text-xs">
                Join
              </Button>
            )}
            {player.clanId === clan.id && (
                <span className="text-xs font-bold text-yellow-400">YOUR CLAN</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const MyClanView: React.FC<{ player: Player; clan: Clan; setError: (e: string | null) => void; leaderboard: Clan[] }> = ({ player, clan, setError, leaderboard }) => {
    const [activeTab, setActiveTab] = useState<'MEMBERS' | 'CHAT' | 'WAR' | 'RANKINGS'>('CHAT');
    const [giftingMember, setGiftingMember] = useState<ClanMember | null>(null);
    const [membersWithBadges, setMembersWithBadges] = useState<ClanMember[]>([]);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [activeRequests, setActiveRequests] = useState<FoodRequest[]>([]);
    const [donatingRequest, setDonatingRequest] = useState<FoodRequest | null>(null);

    useEffect(() => {
        // Fix: Cast the result of Object.values to ClanMember[] to correctly type its elements.
        // Fix: Sort by rankPoints instead of trophies.
        const initialMembers = (Object.values(clan.members || {}) as ClanMember[]).sort((a, b) => b.rankPoints - a.rankPoints);
        setMembersWithBadges(initialMembers);

        const memberUids = initialMembers.map(m => m.uid);
        const listeners: { ref: firebase.database.Reference; listener: (snapshot: firebase.database.DataSnapshot) => void }[] = [];

        memberUids.forEach(uid => {
            const userRef = rtdb.ref(`users/${uid}/activeBadge`);
            const listener = (snapshot: firebase.database.DataSnapshot) => {
                const badge = snapshot.val();
                setMembersWithBadges(prev => prev.map(m => m.uid === uid ? { ...m, activeBadge: badge } : m));
            };
            userRef.on('value', listener);
            listeners.push({ ref: userRef, listener });
        });

        return () => {
            listeners.forEach(({ ref, listener }) => ref.off('value', listener));
        };
    }, [clan.members]);

    useEffect(() => {
        const unsubscribe = clanService.listenToClanFoodRequests(clan.id, setActiveRequests);
        return () => unsubscribe();
    }, [clan.id]);


    const handleLeave = async () => {
        if (!window.confirm("Are you sure you want to leave the clan?")) return;
        try {
            setError(null);
            await clanService.leaveClan(player);
        } catch(e: any) {
            setError(e.message);
        }
    }

    const membersView = (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000]">
             <h4 className="text-lg font-bold text-center mb-3">Members ({clan.memberCount})</h4>
             <ul className="space-y-2 max-h-80 overflow-y-auto">
                 {membersWithBadges.map((member: ClanMember) => (
                     <li key={member.uid} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black text-xs">
                        <div className="flex items-center space-x-2">
                            <PlayerAvatar 
                                photoURL={member.photoURL}
                                uid={member.uid}
                                activeBadge={member.activeBadge}
                                sizeClassName="w-8 h-8"
                                imgClassName="border-2 border-black bg-gray-700"
                            />
                            <div>
                                <p>{member.displayName || 'Anonymous'}</p>
                                {/* Fix: Use rankPoints instead of trophies */}
                                <p className="text-blue-400 font-semibold flex items-center gap-1"><Trophy size={14} /> {member.rankPoints}</p>
                            </div>
                        </div>
                        {member.uid !== player.uid && (
                            <Button onClick={() => setGiftingMember(member)} variant="success" className="!py-1 !px-2 !text-xs">Gift Food</Button>
                        )}
                     </li>
                 ))}
             </ul>
        </div>
    );

    const rankingsView = (
        <ClanLeaderboardView leaderboard={leaderboard} player={player} setError={setError} />
    );

    return (
        <div className="space-y-4">
            <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] text-center">
                <h3 className="text-xl font-bold">{clan.name} <span className="text-gray-400">[{clan.tag}]</span></h3>
                <p className="text-xs text-gray-300 mt-1">{clan.description}</p>
                {/* Fix: Use totalRankPoints instead of totalTrophies */}
                <p className="mt-2 font-bold text-blue-400 flex items-center justify-center gap-1"><Trophy size={16} /> {clan.totalRankPoints} Total Trophies</p>
                 <div className="flex justify-center gap-4 mt-4">
                    <Button onClick={() => setIsRequestModalOpen(true)} variant="success" className="!py-1 !px-3 !text-xs">Request Food</Button>
                    <Button onClick={handleLeave} variant="danger" className="!py-1 !px-3 !text-xs">Leave Clan</Button>
                </div>
            </div>
            
            <div className="flex border-b-2 border-black">
                <button 
                onClick={() => setActiveTab('MEMBERS')}
                className={`w-1/4 py-2 font-bold text-sm transition-colors ${activeTab === 'MEMBERS' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
                >
                    Members
                </button>
                 <button 
                onClick={() => setActiveTab('WAR')}
                className={`w-1/4 py-2 font-bold text-sm transition-colors ${activeTab === 'WAR' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
                >
                    War
                </button>
                <button 
                onClick={() => setActiveTab('CHAT')}
                className={`w-1/4 py-2 font-bold text-sm transition-colors ${activeTab === 'CHAT' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
                >
                    Chat
                </button>
                <button 
                onClick={() => setActiveTab('RANKINGS')}
                className={`w-1/4 py-2 font-bold text-sm transition-colors ${activeTab === 'RANKINGS' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
                >
                    Rankings
                </button>
            </div>
            
            {activeTab === 'MEMBERS' && membersView}
            {activeTab === 'WAR' && <ClanWarScreen clan={clan} player={player} />}
            {activeTab === 'CHAT' && <ClanChatView clanId={clan.id} player={player} activeRequests={activeRequests} onDonate={setDonatingRequest} />}
            {activeTab === 'RANKINGS' && rankingsView}
            <GiftFoodModal 
                player={player} 
                giftingMember={giftingMember} 
                onClose={() => setGiftingMember(null)}
                setError={setError}
            />
            <RequestFoodModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                player={player}
                clanId={clan.id}
            />
            <DonateFoodModal
                request={donatingRequest}
                onClose={() => setDonatingRequest(null)}
                player={player}
                clanId={clan.id}
            />
        </div>
    );
}

const ClanChatView: React.FC<{ clanId: string, player: Player, activeRequests: FoodRequest[], onDonate: (request: FoodRequest) => void }> = ({ clanId, player, activeRequests, onDonate }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const unsubscribe = clanService.listenToClanMessages(clanId, (newMessages) => {
            setMessages(newMessages);
            setLoading(false);
        }, (err) => {
            setError("Could not load chat messages. You may not have the required permissions.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [clanId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim() || sending || player.isBanned) return;

        setError(null);
        setSending(true);
        try {
            await clanService.sendClanMessage(clanId, player, newMessage);
            setNewMessage('');
        } catch (err: any) {
            console.error("Error sending clan message:", err);
            setError(err.message || "Failed to send message.");
        } finally {
            setSending(false);
        }
    };
    
    return (
        <div className="flex flex-col h-[calc(100vh-450px)] bg-[#1a1a2e] border-2 border-black shadow-[4px_4px_0px_#000000]">
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : error && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-red-400 text-center">{error}</div>
                ) : (
                messages.map(msg => {
                    if (msg.type === 'food_request' && msg.foodRequestId) {
                        const request = activeRequests.find(r => r.id === msg.foodRequestId);
                        if (request) {
                            return <FoodRequestMessage key={msg.id} request={request} player={player} onDonate={onDonate} />;
                        }
                    }

                    const isMe = msg.uid === user?.uid;
                    return (
                    <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <PlayerAvatar 
                            photoURL={msg.photoURL}
                            uid={msg.uid}
                            activeBadge={msg.activeBadge}
                            sizeClassName="w-8 h-8"
                            imgClassName="border-2 border-black bg-gray-700 mt-1"
                        />
                        <div className={`max-w-xs md:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <p className="text-xs text-gray-400 px-1">{msg.displayName || 'Player'}</p>
                        <div className={`px-3 py-2 text-sm border-2 border-black shadow-[2px_2px_0px_#000] ${isMe ? 'bg-blue-800' : 'bg-[#2c2c54]'}`}>
                            {msg.text}
                        </div>
                        </div>
                    </div>
                    );
                })
                )}
                <div ref={messagesEndRef} />
            </div>
      
            <div className="bg-[#2c2c54] border-t-2 border-black">
                {error && !loading && <p className="text-red-400 text-center text-xs px-4 pt-2">{error}</p>}
                <form onSubmit={handleSendMessage} className="p-4 flex gap-2">
                    <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message your clan..."
                    className="pixel-input flex-grow"
                    disabled={sending}
                    />
                    <Button type="submit" disabled={sending} className="!px-4 !py-3">
                    {sending ? <Spinner /> : 'Send'}
                    </Button>
                </form>
            </div>
        </div>
    )
}

const FoodRequestMessage: React.FC<{ request: FoodRequest, player: Player, onDonate: (request: FoodRequest) => void }> = ({ request, player, onDonate }) => {
    const progress = (request.donatedAmount / request.requestedAmount) * 100;
    const canDonate = player.uid !== request.requesterUid && (player.inventory?.insects?.[request.insectId] || 0) > 0;

    return (
        <div className="p-3 bg-gray-800 border-2 border-purple-500 my-2 space-y-3">
            <div className="flex items-center gap-3">
                 <PlayerAvatar 
                    photoURL={request.requesterPhotoURL}
                    uid={request.requesterUid}
                    sizeClassName="w-10 h-10"
                    imgClassName="border-2 border-black bg-gray-700"
                />
                <div>
                    <p className="text-sm font-bold">{request.requesterName}</p>
                    <p className="text-sm">requests {request.requestedAmount} x <span className="text-xl">{request.insectIcon}</span> {request.insectName}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex-grow w-full bg-black h-5 border-2 border-black p-0.5 relative">
                    <div className="h-full bg-purple-500" style={{ width: `${progress}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{request.donatedAmount} / {request.requestedAmount}</span>
                </div>
                <Button onClick={() => onDonate(request)} disabled={!canDonate} variant="success" className="!py-2 !px-4 !text-xs">
                    Donate
                </Button>
            </div>
        </div>
    );
};

const RequestFoodModal: React.FC<{ isOpen: boolean, onClose: () => void, player: Player, clanId: string }> = ({ isOpen, onClose, player, clanId }) => {
    const [selectedInsect, setSelectedInsect] = useState<string>('I001');
    const [amount, setAmount] = useState<number>(10);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;
    
    const requestableInsects = Object.values(INSECT_DEFINITIONS).filter(i => i.rarity === 'Common' || i.rarity === 'Rare');
    
    const handleRequest = async () => {
        setLoading(true);
        try {
            await clanService.createFoodRequest(clanId, player, selectedInsect, amount);
            toast.success("Food request posted in clan chat!");
            onClose();
        } catch(e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3">Request Food</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold">Insect</label>
                        <select value={selectedInsect} onChange={e => setSelectedInsect(e.target.value)} className="pixel-input">
                            {requestableInsects.map(insect => <option key={insect.id} value={insect.id}>{insect.icon} {insect.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-bold">Amount (Max 10)</label>
                        <input type="number" value={amount} onChange={e => setAmount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} min="1" max="10" className="pixel-input" />
                    </div>
                    <div className="flex gap-4 pt-2">
                        <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                        <Button onClick={handleRequest} disabled={loading} className="w-full">
                            {loading ? <Spinner /> : "Request"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const DonateFoodModal: React.FC<{ request: FoodRequest | null, onClose: () => void, player: Player, clanId: string }> = ({ request, onClose, player, clanId }) => {
    const [amount, setAmount] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setAmount(1); // Reset amount when modal opens
    }, [request]);

    if (!request) return null;

    const userHas = player.inventory?.insects?.[request.insectId] || 0;
    const maxCanDonate = Math.min(userHas, request.requestedAmount - request.donatedAmount);
    
    const handleDonate = async () => {
        if (amount <= 0 || amount > maxCanDonate) {
            toast.error("Invalid donation amount.");
            return;
        }
        setLoading(true);
        try {
            await clanService.donateToFoodRequest(clanId, request, player, amount);
            toast.success(`You donated ${amount} x ${request.insectName}!`);
            onClose();
        } catch(e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }
    
    if (maxCanDonate <= 0) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                    <p className="text-center">You don't have any {request.insectName} to donate.</p>
                     <div className="mt-4 text-center">
                        <Button onClick={onClose} variant="secondary">Close</Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3">Donate to {request.requesterName}</h3>
                <p className="text-center text-sm mb-2">They need {request.requestedAmount - request.donatedAmount} more {request.insectIcon}.</p>
                <p className="text-center text-xs mb-4">You have: {userHas}</p>

                <div className="space-y-4">
                     <div>
                        <label className="text-sm font-bold">Amount to Donate</label>
                        <input type="number" value={amount} onChange={e => setAmount(Math.max(1, Math.min(maxCanDonate, parseInt(e.target.value) || 1)))} min="1" max={maxCanDonate} className="pixel-input" />
                    </div>
                    <div className="flex gap-4 pt-2">
                        <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                        <Button onClick={handleDonate} disabled={loading} variant="success" className="w-full">
                            {loading ? <Spinner /> : `Donate ${amount}`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}


const NoClanView: React.FC<{ player: Player; setError: (e: string | null) => void; leaderboard: Clan[] }> = ({ player, setError, leaderboard }) => {
    const [view, setView] = useState<'main' | 'create' | 'search'>('main');
    
    const showMain = () => setView('main');

    const mainView = (
        <div className="space-y-4">
            <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] grid grid-cols-2 gap-4">
                <Button onClick={() => setView('create')}>Create Clan</Button>
                <Button onClick={() => setView('search')}>Search Clans</Button>
            </div>
            <ClanLeaderboardView leaderboard={leaderboard} player={player} setError={setError} />
        </div>
    );

    switch(view) {
        case 'create': return <CreateClanView player={player} onBack={showMain} setError={setError} />;
        case 'search': return <SearchClanView player={player} onBack={showMain} setError={setError} />;
        default: return mainView;
    }
}

const CreateClanView: React.FC<{ player: Player, onBack: () => void, setError: (e: string|null) => void }> = ({ player, onBack, setError}) => {
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const config = useGameConfig();

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !tag.trim() || tag.length > 4 || tag.length < 2) {
            setError("Please fill in a valid name and a 2-4 character tag.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await clanService.createClan(player, name, tag.toUpperCase(), description, config.CLAN_CREATE_COST_COINS);
            // The main component listener will handle the UI switch
        } catch(e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000]">
            <h3 className="text-lg font-bold text-center mb-3">Create a New Clan</h3>
            <form onSubmit={handleCreate} className="space-y-3">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Clan Name (e.g. The Titans)" className="pixel-input" required />
                <input type="text" value={tag} onChange={e => setTag(e.target.value)} placeholder="Clan Tag (2-4 chars)" className="pixel-input" required minLength={2} maxLength={4} />
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="pixel-input" rows={2}></textarea>
                <p className="text-center text-xs text-yellow-400">Cost: {config.CLAN_CREATE_COST_COINS} Coins</p>
                <div className="flex gap-4">
                    <Button type="button" onClick={onBack} variant="secondary" className="w-full">Back</Button>
                    <Button type="submit" disabled={loading} className="w-full">{loading ? <Spinner /> : 'Create'}</Button>
                </div>
            </form>
        </div>
    )
}

const SearchClanView: React.FC<{ player: Player, onBack: () => void, setError: (e: string|null) => void }> = ({ player, onBack, setError }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Clan[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const searchResults = await clanService.searchClans(query);
            setResults(searchResults);
        } catch(e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [query, setError]);
    
    return (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-3">
            <h3 className="text-lg font-bold text-center mb-3">Search for Clans</h3>
            <form onSubmit={handleSearch} className="flex gap-2">
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter clan name..." className="pixel-input" />
                <Button type="submit" disabled={loading} className="!px-4">{loading ? <Spinner/> : 'Search'}</Button>
            </form>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
                 {results.map(clan => (
                     <li key={clan.id} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black text-xs">
                        <div>
                            <p className="font-bold">{clan.name} <span className="text-gray-400">[{clan.tag}]</span></p>
                            <p className="text-blue-400 font-semibold flex items-center gap-1"><Trophy size={14} /> {clan.totalRankPoints}</p>
                        </div>
                        <Button onClick={async () => {
                            try { await clanService.joinClan(player, clan.id) } catch (e: any) { setError(e.message) }
                        }} className="!py-1 !px-2 !text-xs">Join</Button>
                     </li>
                 ))}
             </ul>
             <Button type="button" onClick={onBack} variant="secondary" className="w-full">Back</Button>
        </div>
    );
}

interface GiftFoodModalProps {
    player: Player;
    giftingMember: ClanMember | null;
    onClose: () => void;
    setError: (error: string | null) => void;
}

const GiftFoodModal: React.FC<GiftFoodModalProps> = ({ player, giftingMember, onClose, setError }) => {
    const [gifting, setGifting] = useState(false);

    const handleGift = async (insectId: string) => {
        if (!giftingMember) return;
        setGifting(true);
        setError(null);
        try {
            await clanService.giftInsectToClanMember(player, giftingMember.uid, insectId);
            toast.success(`You sent a gift to ${giftingMember.displayName}!`);
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setGifting(false);
        }
    };

    if (!giftingMember) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3">Gift Food to {giftingMember.displayName}</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {Object.values(INSECT_DEFINITIONS).map(insect => {
                        const canAfford = player.coins >= insect.giftCost;
                        return (
                            <div key={insect.id} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black">
                                <div>
                                    <p className="font-bold">{insect.icon} {insect.name}</p>
                                    <p className="text-xs text-yellow-300 flex items-center gap-1">Cost: {insect.giftCost} <Coins size={12} /></p>
                                </div>
                                <Button
                                    onClick={() => handleGift(insect.id)}
                                    disabled={gifting || !canAfford}
                                    className="!py-1 !px-2 !text-xs"
                                >
                                    {gifting ? <Spinner/> : 'Send'}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ClanScreen;