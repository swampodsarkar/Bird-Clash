import React, { useState, useEffect } from 'react';
import { rtdb } from '../services/firebase';
import type { Player, Bird, GiftPayload } from '../types';
import { BIRD_DEFINITIONS, INSECT_DEFINITIONS } from '../constants';
import { Spinner } from './common/Spinner';
import PlayerAvatar from './common/PlayerAvatar';
import Button from './common/Button';
import PlayerRankDisplay from './common/PlayerRankDisplay';
import BirdIcon from './common/BirdIcon';
import { sendGiftToPlayer } from '../services/playerService';
import { toast } from 'react-toastify';

interface PublicProfileScreenProps {
  uid: string;
  onClose: () => void;
  sender?: Player;
}

const PublicProfileScreen: React.FC<PublicProfileScreenProps> = ({ uid, onClose, sender }) => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftCoinsAmount, setGiftCoinsAmount] = useState(100);
  const [giftGemsAmount, setGiftGemsAmount] = useState(10);
  const [giftSending, setGiftSending] = useState(false);

  useEffect(() => {
    setLoading(true);

    if (uid.startsWith('bot_')) {
        const parts = uid.split('_'); // e.g., ['bot', '0', 'Abdullah', '4250']
        const displayName = parts[2] || 'Bot Player';
        const rankPoints = parts.length > 3 ? parseInt(parts[3], 10) : Math.floor(Math.random() * 2800) + 1200; // Fallback

        const allBirdDefs = Object.values(BIRD_DEFINITIONS);
        const ownedBirds: { [birdId: string]: Bird } = {};
        const numBirdsToOwn = Math.floor(Math.random() * 10) + 5; // Own 5 to 14 birds

        // Shuffle and pick birds
        const shuffledBirds = [...allBirdDefs].sort(() => 0.5 - Math.random());
        const selectedBirdDefs = shuffledBirds.slice(0, numBirdsToOwn);

        selectedBirdDefs.forEach(birdDef => {
            const level = Math.floor(Math.random() * 30) + 1; // Level 1 to 30
            ownedBirds[birdDef.id] = {
                id: birdDef.id,
                name: birdDef.name,
                rarity: birdDef.rarity,
                icon: birdDef.icon,
                skillDescription: birdDef.skillDescription,
                level: level,
                xp: 0,
                xpToNextLevel: 100, // placeholder
                skillPower: birdDef.baseAttackPower + (birdDef.attackPowerPerLevel * (level - 1)),
                maxHealth: birdDef.baseHealth + (birdDef.healthPerLevel * (level - 1)),
                powerLevel: level,
                healthLevel: level
            };
        });

        const ownedBirdIds = Object.keys(ownedBirds);
        
        const botPlayer: Player = {
            uid: uid,
            displayName: displayName,
            photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${uid}`,
            rankPoints: rankPoints,
            level: Math.floor(Math.random() * 41) + 10, // Level 10 to 50
            coins: 0, gems: 0, xp: 0, xpToNextLevel: 100, clanId: null, lastLogin: 0, email: null, mineCapacity: 0, mineLastCollected: 0, mineRate: 0, nfts: [], hasCompletedTutorial: true,
            ownedBirds: ownedBirds,
            equippedBirdId: ownedBirdIds[Math.floor(Math.random() * ownedBirdIds.length)],
        };

        setPlayer(botPlayer);
        setLoading(false);
        return; // Exit early, don't try to fetch from Firebase
    }

    const playerRef = rtdb.ref(`users/${uid}`);
    const listener = playerRef.on('value', snapshot => {
      if (snapshot.exists()) {
        setPlayer(snapshot.val());
      } else {
        setError('Player not found.');
      }
      setLoading(false);
    }, (err) => {
      setError('Failed to load profile.');
      setLoading(false);
    });

    return () => playerRef.off('value', listener);
  }, [uid]);

  const ownedBirds = player?.ownedBirds ? Object.values(player.ownedBirds) : [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99]" onClick={onClose}>
      <div className="w-full max-w-lg p-4 bg-[#1a1a2e] border-2 border-black shadow-[8px_8px_0px_#000000] animate-fade-in" onClick={e => e.stopPropagation()}>
         <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
        `}</style>
        {loading && <div className="h-96 flex items-center justify-center"><Spinner /></div>}
        {error && <p className="h-96 text-center text-red-400">{error}</p>}
        {player && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center p-4 bg-gray-900/50 border-2 border-black">
                <PlayerAvatar 
                    photoURL={player.photoURL}
                    uid={player.uid}
                    activeBadge={player.activeBadge}
                    sizeClassName="w-20 h-20"
                    imgClassName="border-4 border-black"
                />
                <h2 className="text-xl font-bold mt-2">{player.displayName} <span className="text-base text-gray-400">(LVL {player.level || 1})</span></h2>
                {player.activeTitle && <p className="text-sm text-yellow-300">{player.activeTitle}</p>}
                {player.statusMessage && <p className="text-sm text-gray-300 italic my-1">"{player.statusMessage}"</p>}
                <PlayerRankDisplay player={player} className="mt-2" />
            </div>
            
            <div>
                <h3 className="font-bold text-center mb-2">Bird Collection ({ownedBirds.length})</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2 bg-black/30 max-h-48 overflow-y-auto">
                    {ownedBirds.length > 0 ? ownedBirds.map((bird: Bird) => (
                        <div key={bird.id} title={`${bird.name} (Lvl ${bird.level})`} className="p-2 bg-gray-800 border-2 border-black flex flex-col items-center justify-center">
                            <BirdIcon bird={bird} className="text-4xl" imgClassName="w-10 h-10" />
                            <p className="text-xs text-gray-400">Lvl {bird.level}</p>
                        </div>
                    )) : <p className="col-span-full text-center text-sm text-gray-500 py-4">No birds yet.</p>}
                </div>
            </div>

            {sender && sender.uid !== uid && (
              <Button onClick={() => setShowGiftModal(true)} className="w-full !bg-green-600 hover:!bg-green-700">
                Send Gift
              </Button>
            )}

            <Button onClick={onClose} variant="secondary" className="w-full">Close</Button>
          </div>
        )}

        {showGiftModal && player && sender && (
          <GiftModal
            sender={sender}
            recipient={player}
            onClose={() => setShowGiftModal(false)}
            giftSending={giftSending}
            setGiftSending={setGiftSending}
            giftCoinsAmount={giftCoinsAmount}
            setGiftCoinsAmount={setGiftCoinsAmount}
            giftGemsAmount={giftGemsAmount}
            setGiftGemsAmount={setGiftGemsAmount}
          />
        )}
      </div>
    </div>
  );
};

