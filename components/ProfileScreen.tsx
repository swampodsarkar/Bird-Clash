import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Player, MatchHistoryEntry } from '../types';
import Button from './common/Button';
import { rtdb } from '../services/firebase';
import * as playerService from '../services/playerService';
import { setActiveTitle, setActiveBadge, breakDuo, cancelDuoRequest, updatePlayerName, updateStatusMessage } from '../services/playerService';
import { Spinner } from './common/Spinner';
import PlayerRankDisplay from './common/PlayerRankDisplay';
import { toast } from 'react-toastify';
import { IMGBB_API_KEY } from '../constants';
import PlayerAvatar from './common/PlayerAvatar';
import { Crown, Shield, Video, Heart, Edit2, Medal, Coins, Gem, Swords, Flame, TrendingUp, TrendingDown, Star } from 'lucide-react';

interface ProfileScreenProps {
  player: Player;
}

const NFTCard: React.FC<{ name: string }> = ({ name }) => {
    const seed = name.replace(/\s+/g, '');
    const bgColor = 'bg-gradient-to-br from-purple-600 to-indigo-800';
    return (
        <div className={`p-2 border-2 border-black shadow-[4px_4px_0px_#000000] ${bgColor} text-center space-y-2 transform hover:scale-105 transition-transform duration-200`}>
            <div className="bg-black/20 p-1 border-2 border-black">
              <img 
                  src={`https://api.dicebear.com/7.x/pixel-art-neutral/svg?seed=${seed}&backgroundType=gradientLinear&backgroundColor=transparent`} 
                  alt={name}
                  className="w-full h-auto"
              />
            </div>
            <p className="text-xs font-bold leading-tight pb-1">{name}</p>
        </div>
    )
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000]">
        <h3 className="text-lg font-semibold mb-3 text-center">{title}</h3>
        {children}
    </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; value: number | string; label: string; color: string; }> = ({ icon, value, label, color }) => (
    <div className="p-2 bg-gray-900/50 border-2 border-black text-center flex flex-col items-center">
        <div className="mb-1">{icon}</div>
        <p className={`font-bold text-base ${color}`}>{value}</p>
        <p className="text-gray-400 text-[10px] uppercase">{label}</p>
    </div>
);

const BADGES_INFO: { [key in 'Owner' | 'Moderator' | 'Content Creator']: { icon: React.ReactNode; color: string } } = {
  'Owner': { icon: <Crown className="text-yellow-400" size={24} />, color: 'text-yellow-400' },
  'Moderator': { icon: <Shield className="text-blue-400" size={24} />, color: 'text-blue-400' },
  'Content Creator': { icon: <Video className="text-pink-400" size={24} />, color: 'text-pink-400' },
};

