import React, { useState, useEffect } from 'react';
import { rtdb } from '../services/firebase';
// Fix: Add Bird to type import to resolve property access errors on unknown type.
import type { Player, Bird } from '../types';
import { BIRD_DEFINITIONS } from '../constants';
import { Spinner } from './common/Spinner';
import PlayerAvatar from './common/PlayerAvatar';
import Button from './common/Button';
import PlayerRankDisplay from './common/PlayerRankDisplay';
import BirdIcon from './common/BirdIcon';

interface PublicProfileScreenProps {
  uid: string;
  onClose: () => void;
}

const PublicProfileScreen: React.FC<PublicProfileScreenProps> = ({ uid, onClose }) => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                    {/* Fix: Explicitly type 'bird' as 'Bird' to resolve property access errors. */}
                    {ownedBirds.length > 0 ? ownedBirds.map((bird: Bird) => (
                        <div key={bird.id} title={`${bird.name} (Lvl ${bird.level})`} className="p-2 bg-gray-800 border-2 border-black flex flex-col items-center justify-center">
                            <BirdIcon bird={bird} className="text-4xl" imgClassName="w-10 h-10" />
                            <p className="text-xs text-gray-400">Lvl {bird.level}</p>
                        </div>
                    )) : <p className="col-span-full text-center text-sm text-gray-500 py-4">No birds yet.</p>}
                </div>
            </div>

            <Button onClick={onClose} variant="secondary" className="w-full">Close</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfileScreen;