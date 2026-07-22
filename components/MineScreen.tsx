
import React, { useState, useMemo } from 'react';
import type { Player, Bird } from '../types';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { INSECT_DEFINITIONS } from '../constants';
import * as playerService from '../services/playerService';
import { toast } from 'react-toastify';

interface BirdsScreenProps {
  player: Player;
}

const BirdsScreen: React.FC<BirdsScreenProps> = ({ player }) => {
  const { user } = useAuth();
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [feeding, setFeeding] = useState(false);

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
        // The player object will update via listener, closing the modal
        setSelectedBird(null);
    } catch(e: any) {
        toast.error(e.message);
    } finally {
        setFeeding(false);
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
                                <div>
                                    <p className="font-bold">{insectInfo.icon} {insectInfo.name} (x{count})</p>
                                    <p className="text-xs text-yellow-300">+{insectInfo.xpValue} XP</p>
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
    )
  }

  return (
    <div className="p-4 space-y-4 text-center">
      <h2 className="text-2xl font-bold text-yellow-400">My Birds</h2>
      
      {ownedBirds.length > 0 ? (
        <div className="space-y-4">
            {ownedBirds.map(bird => {
                const progress = bird.xpToNextLevel > 0 ? (bird.xp / bird.xpToNextLevel) * 100 : 100;
                return (
                    <div key={bird.id} className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] text-left">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-5xl">{bird.icon}</span>
                                <div>
                                    <h3 className="font-bold">{bird.name} <span className="text-xs text-gray-400">(Lv. {bird.level})</span></h3>
                                    <p className="text-xs text-purple-300">{bird.skillDescription}</p>
                                    <p className="text-xs">Power: <span className="font-bold text-yellow-400">{bird.skillPower}</span></p>
                                </div>
                            </div>
                            <Button onClick={() => setSelectedBird(bird)} className="!py-2 !px-4">Feed</Button>
                        </div>
                        <div className="mt-3">
                            <div className="w-full bg-black h-4 border-2 border-black p-0.5">
                                <div className="h-full bg-yellow-400 transition-all duration-500 relative" style={{ width: `${progress}%` }}>
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black text-[10px] font-bold">{bird.xp}/{bird.xpToNextLevel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      ) : (
        <div className="text-center py-8">
            <p className="text-gray-400 text-sm">You don't own any birds yet.</p>
            <p className="text-gray-400 text-sm mt-1">Visit the <span className="font-bold text-yellow-400">Store</span> to get your first bird!</p>
        </div>
      )}
      <FeedModal />
    </div>
  );
};

export default BirdsScreen;