import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SettingsProvider } from './hooks/useSettings';
import AuthScreen from './components/AuthScreen';
import GameScreen from './components/GameScreen';
import ResultsScreen from './components/ResultsScreen';
import InviteNotificationModal from './components/common/InviteNotificationModal';
import { Spinner } from './components/common/Spinner';
import type { Match, Player, MatchResult, Invite, MatchPlayer, Bird, CustomRoom, RoomInvite } from './types';
import { findMatch, cancelMatchmaking, createBotMatch } from './services/gameService';
import * as roomService from './services/roomService';
import { listenToPlayer, updatePlayerCoins, completeTutorial } from './services/playerService';
import { updateUserMatchStatus } from './services/friendService';
import { rtdb } from './services/firebase';
import type firebase from 'firebase/compat/app';
import Button from './components/common/Button';
import { GameConfigProvider } from './hooks/useGameConfig';
import { RealtimeProvider, useRealtime } from './hooks/useRealtime';
import { ToastContainer, toast } from 'react-toastify';
import MaintenanceScreen from './components/common/MaintenanceScreen';
import BannedScreen from './components/common/BannedScreen';
import { useGameConfig } from './hooks/useGameConfig';
import { ContentConfigProvider, useContentConfig } from './hooks/useContentConfig';
import { ADMIN_UID, BIRD_DEFINITIONS } from './constants';
import AdminView from './components/admin/AdminView';
import Dashboard from './components/Dashboard';
import PostLoginLoadingScreen from './components/common/PostLoginLoadingScreen';
import PlayerAvatar from './components/common/PlayerAvatar';
import UpdateRequiredScreen from './components/common/UpdateRequiredScreen';
import CoinCollectorMinigame from './components/minigames/CoinCollectorMinigame';
import { getRankInfo, isWinterThemeActive } from './utils/helpers';
import TutorialModal from './components/common/TutorialModal';
import DailyRewardModal from './components/common/DailyRewardModal';
import Snowfall from './components/common/Snowfall';
import RoomView from './components/common/RoomView';
import RoomInviteNotificationModal from './components/common/RoomInviteNotificationModal';
import MatchmakingScreen from './components/MatchmakingScreen';


// --- Spectate Screen Component ---
interface SpectateScreenProps {
  matchId: string;
  onExit: () => void;
}

const REACTIONS = ['👍', '🎉', '👏'];

