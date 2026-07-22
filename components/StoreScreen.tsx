
import React, { useState } from 'react';
import type { Player, StoreItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import { purchaseBird, purchaseInsect, purchaseCurrency, purchaseEmote, purchaseDuoCard, updatePlayerCoins, updatePlayerGems, purchaseNameChangeCard, purchaseCustomCard } from '../services/playerService';
import { rtdb } from '../services/firebase';
import firebase from 'firebase/compat/app';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import { useContentConfig } from '../hooks/useContentConfig';
import { toast } from 'react-toastify';
import { BIRD_DEFINITIONS } from '../constants';
import BirdIcon from './common/BirdIcon';
import { Coins, Gem, Swords, Sparkles } from 'lucide-react';

interface StoreScreenProps {
  player: Player;
}

const tierStyles = {
    'Common': { border: 'border-gray-400', bg: 'bg-gray-700/50' },
    'Rare': { border: 'border-blue-400', bg: 'bg-blue-700/50' },
    'Epic': { border: 'border-purple-500', bg: 'bg-purple-700/50' },
    'Legendary': { border: 'border-orange-500', bg: 'bg-orange-800/50' },
    'Currency': { border: 'border-yellow-400', bg: 'bg-yellow-700/50' }
};

const StoreScreen: React.FC<StoreScreenProps> = ({ player }) => {
  const { user } = useAuth();
  const { storeItems, loading: contentLoading } = useContentConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'BIRDS' | 'FOOD' | 'EMOTE_GIFT'>('BIRDS');

  const handlePurchase = async (item: StoreItem) => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
        if (item.cost.coins && (player.coins ?? 0) < item.cost.coins) throw new Error("Not enough coins!");
        if (item.cost.gems && (player.gems ?? 0) < item.cost.gems) throw new Error("Not enough gems!");
        
        switch(item.type) {
            case 'bird':
                await purchaseBird(user.uid, item.payload.birdId, item.cost);
                toast.success("Bird purchased!");
                break;
            case 'insect':
                await purchaseInsect(user.uid, item.payload.insectId, item.cost);
                toast.success("Insect purchased!");
                break;
            case 'currency':
                await updatePlayerCoins(user.uid, -(item.cost.coins || 0));
                await updatePlayerGems(user.uid, -(item.cost.gems || 0));
                await purchaseCurrency(user.uid, item.payload.currency, item.payload.amount);
                toast.success("Currency purchased!");
                break;
            case 'emote':
                await purchaseEmote(user.uid, item);
                toast.success("Emote unlocked!");
                break;
            case 'duo_card':
                await purchaseDuoCard(user.uid, item);
                toast.success("Dynamic Duo Card purchased!");
                break;
            case 'name_change_card':
                await purchaseNameChangeCard(user.uid, item);
                toast.success("Name Change Card purchased!");
                break;
            case 'normal_custom_card':
            case 'drone_custom_card':
                await purchaseCustomCard(user.uid, item);
                toast.success("Card purchased!");
                break;
        }
    } catch(e: any) {
        toast.error(e.message);
    } finally {
        setLoading(false);
    }
  };

  const displayedItems = storeItems.filter(item => {
    if (activeTab === 'BIRDS') return item.type === 'bird';
    if (activeTab === 'FOOD') return item.type === 'insect';
    if (activeTab === 'EMOTE_GIFT') return item.type === 'emote' || item.type === 'duo_card' || item.type === 'currency' || item.type === 'name_change_card' || item.type === 'normal_custom_card' || item.type === 'drone_custom_card';
    return false;
  });

  const [starterPackLoading, setStarterPackLoading] = useState(false);
  const hasStarterPack = player.hasPurchasedStarterPack || false;

  const handleStarterPackPurchase = async () => {
    if (!user) return;
    setStarterPackLoading(true);
    try {
      const updates: { [key: string]: any } = {};
      updates[`users/${user.uid}/hasPurchasedStarterPack`] = true;
      updates[`users/${user.uid}/coins`] = firebase.database.ServerValue.increment(5000);
      updates[`users/${user.uid}/gems`] = firebase.database.ServerValue.increment(100);
      const normalBird = BIRD_DEFINITIONS['B001'];
      if (normalBird) {
        updates[`users/${user.uid}/ownedBirds/B001`] = {
          id: normalBird.id, name: normalBird.name, rarity: normalBird.rarity,
          skillDescription: normalBird.skillDescription, skillPower: normalBird.baseAttackPower,
          level: 1, xp: 0, xpToNextLevel: normalBird.baseXpToNextLevel, icon: normalBird.icon,
          maxHealth: normalBird.baseHealth, powerLevel: 1, healthLevel: 1,
          abilityType: normalBird.abilityType, abilityValue: normalBird.abilityValue,
          abilityCooldown: normalBird.abilityCooldown, abilityDescription: normalBird.abilityDescription,
        };
      }
      updates[`users/${user.uid}/inventory/insects/I001`] = firebase.database.ServerValue.increment(10);
      await rtdb.ref().update(updates);
      toast.success('🔥 Starter Pack Purchased! Check your inventory!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setStarterPackLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-xl text-center font-bold text-yellow-400 flex-shrink-0 mb-2">Store</h2>

      {/* Starter Pack Banner */}
      {!hasStarterPack ? (
        <div className="flex-shrink-0 mb-2 p-3 bg-gradient-to-r from-orange-600/30 via-amber-600/20 to-orange-600/30 border-2 border-orange-400 rounded-lg shadow-[0_0_15px_rgba(251,146,60,0.2)] relative overflow-hidden group cursor-pointer" onClick={handleStarterPackPurchase}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-5xl drop-shadow-lg">🎁</span>
              <Sparkles size={16} className="absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-orange-300 flex items-center gap-1">
                🔥 STARTER PACK
                <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">LIMITED</span>
              </h3>
              <p className="text-[10px] text-gray-300 mt-0.5">Common Bird • 100 Gems • 5,000 Coins • 10 Insects</p>
              <div className="flex gap-2 mt-1">
                {[
                  { icon: '🐦', label: 'Tappy' },
                  { icon: '💎', label: '100 Gems' },
                  { icon: '💰', label: '5,000' },
                  { icon: '🐛', label: 'x10' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded-full text-[9px]">
                    <span>{item.icon}</span>
                    <span className="text-gray-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-lg font-bold text-orange-400">৳50</div>
              <Button className="!py-1 !px-3 !text-[10px] !bg-orange-500 !border-orange-400 hover:!bg-orange-600" disabled={starterPackLoading}>
                {starterPackLoading ? <Spinner /> : 'BUY'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 mb-2 p-2 bg-gray-800/50 border border-gray-600 rounded-lg text-center">
          <p className="text-[11px] text-gray-400">✅ Starter Pack purchased</p>
        </div>
      )}

      <div className="flex border-b-2 border-black flex-shrink-0">
        <button 
          onClick={() => setActiveTab('BIRDS')}
          className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'BIRDS' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
            Birds
        </button>
        <button 
          onClick={() => setActiveTab('FOOD')}
          className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'FOOD' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
            Food
        </button>
        <button 
          onClick={() => setActiveTab('EMOTE_GIFT')}
          className={`flex-1 py-2 font-bold text-xs sm:text-sm transition-colors ${activeTab === 'EMOTE_GIFT' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}
        >
            Items
        </button>
      </div>

      {error && <p className="text-red-400 text-center text-xs mt-2">{error}</p>}
      
      <div className="flex-grow overflow-y-auto p-2">
        {contentLoading ? <div className="flex justify-center p-8"><Spinner/></div> :
            displayedItems.length === 0 ? <p className="text-center text-gray-400 py-8">No items available in this category.</p> :
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {displayedItems.map(item => {
                const hasEnoughCoins = !item.cost.coins || (player.coins ?? 0) >= item.cost.coins;
                const hasEnoughGems = !item.cost.gems || (player.gems ?? 0) >= item.cost.gems;
                const canAfford = hasEnoughCoins && hasEnoughGems;
                const style = tierStyles[item.tier];
                const isBirdOwned = item.type === 'bird' && !!(player.ownedBirds && player.ownedBirds[item.payload.birdId]);
                const isEmoteOwned = item.type === 'emote' && !!(player.ownedEmotes && player.ownedEmotes.includes(item.payload.emote));
                const birdDef = item.type === 'bird' ? BIRD_DEFINITIONS[item.payload.birdId] : null;
                const birdIcon = item.type === 'bird' ? { id: item.payload.birdId, icon: item.icon, name: item.name } : null;

                return (
                <div key={item.id} className={`p-2 ${style.bg} border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col justify-between space-y-2`}>
                    <div className={`-m-2 mb-1 p-1 text-center border-b-2 border-black ${style.border}`}>
                        <h3 className="font-bold text-xs truncate">{item.name}</h3>
                    </div>
                    <div className="flex-grow flex flex-col justify-center items-center gap-1">
                        <div className="text-center">
                            {birdIcon ? (
                                <BirdIcon bird={birdIcon} className="text-4xl" imgClassName="w-10 h-10 mx-auto" />
                            ) : (
                                <span className="text-4xl block">{item.icon}</span>
                            )}
                            <div className="mt-1">
                                <p className="text-[10px] text-gray-200 leading-tight line-clamp-2">{item.description}</p>
                                {birdDef && (
                                    <div className="mt-1">
                                        <p className="text-[9px] text-gray-400">POWER</p>
                                        <p className="font-bold text-yellow-400 text-sm flex items-center justify-center gap-1"><Swords size={14} /> {birdDef.baseAttackPower}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button 
                        onClick={() => handlePurchase(item)} 
                        disabled={loading || !canAfford || isBirdOwned || isEmoteOwned}
                        className="w-full !py-1 !text-[10px] flex items-center justify-center gap-1"
                    >
                        {loading ? <Spinner /> : 
                            isBirdOwned || isEmoteOwned ? 'Owned' :
                            item.cost.coins ? <><Coins size={12} /> {item.cost.coins}</> : <><Gem size={12} /> {item.cost.gems}</>
                        }
                    </Button>
                </div>
                )
            })}
            </div>
        }
      </div>
    </div>
  );
};

export default StoreScreen;