const NameChangeModal: React.FC<{ isOpen: boolean, onClose: () => void, currentName: string, onConfirm: (newName: string) => Promise<void> }> = ({ isOpen, onClose, currentName, onConfirm }) => {
    const [newName, setNewName] = useState(currentName);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(newName);
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3 text-yellow-400">Change Name</h3>
                <p className="text-center text-sm text-gray-300 mb-4">Using 1 Name Change Card.</p>
                <div className="space-y-4">
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New display name" className="pixel-input" maxLength={15} />
                    <div className="flex gap-4 pt-2">
                        <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                        <Button onClick={handleConfirm} disabled={loading} className="w-full">
                            {loading ? <Spinner /> : "Confirm"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}


const ProfileScreen: React.FC<ProfileScreenProps> = ({ player }) => {
    const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [statusInput, setStatusInput] = useState(player.statusMessage || '');
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setHistoryLoading(true);
            try {
                const historyRef = rtdb.ref(`matchHistory/${player.uid}`).orderByChild('timestamp').limitToLast(10);
                const snapshot = await historyRef.once('value');
                const historyData: MatchHistoryEntry[] = [];
                if(snapshot.exists()) {
                    snapshot.forEach(child => {
                        historyData.push(child.val());
                    });
                }
                setHistory(historyData.reverse());
            } catch (e) {
                console.error("Failed to fetch match history:", e);
            } finally {
                setHistoryLoading(false);
            }
        };
        fetchHistory();
    }, [player.uid]);

    const combatStats = useMemo(() => {
        if (history.length === 0) {
            return { totalMatches: 0, totalDamage: 0, winRate: 0, lossRate: 0 };
        }
        const wins = history.filter(h => h.outcome === 'win').length;
        const losses = history.filter(h => h.outcome === 'loss').length;
        const totalDamage = history.reduce((sum, h) => sum + h.myDamageDealt, 0);
        const totalMatches = history.length;
        
        return {
            totalMatches,
            totalDamage,
            winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
            lossRate: totalMatches > 0 ? Math.round((losses / totalMatches) * 100) : 0,
        };
    }, [history]);

    const handleSetTitle = async (title: string) => {
        const newTitle = player.activeTitle === title ? null : title;
        try {
            await setActiveTitle(player.uid, newTitle);
        } catch (e) {
            console.error("Failed to set active title:", e);
            alert("Could not set title. Please try again.");
        }
    }

    const handleSetBadge = async (badge: 'Owner' | 'Moderator' | 'Content Creator') => {
        const newBadge = player.activeBadge === badge ? null : badge;
        try {
            await setActiveBadge(player.uid, newBadge);
        } catch (e) {
            console.error("Failed to set active badge:", e);
            alert("Could not set badge. Please try again.");
        }
    };
    
    const handleBreakDuo = async () => {
        if (!window.confirm("Are you sure you want to break your Dynamic Duo?")) return;
        setActionLoading(true);
        try {
            await breakDuo(player);
            toast.info("Dynamic Duo has been broken.");
        } catch (e: any) { toast.error(e.message); } 
        finally { setActionLoading(false); }
    }
    const handleCancelDuo = async () => {
        setActionLoading(true);
        try {
            await cancelDuoRequest(player);
            toast.info("Duo request cancelled and your card has been refunded.");
        } catch (e: any) { toast.error(e.message); } 
        finally { setActionLoading(false); }
    }

    const handleSaveStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await updateStatusMessage(player.uid, statusInput);
            toast.success("Status updated!");
            setIsEditingStatus(false);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveName = async (newName: string) => {
        await updatePlayerName(player.uid, newName);
        toast.success("Display name updated successfully!");
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast.error("File is too large. Max size is 2MB.");
            return;
        }

        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed with status: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                console.error("ImgBB API Error:", result);
                throw new Error(result.error?.message || 'Image upload failed.');
            }

            const newPhotoURL = result.data.url;
            await playerService.updatePlayerPhotoURL(player.uid, newPhotoURL);
            toast.success("Profile picture updated!");
        } catch (err: any) {
            console.error("Upload error:", err);
            toast.error(err.message || "Failed to upload image.");
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };


    const renderDuoSection = () => {
        if (!player.dynamicDuo) return null;

        const { status, partnerDisplayName, since } = player.dynamicDuo;

        if (status === 'active') {
            const days = Math.floor((Date.now() - since) / (1000 * 60 * 60 * 24));
            return (
                <Section title="Dynamic Duo">
                    <div className="text-center space-y-3">
                        <p className="text-lg font-bold flex items-center justify-center gap-2">
                            {player.displayName} <Heart size={24} className="text-pink-400" /> {partnerDisplayName}
                        </p>
                        <p className="text-sm text-gray-300">Duo for <span className="font-bold">{days}</span> days</p>
                        <Button onClick={handleBreakDuo} variant="danger" disabled={actionLoading} className="!text-xs !py-1">
                            Break Duo
                        </Button>
                    </div>
                </Section>
            );
        }

        if (status === 'pending_sent') {
            return (
                 <Section title="Dynamic Duo">
                     <div className="text-center space-y-3">
                        <p>Duo request sent to <span className="font-bold">{partnerDisplayName}</span></p>
                        <Button onClick={handleCancelDuo} variant="danger" disabled={actionLoading} className="!text-xs !py-1">
                            Cancel Request
                        </Button>
                    </div>
                </Section>
            );
        }

        return null;
    }


  return (
    <div className="space-y-4 overflow-y-auto pb-8 h-full">
      <div className="flex justify-between items-start flex-wrap gap-y-2 px-2">
        <div className="space-y-1">
            <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                {player.displayName}
                {(player.nameChangeCards || 0) > 0 && 
                    <button onClick={() => setIsNameModalOpen(true)} title="Change Name" className="text-sm"><Edit2 size={14} /></button>
                }
            </h2>
            {player.activeTitle && <p className="text-sm text-yellow-300 -mt-1">{player.activeTitle}</p>}
             {isEditingStatus ? (
                <form onSubmit={handleSaveStatus} className="flex gap-2">
                    <input 
                        type="text" 
                        value={statusInput} 
                        onChange={e => setStatusInput(e.target.value)} 
                        className="pixel-input !py-1 !text-xs" 
                        maxLength={50}
                        autoFocus
                    />
                    <Button type="submit" variant="success" className="!py-1 !px-2 !text-xs" disabled={actionLoading}>Save</Button>
                    <Button type="button" onClick={() => setIsEditingStatus(false)} variant="secondary" className="!py-1 !px-2 !text-xs">X</Button>
                </form>
            ) : (
                <div className="flex items-center gap-2 text-sm text-gray-300 italic">
                    <p>"{player.statusMessage || 'No status set'}"</p>
                    <button onClick={() => setIsEditingStatus(true)} title="Edit Status" className="text-xs"><Edit2 size={12} /></button>
                </div>
            )}
        </div>
        <PlayerRankDisplay player={player} />
      </div>
       <div className="flex flex-col items-center text-center p-4 bg-gray-900/50 border-2 border-black">
        <div className="relative">
            <PlayerAvatar 
                photoURL={player.photoURL}
                uid={player.uid}
                activeBadge={player.activeBadge}
                sizeClassName="w-20 h-20"
                imgClassName="border-4 border-black"
            />
            <button
                onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-gray-900 border-2 border-yellow-400 rounded-full p-1.5 hover:bg-gray-700 disabled:opacity-50"
                aria-label="Change profile picture"
                disabled={uploadingPhoto}
            >
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                hidden
                accept="image/png, image/jpeg, image/gif"
                onChange={handlePhotoUpload}
            />
            {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Spinner />
                </div>
            )}
        </div>
      </div>

      <Section title={`Level ${player.level || 1}`}>
        <div className="w-full bg-black h-6 border-2 border-black p-0.5">
            <div
                className="h-full bg-yellow-400 transition-all duration-500 relative flex items-center justify-center"
                style={{ width: `${((player.xp || 0) / (player.xpToNextLevel || 100)) * 100}%` }}
            >
                <span className="text-black text-xs font-bold" style={{textShadow:'none'}}>
                    {player.xp || 0} / {player.xpToNextLevel || 100} XP
                </span>
            </div>
        </div>
      </Section>
      
      {renderDuoSection()}

      {/* Player Stats */}
      <Section title="My Stats">
        <div className="grid grid-cols-3 gap-2 text-sm">
            <StatCard icon={<Medal size={24} className="text-blue-400" />} value={player.rankPoints} label="Rank Points" color="text-blue-400" />
            <StatCard icon={<Coins size={24} className="text-yellow-400" />} value={player.coins} label="Coins" color="text-yellow-400" />
            <StatCard icon={<Gem size={24} className="text-purple-400" />} value={player.gems} label="Gems" color="text-purple-400" />
        </div>
      </Section>

      {/* Combat Stats */}
      <Section title="Combat Stats">
        <div className="grid grid-cols-2 gap-2 text-sm">
            <StatCard icon={<Swords size={24} className="text-gray-300" />} value={combatStats.totalMatches} label="Matches" color="text-gray-300" />
            <StatCard icon={<Flame size={24} className="text-orange-400" />} value={combatStats.totalDamage} label="Damage Dealt" color="text-orange-400" />
            <StatCard icon={<TrendingUp size={24} className="text-green-400" />} value={`${combatStats.winRate}%`} label="Win Rate" color="text-green-400" />
            <StatCard icon={<TrendingDown size={24} className="text-red-400" />} value={`${combatStats.lossRate}%`} label="Loss Rate" color="text-red-400" />
        </div>
      </Section>

      {/* Titles */}
       <Section title="My Titles">
          {(player.unlockedTitles || []).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(player.unlockedTitles || []).map((title) => {
                      const isActive = player.activeTitle === title;
                      return (
                          <button 
                              key={title} 
                              onClick={() => handleSetTitle(title)}
                              className={`p-2 border-2 border-black text-center text-xs font-bold transition-all duration-150 shadow-[2px_2px_0px_#000]
                                  ${isActive ? 'bg-yellow-400 text-black' : 'bg-gray-900 hover:bg-gray-800'}`
                              }
                          >
                              {title}
                          </button>
                      )
                  })}
              </div>
          ) : (
              <p className="text-center text-sm text-gray-400 py-4">No titles unlocked yet. Keep playing!</p>
          )}
      </Section>
      
        {/* Badges Section */}
        <Section title="My Badges">
            {(player.unlockedBadges || []).length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {(player.unlockedBadges || []).map((badge) => {
                        const isActive = player.activeBadge === badge;
                        const badgeInfo = BADGES_INFO[badge];
                        return (
                            <button 
                                key={badge} 
                                onClick={() => handleSetBadge(badge)}
                                className={`p-2 border-2 border-black text-center text-xs font-bold transition-all duration-150 shadow-[2px_2px_0px_#000]
                                    ${isActive ? 'bg-green-500 text-white' : 'bg-gray-900 hover:bg-gray-800'}`
                                }
                            >
                                <span className="flex justify-center">{badgeInfo?.icon || <Star size={24} className="text-yellow-400" />}</span>
                                <span className="block mt-1">{badge}</span>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <p className="text-center text-sm text-gray-400 py-4">No badges unlocked yet. Receive them as gifts!</p>
            )}
        </Section>

      {/* Match History */}
      <Section title="Match History">
          {historyLoading ? <div className="flex justify-center"><Spinner/></div> : 
           history.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {history.map(item => {
                      const outcomeColor = item.outcome === 'win' ? 'text-green-400' : item.outcome === 'loss' ? 'text-red-400' : 'text-gray-400';
                      const trophyColor = item.rankPointChange > 0 ? 'text-green-400' : item.rankPointChange < 0 ? 'text-red-400' : 'text-gray-400';

                      return (
                          <div key={item.matchId} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black text-xs">
                              <div className="flex items-center space-x-2">
                                  <img src={item.opponentPhotoURL} alt="opponent" className="w-8 h-8 bg-gray-700 border-2 border-black" />
                                  <div>
                                      <p className={`font-bold text-sm uppercase ${outcomeColor}`}>{item.outcome}</p>
                                      <p>vs. {item.opponentDisplayName}</p>
                                  </div>
                              </div>
                              <div className="text-right">
{/* Fix: Replaced non-existent 'myTaps' and 'opponentTaps' with 'myDamageDealt' and 'opponentDamageDealt' */}
                                  <p className="font-bold">{item.myDamageDealt} - {item.opponentDamageDealt}</p>
                                  {item.matchType === 'rank' && <p className={trophyColor}>{item.rankPointChange > 0 ? `+${item.rankPointChange}`: item.rankPointChange} RP</p>}
                              </div>
                          </div>
                      )
                  })}
              </div>
           ) : <p className="text-center text-sm text-gray-400 py-4">No matches played yet.</p>
          }
      </Section>

      {/* NFT Collection */}
      <Section title="NFT Collection">
        {player.nfts && player.nfts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {player.nfts.map((nftName, index) => (
                    <NFTCard key={`${nftName}-${index}`} name={nftName} />
                ))}
            </div>
        ) : (
            <div className="text-center py-4">
                <p className="text-gray-400 text-sm">You Don't have any cards.</p>
                <p className="text-gray-400 text-sm mt-1">Win them in the <span className="font-bold text-yellow-400">Luck Royale</span>!</p>
            </div>
        )}
      </Section>
        <NameChangeModal 
            isOpen={isNameModalOpen}
            onClose={() => setIsNameModalOpen(false)}
            currentName={player.displayName || ''}
            onConfirm={handleSaveName}
        />
    </div>
  );
};

export default ProfileScreen;