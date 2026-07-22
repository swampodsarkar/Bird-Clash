
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// Fix: Removed 'Team' from import as Duo matchmaking is deprecated.
import { ScrollText, Ticket, Dices, Trophy, Users, Calendar, Medal, Lock, Coins, Gem, Star } from 'lucide-react';
import type { Player, Match, ChatMessage, Bird, Friend, UserPresence, MailItem, CustomRoom, RoomInvite } from '../types';
import SettingsModal from './common/SettingsModal';
import { auth, rtdb } from '../services/firebase';
// Fix: Removed unused Duo matchmaking functions.
import { cancelMatchmaking } from '../services/gameService';
import * as playerService from '../services/playerService';
import { claimDailyMembershipRewards } from '../services/purchaseService';
import StoreScreen from './StoreScreen';
import BirdsScreen from './BirdsScreen';
import RoyalePassScreen from './RoyalePassScreen';
import ProfileScreen from './ProfileScreen';
import EsportsScreen from './EsportsScreen';
import PlayerAvatar from './common/PlayerAvatar';
import TopUpSelectionModal from './common/TopUpSelectionModal';
import Leaderboard from './Leaderboard';
import SocialScreen from './SocialScreen';
import QuestsScreen from './QuestsScreen';
import { useRealtime } from '../hooks/useRealtime';
import MailboxModal from './common/MailboxModal';
import LuckRoyaleScreen from './LuckRoyaleScreen';
import BottomNav from './common/BottomNav';
import PublicProfileScreen from './PublicProfileScreen';
import Button from './common/Button';
import { useGameConfig } from '../hooks/useGameConfig';
import { Spinner } from './common/Spinner';
import { toast } from 'react-toastify';
import MembershipClaimModal from './common/MembershipClaimModal';
import firebase from 'firebase/compat/app';
import { DAILY_QUESTS } from '../constants';
import PlayerRankDisplay from './common/PlayerRankDisplay';
import SeasonalEventModal from './common/SeasonalEventModal';
import { useSettings } from '../hooks/useSettings';
import EventsModal from './common/EventsModal';
import { isWinterThemeActive } from '../utils/helpers';
import { useContentConfig } from '../hooks/useContentConfig';
import Snowfall from './common/Snowfall';
import CustomRoomModal from './common/CustomRoomModal';
import LottieBird from './common/LottieBird';
import { ReferralModal } from './common/ReferralModal';
import { LimitedEventBanner } from './common/LimitedEventBanner';
import { applyReferralCode } from '../services/referralService';


type Tab = 'CHALLENGE' | 'QUESTS' | 'BIRDS' | 'STORE' | 'ROYALE_PASS' | 'LUCK_ROYALE' | 'SOCIAL' | 'LEADERBOARD' | 'ESPORTS' | 'PROFILE';

interface DashboardProps {
    playerData: Player;
    onStartMatchmaking: () => void;
    onStartSpectating: (matchId: string) => void;
    onStartMinigame: () => void;
    onEnterRoom: (room: CustomRoom) => void;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const prevValueRef = useRef(value);