interface GiftModalProps {
    sender: Player;
    recipient: Player;
    onClose: () => void;
    giftSending: boolean;
    setGiftSending: (v: boolean) => void;
    giftCoinsAmount: number;
    setGiftCoinsAmount: (v: number) => void;
    giftGemsAmount: number;
    setGiftGemsAmount: (v: number) => void;
}

const GiftModal: React.FC<GiftModalProps> = ({ sender, recipient, onClose, giftSending, setGiftSending, giftCoinsAmount, setGiftCoinsAmount, giftGemsAmount, setGiftGemsAmount }) => {
    const [tab, setTab] = useState<'coins' | 'gems' | 'bird' | 'insect'>('coins');
    const [birdItemId, setBirdItemId] = useState('B001');
    const [insectItemId, setInsectItemId] = useState('I001');
    const [insectAmount, setInsectAmount] = useState(1);

    const birdDefs = Object.values(BIRD_DEFINITIONS);
    const insectDefs = Object.values(INSECT_DEFINITIONS);

    const handleSend = async () => {
        setGiftSending(true);
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

            await sendGiftToPlayer(sender, recipient.uid, giftPayload, cost);
            toast.success(`Gift sent to ${recipient.displayName}!`);
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setGiftSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="w-full max-w-md p-4 bg-[#1a1a2e] border-2 border-black shadow-[6px_6px_0px_#000000] space-y-3" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center">Send Gift to {recipient.displayName}</h3>
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
                            <p className="text-xs text-gray-400 mb-1">Gold to send, and Your Balance: {sender.coins}</p>
                            <input type="number" value={giftCoinsAmount} onChange={e => setGiftCoinsAmount(Math.max(1, parseInt(e.target.value) || 0))} placeholder="Amount" className="pixel-input w-full" min={1} max={sender.coins} />
                            <p className="text-[10px] text-green-400 mt-1">Cost: {giftCoinsAmount} Gold</p>
                        </div>
                    )}
                    {tab === 'gems' && (
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Your Balance: {sender.gems} Gems</p>
                            <input type="number" value={giftGemsAmount} onChange={e => setGiftGemsAmount(Math.max(1, parseInt(e.target.value) || 0))} placeholder="Amount" className="pixel-input w-full" min={1} max={sender.gems} />
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
                            <input type="number" value={insectAmount} onChange={e => setInsectAmount(Math.max(1, parseInt(e.target.value) || 0))} placeholder="Amount" className="pixel-input w-full" min={1} />
                            <p className="text-[10px] text-green-400 mt-1">Cost: {INSECT_DEFINITIONS[insectItemId]?.giftCost * insectAmount} Gold</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-2">
                    <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                    <Button onClick={handleSend} disabled={giftSending} className="w-full !bg-green-600 hover:!bg-green-700">
                        {giftSending ? <Spinner /> : "Send Gift"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PublicProfileScreen;