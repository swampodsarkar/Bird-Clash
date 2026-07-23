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
import { ADMIN_UID, ADMIN_EMAIL, BIRD_DEFINITIONS } from './constants';
import AdminView from './components/admin/AdminView';
import Dashboard from './components/Dashboard';
import PostLoginLoadingScreen from './components/common/PostLoginLoadingScreen';
import SplashScreen from './components/common/SplashScreen';
import PlayerAvatar from './components/common/PlayerAvatar';
import UpdateRequiredScreen from './components/common/UpdateRequiredScreen';
import CoinCollectorMinigame from './components/minigames/CoinCollectorMinigame';
import { getRankInfo, isWinterThemeActive } from './utils/helpers';
import TutorialModal from './components/common/TutorialModal';
import DailyRewardModal from './components/common/DailyRewardModal';
import Snowfall from './components/common/Snowfall';
import RoomView from './components/common/RoomView';
import RoomBrowser from './components/common/RoomBrowser';
import RoomInviteNotificationModal from './components/common/RoomInviteNotificationModal';
import MatchmakingScreen from './components/MatchmakingScreen';
import SpectatorScreen from './components/SpectatorScreen';
import { initializeReferral, applyReferralCode } from './services/referralService';
import { checkAndUpdateStreak } from './services/streakService';
import { StreakModal } from './components/common/StreakModal';
import type { LoginStreak } from './types';




type GameState = 'AUTH' | 'LOBBY' | 'ROOM_BROWSER' | 'MATCHMAKING' | 'IN_ROOM' | 'IN_GAME' | 'RESULTS' | 'SPECTATING' | 'MINIGAME';

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
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakData, setStreakData] = useState<{ streak: LoginStreak; reward: { coins: number; gems: number } | null } | null>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);


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
  
  // Handles matchmaking logic, including bot fallback + beginner bot protection
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

      // Set a 30-second timeout — if no real player found, create rank-based bot match
      matchmakingTimeoutRef.current = window.setTimeout(async () => {
        if (gameState !== 'MATCHMAKING' || foundMatchForVS) return;
        cleanup();
        cancelMatchmaking(playerData.uid, 'rank', 0);
        try {
            const botMatch = await createBotMatch(playerData, equippedBird);
            handleOpponentLocated(botMatch);
        } catch (e: any) {
            toast.error("Failed to create a bot match. Please try again.");
            if (fee > 0) await updatePlayerCoins(playerData.uid, fee);
            setGameState('LOBBY');
        }
      }, 30000);

      findMatch(playerData, handleOpponentLocated, (error) => {
        cleanup();
        toast.error(error.message);
        setGameState('LOBBY');
      }, 'rank', fee, equippedBird);

      return cleanup;
    }
  }, [gameState, playerData, config.RANK_ENTRY_FEE_COINS, foundMatchForVS]);


  // Initialize referral on login
  useEffect(() => {
    if (user && playerData) {
      initializeReferral(user.uid);
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode && !playerData.referral?.referredBy) {
        applyReferralCode(user.uid, refCode).catch(() => {});
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, playerData?.referral?.referredBy]);

  // Check and update streak on login
  useEffect(() => {
    if (user && playerData && gameState === 'LOBBY') {
      checkAndUpdateStreak(playerData).then(data => {
        if (data.reward) {
          setStreakData(data);
          setShowStreakModal(true);
        }
      });
    }
  }, [user, playerData?.lastLogin, gameState]);

  // One-time data migration for admin
  useEffect(() => {
    const isAdmin = user?.email === ADMIN_EMAIL || user?.uid === ADMIN_UID;
    if (isAdmin && !isAdminExited) {
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
  
  const handleOpenRoomBrowser = useCallback(() => {
    setGameState('ROOM_BROWSER');
  }, []);

  const handleBackToLobby = useCallback(() => {
    setGameState('LOBBY');
  }, []);

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

  if (maintenanceMode && user?.email !== ADMIN_EMAIL && user?.uid !== ADMIN_UID) {
      return <MaintenanceScreen />;
  }
  
  if (showUpdateScreen) {
      return <UpdateRequiredScreen onUpdateComplete={handleUpdateComplete} patchSizeMB={patchSizeMB} patchVersion={patchVersion} />;
  }

  if (playerData?.isBanned) {
      return <BannedScreen />;
  }
  
  // If the user is an admin and hasn't explicitly exited to the game view
  const isCurrentAdmin = user && (user.email === ADMIN_EMAIL || user.uid === ADMIN_UID);
  if (isCurrentAdmin && !isAdminExited) {
    return (
        <div className="w-full">
            <AdminView onExit={() => setIsAdminExited(true)} />
        </div>
    );
  }

  const renderContent = () => {
    if (showSplash) {
      return <SplashScreen onComplete={() => setShowSplash(false)} />;
    }
    
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
                onOpenRoomBrowser={handleOpenRoomBrowser}
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
      case 'ROOM_BROWSER':
        if (playerData) {
            return <RoomBrowser
                player={playerData}
                onEnterRoom={handleEnterRoom}
                onBack={handleBackToLobby}
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
          return <SpectatorScreen matchId={spectatingMatchId} onExit={handleExitSpectating} />;
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
        {showStreakModal && streakData && (
          <StreakModal streak={streakData.streak} reward={streakData.reward} onClose={() => setShowStreakModal(false)} />
        )}
    </div>
  );
};

export default App;