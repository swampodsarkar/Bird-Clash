
import React, { useState, useMemo } from 'react';
import type { Player, Bird } from '../types';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { INSECT_DEFINITIONS } from '../constants';
import * as playerService from '../services/playerService';
import { toast } from 'react-toastify';
import { Spinner } from './common/Spinner';
import BirdIcon from './common/BirdIcon';
import { Coins, Heart, Swords, Mail, Tag, Video, Ticket } from 'lucide-react';

interface BirdsScreenProps {
  player: Player;
}

const MyBirdsView: React.FC<{ player: Player }> = ({ player }) => {
  const { user } = useAuth();
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [feeding, setFeeding] = useState(false);
  const [equipping, setEquipping] = useState(false);

  const ownedBirds = useMemo(() => {
    return player.ownedBirds ? Object.values(player.ownedBirds) : [];
  }, [player.ownedBirds]);

  const ownedInsects = useMemo(() => {
    return player.inventory?.insects ? Object.entries(player.inventory.insects) : [];
  }, [player.inventory?.insects]);

  const handleFeed = async (insectId: string) => {
    if (!user || !selectedBird || feeding) return;
    setFeeding(true);
    try {
      await playerService.feedBird(user.uid, selectedBird.id, insectId);
      toast.success(`${selectedBird.name} enjoyed the meal!`);
      setSelectedBird(null); // Close modal on success
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFeeding(false);
    }
  };

  const handleEquip = async (birdId: string) => {
    if (!user) return;
    setEquipping(true);
    try {
        await playerService.equipBird(user.uid, birdId);
        toast.success("Bird equipped!");
    } catch(e: any) {
        toast.error("Failed to equip bird.");
    } finally {
        setEquipping(false);
    }
  }

  const FeedModal: React.FC = () => {
    if (!selectedBird) return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBird(null)}>
        <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-center mb-3">Feed {selectedBird.name}</h3>
          {ownedInsects.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ownedInsects.map(([id, count]) => {
                const insectInfo = INSECT_DEFINITIONS[id];
                if (!insectInfo) return null;
                return (
                  <div key={id} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black">
                    <div className="flex items-center">
                        <span className="text-3xl mr-2 transition-transform duration-200 pseudo-3d-item">{insectInfo.icon}</span>
                        <div>
                            <p className="font-bold">{insectInfo.name} (x{count})</p>
                            <p className="text-xs text-yellow-300">+{insectInfo.xpValue} XP</p>
                        </div>
                    </div>
                    <Button onClick={() => handleFeed(id)} disabled={feeding} className="!py-1 !px-2 !text-xs">
                      Feed
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">You have no food! Buy some from the store.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {ownedBirds.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 overflow-y-auto p-1">
          {ownedBirds.map(bird => {
            const progress = bird.xpToNextLevel > 0 ? (bird.xp / bird.xpToNextLevel) * 100 : 100;
            const isEquipped = player.equippedBirdId === bird.id;
            return (
              <div key={bird.id} className="p-2 bg-[#2c2c54] border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col items-center text-center">
                  <div className="relative">
                    <BirdIcon bird={bird} className="text-4xl" imgClassName="w-12 h-12" />
                    {isEquipped && <span className="absolute -top-2 -right-2 text-xs bg-green-600 text-white px-1 rounded border border-black">EQP</span>}
                  </div>
                  
                  <div className="mt-1 w-full">
                      <h3 className="font-bold text-xs truncate">{bird.name}</h3>
                      <p className="text-[10px] text-gray-400">Lvl {bird.level}</p>
                  </div>

                  <div className="w-full bg-black h-2 border border-gray-600 my-1">
                    <div className="h-full bg-yellow-400 relative" style={{ width: `${progress}%` }}></div>
                  </div>
                  
                  <div className="flex gap-1 w-full mt-auto">
                     <Button onClick={() => handleEquip(bird.id)} disabled={isEquipped || equipping} variant={isEquipped ? 'secondary' : 'primary'} className="!py-0.5 !px-1 !text-[10px] flex-1">
                        {isEquipped ? 'Used' : 'Equip'}
                    </Button>
                    <Button onClick={() => setSelectedBird(bird)} className="!py-0.5 !px-1 !text-[10px] flex-1">Feed</Button>
                  </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center p-8">
          <p className="text-gray-400 text-sm">You don't own any birds yet.</p>
          <p className="text-gray-400 text-sm mt-1">Visit the <span className="font-bold text-yellow-400">Store</span> to get your first bird!</p>
        </div>
      )}
      <FeedModal />
    </div>
  );
};

const TrainingView: React.FC<{ player: Player }> = ({ player }) => {
    const { user } = useAuth();
    const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
    const [upgrading, setUpgrading] = useState<'skillPower' | 'maxHealth' | null>(null);

    const ownedBirds = useMemo(() => player.ownedBirds ? Object.values(player.ownedBirds) : [], [player.ownedBirds]);

    const handleUpgrade = async (stat: 'skillPower' | 'maxHealth') => {
        if (!user || !selectedBird || upgrading) return;
        setUpgrading(stat);
        try {
            await playerService.upgradeBirdStat(user.uid, selectedBird.id, stat);
            toast.success(`${stat === 'skillPower' ? 'Power' : 'Health'} upgraded!`);
            const updatedBird = player.ownedBirds?.[selectedBird.id];
            if (updatedBird) setSelectedBird(updatedBird);

        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setUpgrading(null);
        }
    };
    
    React.useEffect(() => {
        if (selectedBird) {
            const updatedBird = player.ownedBirds?.[selectedBird.id];
            if(updatedBird) setSelectedBird(updatedBird);
        }
    }, [player.ownedBirds, selectedBird]);

    if (selectedBird) {
        const powerLevel = selectedBird.powerLevel || 1;
        const healthLevel = selectedBird.healthLevel || 1;
        const powerCost = Math.floor(250 * Math.pow(powerLevel, 1.2));
        const healthCost = Math.floor(250 * Math.pow(healthLevel, 1.2));

        return (
             <div className="h-full flex flex-col p-2 space-y-2">
                 <div className="flex items-center gap-4 bg-[#2c2c54] p-3 border-2 border-black">
                    <BirdIcon bird={selectedBird} className="text-5xl" imgClassName="w-12 h-12" />
                    <div>
                      <h3 className="font-bold">{selectedBird.name} <span className="text-xs text-gray-400">(Lv. {selectedBird.level})</span></h3>
                    </div>
                </div>
                
                <div className="flex-grow space-y-2 overflow-y-auto">
                    <div className="p-3 bg-gray-900 border-2 border-black flex items-center justify-between">
                        <div>
                            <p className="font-bold">Skill Power <span className="text-xs text-gray-400">(Lvl {powerLevel})</span></p>
                            <p className="text-sm flex items-center gap-1"><Swords size={14} /> <span className="text-yellow-400">{selectedBird.skillPower}</span> → <span className="text-green-400">{selectedBird.skillPower + 5}</span></p>
                        </div>
                        <Button onClick={() => handleUpgrade('skillPower')} disabled={!!upgrading} className="!py-2 !text-xs flex items-center gap-1">
                            {upgrading === 'skillPower' ? <Spinner /> : <>Upgrade <Coins size={12} />{powerCost}</>}
                        </Button>
                    </div>
                     <div className="p-3 bg-gray-900 border-2 border-black flex items-center justify-between">
                        <div>
                            <p className="font-bold">Max Health <span className="text-xs text-gray-400">(Lvl {healthLevel})</span></p>
                            <p className="text-sm flex items-center gap-1"><Heart size={14} /> <span className="text-red-400">{selectedBird.maxHealth}</span> → <span className="text-green-400">{selectedBird.maxHealth + 20}</span></p>
                        </div>
                        <Button onClick={() => handleUpgrade('maxHealth')} disabled={!!upgrading} className="!py-2 !text-xs flex items-center gap-1">
                             {upgrading === 'maxHealth' ? <Spinner /> : <>Upgrade <Coins size={12} />{healthCost}</>}
                        </Button>
                    </div>
                </div>
                 <Button onClick={() => setSelectedBird(null)} variant="secondary" className="w-full mt-auto">Back</Button>
             </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <p className="text-center text-xs text-gray-300 p-2">Select a bird to train.</p>
            <div className="flex-grow overflow-y-auto space-y-2 p-1">
                {ownedBirds.map(bird => (
                    <button key={bird.id} onClick={() => setSelectedBird(bird)} className="w-full p-2 bg-[#2c2c54] border-2 border-black flex items-center gap-3 hover:bg-gray-800 transition-colors">
                        <BirdIcon bird={bird} className="text-4xl" imgClassName="w-10 h-10" />
                        <div className="text-left">
                            <h3 className="font-bold text-sm">{bird.name}</h3>
                            <div className="flex gap-2 text-xs">
                                <span className="flex items-center gap-1"><Swords size={12} /> {bird.skillPower}</span>
                                <span className="flex items-center gap-1"><Heart size={12} /> {bird.maxHealth}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const EmotesView: React.FC<{ player: Player }> = ({ player }) => {
    const { user } = useAuth();
    const [selectedEmotes, setSelectedEmotes] = useState<Set<string>>(() => new Set(player.equippedEmotes || []));
    const [saving, setSaving] = useState(false);

    const ownedEmotes = useMemo(() => player.ownedEmotes || [], [player.ownedEmotes]);

    const handleToggleEmote = (emote: string) => {
        setSelectedEmotes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(emote)) {
                newSet.delete(emote);
            } else if (newSet.size < 6) {
                newSet.add(emote);
            } else {
                toast.info("You can only equip up to 6 emotes.");
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await playerService.equipEmotes(user.uid, Array.from(selectedEmotes));
            toast.success("Emotes equipped!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div className="h-full flex flex-col space-y-4 overflow-y-auto p-1">
            <div className="p-2 bg-gray-900 border-2 border-black flex-shrink-0">
                <h3 className="font-bold text-center text-sm mb-2">Equipped ({selectedEmotes.size}/6)</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                    {Array.from(selectedEmotes).map(emote => (
                        <div key={emote} className="text-2xl p-1 bg-gray-800 rounded">{emote}</div>
                    ))}
                </div>
            </div>

            <div className="flex-grow space-y-2">
                <h3 className="font-bold text-center text-sm">Collection</h3>
                {ownedEmotes.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2">
                    {ownedEmotes.map(emote => (
                        <button 
                            key={emote}
                            onClick={() => handleToggleEmote(emote)}
                            className={`p-2 border-2 border-black text-2xl transition-all ${selectedEmotes.has(emote) ? 'bg-blue-600' : 'bg-gray-800'}`}
                        >
                            {emote}
                        </button>
                    ))}
                    </div>
                ) : (
                    <p className="text-center text-sm text-gray-400">Purchase emotes from the Store!</p>
                )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full flex-shrink-0">
                {saving ? <Spinner/> : "Save"}
            </Button>
        </div>
    );
};

const InventoryView: React.FC<{ player: Player }> = ({ player }) => {
  const inventoryItems = useMemo(() => [
    { name: 'Duo Card', icon: <Mail className="text-pink-400" size={24} />, description: 'Send Duo request.', count: player.dynamicDuoCards || 0 },
    { name: 'Name Change', icon: <Tag className="text-blue-400" size={24} />, description: 'Change display name.', count: player.nameChangeCards || 0 },
    { name: 'Room Card', icon: <Ticket className="text-yellow-400" size={24} />, description: 'Create custom room.', count: player.normalCustomCards || 0 },
    { name: 'Esports Card', icon: <Video className="text-green-400" size={24} />, description: 'Create esports room.', count: player.droneCustomCards || 0 },
  ], [player]);

  const hasItems = inventoryItems.some(item => item.count > 0);

  return (
    <div className="h-full overflow-y-auto p-1">
      {!hasItems ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">Your inventory is empty.</p>
          <p className="text-gray-400 text-sm mt-1">Get items from the <span className="font-bold text-yellow-400">Store</span>!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {inventoryItems.filter(item => item.count > 0).map(item => (
            <div key={item.name} className="p-2 bg-[#2c2c54] border-2 border-black shadow-[2px_2px_0px_#000000] flex flex-col items-center text-center gap-1">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <h3 className="font-bold text-xs">{item.name}</h3>
                <p className="text-[10px] text-gray-300 leading-tight">{item.description}</p>
                <p className="text-sm font-bold text-yellow-400 mt-1">x{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const BirdsScreen: React.FC<BirdsScreenProps> = ({ player }) => {
  const [activeTab, setActiveTab] = useState<'MY_BIRDS' | 'TRAINING' | 'MY_EMOTES' | 'INVENTORY'>('MY_BIRDS');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex border-b-2 border-black flex-shrink-0">
        <button onClick={() => setActiveTab('MY_BIRDS')} className={`flex-1 py-2 font-bold text-xs sm:text-sm ${activeTab === 'MY_BIRDS' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}>Birds</button>
        <button onClick={() => setActiveTab('TRAINING')} className={`flex-1 py-2 font-bold text-xs sm:text-sm ${activeTab === 'TRAINING' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}>Training</button>
        <button onClick={() => setActiveTab('MY_EMOTES')} className={`flex-1 py-2 font-bold text-xs sm:text-sm ${activeTab === 'MY_EMOTES' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}>Emotes</button>
         <button onClick={() => setActiveTab('INVENTORY')} className={`flex-1 py-2 font-bold text-xs sm:text-sm ${activeTab === 'INVENTORY' ? 'bg-yellow-400 text-black' : 'bg-[#2c2c54] text-white hover:bg-[#474787]'}`}>Items</button>
      </div>

      <div className="flex-grow overflow-hidden pt-2">
        {activeTab === 'MY_BIRDS' && <MyBirdsView player={player} />}
        {activeTab === 'TRAINING' && <TrainingView player={player} />}
        {activeTab === 'MY_EMOTES' && <EmotesView player={player} />}
        {activeTab === 'INVENTORY' && <InventoryView player={player} />}
      </div>
    </div>
  );
};

export default BirdsScreen;
