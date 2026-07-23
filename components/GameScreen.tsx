
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Match, MatchResult, MatchPlayer, Player } from '../types';
import { rtdb } from '../services/firebase';
import * as playerService from '../services/playerService';
import * as gameService from '../services/gameService';
import firebase from 'firebase/compat/app';
import Button from './common/Button';
import { getRankInfo } from '../utils/helpers';
import { Spinner } from './common/Spinner';
import { toast } from 'react-toastify';
import SettingsModal from './common/SettingsModal';
import PlayerAvatar from './common/PlayerAvatar';
import { useSettings } from '../hooks/useSettings';
import { soundManager } from '../utils/sound';
import LottieBird from './common/LottieBird';
import { AttackEffect, ShieldEffect, HealEffect, UltimateEffect, HitEffect } from './common/LottieEffects';
import VictoryAnimation from './common/VictoryAnimation';
import PingIndicator from './common/PingIndicator';

interface ReportModalProps {
    opponentName: string;
    onClose: () => void;
    onSubmit: (category: string, details: string) => Promise<void>;
}

const ReportModal: React.FC<ReportModalProps> = ({ opponentName, onClose, onSubmit }) => {
    const [category, setCategory] = useState('cheating');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit(category, details);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3 text-yellow-400">Report {opponentName}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold">Reason</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="pixel-input">
                            <option value="cheating">Cheating / Hacking</option>
                            <option value="abusive_language">Abusive Language / Harassment</option>
                            <option value="inappropriate_name">Inappropriate Name</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold">Details (Optional)</label>
                        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="Provide more information..." className="pixel-input" />
                    </div>
                    <div className="flex gap-4 pt-2">
                        <Button type="button" onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} variant="danger" className="w-full">
                            {isSubmitting ? <Spinner /> : "Submit Report"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface Particle {
    id: number;
    x: number;
    y: number;
    type: 'damage' | 'block' | 'heal' | 'ultimate';
}

const ParticleEffect: React.FC<{ particle: Particle }> = ({ particle }) => {
    const colors = {
        damage: 'text-red-500',
        block: 'text-blue-400',
        heal: 'text-green-400',
        ultimate: 'text-purple-500',
    };
    const symbols = {
        damage: '✸',
        block: '🛡',
        heal: '✦',
        ultimate: '⚡',
    };
    return (
        <div
            className={`absolute pointer-events-none text-2xl font-bold animate-particle ${colors[particle.type]}`}
            style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
        >
            {symbols[particle.type]}
        </div>
    );
};

interface GameScreenProps {
  match: Match;
  currentPlayer: Player;
  onGameOver: (result: MatchResult, match: Match) => void;
}

const DEFAULT_EMOTES = ['👍', '😂', '😭', '🔥', '👋', 'GG'];

const EmoteBubble: React.FC<{ payload: { emote: string; key: string } | null }> = ({ payload }) => {
    if (!payload) return null;
    return (
        <div key={payload.key} className="absolute -top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-white/90 text-black text-5xl p-3 rounded-full border-4 border-black shadow-lg animate-emote-popup animate-emote-fadeout">
                {payload.emote}
            </div>
        </div>
    );
};

const ReactionAnimation: React.FC<{ payload: { reaction: string; targetPlayerUid: string; key: string } | null, playerRefs: React.RefObject<Map<string, HTMLDivElement>> }> = ({ payload, playerRefs }) => {
    if (!payload || !playerRefs.current) return null;

    const targetEl = playerRefs.current.get(payload.targetPlayerUid);
    if (!targetEl) return null;

    const rect = targetEl.getBoundingClientRect();

    return (
        <div
            key={payload.key}
            className="absolute pointer-events-none z-20"
            style={{ top: `${rect.top + rect.height / 2}px`, left: `${rect.left + rect.width / 2}px` }}
        >
            <div className="text-7xl animate-reaction-float-up -translate-x-1/2 -translate-y-1/2">
                {payload.reaction}
            </div>
        </div>
    );
};

const CONFIRM_FORFEIT_KEY = 'ff-forfeit-confirm';

const ROUNDS_TO_WIN = 2;

const processRoundEnd = (data: any, winnerKey: string, loserKey: string, winnerUid: string) => {
  if (!data.rounds) data.rounds = [];
  data.rounds.push({
    roundNumber: data.currentRound || 1,
    winner: winnerUid,
    player1Health: Math.max(0, data.player1.currentHealth),
    player2Health: Math.max(0, data.player2.currentHealth),
  });

  data[winnerKey].wins = (data[winnerKey].wins || 0) + 1;

  if (!data.log) data.log = [];
  data.log.push(`${data[winnerKey].displayName} wins Round ${data.currentRound}!`);

  if (data[winnerKey].wins >= ROUNDS_TO_WIN) {
    data.winner = winnerUid;
    data.status = 'finished';
    data.log.push(`${data[winnerKey].displayName} wins the match ${data[winnerKey].wins}-${data[loserKey].wins || 0}!`);
    return data;
  }

  data.currentRound = (data.currentRound || 1) + 1;

  data.player1.currentHealth = data.player1.selectedBird.maxHealth;
  data.player2.currentHealth = data.player2.selectedBird.maxHealth;

  data.player1.activeEffects = {};
  data.player2.activeEffects = {};

  data.player1.perfectMeter = 0;
  data.player2.perfectMeter = 0;

  data.roundTimerEndTime = Date.now() + 60000;

  data.turn = 1;

  data.currentTurnPlayerUid = data[loserKey].uid;

  data.turnTimer = {
    currentTurnStartTime: Date.now(),
    turnDuration: 30,
  };

  data.log.push(`--- Round ${data.currentRound} ---`);
  data.log.push(`${data[loserKey].displayName} starts Round ${data.currentRound}.`);

  return data;
};

const GameScreen: React.FC<GameScreenProps> = ({ match, currentPlayer, onGameOver }) => {
  const currentUserId = currentPlayer.uid;
  const [gameState, setGameState] = useState<Match>(match);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<{ amount: number; target: 'me' | 'opponent'; key: number }[]>([]);
  const [animationClasses, setAnimationClasses] = useState({ me: '', opponent: '', screen: '' });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeEffect, setActiveEffect] = useState<'attack' | 'shield' | 'heal' | 'ultimate' | 'hit' | null>(null);
  const [isEmotePanelOpen, setIsEmotePanelOpen] = useState(false);
  const [emoteCooldown, setEmoteCooldown] = useState(false);
  const [emoteDisplay, setEmoteDisplay] = useState<{ me: { emote: string; key: string } | null; opponent: { emote: string; key: string } | null }>({ me: null, opponent: null });
  const [reactionDisplay, setReactionDisplay] = useState<{ reaction: string; targetPlayerUid: string; key: string } | null>(null);
  const [gameOverState, setGameOverState] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);
  const [roundMultiplier, setRoundMultiplier] = useState<number>(1);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  const lastEmoteKey = useRef<string | null>(null);
  const lastReactionKey = useRef<string | null>(null);
  const playerRefs = useRef(new Map<string, HTMLDivElement>());
  const { fastAnimationMode } = useSettings();
  const turnTimerRef = useRef<number | null>(null);
  const prevTurnRef = useRef<number>(match.turn);

  const gameOverHandled = useRef(false);
  const prevHealthRef = useRef<{ me?: number; opponent?: number }>({});

  // Persist match ID for reconnection
  useEffect(() => {
    try {
      localStorage.setItem('ff-last-match', JSON.stringify({ matchId: match.id, playerUid: currentUserId, lastTurn: match.turn, status: match.status }));
    } catch {}
  }, [match.id, currentUserId, match.turn, match.status]);

  // Check for reconnection
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ff-last-match');
      if (stored) {
        const parsed: { matchId: string; playerUid: string; lastTurn: number; status: string } = JSON.parse(stored);
        if (parsed.matchId === match.id && parsed.playerUid === currentUserId && parsed.status === 'active' && parsed.lastTurn < match.turn) {
          setShowReconnectBanner(true);
          setTimeout(() => setShowReconnectBanner(false), 3000);
        }
      }
    } catch {}
  }, [match.id, currentUserId, match.turn]);

  // Listen for game state changes from Firebase
  useEffect(() => {
    const matchRef = rtdb.ref(`matches/${match.id}`);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
      const data = snapshot.val() as Match;
      if (data) {
        setGameState(data);
        if (data.status === 'active') {
          setIsReconnecting(false);
        }
      }
    };
    const errorListener = (error: Error) => {
      setGameError("Connection lost. Trying to reconnect...");
      setIsReconnecting(true);
      setTimeout(() => setIsReconnecting(false), 5000);
    };

    matchRef.on('value', listener, errorListener);
    return () => matchRef.off('value', listener);
  }, [match.id]);

  useEffect(() => {
    setGameState(match);
    localStorage.setItem('ff-last-match', JSON.stringify({ matchId: match.id, playerUid: currentUserId, lastTurn: match.turn, status: match.status }));
  }, [match]);

  const { me, opponent } = useMemo(() => {
    if (!gameState) return { me: null, opponent: null };
    if (gameState.player1.uid === currentUserId) {
      return { me: gameState.player1, opponent: gameState.player2 };
    }
    return { me: gameState.player2, opponent: gameState.player1 };
  }, [gameState, currentUserId]);

  const myEmotes = useMemo(() => {
    const equipped = me?.equippedEmotes;
    if (!equipped || equipped.length === 0) return DEFAULT_EMOTES;
    const combined = [...equipped];
    const equippedSet = new Set(equipped);
    for (const defaultEmote of DEFAULT_EMOTES) {
        if (combined.length >= 6) break;
        if (!equippedSet.has(defaultEmote)) combined.push(defaultEmote);
    }
    return combined.slice(0, 6);
  }, [me]);

  const isOpponentBot = useMemo(() => opponent?.isBot === true, [opponent]);

  // --- Auto-forfeit on opponent disconnect (runs once per match) ---
  useEffect(() => {
    if (!gameState || gameState.status !== 'active' || isOpponentBot) return;
    if (!opponent?.uid) return;

    const myDisconnectRef = rtdb.ref(`matches/${match.id}/disconnections/${currentUserId}`);
    const allDisconnectsRef = rtdb.ref(`matches/${match.id}/disconnections`);

    // Set onDisconnect: marks me as disconnected
    myDisconnectRef.onDisconnect().set({
      disconnectedAt: firebase.database.ServerValue.TIMESTAMP,
      uid: currentUserId,
    }).then(() => {
      myDisconnectRef.set(null); // Clear current
    });

    // Watch opponent's disconnect status
    let forfeitTimer: number | null = null;
    const opponentDisconnectRef = rtdb.ref(`matches/${match.id}/disconnections/${opponent.uid}`);
    const listener = (snap: firebase.database.DataSnapshot) => {
      if (!snap.exists()) {
        if (forfeitTimer) { clearTimeout(forfeitTimer); forfeitTimer = null; }
        return;
      }
      const data = snap.val();
      if (!data || !data.disconnectedAt) {
        if (forfeitTimer) { clearTimeout(forfeitTimer); forfeitTimer = null; }
        return;
      }
      // Start a 15s grace period timer
      if (!forfeitTimer) {
        forfeitTimer = window.setTimeout(() => {
          gameService.forfeitMatch(match.id, opponent.uid).catch(() => {});
        }, 15000);
      }
    };
    opponentDisconnectRef.on('value', listener);

    return () => {
      if (forfeitTimer) clearTimeout(forfeitTimer);
      myDisconnectRef.onDisconnect().cancel();
      myDisconnectRef.remove().catch(() => {});
      opponentDisconnectRef.off('value', listener);
      allDisconnectsRef.remove().catch(() => {});
    };
  }, [currentUserId, match.id, opponent?.uid, isOpponentBot]);

  // Turn Timer Logic
  useEffect(() => {
    if (!gameState.turnTimer || gameState.status !== 'active') {
      setTurnTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = (Date.now() - gameState.turnTimer!.currentTurnStartTime) / 1000;
      const remaining = Math.max(0, gameState.turnTimer!.turnDuration - elapsed);
      setTurnTimeLeft(Math.ceil(remaining));

      if (remaining <= 10 && remaining > 0 && Math.ceil(remaining) === Math.ceil(remaining + 0.5)) {
        soundManager.play('countdown_warning');
      }

      if (remaining <= 0) {
        const currentUid = gameState.currentTurnPlayerUid;
        if (currentUid === currentUserId) {
          gameService.autoPassTurn(match.id).catch(() => {});
        }
      }
    };

    updateTimer();
    turnTimerRef.current = window.setInterval(updateTimer, 500);
    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
      }
    };
  }, [gameState.turnTimer, gameState.status, gameState.currentTurnPlayerUid, currentUserId, match.id]);

  // Round Timer Logic (60s per round)
  useEffect(() => {
    if (gameState.status !== 'active' || gameState.currentTurnPlayerUid !== currentUserId) {
      return;
    }
    if (!gameState.roundTimerEndTime) {
      setRoundTimeLeft(null);
      setRoundMultiplier(1);
      return;
    }

    const updateRoundTimer = () => {
      const remaining = Math.max(0, gameState.roundTimerEndTime! - Date.now());
      const elapsed = 60000 - remaining;
      setRoundTimeLeft(Math.ceil(remaining / 1000));

      // Compute multiplier phase
      let mult = 1;
      if (elapsed >= 55000) mult = 3;
      else if (elapsed >= 40000) mult = 2;
      setRoundMultiplier(mult);

      if (remaining <= 0) {
        gameService.resolveRoundByTimer(match.id).catch(() => {});
      }
    };

    updateRoundTimer();
    const interval = setInterval(updateRoundTimer, 500);
    return () => clearInterval(interval);
  }, [gameState.roundTimerEndTime, gameState.status, currentUserId, match.id]);

  // Calculate potential damage for preview
  const potentialDamage = useMemo(() => {
      if (!me || !opponent) return 0;
      if (opponent.activeEffects?.invulnerable) return 0;

      let damage = me.selectedBird.skillPower;

      if (me.activeEffects?.doubleAttack) {
          damage *= 2;
      }

      if (me.currentHealth / me.selectedBird.maxHealth <= 0.3) {
          damage = Math.floor(damage * 1.2);
      }

      if (opponent.activeEffects?.blocking) {
          damage = Math.floor(damage * 0.3);
      } else if (opponent.activeEffects?.defenseBuff) {
          damage = Math.floor(damage * 0.5);
      }

      if (opponent.activeEffects?.shield) {
          damage = Math.max(0, damage - opponent.activeEffects.shield);
      }
      return damage;
  }, [me, opponent]);

  const spawnParticles = (type: Particle['type'], count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        type,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  };

  const addDamageNumber = (amount: number, target: 'me' | 'opponent') => {
    const key = Date.now();
    setDamageNumbers(prev => [...prev, { amount, target, key }]);
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(dn => dn.key !== key));
    }, 1000);
  };

  useEffect(() => {
    const emoteData = gameState.lastEmote;
    if (emoteData && emoteData.key !== lastEmoteKey.current) {
        lastEmoteKey.current = emoteData.key;
        const isMe = emoteData.senderUid === currentUserId;
        const emotePayload = { emote: emoteData.emote, key: emoteData.key };
        if (isMe) setEmoteDisplay(prev => ({ ...prev, me: emotePayload }));
        else setEmoteDisplay(prev => ({ ...prev, opponent: emotePayload }));
    }

    const reactionData = gameState.lastReaction;
    if (reactionData && reactionData.key !== lastReactionKey.current) {
        lastReactionKey.current = reactionData.key;
        setReactionDisplay({
            reaction: reactionData.reaction,
            targetPlayerUid: reactionData.targetPlayerUid,
            key: reactionData.key,
        });
        setTimeout(() => setReactionDisplay(null), 1500);
    }

    const newMe = gameState.player1.uid === currentUserId ? gameState.player1 : gameState.player2;
    const newOpponent = gameState.player1.uid === currentUserId ? gameState.player2 : gameState.player1;

    const myDamageTaken = (prevHealthRef.current.me ?? newMe.currentHealth) - newMe.currentHealth;
    const opponentDamageTaken = (prevHealthRef.current.opponent ?? newOpponent.currentHealth) - newOpponent.currentHealth;

    if (opponentDamageTaken > 0) {
        setAnimationClasses({ me: 'anim-attack-me', opponent: 'anim-hit-opponent', screen: '' });
        addDamageNumber(opponentDamageTaken, 'opponent');
        spawnParticles('damage', 5);
        setActiveEffect('attack');
        soundManager.play('attack');
    }
    if (myDamageTaken > 0) {
        setAnimationClasses({ me: 'anim-hit-me', opponent: 'anim-attack-opponent', screen: 'anim-screen-shake' });
        addDamageNumber(myDamageTaken, 'me');
        spawnParticles('damage', 3);
        setActiveEffect('hit');
        soundManager.play('hit');
    }

    if (newMe.currentHealth > (prevHealthRef.current.me ?? newMe.currentHealth)) {
      setAnimationClasses({ me: 'anim-ability', opponent: '', screen: '' });
      spawnParticles('heal', 4);
      setActiveEffect('heal');
    }

    if (newOpponent.currentHealth > (prevHealthRef.current.opponent ?? newOpponent.currentHealth)) {
      setAnimationClasses({ me: '', opponent: 'anim-ability', screen: '' });
      spawnParticles('heal', 4);
    }

    if (opponent.activeEffects?.blocking && opponentDamageTaken === 0 && prevTurnRef.current !== gameState.turn) {
      spawnParticles('block', 6);
      setActiveEffect('shield');
      soundManager.play('block');
    }

    if (myDamageTaken > 0 || opponentDamageTaken > 0) {
        const animDuration = fastAnimationMode ? 300 : 600;
        setTimeout(() => setAnimationClasses({ me: '', opponent: '', screen: '' }), animDuration);
    }
    prevHealthRef.current = { me: newMe.currentHealth, opponent: newOpponent.currentHealth };
    prevTurnRef.current = gameState.turn;

    if (gameState.status === 'finished' && !gameOverHandled.current) {
        gameOverHandled.current = true;
        let outcome: 'win' | 'loss' | 'draw' = 'draw';
        if (gameState.winner === currentUserId) {
          outcome = 'win';
          soundManager.play('victory');
        } else if (gameState.winner && gameState.winner !== 'draw') {
          outcome = 'loss';
          soundManager.play('defeat');
        }

        setGameOverState(outcome);

        setTimeout(() => {
            onGameOver({
                outcome,
                myDamageDealt: newMe.damageDealt,
                opponentDamageDealt: newOpponent.damageDealt,
                matchType: gameState.matchType,
            }, gameState);
            try {
              localStorage.removeItem('ff-last-match');
            } catch {}
        }, 2500);
    }
  }, [gameState, currentUserId, onGameOver, fastAnimationMode]);

  const isGameActive = gameState.status === 'active';
  const isMyTurn = isGameActive && gameState.currentTurnPlayerUid === currentUserId;

  const handleAttack = useCallback(() => {
    if (!isMyTurn || isSubmitting) return;
    setIsSubmitting(true);
    soundManager.play('button_click');

    const matchRef = rtdb.ref(`matches/${match.id}`);
    matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active' || currentData.currentTurnPlayerUid !== currentUserId) return;
        const meKey = currentData.player1.uid === currentUserId ? 'player1' : 'player2';
        const opponentKey = meKey === 'player1' ? 'player2' : 'player1';

        // --- Process Burn (tick at turn start) ---
        [meKey, opponentKey].forEach(key => {
            const burn = currentData[key].activeEffects?.burn;
            if (burn) {
                currentData[key].currentHealth -= burn.damage;
                currentData.log.push(`${currentData[key].displayName} takes ${burn.damage} burn damage!`);
                burn.turns -= 1;
                if (burn.turns <= 0) delete currentData[key].activeEffects.burn;
            }
        });

        // --- Burn kill check (round end) ---
        if (currentData[opponentKey].currentHealth <= 0) {
            return processRoundEnd(currentData, meKey, opponentKey, currentUserId);
        }
        if (currentData[meKey].currentHealth <= 0) {
            return processRoundEnd(currentData, opponentKey, meKey, currentData[opponentKey].uid);
        }

        // --- Check if attacker is STUNNED ---
        if (currentData[meKey].activeEffects?.stunned) {
            delete currentData[meKey].activeEffects.stunned;
            currentData.log.push(`${currentData[meKey].displayName} is stunned and misses a turn!`);
            // Still pass turn with no attack
            if (currentData[meKey].ultimateCooldownLeft && currentData[meKey].ultimateCooldownLeft > 0) {
                currentData[meKey].ultimateCooldownLeft -= 1;
            }
            if (currentData[meKey].abilityCooldownLeft && currentData[meKey].abilityCooldownLeft > 0) {
                currentData[meKey].abilityCooldownLeft -= 1;
            }
            currentData.turn += 1;
            currentData.currentTurnPlayerUid = currentData[opponentKey].uid;
            currentData.turnTimer = { currentTurnStartTime: Date.now(), turnDuration: 30 };
            return currentData;
        }

        let damage = currentData[meKey].selectedBird.skillPower;

        // --- Critical Hit (15% chance for 2x damage) ---
        let isCritical = false;
        if (Math.random() < 0.15) {
            damage *= 2;
            isCritical = true;
        }

        // --- Perfect Meter: Super Precise Power (3x damage) ---
        let isSuperPrecise = false;
        if ((currentData[meKey].perfectMeter || 0) >= 100) {
            damage *= 3;
            isSuperPrecise = true;
            currentData[meKey].perfectMeter = 0;
            currentData.log.push(`${currentData[meKey].displayName} unleashes SUPER PRECISE POWER!`);
        }

        // --- Time-based Sudden Death Multiplier (40s=2x, 55s=3x) ---
        let timeMultiplier = 1;
        if (currentData.roundTimerEndTime) {
            const elapsed = Date.now() - (currentData.roundTimerEndTime - 60000);
            if (elapsed >= 55000) timeMultiplier = 3;
            else if (elapsed >= 40000) timeMultiplier = 2;
        }
        if (timeMultiplier > 1) {
            damage *= timeMultiplier;
        }

        // --- Block Defense Check ---
        if (currentData[opponentKey].activeEffects?.blocking) {
            damage = Math.floor(damage * 0.3);
            delete currentData[opponentKey].activeEffects.blocking;
            currentData.log.push(`${currentData[opponentKey].displayName}'s block absorbs most of the damage!`);
        }

        if (currentData[meKey].activeEffects?.doubleAttack) {
            damage *= 2;
            delete currentData[meKey].activeEffects.doubleAttack;
        }

        if ((currentData[meKey].currentHealth / currentData[meKey].selectedBird.maxHealth) <= 0.3) {
            damage = Math.floor(damage * 1.2);
            if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
            currentData[meKey].activeEffects.adrenaline = true;
        }

        if (currentData[opponentKey].activeEffects?.invulnerable) {
            damage = 0;
            delete currentData[opponentKey].activeEffects.invulnerable;
        } else if (currentData[opponentKey].activeEffects?.defenseBuff) {
            damage = Math.floor(damage * 0.5);
            delete currentData[opponentKey].activeEffects.defenseBuff;
        }

        // Shield absorbs damage first
        if (currentData[opponentKey].activeEffects?.shield) {
            const shieldHp = currentData[opponentKey].activeEffects.shield;
            if (damage <= shieldHp) {
                currentData[opponentKey].activeEffects.shield -= damage;
                damage = 0;
                currentData.log.push(`${currentData[opponentKey].displayName}'s shield absorbed the attack!`);
            } else {
                damage -= shieldHp;
                delete currentData[opponentKey].activeEffects.shield;
                currentData.log.push(`${currentData[opponentKey].displayName}'s shield shattered!`);
            }
        }

        currentData[opponentKey].currentHealth -= damage;
        currentData[meKey].damageDealt += damage;

        if (!currentData.log) currentData.log = [];
        const critLabel = isCritical ? ' CRITICAL!' : '';
        const preciseLabel = isSuperPrecise ? ' ⚡SUPER PRECISE⚡' : '';
        const timeLabel = timeMultiplier > 1 ? ` ⏱${timeMultiplier}x TIME!` : '';
        currentData.log.push(`${currentData[meKey].displayName} attacks for ${damage} damage!${critLabel}${preciseLabel}${timeLabel}`);

        if (currentData[meKey].ultimateCooldownLeft && currentData[meKey].ultimateCooldownLeft > 0) {
            currentData[meKey].ultimateCooldownLeft -= 1;
        }

        if (currentData[meKey].abilityCooldownLeft && currentData[meKey].abilityCooldownLeft > 0) {
            currentData[meKey].abilityCooldownLeft -= 1;
        }

        if (currentData[opponentKey].currentHealth <= 0) {
            return processRoundEnd(currentData, meKey, opponentKey, currentUserId);
        }

        // Build perfect meter on successful hit
        if (damage > 0) {
            currentData[meKey].perfectMeter = Math.min(100, (currentData[meKey].perfectMeter || 0) + 25);
        }

        currentData.turn += 1;
        const nextUid = currentData[opponentKey].uid;
        currentData.currentTurnPlayerUid = nextUid;
        currentData.turnTimer = {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        };
        return currentData;
    }).catch(error => toast.error("Attack failed."))
      .finally(() => setIsSubmitting(false));
  }, [isMyTurn, isSubmitting, currentUserId, match.id]);

  const handleBlock = useCallback(() => {
    if (!isMyTurn || isSubmitting) return;
    setIsSubmitting(true);
    soundManager.play('button_click');
    setAnimationClasses({ me: 'anim-block', opponent: '', screen: '' });
    const clearAnim = () => setAnimationClasses({ me: '', opponent: '', screen: '' });
    setTimeout(clearAnim, fastAnimationMode ? 300 : 500);

    const matchRef = rtdb.ref(`matches/${match.id}`);
    matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active' || currentData.currentTurnPlayerUid !== currentUserId) return;
        const meKey = currentData.player1.uid === currentUserId ? 'player1' : 'player2';
        const opponentKey = meKey === 'player1' ? 'player2' : 'player1';

        if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
        currentData[meKey].activeEffects.blocking = true;

        if (!currentData.log) currentData.log = [];
        currentData.log.push(`${currentData[meKey].displayName} takes a defensive stance!`);

        if (currentData[meKey].ultimateCooldownLeft && currentData[meKey].ultimateCooldownLeft > 0) {
            currentData[meKey].ultimateCooldownLeft -= 1;
        }

        currentData.turn += 1;
        currentData.currentTurnPlayerUid = currentData[opponentKey].uid;
        currentData.turnTimer = {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        };
        return currentData;
    }).catch(error => toast.error("Block failed."))
      .finally(() => setIsSubmitting(false));
  }, [isMyTurn, isSubmitting, currentUserId, match.id]);

  const handleUltimate = useCallback(() => {
    if (!isMyTurn || isSubmitting) return;
    soundManager.play('button_click');
    setAnimationClasses({ me: 'anim-ultimate-me', opponent: '', screen: 'anim-screen-shake' });
    const clearAnim = () => setAnimationClasses({ me: '', opponent: '', screen: '' });
    setTimeout(clearAnim, fastAnimationMode ? 400 : 800);

    const birdDef = me?.selectedBird;
    if (!birdDef || !birdDef.ultimateType) return;
    if (me?.ultimateCooldownLeft && me.ultimateCooldownLeft > 0) {
        toast.info(`Ultimate is on cooldown for ${me.ultimateCooldownLeft} more turns.`);
        return;
    }

    setIsSubmitting(true);
    const matchRef = rtdb.ref(`matches/${match.id}`);

    let ultEffect: 'ultimate' | 'heal' | null = null;

    matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active' || currentData.currentTurnPlayerUid !== currentUserId) return;
        const meKey = currentData.player1.uid === currentUserId ? 'player1' : 'player2';
        const opponentKey = meKey === 'player1' ? 'player2' : 'player1';

        const ultimateType = currentData[meKey].selectedBird.ultimateType;
        const ultimateValue = currentData[meKey].selectedBird.ultimateValue || 0;

        // --- Time-based Sudden Death Multiplier (40s=2x, 55s=3x) ---
        let timeMultiplier = 1;
        if (currentData.roundTimerEndTime) {
            const elapsed = Date.now() - (currentData.roundTimerEndTime - 60000);
            if (elapsed >= 55000) timeMultiplier = 3;
            else if (elapsed >= 40000) timeMultiplier = 2;
        }

        if (!currentData.log) currentData.log = [];
        const timeLabel = timeMultiplier > 1 ? ` ⚡${timeMultiplier}x TIME BONUS` : '';
        currentData.log.push(`${currentData[meKey].displayName} uses ULTIMATE: ${currentData[meKey].selectedBird.ultimateDescription}${timeLabel}`);

        if (ultimateType === 'MASSIVE_DAMAGE') {
            let damage = ultimateValue * timeMultiplier;
            if (currentData[opponentKey].activeEffects?.blocking) {
                damage = Math.floor(damage * 0.3);
                delete currentData[opponentKey].activeEffects.blocking;
            }
            if (currentData[opponentKey].activeEffects?.invulnerable) {
                damage = 0;
                delete currentData[opponentKey].activeEffects.invulnerable;
            } else if (currentData[opponentKey].activeEffects?.defenseBuff) {
                damage = Math.floor(damage * 0.5);
                delete currentData[opponentKey].activeEffects.defenseBuff;
            }
            currentData[opponentKey].currentHealth -= damage;
            currentData[meKey].damageDealt += damage;
            ultEffect = 'ultimate';
        } else if (ultimateType === 'FULL_HEAL') {
            currentData[meKey].currentHealth = currentData[meKey].selectedBird.maxHealth;
            ultEffect = 'heal';
        } else if (ultimateType === 'INVULNERABILITY') {
            if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
            currentData[meKey].activeEffects.invulnerable = true;
        } else if (ultimateType === 'DOUBLE_ATTACK') {
            if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
            currentData[meKey].activeEffects.doubleAttack = true;
        }

        currentData[meKey].ultimateCooldownLeft = currentData[meKey].selectedBird.ultimateCooldown;

        if (currentData[opponentKey].currentHealth <= 0) {
            return processRoundEnd(currentData, meKey, opponentKey, currentUserId);
        }
        currentData.turn += 1;
        currentData.currentTurnPlayerUid = currentData[opponentKey].uid;
        currentData.turnTimer = {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        };
        return currentData;
    }).then(() => {
        if (ultEffect) {
            spawnParticles(ultEffect, 8);
            setActiveEffect(ultEffect);
            if (ultEffect === 'ultimate') soundManager.play('ultimate');
        }
    }).catch(error => toast.error("Ultimate failed."))
      .finally(() => setIsSubmitting(false));
  }, [isMyTurn, isSubmitting, currentUserId, match.id, me]);

  const handleAbility = useCallback(() => {
    if (!isMyTurn || isSubmitting) return;
    soundManager.play('button_click');
    setAnimationClasses({ me: 'anim-ability', opponent: '', screen: '' });
    const clearAnim = () => setAnimationClasses({ me: '', opponent: '', screen: '' });
    setTimeout(clearAnim, fastAnimationMode ? 300 : 600);

    const birdDef = me?.selectedBird;
    if (!birdDef || !birdDef.abilityType) return;
    if (me?.abilityCooldownLeft && me.abilityCooldownLeft > 0) {
        toast.info(`Ability is on cooldown for ${me.abilityCooldownLeft} more turns.`);
        return;
    }

    setIsSubmitting(true);
    const matchRef = rtdb.ref(`matches/${match.id}`);
    matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active' || currentData.currentTurnPlayerUid !== currentUserId) return;
        const meKey = currentData.player1.uid === currentUserId ? 'player1' : 'player2';
        const opponentKey = meKey === 'player1' ? 'player2' : 'player1';

        if (currentData[meKey].abilityUsesLeft !== undefined && currentData[meKey].abilityUsesLeft <= 0) {
            if (!currentData.log) currentData.log = [];
            currentData.log.push(`${currentData[meKey].displayName} has no ability uses left!`);
            return;
        }

        if (!currentData.log) currentData.log = [];

        const abilityType = currentData[meKey].selectedBird.abilityType;
        const abilityValue = currentData[meKey].selectedBird.abilityValue || 0;

        if (abilityType === 'SHIELD') {
            if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
            currentData[meKey].activeEffects.shield = abilityValue;
            currentData.log.push(`${currentData[meKey].displayName} uses ${currentData[meKey].selectedBird.abilityDescription}`);
        } else if (abilityType === 'DEFENSE_BUFF') {
            if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
            currentData[meKey].activeEffects.defenseBuff = true;
            currentData.log.push(`${currentData[meKey].displayName} uses ${currentData[meKey].selectedBird.abilityDescription}`);
        } else if (abilityType === 'BURN') {
            if (!currentData[opponentKey].activeEffects) currentData[opponentKey].activeEffects = {};
            currentData[opponentKey].activeEffects.burn = { turns: 2, damage: abilityValue };
            currentData.log.push(`${currentData[meKey].displayName} uses ${currentData[meKey].selectedBird.abilityDescription}`);
        } else if (abilityType === 'STUN_CHANCE') {
            const stunned = Math.random() < (abilityValue / 100);
            if (stunned) {
                if (!currentData[opponentKey].activeEffects) currentData[opponentKey].activeEffects = {};
                currentData[opponentKey].activeEffects.stunned = true;
                currentData.log.push(`${currentData[meKey].displayName} stuns ${currentData[opponentKey].displayName}!`);
            } else {
                currentData.log.push(`${currentData[meKey].displayName}'s stun attempt failed.`);
            }
        }

        // Decrement ability uses (2 per match max)
        if (currentData[meKey].abilityUsesLeft !== undefined) {
            currentData[meKey].abilityUsesLeft -= 1;
        }

        // Start ability cooldown
        const abilityCd = currentData[meKey].selectedBird.abilityCooldown ?? 4;
        currentData[meKey].abilityCooldownLeft = abilityCd;

        if (currentData[meKey].ultimateCooldownLeft && currentData[meKey].ultimateCooldownLeft > 0) {
            currentData[meKey].ultimateCooldownLeft -= 1;
        }

        currentData.turn += 1;
        currentData.currentTurnPlayerUid = currentData[opponentKey].uid;
        currentData.turnTimer = {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        };
        return currentData;
    }).catch(error => toast.error("Ability failed."))
      .finally(() => setIsSubmitting(false));
  }, [isMyTurn, isSubmitting, currentUserId, match.id, me]);

  const handleUsePotion = useCallback((potionId: string) => {
    if (!isMyTurn || isSubmitting) return;

    setIsSubmitting(true);
    soundManager.play('button_click');
    const matchRef = rtdb.ref(`matches/${match.id}`);
    matchRef.transaction(currentData => {
        if (!currentData || currentData.status !== 'active' || currentData.currentTurnPlayerUid !== currentUserId) return;
        const meKey = currentData.player1.uid === currentUserId ? 'player1' : 'player2';
        const opponentKey = meKey === 'player1' ? 'player2' : 'player1';

        if (!currentData[meKey].potions || !currentData[meKey].potions[potionId] || currentData[meKey].potions[potionId] <= 0) {
            return;
        }

        currentData[meKey].potions[potionId] -= 1;

        if (!currentData.log) currentData.log = [];

        if (potionId === 'P001') {
            currentData[meKey].currentHealth = Math.min(currentData[meKey].selectedBird.maxHealth, currentData[meKey].currentHealth + 100);
            currentData.log.push(`${currentData[meKey].displayName} used a Small Health Potion!`);
        } else if (potionId === 'P002') {
            currentData[meKey].currentHealth = Math.min(currentData[meKey].selectedBird.maxHealth, currentData[meKey].currentHealth + 300);
            currentData.log.push(`${currentData[meKey].displayName} used a Large Health Potion!`);
        } else if (potionId === 'P003') {
            if (!currentData[meKey].activeEffects) currentData[meKey].activeEffects = {};
            currentData[meKey].activeEffects.doubleAttack = true;
            currentData.log.push(`${currentData[meKey].displayName} used a Damage Booster!`);
        }

        currentData.turn += 1;
        currentData.currentTurnPlayerUid = currentData[opponentKey].uid;
        currentData.turnTimer = {
            currentTurnStartTime: Date.now(),
            turnDuration: 30,
        };
        return currentData;
    }).catch(error => toast.error("Failed to use potion."))
      .finally(() => setIsSubmitting(false));
  }, [isMyTurn, isSubmitting, currentUserId, match.id]);

  const handleForfeit = useCallback(async () => {
    try {
      await gameService.forfeitMatch(match.id, currentUserId);
      toast.info("You forfeited the match.");
    } catch (e: any) {
      toast.error("Failed to forfeit.");
    }
    setShowForfeitConfirm(false);
  }, [match.id, currentUserId]);

  const handleSendEmote = useCallback((emote: string) => {
      if (emoteCooldown) {
          toast.info("Please wait before sending another emote.");
          return;
      }
      const emotePayload = {
          senderUid: currentUserId,
          emote,
          key: Date.now().toString(),
      };
      rtdb.ref(`matches/${match.id}/lastEmote`).set(emotePayload).catch(err => {
          toast.error("Could not send emote.");
      });
      setEmoteCooldown(true);
      setTimeout(() => setEmoteCooldown(false), 2000);
  }, [emoteCooldown, currentUserId, match.id]);

  useEffect(() => {
    if (isOpponentBot && gameState.currentTurnPlayerUid === opponent?.uid && gameState.status === 'active') {
        const botAttackDelay = fastAnimationMode ? 500 : Math.random() * 2000 + 1000;
        const timeoutId = setTimeout(() => {
            const matchRef = rtdb.ref(`matches/${match.id}`);
            matchRef.transaction(currentData => {
                if (!currentData || currentData.status !== 'active' || currentData.currentTurnPlayerUid !== opponent?.uid) return;
                const meKey = currentData.player1.uid === currentUserId ? 'player1' : 'player2';
                const opponentKey = meKey === 'player1' ? 'player2' : 'player1';

                let damage = currentData[opponentKey].selectedBird.skillPower;

              // --- Critical Hit (30% chance for 2x damage) ---
                 let isCritical = false;
                 if (Math.random() < 0.30) {
                     damage *= 2;
                     isCritical = true;
                 }
                 
                 // --- Perfect Meter: Super Precise Power (4x damage) ---
                 let isSuperPrecise = false;
                 if ((currentData[opponentKey].perfectMeter || 0) >= 100) {
                     damage *= 4;
                     isSuperPrecise = true;
                     currentData[opponentKey].perfectMeter = 0;
                     currentData.log.push(`${currentData[opponentKey].displayName} unleashes SUPER PRECISE POWER!`);
                 }
                  
                const botUltimateCooldown = currentData[opponentKey].ultimateCooldownLeft || 0;
                const botUltimateType = currentData[opponentKey].selectedBird.ultimateType;
                let usedUltimate = false;

                // --- Time-based Damage Multiplier ---
                  let timeMultiplier = 1;
                 if (currentData.roundTimerEndTime) {
                     const elapsed = Date.now() - (currentData.roundTimerEndTime - 60000);
                     if (elapsed >= 45000) timeMultiplier = 4;      // last 15s: 4x (ultra aggressive)
                     else if (elapsed >= 30000) timeMultiplier = 3; // 30-45s: 3x (strong)
                     else if (elapsed >= 15000) timeMultiplier = 2; // 15-30s: 2x
                 }
                 damage *= timeMultiplier;
                 
                 // --- Bot Strategy: Conditional Ultimate Usage ---
                 const roundTimeRemaining = currentData.roundTimerEndTime ? Math.max(0, currentData.roundTimerEndTime - Date.now()) : 0;
                 if (roundTimeRemaining <= 20000 && botUltimateType === 'MASSIVE_DAMAGE') {
                     if (!usedUltimate) {
                         usedUltimate = true;
                         const timeLabel = timeMultiplier > 1 ? ` ⚡${timeMultiplier}x FINAL PUSH BONUS` : '';
                         currentData.log.push(`Bot unleashes ULTIMATE OF FATE: ${currentData[opponentKey].selectedBird.ultimateDescription}${timeLabel} `);
                         damage = (currentData[opponentKey].selectedBird.ultimateValue || 0) * timeMultiplier;
                         spawnParticles('ultimate', 8);
                         setActiveEffect('ultimate');
                     }
                 } else if (roundTimeRemaining <= 40000 && !usedUltimate) {
                     if (botUltimateType === 'FULL_HEAL') {
                         usedUltimate = true;
                         const timeLabel = timeMultiplier > 1 ? ` ⚡${timeMultiplier}x REJUVENATION BONUS` : '';
                         currentData.log.push(`Bot casts REGENERATION: ${currentData[opponentKey].selectedBird.ultimateDescription}${timeLabel}`);
                         currentData[opponentKey].currentHealth = currentData[opponentKey].selectedBird.maxHealth;
                         damage = 0;
                     }
                 }

                 if (botUltimateType && botUltimateCooldown <= 0 && !usedUltimate) {
                    usedUltimate = true;
                    const timeLabel = timeMultiplier > 1 ? ` ⚡${timeMultiplier}x TIME BONUS` : '';
                    currentData.log.push(`Bot uses ULTIMATE: ${currentData[opponentKey].selectedBird.ultimateDescription}${timeLabel}`);

                    if (botUltimateType === 'MASSIVE_DAMAGE') {
                        damage = (currentData[opponentKey].selectedBird.ultimateValue || 0) * timeMultiplier;
                        spawnParticles('ultimate', 8);
                        setActiveEffect('ultimate');
                    } else if (botUltimateType === 'FULL_HEAL') {
                        currentData[opponentKey].currentHealth = currentData[opponentKey].selectedBird.maxHealth;
                        damage = 0;
                    } else if (botUltimateType === 'INVULNERABILITY') {
                        if (!currentData[opponentKey].activeEffects) currentData[opponentKey].activeEffects = {};
                        currentData[opponentKey].activeEffects.invulnerable = true;
                        damage = 0;
                    } else if (botUltimateType === 'DOUBLE_ATTACK') {
                        if (!currentData[opponentKey].activeEffects) currentData[opponentKey].activeEffects = {};
                        currentData[opponentKey].activeEffects.doubleAttack = true;
                        damage = 0;
                    }
                    currentData[opponentKey].ultimateCooldownLeft = currentData[opponentKey].selectedBird.ultimateCooldown;
                }

                if (!usedUltimate) {
                    if (currentData[meKey].activeEffects?.blocking) {
                        damage = Math.floor(damage * 0.3);
                        delete currentData[meKey].activeEffects.blocking;
                        currentData.log.push(`${currentData[meKey].displayName}'s block absorbs most of the damage!`);
                    }

                    if (currentData[opponentKey].activeEffects?.doubleAttack) {
                        damage *= 2;
                        delete currentData[opponentKey].activeEffects.doubleAttack;
                    }

                    if ((currentData[opponentKey].currentHealth / currentData[opponentKey].selectedBird.maxHealth) <= 0.3) {
                        damage = Math.floor(damage * 1.2);
                        if (!currentData[opponentKey].activeEffects) currentData[opponentKey].activeEffects = {};
                        currentData[opponentKey].activeEffects.adrenaline = true;
                    }

                    if (currentData[meKey].activeEffects?.invulnerable) {
                        damage = 0;
                        delete currentData[meKey].activeEffects.invulnerable;
                    } else if (currentData[meKey].activeEffects?.defenseBuff) {
                        damage = Math.floor(damage * 0.5);
                        delete currentData[meKey].activeEffects.defenseBuff;
                    }

                    if (damage > 0) {
                        const critLabel = isCritical ? ' CRITICAL!' : '';
                        const preciseLabel = isSuperPrecise ? ' ⚡SUPER PRECISE⚡' : '';
                        const timeLabel = timeMultiplier > 1 ? ` ⏱${timeMultiplier}x TIME!` : '';
                        currentData.log.push(`Bot attacks for ${damage} damage!${critLabel}${preciseLabel}${timeLabel}`);
                    }
                } else if (damage > 0 && botUltimateType === 'MASSIVE_DAMAGE') {
                     if (currentData[meKey].activeEffects?.invulnerable) {
                        damage = 0;
                        delete currentData[meKey].activeEffects.invulnerable;
                    } else if (currentData[meKey].activeEffects?.defenseBuff) {
                        damage = Math.floor(damage * 0.5);
                        delete currentData[meKey].activeEffects.defenseBuff;
                    }
                }

                currentData[meKey].currentHealth -= damage;
                currentData[opponentKey].damageDealt += damage;

                if (currentData[opponentKey].ultimateCooldownLeft && currentData[opponentKey].ultimateCooldownLeft > 0 && !usedUltimate) {
                    currentData[opponentKey].ultimateCooldownLeft -= 1;
                }

                if (currentData[meKey].currentHealth <= 0) {
                    return processRoundEnd(currentData, opponentKey, meKey, opponent?.uid || '');
                }

                // Build perfect meter on successful hit
                if (damage > 0) {
                    currentData[opponentKey].perfectMeter = Math.min(100, (currentData[opponentKey].perfectMeter || 0) + 25);
                }

                currentData.turn += 1;
                currentData.currentTurnPlayerUid = currentData[meKey].uid;
                currentData.turnTimer = {
                    currentTurnStartTime: Date.now(),
                    turnDuration: 30,
                };
                return currentData;
            }).catch(error => console.error("Bot attack failed.", error));
        }, botAttackDelay);

        return () => clearTimeout(timeoutId);
    }
  }, [gameState, isOpponentBot, opponent, currentUserId, match.id, fastAnimationMode]);

  const handleReportSubmit = async (category: string, details: string) => {
    try {
        await playerService.submitReport(currentPlayer, category, details, opponent, match.id);
        toast.success("Report submitted. Thank you for helping keep the community safe.");
        setIsReportModalOpen(false);
    } catch (e: any) {
        toast.error(`Failed to submit report: ${e.message}`);
    }
  };

  if (gameError && !isReconnecting) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
            <h2 className="text-xl font-bold text-red-400 mb-4">Game Error</h2>
            <p className="text-gray-300 mb-6">{gameError}</p>
            <Button onClick={() => onGameOver({ outcome: 'draw', myDamageDealt: 0, opponentDamageDealt: 0, matchType: match.matchType }, match)}>
                Return to Lobby
            </Button>
        </div>
     )
  }

  if (!me || !opponent) {
      return <div className="flex justify-center items-center h-full"><Spinner /></div>;
  }

  const isP1 = me.uid === gameState.player1.uid;
  const myWins = me.wins || 0;
  const oppWins = opponent.wins || 0;
  const currentRound = gameState.currentRound || 1;
  const turnTimePercent = turnTimeLeft !== null ? (turnTimeLeft / 30) * 100 : 0;
  const isTimeLow = turnTimeLeft !== null && turnTimeLeft <= 10;

  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden landscape:flex-row landscape:items-stretch ${animationClasses.screen}`}>
      {showReconnectBanner && (
        <div className="absolute top-0 left-0 right-0 bg-green-600 text-white text-center text-sm font-bold py-2 z-50 animate-bounce">
          Reconnected! Match resumed.
        </div>
      )}
      {isReconnecting && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-center">
            <Spinner />
            <p className="text-yellow-400 font-bold mt-4">Reconnecting...</p>
          </div>
        </div>
      )}
      {/* Ping indicator - top right corner */}
      <div className="absolute top-1 right-1 z-50">
        <PingIndicator />
      </div>

      {/* Round indicator bar */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-black/70 px-3 py-1 rounded-full border border-yellow-500/50">
        <span className="text-[10px] font-bold text-yellow-400">R{currentRound}</span>
        <span className="text-[10px] text-white">|</span>
        <span className="text-[10px] text-green-400">{me.displayName?.split(' ')[0] || 'P1'} {myWins}</span>
        <span className="text-[10px] text-gray-400">-</span>
        <span className="text-[10px] text-red-400">{oppWins} {opponent.displayName?.split(' ')[0] || 'P2'}</span>
      </div>

      {/* Left/Opponent section */}
      <div className="flex flex-col landscape:w-1/4 landscape:h-full p-1 sm:p-2">
        <PlayerDisplay player={opponent} isTurn={!isMyTurn && isGameActive} roundWins={oppWins} isP1={!isP1} />
      </div>

      {/* Center Battle Area */}
      <div className="flex-grow flex flex-col items-center justify-center relative bg-black/20 border-2 border-black m-1 sm:m-2 overflow-hidden landscape:flex-1">
        {particles.map(p => (
          <ParticleEffect key={p.id} particle={p} />
        ))}

        {activeEffect === 'attack' && <AttackEffect show={true} onComplete={() => setActiveEffect(null)} />}
        {activeEffect === 'shield' && <ShieldEffect show={true} onComplete={() => setActiveEffect(null)} />}
        {activeEffect === 'heal' && <HealEffect show={true} onComplete={() => setActiveEffect(null)} />}
        {activeEffect === 'ultimate' && <UltimateEffect show={true} onComplete={() => setActiveEffect(null)} />}
        {activeEffect === 'hit' && <HitEffect show={true} onComplete={() => setActiveEffect(null)} />}

        <div className="flex items-center justify-around w-full h-full relative">
          {damageNumbers.map(dn => (
            <div key={dn.key} className={`absolute text-4xl sm:text-5xl font-bold pointer-events-none animate-damage-popup ${dn.target === 'me' ? 'text-red-500 left-[15%]' : 'text-red-500 right-[15%]'}`}>
              -{dn.amount}
            </div>
          ))}

          <div className={`relative ${animationClasses.opponent}`}>
            <div ref={el => { if (el) playerRefs.current.set(opponent.uid, el); }} className="bird-wrapper">
              <EmoteBubble payload={emoteDisplay.opponent} />
              <LottieBird bird={opponent.selectedBird} size="lg" animated={true} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 bg-black/60 p-2 sm:p-3 border-2 border-black z-10 min-w-[100px]">
            <h2 className="text-sm sm:text-lg font-bold text-yellow-400 text-center">
              {isGameActive ? (isMyTurn ? "YOUR TURN" : `${opponent.displayName}'s Turn`) : "MATCH OVER"}
            </h2>
            <p className="text-xs text-gray-400">Turn {gameState.turn}</p>

            {isGameActive && roundTimeLeft !== null && (
              <div className="w-full mt-1">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] font-bold text-red-400">⏱ ROUND</span>
                  <span className={`text-sm font-bold ${roundTimeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>{roundTimeLeft}s</span>
                </div>
                <div className="w-full bg-gray-800 h-1 rounded-full border border-gray-600 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${roundTimeLeft <= 10 ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`}
                    style={{ width: `${(roundTimeLeft / 60) * 100}%` }}
                  />
                </div>
                {roundMultiplier > 1 && (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className={`text-[10px] font-bold ${roundMultiplier === 3 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
                      ⚡ DAMAGE {roundMultiplier}x
                    </span>
                  </div>
                )}
              </div>
            )}

            {isGameActive && turnTimeLeft !== null && (
              <div className="w-full mt-1">
                <div className="w-full bg-gray-800 h-2 rounded-full border border-gray-600 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isTimeLow ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`}
                    style={{ width: `${turnTimePercent}%` }}
                  />
                </div>
                <p className={`text-xs font-bold text-center mt-0.5 ${isTimeLow ? 'text-red-400 animate-pulse' : 'text-gray-300'}`}>
                  {turnTimeLeft}s
                </p>
              </div>
            )}
          </div>

          <div className={`relative ${animationClasses.me}`}>
            <div ref={el => { if (el) playerRefs.current.set(me.uid, el); }} className="bird-wrapper">
              <EmoteBubble payload={emoteDisplay.me} />
              <LottieBird bird={me.selectedBird} size="lg" animated={true} />
            </div>
          </div>
        </div>

        {/* Perfect Meter Bars */}
        <div className="w-full px-4 pb-1 flex gap-4 items-center mt-1">
          <div className="flex-1 flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-yellow-300 font-bold">{opponent?.perfectMeter || 0}%</span>
              <span className="text-[7px] text-yellow-500/80 uppercase tracking-wider">Perfect</span>
            </div>
            <div className="w-full max-w-[120px] h-1.5 bg-gray-800 rounded-full border border-gray-600 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-300"
                style={{ width: `${Math.min(100, opponent?.perfectMeter || 0)}%` }}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-yellow-500/80 uppercase tracking-wider">Perfect</span>
              <span className="text-[8px] text-yellow-300 font-bold">{me?.perfectMeter || 0}%</span>
            </div>
            <div className="w-full max-w-[120px] h-1.5 bg-gray-800 rounded-full border border-gray-600 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-300"
                style={{ width: `${Math.min(100, me?.perfectMeter || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {gameOverState && (
          <div className="game-over-overlay">
            {gameOverState === 'win' && (
              <>
                <VictoryAnimation type="victory" />
                <h1 className="game-over-text victory-text z-50">VICTORY</h1>
              </>
            )}
            {gameOverState === 'loss' && (
              <>
                <VictoryAnimation type="defeat" />
                <h1 className="game-over-text defeat-text z-50">DEFEAT</h1>
              </>
            )}
            {gameOverState === 'draw' && <h1 className="game-over-text draw-text z-50">DRAW</h1>}
          </div>
        )}
        <ReactionAnimation payload={reactionDisplay} playerRefs={playerRefs} />
      </div>

      {/* Right/My section */}
      <div className="flex flex-col landscape:w-1/4 landscape:h-full p-1 sm:p-2">
        <PlayerDisplay player={me} isTurn={isMyTurn && isGameActive} roundWins={myWins} isP1={isP1} />

        {/* Action Buttons */}
        <div className="mt-1 sm:mt-2 flex flex-col gap-1.5">
          {/* Row 1: Attack (main) */}
          <button
            onClick={handleAttack}
            disabled={!isMyTurn || isSubmitting}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-orange-600 border-2 border-red-400 rounded-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_0_#991b1b] active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:translate-y-0 disabled:shadow-[0_4px_0_#991b1b] hover:from-red-500 hover:to-orange-500"
          >
            {isSubmitting ? <Spinner /> : (
              <><span className="text-lg">⚔️</span> ATTACK <span className="text-yellow-300 text-xs">~{potentialDamage}</span></>
            )}
          </button>

          {/* Row 2: Ability + Block + Ultimate */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Bird Special Ability */}
            {me.selectedBird.abilityType && (
              <button
                onClick={handleAbility}
                disabled={!isMyTurn || isSubmitting || (me.abilityCooldownLeft ?? 0) > 0}
                className="py-2 bg-gradient-to-br from-green-600 to-emerald-700 border-2 border-green-400 rounded-lg font-bold text-[10px] sm:text-xs flex flex-col items-center justify-center gap-0.5 shadow-[0_3px_0_#166534] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:translate-y-0 disabled:shadow-[0_3px_0_#166534] hover:from-green-500 hover:to-emerald-600"
              >
                <span className="text-sm">✨</span>
                <span>ABILITY</span>
                <span className="text-green-300 text-[8px]">
                  {(me.abilityCooldownLeft ?? 0) > 0 ? `CD:${me.abilityCooldownLeft}` : (me.selectedBird.abilityDescription?.split(':')[0] || '')}
                </span>
              </button>
            )}

            {/* Block */}
            <button
              onClick={handleBlock}
              disabled={!isMyTurn || isSubmitting}
              className="py-2 bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-blue-400 rounded-lg font-bold text-[10px] sm:text-xs flex flex-col items-center justify-center gap-0.5 shadow-[0_3px_0_#1e40af] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:translate-y-0 disabled:shadow-[0_3px_0_#1e40af] hover:from-blue-500 hover:to-indigo-600"
            >
              <span className="text-sm">🛡</span>
              <span>BLOCK</span>
              <span className="text-blue-300 text-[8px]">-70%</span>
            </button>

            {/* Ultimate */}
            {me.selectedBird.ultimateType && (
              <button
                onClick={handleUltimate}
                disabled={!isMyTurn || isSubmitting || (me.ultimateCooldownLeft ?? 0) > 0}
                className="py-2 bg-gradient-to-br from-purple-600 to-pink-700 border-2 border-purple-400 rounded-lg font-bold text-[10px] sm:text-xs flex flex-col items-center justify-center gap-0.5 shadow-[0_3px_0_#6b21a8] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:translate-y-0 disabled:shadow-[0_3px_0_#6b21a8] hover:from-purple-500 hover:to-pink-600"
              >
                <span className="text-sm">💥</span>
                <span>ULTIMATE</span>
                <span className="text-purple-300 text-[8px]">
                  {(me.ultimateCooldownLeft ?? 0) > 0 ? `CD:${me.ultimateCooldownLeft}` : `~${me.selectedBird.ultimateValue || 0}`}
                </span>
              </button>
            )}
          </div>

          {/* Row 3: Potions + Utility */}
          <div className="flex gap-1 items-center">
            {me.potions && (Object.entries(me.potions) as [string, number][]).filter(([, count]) => count > 0).map(([potionId, count]) => (
              <button
                key={potionId}
                onClick={() => handleUsePotion(potionId)}
                disabled={!isMyTurn || isSubmitting}
                className="flex-1 h-9 sm:h-10 bg-gradient-to-r from-teal-700 to-cyan-800 border-2 border-teal-400 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 rounded-lg disabled:opacity-40 hover:from-teal-600 hover:to-cyan-700 transition-all active:scale-95"
                title={`Use potion (ends turn)`}
              >
                <span>🧪</span>
                <span>{count}</span>
              </button>
            ))}
            <button onClick={() => setIsEmotePanelOpen(prev => !prev)} className="h-9 sm:h-10 w-9 sm:w-10 bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-500 text-lg rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all active:scale-95">😊</button>
            <button onClick={() => setShowForfeitConfirm(true)} className="h-9 sm:h-10 w-9 sm:w-10 bg-gradient-to-br from-red-800 to-red-950 border-2 border-red-500 text-sm rounded-lg hover:from-red-700 hover:to-red-900 transition-all active:scale-95" title="Forfeit">🏳️</button>
            <button onClick={() => setIsSettingsOpen(true)} className="h-9 sm:h-10 w-9 sm:w-10 bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-500 text-lg rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all active:scale-95">⚙️</button>
          </div>
        </div>
      </div>

      {isEmotePanelOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 p-2 bg-black/90 border-2 border-black grid grid-cols-3 gap-2 rounded-lg">
          {myEmotes.map(emote => (
            <button key={emote} onClick={() => { handleSendEmote(emote); setIsEmotePanelOpen(false); }} className="text-3xl sm:text-4xl p-2 hover:bg-white/20 rounded-lg transition-colors">{emote}</button>
          ))}
        </div>
      )}

      {showForfeitConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] p-4 sm:p-6 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-red-400 mb-4">Forfeit Match?</h3>
            <p className="text-gray-300 mb-6">Are you sure? This will count as a loss.</p>
            <div className="flex gap-4">
              <Button onClick={() => setShowForfeitConfirm(false)} variant="secondary" className="flex-1">Cancel</Button>
              <Button onClick={handleForfeit} variant="danger" className="flex-1">Forfeit</Button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {isReportModalOpen && <ReportModal opponentName={opponent.displayName || 'Opponent'} onClose={() => setIsReportModalOpen(false)} onSubmit={handleReportSubmit} />}
    </div>
  );
};

const PlayerDisplay: React.FC<{ player: MatchPlayer, isTurn: boolean, roundWins: number, isP1: boolean }> = ({ player, isTurn, roundWins, isP1 }) => {
    if (!player || !player.selectedBird) return null;
    const healthPercent = (player.currentHealth / player.selectedBird.maxHealth) * 100;
    const { rankName } = getRankInfo(player.rankPoints);
    const borderColor = isP1 ? 'border-yellow-400' : 'border-gray-700';
    const bgColor = isP1 ? 'bg-blue-900/80' : 'bg-[#1e2227]';
    const turnIndicatorBorder = isTurn ? '!border-yellow-400' : '';
    const isAdrenaline = (player.currentHealth / player.selectedBird.maxHealth) <= 0.3;
    const isBlocking = player.activeEffects?.blocking;

    return (
    <div className={`p-1 sm:p-2 ${bgColor} border-2 ${borderColor} ${turnIndicatorBorder} shadow-lg transition-all duration-300 ${isTurn ? 'scale-105' : ''} relative`}>
        {isBlocking && <div className="absolute inset-0 border-2 border-blue-400 animate-pulse pointer-events-none z-10 rounded" title="Blocking!"></div>}
        {isAdrenaline && <div className="absolute inset-0 border-4 border-red-500 animate-pulse pointer-events-none z-10" title="Adrenaline Rush!"></div>}
        <div className="flex justify-between items-start relative z-20">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <PlayerAvatar
                    photoURL={player.photoURL}
                    uid={player.uid}
                    activeBadge={player.activeBadge}
                    sizeClassName="w-8 h-8 sm:w-10 sm:h-10"
                    imgClassName="border-2 border-black bg-gray-600"
                />
                <div className="min-w-0">
                    <p className="font-pixel text-[10px] sm:text-sm text-white leading-tight truncate">{player.displayName}</p>
                    <p className="font-semibold text-[9px] sm:text-xs text-blue-300 leading-tight truncate">{rankName}</p>
                    {isAdrenaline && <p className="text-[8px] sm:text-[10px] text-red-400 font-bold uppercase animate-bounce">🔥 Adrenaline!</p>}
                    {isBlocking && <p className="text-[8px] sm:text-[10px] text-blue-400 font-bold uppercase animate-pulse">🛡 Blocking!</p>}
                </div>
            </div>
            <div className="text-right flex-shrink-0 ml-1">
                {[...Array(2)].map((_, i) => (
                    <span key={i} className={`inline-block w-2.5 h-2.5 rounded-full mx-0.5 ${i < roundWins ? 'bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.8)]' : 'bg-gray-600 border border-gray-500'}`}></span>
                ))}
            </div>
        </div>
        <div className="mt-1 sm:mt-2 w-full bg-black h-4 sm:h-5 border border-black p-0.5 relative z-20">
            <div
              className={`h-full transition-all duration-300 ${isAdrenaline ? 'bg-red-600' : 'bg-gradient-to-r from-red-600 via-yellow-500 to-yellow-400'}`}
              style={{ width: `${Math.max(0, healthPercent)}%`}}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-xs font-bold text-white font-pixel" style={{textShadow:'1px 1px 0 #000'}}>{Math.max(0, player.currentHealth)} / {player.selectedBird.maxHealth}</span>
        </div>
    </div>
  )};

export default GameScreen;