const SpectateScreen: React.FC<SpectateScreenProps> = ({ matchId, onExit }) => {
  const [matchState, setMatchState] = useState<Match | null>(null);
  const config = useGameConfig();
  const [timeLeft, setTimeLeft] = useState(config.MATCH_DURATION_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [reactionCooldown, setReactionCooldown] = useState(false);
  const winterThemeActive = isWinterThemeActive();
  const isDroneView = matchState?.matchType === 'drone';

  useEffect(() => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        setMatchState(data);
      } else {
        setError("The match you were spectating has ended or could not be found.");
      }
    };
    
    matchRef.on('value', listener, (err: Error) => {
      setError("Could not connect to the match. Please check your permissions.");
    });

    return () => matchRef.off('value', listener);
  }, [matchId]);

  useEffect(() => {
    if (!matchState || matchState.status !== 'active') {
      return;
    }

    const timer = setInterval(() => {
      const elapsed = (Date.now() - matchState.startTime) / 1000;
      const remaining = Math.max(0, config.MATCH_DURATION_SECONDS - elapsed);
      setTimeLeft(Math.ceil(remaining));
    }, 500);

    return () => clearInterval(timer);
  }, [matchState, config.MATCH_DURATION_SECONDS]);

  const handleSendReaction = (reaction: string, targetPlayerUid: string) => {
    if (reactionCooldown) {
        toast.info("Please wait before sending another reaction.");
        return;
    }
    const reactionPayload = {
        senderUid: "spectator",
        reaction,
        targetPlayerUid,
        key: Date.now().toString(),
    };
    rtdb.ref(`matches/${matchId}/lastReaction`).set(reactionPayload).catch(err => {
        console.error("Failed to send reaction", err);
        toast.error("Could not send reaction.");
    });
    setReactionCooldown(true);
    setTimeout(() => setReactionCooldown(false), 2000); // 2 second cooldown
  };

  const { player1, player2, turn, currentTurnPlayerUid } = useMemo(() => {
    return { 
      player1: matchState?.player1, 
      player2: matchState?.player2,
      turn: matchState?.turn || 1,
      currentTurnPlayerUid: matchState?.currentTurnPlayerUid
    };
  }, [matchState]);
  
  const p1MovesLeft = 5 - Math.floor((turn - 1) / 2);
  const p2MovesLeft = 5 - Math.floor(turn / 2);
  
  const PlayerDisplay: React.FC<{ player?: MatchPlayer, isP1: boolean }> = ({ player, isP1 }) => {
    if (!player || !player.selectedBird) return null;
    const healthPercent = (player.currentHealth / player.selectedBird.maxHealth) * 100;
    const isTurn = player.uid === currentTurnPlayerUid;
    const movesLeft = isP1 ? p1MovesLeft : p2MovesLeft;
    const { rankName } = getRankInfo(player.rankPoints);
    
    const borderColor = isDroneView ? (isP1 ? 'border-cyan-400' : 'border-pink-500') : (isP1 ? 'border-yellow-400' : 'border-gray-700');
    const bgColor = isDroneView ? 'bg-black/50 backdrop-blur-sm' : (isP1 ? 'bg-blue-900/80' : 'bg-[#1e2227]');
    const turnIndicatorBorder = isTurn ? (isDroneView ? '!border-yellow-300' : '!border-yellow-400') : '';

    return (
    <div className={`p-2 ${bgColor} border-2 ${borderColor} ${turnIndicatorBorder} shadow-lg transition-all duration-300 ${isTurn ? 'scale-105' : ''}`}>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <PlayerAvatar 
                    photoURL={player.photoURL}
                    uid={player.uid}
                    activeBadge={player.activeBadge}
                    sizeClassName="w-12 h-12"
                    imgClassName="border-2 border-black bg-gray-600"
                />
                <div>
                    <p className="font-pixel text-sm text-white leading-tight">{player.displayName}</p>
                    <p className="font-semibold text-xs text-blue-300 leading-tight">{rankName}</p>
                </div>
            </div>

            <div className="text-right flex-shrink-0 ml-2">
                <p className="font-pixel text-sm text-white mt-1">Moves: {movesLeft}</p>
            </div>
        </div>
        
        <div className="mt-2 w-full bg-black h-5 border border-black p-0.5 relative">
            <div 
              className={`h-full transition-all duration-300 bg-gradient-to-r from-red-600 via-yellow-500 to-yellow-400`} 
              style={{ width: `${Math.max(0, healthPercent)}%`}}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white font-pixel" style={{textShadow:'1px 1px 0 #000'}}>{Math.max(0, player.currentHealth)} / {player.selectedBird.maxHealth}</span>
        </div>
    </div>
  )};

  if (error) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
            <h2 className="text-xl font-bold text-red-400 mb-4">Spectate Error</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button onClick={onExit}>Return to Lobby</Button>
        </div>
     )
  }

  if (!matchState) {
    return <div className="flex items-center justify-center min-h-[80vh]"><Spinner /></div>
  }
  
  const isFinished = matchState.status === 'finished';
  let winnerMessage = '';
  if (isFinished) {
      if (matchState.winner) {
          const winnerName = matchState.winner === matchState.player1.uid ? matchState.player1.displayName : matchState.player2.displayName;
          winnerMessage = `${winnerName || 'Player'} has won the match!`;
      } else {
          winnerMessage = "The match ended in a draw!";
      }
  }

  return (
    <div className={`flex flex-col items-center justify-between h-full p-4 relative overflow-hidden ${isDroneView ? 'bg-gray-900' : ''}`} style={{ background: isDroneView ? 'radial-gradient(ellipse at center, #1e3a8a 0%, #0c0a09 100%)' : 'transparent' }}>
        {(winterThemeActive || isDroneView) && <Snowfall />}
        {isDroneView && <div className="absolute top-4 left-4 font-pixel text-lg text-cyan-300 animate-pulse" style={{textShadow: '0 0 5px #0e7490'}}>📹 DRONE CAM</div>}
        <div className="w-full space-y-4">
            <PlayerDisplay player={player1} isP1={true} />
            <PlayerDisplay player={player2} isP1={false} />
        </div>

        <div className="text-center">
            {isFinished ? (
                 <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000]">
                    <h2 className="text-2xl font-bold text-yellow-400">Match Over</h2>
                    <p className="text-gray-300 mt-2">{winnerMessage}</p>
                 </div>
            ) : (
                <>
                    <p className="text-sm text-gray-400">Time Left</p>
                    <p className={`text-6xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>{timeLeft}</p>
                </>
            )}
        </div>
      
        <Button onClick={onExit} className="bg-gray-600 hover:bg-gray-700 mb-20">
            Exit Spectate
        </Button>
        
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/30 backdrop-blur-sm border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                <div className="text-center">
                    <p className="text-xs font-bold mb-1 text-gray-300">React to {player1?.displayName}</p>
                    <div className="flex justify-center gap-2">
                        {REACTIONS.map(r => 
                            <button 
                                key={`p1-${r}`} 
                                onClick={() => player1 && handleSendReaction(r, player1.uid)}
                                disabled={reactionCooldown}
                                className="text-2xl p-1 rounded-full hover:bg-white/20 transition-transform hover:scale-125 disabled:opacity-50"
                            >
                                {r}
                            </button>
                        )}
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold mb-1 text-gray-300">React to {player2?.displayName}</p>
                    <div className="flex justify-center gap-2">
                        {REACTIONS.map(r => 
                            <button 
                                key={`p2-${r}`} 
                                onClick={() => player2 && handleSendReaction(r, player2.uid)}
                                disabled={reactionCooldown}
                                className="text-2xl p-1 rounded-full hover:bg-white/20 transition-transform hover:scale-125 disabled:opacity-50"
                            >
                                {r}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};


type GameState = 'AUTH' | 'LOBBY' | 'MATCHMAKING' | 'IN_ROOM' | 'IN_GAME' | 'RESULTS' | 'SPECTATING' | 'MINIGAME';

const ViewportManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const setViewportHeight = () => {
      // This creates a CSS variable --vh which is 1% of the window's inner height.
      // It helps solve the 100vh issue on mobile browsers where the address bar interferes.
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    setViewportHeight(); // Set initial value

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  return <>{children}</>;
};


const App: React.FC = () => {
  return (
    <GameConfigProvider>
      <AuthProvider>
        <SettingsProvider>
          <RealtimeProvider>
            <ContentConfigProvider>
              <ViewportManager>
                <Game />
              </ViewportManager>
              <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop={false}
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="dark"
                  aria-label="Notifications"
              />
            </ContentConfigProvider>
          </RealtimeProvider>
        </SettingsProvider>
      </AuthProvider>
    </GameConfigProvider>
  );
};

const Game: React.FC = () => {
  const { user, loading } = useAuth();
  const { maintenanceMode, isUpdateRequired, patchSizeMB, patchVersion } = useRealtime();
  const { loading: contentLoading } = useContentConfig();
  const config = useGameConfig();
  const [gameState, setGameState] = useState<GameState>('AUTH');
  const [match, setMatch] = useState<Match | null>(null);
  const [matchResult, setMatchResult] = useState<{ result: MatchResult; match: Match } | null>(null);
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [roomInvite, setRoomInvite] = useState<RoomInvite | null>(null);
  const [currentRoom, setCurrentRoom] = useState<CustomRoom | null>(null);
  const [spectatingMatchId, setSpectatingMatchId] = useState<string | null>(null);
  const [isAdminExited, setIsAdminExited] = useState(false);
  const [isLoadingAfterLogin, setIsLoadingAfterLogin] = useState(false);
  const [showUpdateScreen, setShowUpdateScreen] = useState(false);
  const matchmakingTimeoutRef = useRef<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDailyRewardModal, setShowDailyRewardModal] = useState(false);
  const [foundMatchForVS, setFoundMatchForVS] = useState<Match | null>(null);


  // Listen for player data changes
  useEffect(() => {
    if (!user) {
      setPlayerData(null);
      return;
    }
    const unsubscribe = listenToPlayer(user.uid, (player) => {
        if (player && player.hasCompletedTutorial === false && !showTutorial) {
            setShowTutorial(true);
        }
        setPlayerData(player);

        // Check for reconnection
        if (player) {
          try {
            const stored = localStorage.getItem('ff-last-match');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.playerUid === player.uid && parsed.status === 'active') {
                rtdb.ref(`matches/${parsed.matchId}`).once('value').then(s => {
                  if (s.exists()) {
                    const matchData = s.val() as Match;
                    if (matchData.status === 'active') {
                      setMatch(matchData);
                      setFoundMatchForVS(matchData);
                      setGameState('IN_GAME');
                      toast.info("Rejoined your active match!");
                    } else {
                      localStorage.removeItem('ff-last-match');
                    }
                  } else {
                    localStorage.removeItem('ff-last-match');
                  }
                });
              }
            }
          } catch {}
        }
    }, (error) => {
        console.error("Failed to listen to player data:", error);
        setPlayerData(null);
    });
    return () => unsubscribe();
  }, [user, showTutorial]);

  // Listen for custom room invites
  useEffect(() => {
    if (user) {
        const unsubscribe = roomService.listenForRoomInvites(user.uid, (receivedInvite) => {
            setRoomInvite(receivedInvite);
        });
        return () => unsubscribe();
    } else {
        setRoomInvite(null);
    }
  }, [user]);

  // Listen for current room changes
  useEffect(() => {
    if (!currentRoom) return;

    const unsubscribe = roomService.listenToRoom(currentRoom.id, (updatedRoom) => {
        if (updatedRoom) {
            setCurrentRoom(updatedRoom);
            if(updatedRoom.matchId) {
                // Match has started, let's join
                rtdb.ref(`matches/${updatedRoom.matchId}`).once('value').then(snapshot => {
                    if (snapshot.exists()) {
                        handleMatchFound(snapshot.val());
                    }
                });
            }
        } else {
            // Room was deleted (e.g., host left)
            toast.info("The room was closed by the host.");
            handleLeaveRoom();
        }
    });
    return () => unsubscribe();
  }, [currentRoom?.id]);


  useEffect(() => {
    if (loading) return;
    if (user) {
      if(gameState === 'AUTH') {
        setIsLoadingAfterLogin(true);
      }
    } else {
      setGameState('AUTH');
      setIsLoadingAfterLogin(false);
      setMatch(null);
      setMatchResult(null);
      setPlayerData(null);
      setCurrentRoom(null);
    }
    setIsAdminExited(false);
  }, [user, loading, gameState]);

  useEffect(() => {
    const lastCompletedVersion = parseInt(localStorage.getItem('lastCompletedVersion') || '0', 10);
    if (isUpdateRequired && patchVersion > lastCompletedVersion) {
        setShowUpdateScreen(true);
    } else {
        setShowUpdateScreen(false);
    }
  }, [isUpdateRequired, patchVersion]);
  
  // Handles matchmaking logic, including bot fallback
  useEffect(() => {
    if (gameState === 'MATCHMAKING' && playerData && !foundMatchForVS) {
      const equippedBird = playerData.ownedBirds?.[playerData.equippedBirdId || ''] || Object.values(playerData.ownedBirds || {})[0];
      if (!equippedBird) {
        toast.error("Please equip a bird first!");
        setGameState('LOBBY');
        return;
      }
      const fee = config.RANK_ENTRY_FEE_COINS;

      const cleanup = () => {
        if (matchmakingTimeoutRef.current) {
          clearTimeout(matchmakingTimeoutRef.current);
          matchmakingTimeoutRef.current = null;
        }
      };

      const handleOpponentLocated = (locatedMatch: Match) => {
        cleanup();
        setFoundMatchForVS(locatedMatch);
      };

      // Set a 30-second timeout to find a bot match.
      matchmakingTimeoutRef.current = window.setTimeout(async () => {
        if (gameState !== 'MATCHMAKING' || foundMatchForVS) return; // Check if still matchmaking
        cleanup();
        cancelMatchmaking(playerData.uid, 'rank', 0); // Cancel the queue search
        try {
            const botMatch = await createBotMatch(playerData, equippedBird);
            handleOpponentLocated(botMatch);
        } catch (e: any) {
            toast.error("Failed to create a bot match. Please try again.");
            if (fee > 0) await updatePlayerCoins(playerData.uid, fee); // Refund fee
            setGameState('LOBBY');
        }
      }, 30000);

      // Start the search for a real player.
      findMatch(playerData, handleOpponentLocated, (error) => {
        cleanup();
        toast.error(error.message);
        setGameState('LOBBY');
      }, 'rank', fee, equippedBird);

      return cleanup;
    }
  }, [gameState, playerData, config.RANK_ENTRY_FEE_COINS, foundMatchForVS]);


  // One-time data migration for admin
  useEffect(() => {
    if (user?.uid === ADMIN_UID && !isAdminExited) {
      const runMigration = async () => {
        const migrationRef = rtdb.ref('migrations/removedApexCondor');
        const snapshot = await migrationRef.once('value');
        if (snapshot.exists()) {
          console.log("Apex Condor removal migration has already been run.");
          return;
        }

        toast.info("Running one-time migration to remove 'Apex Condor'...", { autoClose: 10000 });
        
        try {
          const usersRef = rtdb.ref('users');
          const usersSnapshot = await usersRef.once('value');
          if (!usersSnapshot.exists()) {
            toast.warn("Migration: No users found.");
            await migrationRef.set(Date.now());
            return;
          }

          const usersData = usersSnapshot.val();
          const updates: { [key: string]: any } = {};
          let affectedUsersCount = 0;

          for (const uid in usersData) {
            const player = usersData[uid];
            if (player.ownedBirds) {
              let condorId: string | null = null;
              for (const birdId in player.ownedBirds) {
                if (player.ownedBirds[birdId].name?.trim().toLowerCase() === 'apex condor') {
                  condorId = birdId;
                  break;
                }
              }

              if (condorId) {
                affectedUsersCount++;
                updates[`/users/${uid}/ownedBirds/${condorId}`] = null;

                if (player.equippedBirdId === condorId) {
                  const remainingBirdIds = Object.keys(player.ownedBirds).filter(id => id !== condorId);
                  if (remainingBirdIds.length > 0) {
                    updates[`/users/${uid}/equippedBirdId`] = remainingBirdIds[0];
                  } else {
                    const tappyDef = BIRD_DEFINITIONS['B001'];
                    const tappyBird: Bird = {
                      id: tappyDef.id, name: tappyDef.name, rarity: tappyDef.rarity,
                      skillDescription: tappyDef.skillDescription, skillPower: tappyDef.baseAttackPower,
                      level: 1, xp: 0, xpToNextLevel: tappyDef.baseXpToNextLevel,
                      icon: tappyDef.icon, maxHealth: tappyDef.baseHealth,
                      powerLevel: 1, healthLevel: 1,
                    };
                    updates[`/users/${uid}/ownedBirds/B001`] = tappyBird;
                    updates[`/users/${uid}/equippedBirdId`] = 'B001';
                  }
                }
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await rtdb.ref().update(updates);
            toast.success(`Migration complete! 'Apex Condor' removed from ${affectedUsersCount} players.`);
          } else {
            toast.info("Migration check complete. No players found with 'Apex Condor'.");
          }
          
          await migrationRef.set(Date.now());

        } catch (e: any) {
          console.error("Migration failed:", e);
          toast.error(`Migration failed: ${e.message}`);
        }
      };

      runMigration();
    }
  }, [user, isAdminExited]);

  const handleUpdateComplete = (version: number) => {
    localStorage.setItem('lastCompletedVersion', version.toString());
    setShowUpdateScreen(false);
  };

  const handleLoadingComplete = useCallback(() => {
    setIsLoadingAfterLogin(false);
    if (sessionStorage.getItem('dailyRewardDue') === 'true') {
        sessionStorage.removeItem('dailyRewardDue');
        setShowDailyRewardModal(true);
    } else if (playerData && !playerData.hasCompletedTutorial) {
        setShowTutorial(true);
    } else {
        setGameState('LOBBY');
    }
  }, [playerData]);
  
  const handleClaimDailyReward = async () => {
    if (!user) return;
    try {
        await updatePlayerCoins(user.uid, config.DAILY_LOGIN_BONUS_COINS);
        await rtdb.ref(`users/${user.uid}/lastLogin`).set(Date.now());
        toast.success(`You claimed ${config.DAILY_LOGIN_BONUS_COINS} coins!`);
        setShowDailyRewardModal(false);
        // After claiming, check for tutorial
        if (playerData && !playerData.hasCompletedTutorial) {
            setShowTutorial(true);
        } else {
            setGameState('LOBBY');
        }
    } catch (e) {
        toast.error("Failed to claim daily reward.");
        setShowDailyRewardModal(false);
        setGameState('LOBBY'); // Move on anyway
    }
  };

  const handleStartMatchmaking = useCallback(() => setGameState('MATCHMAKING'), []);
  
  const handleEnterRoom = useCallback((room: CustomRoom) => {
    setCurrentRoom(room);
    setGameState('IN_ROOM');
  }, []);

  const handleLeaveRoom = useCallback(() => {
    if (currentRoom && playerData) {
        roomService.leaveRoom(playerData, currentRoom.id);
    }
    setCurrentRoom(null);
    setGameState('LOBBY');
  }, [currentRoom, playerData]);
  
  const handleMatchFound = useCallback((foundMatch: Match) => {
    setMatch(foundMatch);
    if(user) updateUserMatchStatus(user.uid, foundMatch.id);
    setCurrentRoom(null);
    setGameState('IN_GAME');
  }, [user]);
  
  const handleCancelMatchmaking = useCallback(() => {
    if(playerData) {
        cancelMatchmaking(playerData.uid, 'rank', config.RANK_ENTRY_FEE_COINS);
    }
    setFoundMatchForVS(null);
    setGameState('LOBBY');
  }, [playerData, config.RANK_ENTRY_FEE_COINS]);
  
  const handleGameOver = useCallback((result: MatchResult, match: Match) => {
    if(user) updateUserMatchStatus(user.uid, null);
    setMatchResult({ result, match });
    setGameState('RESULTS');
  }, [user]);
  
  const handlePlayAgain = useCallback(() => {
    setMatch(null);
    setMatchResult(null);
    setFoundMatchForVS(null);
    setGameState('LOBBY');
  }, []);

  const handleStartMinigame = useCallback(() => setGameState('MINIGAME'), []);
  const handleMinigameEnd = useCallback(async (coinsEarned: number) => {
      if (user && coinsEarned !== 0) {
          await updatePlayerCoins(user.uid, coinsEarned);
          if (coinsEarned > 0) {
            toast.success(`You earned ${coinsEarned} coins!`);
          } else {
            toast.warn(`You lost ${-coinsEarned} coins!`);
          }
      }
      setGameState('LOBBY');
  }, [user]);

  const handleAcceptRoomInvite = async () => {
    if (!roomInvite || !playerData) return;
    try {
        const room = await roomService.joinRoom(playerData, roomInvite.roomId);
        handleEnterRoom(room);
    } catch (error: any) {
        toast.error(error.message || "Failed to join room.");
    } finally {
        setRoomInvite(null);
    }
  };

  const handleDeclineRoomInvite = async () => {
    // No action needed on decline for room invites currently
    setRoomInvite(null);
  };
  
  const handleStartSpectating = useCallback((matchId: string) => {
    setSpectatingMatchId(matchId);
    setGameState('SPECTATING');
  }, []);

  const handleExitSpectating = useCallback(() => {
    setSpectatingMatchId(null);
    setGameState('LOBBY');
  }, []);

  const handleCompleteTutorial = useCallback(async () => {
    if (user) {
      try {
        await completeTutorial(user.uid);
        setShowTutorial(false);
        setGameState('LOBBY');
      } catch (error) {
        toast.error("Could not save tutorial progress. It may appear again.");
        setShowTutorial(false); // Hide it anyway for this session
        setGameState('LOBBY');
      }
    }
  }, [user]);

  const CenteredSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <Spinner />
    </div>
  );

  if (maintenanceMode && user?.uid !== ADMIN_UID) {
      return <MaintenanceScreen />;
  }
  
  if (showUpdateScreen) {
      return <UpdateRequiredScreen onUpdateComplete={handleUpdateComplete} patchSizeMB={patchSizeMB} patchVersion={patchVersion} />;
  }

  if (playerData?.isBanned) {
      return <BannedScreen />;
  }
  
  // If the user is an admin and hasn't explicitly exited to the game view
  if (user && user.uid === ADMIN_UID && !isAdminExited) {
    return (
        <div className="w-full">
            <AdminView onExit={() => setIsAdminExited(true)} />
        </div>
    );
  }

  const renderContent = () => {
    if (isLoadingAfterLogin) {
      return <PostLoginLoadingScreen onComplete={handleLoadingComplete} />;
    }
    
    if (showDailyRewardModal) {
        return <DailyRewardModal onClaim={handleClaimDailyReward} amount={config.DAILY_LOGIN_BONUS_COINS} />;
    }
    
    if (showTutorial) {
        return <TutorialModal onComplete={handleCompleteTutorial} />;
    }
    
    if (gameState === 'LOBBY' && contentLoading && !isLoadingAfterLogin) {
        return <CenteredSpinner />;
    }

    switch (gameState) {
      case 'AUTH':
        return <AuthScreen />;
      case 'LOBBY':
        if (playerData) {
            return <Dashboard
                onStartMatchmaking={handleStartMatchmaking}
                playerData={playerData}
                onStartSpectating={handleStartSpectating}
                onStartMinigame={handleStartMinigame}
                onEnterRoom={handleEnterRoom}
            />;
        }
        return <CenteredSpinner />;
      case 'MATCHMAKING':
        if (playerData) {
          return <MatchmakingScreen 
            playerData={playerData} 
            onCancelMatchmaking={handleCancelMatchmaking} 
            foundMatch={foundMatchForVS}
            onMatchConfirmed={handleMatchFound}
          />
        }
        return <CenteredSpinner />;
      case 'IN_ROOM':
        if (currentRoom && playerData) {
            return <RoomView
                room={currentRoom}
                player={playerData}
                onLeave={handleLeaveRoom}
            />
        }
        return <CenteredSpinner />;
      case 'IN_GAME':
        if (match && user && playerData) {
          return <GameScreen match={match} currentPlayer={playerData} onGameOver={handleGameOver} />;
        }
        return <CenteredSpinner />;
      case 'RESULTS':
        if (matchResult && user && playerData) {
          return <ResultsScreen data={matchResult} onPlayAgain={handlePlayAgain} currentUserId={user.uid} playerData={playerData} />;
        }
        return <CenteredSpinner />;
      case 'SPECTATING':
        if (spectatingMatchId) {
          return <SpectateScreen matchId={spectatingMatchId} onExit={handleExitSpectating} />;
        }
        return <CenteredSpinner />;
       case 'MINIGAME':
        if (playerData) {
            return <CoinCollectorMinigame player={playerData} onGameEnd={handleMinigameEnd} />;
        }
        return <CenteredSpinner />;
      default:
        return <AuthScreen />;
    }
  };

  return (
    <div className="w-full h-full">
        {roomInvite && <RoomInviteNotificationModal invite={roomInvite} onAccept={handleAcceptRoomInvite} onDecline={handleDeclineRoomInvite} />}
        {renderContent()}
    </div>
  );
};

export default App;