    useEffect(() => {
        if (prevValueRef.current === value) return;
        const start = prevValueRef.current;
        const end = value;
        const duration = 500;
        let startTime: number | null = null;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCurrentValue(Math.floor(start + (end - start) * progress));
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                prevValueRef.current = value;
            }
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span>{currentValue}</span>;
};

const SettingsIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756.2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const MailIcon: React.FC<{ hasUnread: boolean }> = ({ hasUnread }) => <div className="relative"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{hasUnread && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-bounce"></div>}</div>;
const LogoutIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

// Side Icon Button
const SidebarButton: React.FC<{icon: React.ReactNode, label: string, onClick: () => void, indicator?: boolean, isLocked?: boolean, unlockLevel?: number}> = ({icon, label, onClick, indicator, isLocked, unlockLevel}) => (
    <button 
        onClick={isLocked ? undefined : onClick} 
        className={`w-12 h-12 sm:w-36 sm:h-10 border-2 rounded-lg flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-0.5 sm:px-2 sm:gap-2 backdrop-blur-md transition-all duration-200 relative shadow-lg group active:scale-95
        ${isLocked ? 'bg-gray-800/80 border-gray-600 text-gray-500 cursor-not-allowed' : 'bg-black/60 border-gray-600 text-white hover:bg-black/80 hover:border-yellow-400 hover:text-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]'}`}
    >
        {indicator && !isLocked && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse shadow-lg"></div>}
        
        {isLocked && <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg z-10"><Lock size={16} className="text-gray-400" /></div>}
        
        <span className="sm:w-6 text-center drop-shadow-md group-hover:scale-110 transition-transform duration-200 flex justify-center">{icon}</span>
        <div className="flex flex-col items-center sm:items-start">
            <span className="text-[8px] sm:text-[10px] font-bold font-pixel tracking-wider">{label}</span>
            {isLocked && unlockLevel && <span className="hidden sm:block text-[8px] text-red-300 font-bold uppercase">Lvl {unlockLevel}</span>}
        </div>
    </button>
);

const getPrimeLevel = (totalGemsToppedUp: number = 0): number => {
    if (totalGemsToppedUp >= 20000) return 8;
    if (totalGemsToppedUp >= 15000) return 7;
    if (totalGemsToppedUp >= 10000) return 6;
    if (totalGemsToppedUp >= 5000) return 5;
    if (totalGemsToppedUp >= 4000) return 4;
    if (totalGemsToppedUp >= 3000) return 3;
    if (totalGemsToppedUp >= 2000) return 2;
    if (totalGemsToppedUp >= 1000) return 1;
    return 0;
};


const PrimeLevelDisplay: React.FC<{ level: number }> = ({ level }) => {
    if (level === 0) return null;

    return (
        <div className="ff-prime-level" title={`Prime Level ${level}`}>
            <span className="ff-prime-level-icon"><Star size={14} fill="currentColor" /></span>
            <span className="ff-prime-level-text">{level}</span>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = (props) => {
    const { playerData, onStartMatchmaking, onEnterRoom } = props;
    const config = useGameConfig();
    const { lobbyBackground } = useContentConfig();
    const { musicVolume } = useSettings();
    const [activeTab, setActiveTab] = useState<Tab>('CHALLENGE');
    const [selectedMode, setSelectedMode] = useState<'rank' | 'minigame'>('rank');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [isMailboxOpen, setIsMailboxOpen] = useState(false);
    const [mailItems, setMailItems] = useState<MailItem[]>([]);
    const winterThemeActive = isWinterThemeActive();
  const [isCustomRoomModalOpen, setIsCustomRoomModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  
  const [hasUnreadGlobalMessages, setHasUnreadGlobalMessages] = useState(false);

    const { notifications } = useRealtime();
    const [viewingProfileUid, setViewingProfileUid] = useState<string | null>(null);
    const [matchmakingError, setMatchmakingError] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [membershipModalInfo, setMembershipModalInfo] = useState<{type: 'weekly' | 'monthly'} | null>(null);
    const [isWinterverseModalOpen, setIsWinterverseModalOpen] = useState(false);
    const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
    const musicStarted = useRef(false);

    useEffect(() => {
        const hideModal = sessionStorage.getItem('hideWinterverseModal') === 'true';
        if (!hideModal) {
            // Add a small delay to make it feel less abrupt on login
            setTimeout(() => setIsWinterverseModalOpen(true), 1000);
        }
    }, []);
    
    const NOTIF_STORAGE_KEY = `birdclash-lastReadNotifTimestamp-${playerData.uid}`;
    const hasUnreadGlobalNotifs = useMemo(() => {
        if (notifications.length > 0) {
            const lastReadTimestamp = parseInt(localStorage.getItem(NOTIF_STORAGE_KEY) || '0', 10);
            return notifications[0].timestamp > lastReadTimestamp;
        }
        return false;
    }, [notifications, NOTIF_STORAGE_KEY]);

    useEffect(() => {
        const unsub = playerService.listenToMail(playerData.uid, setMailItems);
        return () => unsub();
    }, [playerData.uid]);

    const hasUnreadMail = useMemo(() => mailItems.some(item => item.status === 'unread'), [mailItems]);

    const isWeeklyActive = playerData.weeklyMembershipExpires && playerData.weeklyMembershipExpires > Date.now();
    const isMonthlyActive = playerData.monthlyMembershipExpires && playerData.monthlyMembershipExpires > Date.now();

    useEffect(() => {
        const audioEl = document.getElementById('lobby-music') as HTMLAudioElement;
        if (!audioEl) return;
    
        const targetUrl = config.lobbyMusicUrl || 'https://cdn.pixabay.com/download/audio/2022/08/04/audio_2d81b016b8.mp3';
        if (audioEl.src !== targetUrl) {
            audioEl.src = targetUrl;
            audioEl.load();
        }
    
        audioEl.volume = musicVolume;
    
        const playMusic = () => {
            if (musicStarted.current || !audioEl.paused) {
                // If music is already considered started or is not paused, cleanup and exit.
                document.removeEventListener('click', playMusic);
                document.removeEventListener('touchstart', playMusic);
                return;
            }
    
            const playPromise = audioEl.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    musicStarted.current = true;
                    // On success, cleanup listeners.
                    document.removeEventListener('click', playMusic);
                    document.removeEventListener('touchstart', playMusic);
                }).catch(error => {
                    console.log("Lobby music autoplay prevented. Awaiting user interaction.");
                    // On failure, ensure listeners are attached (they are added below).
                });
            }
        };
    
        // Attach interaction listeners immediately as a fallback for autoplay policies.
        // They will be removed once music successfully plays.
        document.addEventListener('click', playMusic, { once: true });
        document.addEventListener('touchstart', playMusic, { once: true });
    
        // Attempt to play right away.
        playMusic();
    
        // Cleanup function for when the component unmounts.
        return () => {
            if (audioEl) {
                audioEl.pause();
            }
            musicStarted.current = false; // Reset for next time dashboard mounts.
            document.removeEventListener('click', playMusic);
            document.removeEventListener('touchstart', playMusic);
        };
    }, [musicVolume, config.lobbyMusicUrl]);

    const hasClaimableQuests = useMemo(() => {
        if (!playerData.quests) return false;
        return DAILY_QUESTS.some(quest => {
            const progress = playerData.quests?.progress[quest.id];
            return progress && progress.progress >= quest.target && !progress.claimed;
        });
    }, [playerData.quests]);

    const isDailyClaimAvailable = useMemo(() => {
        const now = Date.now();
        const todayStr = new Date(now).toISOString().split('T')[0];
        const weeklyActive = playerData.weeklyMembershipExpires && playerData.weeklyMembershipExpires > now;
        const weeklyClaimed = playerData.weeklyClaims?.includes(todayStr);
        const monthlyActive = playerData.monthlyMembershipExpires && playerData.monthlyMembershipExpires > now;
        const monthlyClaimed = playerData.monthlyClaims?.includes(todayStr);
        return (weeklyActive && !weeklyClaimed) || (monthlyActive && !monthlyClaimed);
    }, [playerData]);

    const equippedBird = useMemo(() => {
        if (!playerData.ownedBirds) return null;
        const birdId = playerData.equippedBirdId;
        if (birdId && playerData.ownedBirds[birdId]) return playerData.ownedBirds[birdId];
        const allBirds = Object.values(playerData.ownedBirds);
        return allBirds.length > 0 ? allBirds[0] : null;
    }, [playerData.ownedBirds, playerData.equippedBirdId]);

    const handleToggleMailbox = () => {
        setIsMailboxOpen(prev => !prev);
        if (!isMailboxOpen && notifications.length > 0) {
            localStorage.setItem(NOTIF_STORAGE_KEY, notifications[0].timestamp.toString());
        }
    };
    
    const handleClaim = async () => {
        if (!playerData.uid) return;
        setIsClaiming(true);
        try { const message = await claimDailyMembershipRewards(playerData.uid); toast.success(message); } 
        catch (e: any) { toast.error(e.message); } 
        finally { setIsClaiming(false); }
    };

    const handleStartSoloMatchmaking = () => {
        if (playerData.isBlacklisted) {
            toast.warn("⚠️ This ID is under suspicious activity. You can’t play ranked matches at the moment.");
            return;
        }
        if (!equippedBird) { toast.error("Please equip a bird from your Collection first!"); return; }
        setMatchmakingError(null);
        const fee = config.RANK_ENTRY_FEE_COINS;
        if (playerData.coins < fee) {
            const errorMsg = `Not enough coins! You need ${fee} to play.`;
            setMatchmakingError(errorMsg);
            toast.error(errorMsg);
            return;
        }
        onStartMatchmaking();
    };

    const hasBirds = playerData.ownedBirds && Object.keys(playerData.ownedBirds).length > 0;
    const primeLevel = getPrimeLevel(playerData.totalGemsToppedUp);
    
    // Feature Locking Logic for NPE
    const playerLevel = playerData.level || 1;
    const isSocialLocked = playerLevel < 3;
    const isEventsLocked = playerLevel < 5;
    const isEsportsLocked = playerLevel < 10;

    const renderPanelContent = () => {
        const panelProps = { player: playerData };
        switch(activeTab) {
            case 'STORE': return <StoreScreen {...panelProps} />;
            case 'BIRDS': return <BirdsScreen {...panelProps} />;
            case 'SOCIAL': return <SocialScreen player={playerData} onStartSpectating={props.onStartSpectating} onViewProfile={setViewingProfileUid} />;
            case 'PROFILE': return <ProfileScreen {...panelProps} />;
            case 'ROYALE_PASS': return <RoyalePassScreen {...panelProps} />;
            case 'ESPORTS': return <EsportsScreen {...panelProps} />;
            case 'LEADERBOARD': return <Leaderboard onViewProfile={setViewingProfileUid} />;
            case 'LUCK_ROYALE': return <LuckRoyaleScreen {...panelProps} />;
            case 'QUESTS': return <QuestsScreen {...panelProps} />;
            default: return null;
        }
    };

    const showContentPanel = activeTab !== 'CHALLENGE';
    
    return (
        <div className="w-full h-full flex flex-col relative screen-enter" style={{ 
            backgroundImage: winterThemeActive 
                ? 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)' 
                : `url('${lobbyBackground}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}>
            {winterThemeActive && <Snowfall />}
            {/* Header - Polished HUD - Reduced Padding */}
            <header className="px-2 py-1 flex-shrink-0 flex flex-wrap items-center justify-between gap-2 bg-black/40 backdrop-blur-md border-b border-white/10 z-10 shadow-lg">
                {/* Player Info */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setActiveTab('PROFILE')} className="flex items-center space-x-2 text-left hover:scale-105 transition-transform duration-200">
                        <PlayerAvatar photoURL={playerData.photoURL} uid={playerData.uid} activeBadge={playerData.activeBadge} sizeClassName="w-10 h-10 md:w-12 md:h-12" imgClassName="border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] rounded-lg"/>
                        <div>
                            <h2 className="text-xs md:text-sm font-bold font-pixel whitespace-nowrap text-white drop-shadow-md">{playerData.displayName || 'Player'}</h2>
                             <div className="w-20 h-3 bg-gray-900 border border-gray-600 rounded-full mt-0.5 relative overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full" 
                                  style={{ width: `${((playerData.xp || 0) / (playerData.xpToNextLevel || 100)) * 100}%` }}
                                ></div>
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white uppercase tracking-wider drop-shadow-md">LVL {playerData.level || 1}</span>
                            </div>
                        </div>
                    </button>
                    {primeLevel > 0 && <PrimeLevelDisplay level={primeLevel} />}
                    <PlayerRankDisplay player={playerData} className="ml-1 scale-100" />
                </div>

                {/* Actions and Currency */}
                <div className="flex items-center justify-end flex-wrap gap-2 flex-grow">
                    {isDailyClaimAvailable && <Button onClick={handleClaim} disabled={isClaiming} variant="success" className="!py-1 !px-2 !text-[10px] font-bold animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]">{isClaiming ? <Spinner /> : 'CLAIM'}</Button>}
                    
                    <div className="ff-currency-box text-yellow-400 !text-sm !py-1 !px-2">
                        <span className="text-lg"><Coins size={18} /></span>
                        <AnimatedNumber value={playerData.coins} />
                    </div>
                    
                    <div className="ff-gem-box text-purple-400 !text-sm !py-1 !px-2 !pr-6">
                        <span className="text-lg"><Gem size={18} /></span>
                        <AnimatedNumber value={playerData.gems} />
                        <button onClick={() => setIsTopUpModalOpen(true)} className="ff-topup-button" aria-label="Top up gems">+</button>
                    </div>

                    {isWeeklyActive && <div onClick={() => setMembershipModalInfo({ type: 'weekly' })} className="ff-membership-card glow-w text-base" title={`Weekly Pass Active. Expires: ${new Date(playerData.weeklyMembershipExpires!).toLocaleDateString()}`}>W</div>}
                    {isMonthlyActive && <div onClick={() => setMembershipModalInfo({ type: 'monthly' })} className="ff-membership-card glow-m text-base" title={`Monthly Pass Active. Expires: ${new Date(playerData.monthlyMembershipExpires!).toLocaleDateString()}`}>M</div>}
                    
                    <div className="flex items-center gap-1 ml-1 bg-black/40 p-1 rounded-xl border border-white/10">
                      <button onClick={handleToggleMailbox} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors relative group" aria-label="Mailbox">
                          <MailIcon hasUnread={hasUnreadMail || hasUnreadGlobalNotifs} />
                      </button>
                      <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Settings">
                          <SettingsIcon />
                      </button>
                      <button onClick={() => auth.signOut()} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" aria-label="Logout">
                          <LogoutIcon />
                      </button>
                    </div>
                </div>
            </header>

            {/* Main View - Tighter layout */}
            <main className="flex-grow flex flex-row overflow-hidden">
                {/* Left Sidebar - Reduced gaps and sizes */}
                <div className="flex flex-col gap-1 justify-center p-1 sm:p-2 ml-1">
                    <SidebarButton icon={<ScrollText size={20} />} label="Quests" onClick={() => setActiveTab('QUESTS')} indicator={hasClaimableQuests} />
                    <SidebarButton icon={<Ticket size={20} />} label="Pass" onClick={() => setActiveTab('ROYALE_PASS')} />
                    <SidebarButton icon={<Dices size={20} />} label="Royale" onClick={() => setActiveTab('LUCK_ROYALE')} />
                    <SidebarButton icon={<Trophy size={20} />} label="Ranks" onClick={() => setActiveTab('LEADERBOARD')} />
                    
                    <SidebarButton icon={<Users size={20} />} label="Social" onClick={() => setActiveTab('SOCIAL')} isLocked={isSocialLocked} unlockLevel={3} />
                    <SidebarButton icon={<Calendar size={20} />} label="Events" onClick={() => setIsEventsModalOpen(true)} indicator={true} isLocked={isEventsLocked} unlockLevel={5} />
                    <SidebarButton icon={<Medal size={20} />} label="Esports" onClick={() => setActiveTab('ESPORTS')} isLocked={isEsportsLocked} unlockLevel={10} />
                    <SidebarButton icon={<span style={{fontSize:20}}>🎁</span>} label="Refer" onClick={() => setIsReferralModalOpen(true)} />
                </div>

                {/* Central Content Area - Reduced Bird Scale and Padding */}
                <div className="flex-grow flex flex-col gap-1 p-1 overflow-hidden relative">
                    <LimitedEventBanner onEventClick={(event) => toast.info(`${event.title}: ${event.description}`)} />
                     <div className="flex-grow flex items-center justify-center relative">
                        {equippedBird ? (
                            <div className="text-center group">
                                <LottieBird
                                    bird={equippedBird}
                                    size="xl"
                                    animated={true}
                                />
                                <h2 className="name !text-xl sm:!text-3xl mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{equippedBird.name}</h2>
                            </div>
                        ) : (
                            <div className="text-center p-4 rounded-xl bg-black/60 backdrop-blur-sm border-2 border-yellow-500/30">
                                <p className="font-pixel text-xl text-yellow-400">Welcome!</p>
                                <p className="mt-2 text-sm text-gray-300">Visit the <span className="font-bold text-white">Store</span> to get started.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Controls and Buttons - Compact */}
                    <div className="flex-shrink-0 max-w-sm mx-auto w-full flex flex-col justify-center items-center gap-2 p-2 mb-2">
                        <div className="w-full p-2 bg-black/70 backdrop-blur-md space-y-2 border border-yellow-500/30 rounded-xl shadow-2xl">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setSelectedMode('rank')}
                                    className={`p-1.5 border-2 rounded-lg transition-all duration-200 ${selectedMode === 'rank' ? 'bg-yellow-500/20 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'bg-black/40 border-gray-600 hover:border-gray-400 hover:bg-black/60'}`}
                                >
                                    <p className="font-pixel text-xs md:text-sm text-white">RANKED</p>
                                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">1v1 Battle</p>
                                </button>
                                <button
                                    onClick={() => setSelectedMode('squad')}
                                    className={`p-1.5 border-2 rounded-lg transition-all duration-200 ${selectedMode === 'squad' ? 'bg-yellow-500/20 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'bg-black/40 border-gray-600 hover:border-gray-400 hover:bg-black/60'}`}
                                >
                                    <p className="font-pixel text-xs md:text-sm text-white">SQUAD</p>
                                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">2v2 Battle</p>
                                </button>
                                <button
                                    onClick={() => setSelectedMode('minigame')}
                                    className={`p-1.5 border-2 rounded-lg transition-all duration-200 ${selectedMode === 'minigame' ? 'bg-yellow-500/20 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'bg-black/40 border-gray-600 hover:border-gray-400 hover:bg-black/60'}`}
                                >
                                    <p className="font-pixel text-xs md:text-sm text-white">MINI GAME</p>
                                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">Coin Rush</p>
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    onClick={() => setIsCustomRoomModalOpen(true)}
                                    className="w-full !py-2 !text-xs !font-bold"
                                    variant="secondary"
                                >
                                    ROOM
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (selectedMode === 'rank') {
                                            handleStartSoloMatchmaking();
                                        } else if (selectedMode === 'squad') {
                                            if (playerData.dynamicDuo?.status === 'active') {
                                                handleStartSoloMatchmaking();
                                                toast.info("Squad mode: inviting duo partner...");
                                            } else {
                                                toast.info("You need an active Dynamic Duo to play Squad mode! Go to Social tab.");
                                            }
                                        } else if (selectedMode === 'minigame') {
                                            props.onStartMinigame();
                                        }
                                    }}
                                    disabled={!hasBirds && selectedMode === 'rank'}
                                    className="w-full col-span-2 !py-2 !text-base !font-bold !tracking-widest"
                                >
                                    START
                                </Button>
                            </div>

                            {matchmakingError && <p className="text-red-400 text-[10px] font-bold text-center bg-red-900/30 p-0.5 rounded">{matchmakingError}</p>}
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Nav - Hidden on larger screens */}
            <div className="sm:hidden">
              <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} hasUnreadGlobalMessages={hasUnreadGlobalMessages} />
            </div>

             {/* Modal-like Panel for other tabs - Full Height optimization */}
             {showContentPanel && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex items-center justify-center p-1 sm:p-4" onClick={() => setActiveTab('CHALLENGE')}>
                    <div className="w-full h-full max-w-7xl max-h-[98vh] bg-[#1a1a2e] border-2 border-yellow-500/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col rounded-xl overflow-hidden screen-enter" onClick={e => e.stopPropagation()}>
                        <div className="p-2 flex-shrink-0 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-gray-900 to-[#1a1a2e]">
                            <h2 className="font-pixel text-lg sm:text-xl text-yellow-400 tracking-wider drop-shadow-sm">{activeTab.replace('_', ' ')}</h2>
                            <button onClick={() => setActiveTab('CHALLENGE')} className="text-2xl hover:text-yellow-400 transition-colors text-gray-400">&times;</button>
                        </div>
                        <div className="flex-grow overflow-hidden flex flex-col p-1 sm:p-2 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                            {renderPanelContent()}
                        </div>
                    </div>
                </div>
            )}

            <MailboxModal isOpen={isMailboxOpen} onClose={handleToggleMailbox} player={playerData} globalNotifications={notifications} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <TopUpSelectionModal isOpen={isTopUpModalOpen} onClose={() => setIsTopUpModalOpen(false)} player={playerData} />
            {viewingProfileUid && <PublicProfileScreen uid={viewingProfileUid} onClose={() => setViewingProfileUid(null)} />}
            <MembershipClaimModal isOpen={!!membershipModalInfo} onClose={() => setMembershipModalInfo(null)} player={playerData} type={membershipModalInfo?.type || 'weekly'}/>
            <SeasonalEventModal isOpen={isWinterverseModalOpen} onClose={() => setIsWinterverseModalOpen(false)} />
            <EventsModal isOpen={isEventsModalOpen} onClose={() => setIsEventsModalOpen(false)} player={playerData} />
            <CustomRoomModal 
                isOpen={isCustomRoomModalOpen} 
                onClose={() => setIsCustomRoomModalOpen(false)} 
                player={playerData}
                onEnterRoom={onEnterRoom}
            />
            {isReferralModalOpen && (
                <ReferralModal
                    player={playerData}
                    onClose={() => setIsReferralModalOpen(false)}
                    onApplyCode={async (code) => {
                        await applyReferralCode(playerData.uid, code);
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;
