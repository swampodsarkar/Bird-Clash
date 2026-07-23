import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Match, MatchPlayer } from '../types';
import { rtdb } from '../services/firebase';
import type firebase from 'firebase/compat/app';
import { useGameConfig } from '../hooks/useGameConfig';
import { getRankInfo, isWinterThemeActive } from '../utils/helpers';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import Snowfall from './common/Snowfall';
import PlayerAvatar from './common/PlayerAvatar';
import LottieBird from './common/LottieBird';
import { AttackEffect, ShieldEffect, HealEffect, UltimateEffect, HitEffect } from './common/LottieEffects';
import VictoryAnimation from './common/VictoryAnimation';

interface SpectatorScreenProps {
  matchId: string;
  onExit: () => void;
}

const REACTIONS = ['👍', '🎉', '👏'];
const ROUNDS_TO_WIN = 2;

interface Particle {
  id: number; x: number; y: number; type: 'damage' | 'block' | 'heal' | 'ultimate';
}

interface DamageNumber {
  amount: number; target: 'me' | 'opponent'; key: number;
}

let particleId = 0;

const ParticleEffect: React.FC<{ particle: Particle }> = ({ particle }) => {
  const emoji = particle.type === 'damage' ? '✸' : particle.type === 'block' ? '🛡' : particle.type === 'heal' ? '✦' : '⚡';
  return (
    <div className="absolute pointer-events-none animate-particle" style={{ left: `${particle.x}%`, top: `${particle.y}%` }}>
      <span className="text-xl">{emoji}</span>
    </div>
  );
};

const EmoteBubble: React.FC<{ payload: { emote: string; key: string } | null }> = ({ payload }) => {
  const [visible, setVisible] = useState(false);
  const [emote, setEmote] = useState('');
  const prevKey = useRef('');
  useEffect(() => {
    if (payload && payload.key !== prevKey.current) {
      prevKey.current = payload.key;
      setEmote(payload.emote);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [payload]);
  if (!visible) return null;
  return (
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 animate-emote-popup">
      <span className="text-3xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{emote}</span>
    </div>
  );
};

const ReactionAnimation: React.FC<{ payload: { reaction: string; targetPlayerUid: string; key: string } | null }> = ({ payload }) => {
  const [visible, setVisible] = useState(false);
  const [reaction, setReaction] = useState('');
  const prevKey = useRef('');
  if (payload && payload.key !== prevKey.current) {
    prevKey.current = payload.key;
    setReaction(payload.reaction);
    setVisible(true);
    setTimeout(() => setVisible(false), 1500);
  }
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <span className="text-6xl animate-reaction-float-up">{reaction}</span>
    </div>
  );
};

const PlayerDisplay: React.FC<{ player: MatchPlayer; side: 'left' | 'right' }> = ({ player, side }) => {
  const bird = player.selectedBird;
  if (!bird) return null;
  const healthPercent = Math.max(0, (player.currentHealth / bird.maxHealth) * 100);
  const isAdrenaline = healthPercent < 30;
  const { rankName } = getRankInfo(player.rankPoints);
  const roundWins = player.wins || 0;

  return (
    <div className={`flex-1 min-w-0 flex flex-col ${side === 'right' ? 'items-end' : 'items-start'} px-2`}>
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <PlayerAvatar photoURL={player.photoURL} uid={player.uid} activeBadge={player.activeBadge} sizeClassName="w-8 h-8 sm:w-10 sm:h-10" imgClassName="border-2 border-black bg-gray-600" />
        <div className="min-w-0">
          <p className="font-pixel text-[10px] sm:text-sm text-white leading-tight truncate">{player.displayName}</p>
          <p className="font-semibold text-[9px] sm:text-xs text-blue-300 leading-tight truncate">{rankName}</p>
          {isAdrenaline && <p className="text-[8px] sm:text-[10px] text-red-400 font-bold uppercase animate-bounce">🔥 Adrenaline!</p>}
        </div>
        <div className="text-right flex-shrink-0 ml-1">
          {[...Array(2)].map((_, i) => (
            <span key={i} className={`inline-block w-2.5 h-2.5 rounded-full mx-0.5 ${i < roundWins ? 'bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.8)]' : 'bg-gray-600 border border-gray-500'}`} />
          ))}
        </div>
      </div>
      <div className="mt-1 sm:mt-2 w-full bg-black h-4 sm:h-5 border border-black p-0.5 relative z-20">
        <div className={`h-full transition-all duration-300 ${isAdrenaline ? 'bg-red-600' : 'bg-gradient-to-r from-red-600 via-yellow-500 to-yellow-400'}`} style={{ width: `${Math.max(0, healthPercent)}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-xs font-bold text-white font-pixel" style={{textShadow:'1px 1px 0 #000'}}>{Math.max(0, player.currentHealth)} / {bird.maxHealth}</span>
      </div>
    </div>
  );
};

const SpectatorScreen: React.FC<SpectatorScreenProps> = ({ matchId, onExit }) => {
  const [matchState, setMatchState] = useState<Match | null>(null);
  const config = useGameConfig();
  const [timeLeft, setTimeLeft] = useState(config.MATCH_DURATION_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [reactionCooldown, setReactionCooldown] = useState(false);
  const winterThemeActive = isWinterThemeActive();

  // Animation state
  const [animationClasses, setAnimationClasses] = useState({ me: '', opponent: '', screen: '' });
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [emoteDisplay, setEmoteDisplay] = useState<{ me: { emote: string; key: string } | null; opponent: { emote: string; key: string } | null }>({ me: null, opponent: null });
  const [reactionDisplay, setReactionDisplay] = useState<{ reaction: string; targetPlayerUid: string; key: string } | null>(null);
  const [gameOverState, setGameOverState] = useState<'win' | 'loss' | 'draw' | null>(null);

  const prevHealthRef = useRef({ me: 0, opponent: 0 });
  const lastEmoteKey = useRef('');
  const lastReactionKey = useRef('');
  const playerRefs = useRef(new Map<string, HTMLDivElement>());

  const isEsports = matchState?.matchType === 'esports';

  // Listen to match data
  useEffect(() => {
    const matchRef = rtdb.ref(`matches/${matchId}`);
    const listener = (snapshot: firebase.database.DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        setMatchState(data);
      } else {
        setError("The match has ended or could not be found.");
      }
    };
    matchRef.on('value', listener, (err: Error) => {
      setError("Could not connect to the match.");
    });
    return () => matchRef.off('value', listener);
  }, [matchId]);

  // Timer
  useEffect(() => {
    if (!matchState || matchState.status !== 'active') return;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - matchState.startTime) / 1000;
      setTimeLeft(Math.max(0, config.MATCH_DURATION_SECONDS - Math.ceil(elapsed)));
    }, 500);
    return () => clearInterval(timer);
  }, [matchState, config.MATCH_DURATION_SECONDS]);

  // Animation detection — same as GameScreen but read-only
  useEffect(() => {
    if (!matchState) return;

    const emoteData = matchState.lastEmote;
    if (emoteData && emoteData.key !== lastEmoteKey.current) {
      lastEmoteKey.current = emoteData.key;
      const emotePayload = { emote: emoteData.emote, key: emoteData.key };
      if (emoteData.senderUid === matchState.player1.uid) {
        setEmoteDisplay(prev => ({ ...prev, opponent: emotePayload }));
      } else {
        setEmoteDisplay(prev => ({ ...prev, me: emotePayload }));
      }
    }

    const reactionData = matchState.lastReaction;
    if (reactionData && reactionData.key !== lastReactionKey.current) {
      lastReactionKey.current = reactionData.key;
      setReactionDisplay({ reaction: reactionData.reaction, targetPlayerUid: reactionData.targetPlayerUid, key: reactionData.key });
      setTimeout(() => setReactionDisplay(null), 1500);
    }

    const p1 = matchState.player1;
    const p2 = matchState.player2;

    const myDamageTaken = (prevHealthRef.current.me || p1.currentHealth) - p1.currentHealth;
    const opponentDamageTaken = (prevHealthRef.current.opponent || p2.currentHealth) - p2.currentHealth;

    if (opponentDamageTaken > 0) {
      setAnimationClasses({ me: 'anim-attack-me', opponent: 'anim-hit-opponent', screen: '' });
      addDamageNumber(opponentDamageTaken, 'opponent');
      spawnParticles('damage', 5);
      setActiveEffect('attack');
    }
    if (myDamageTaken > 0) {
      setAnimationClasses({ me: 'anim-hit-me', opponent: 'anim-attack-opponent', screen: 'anim-screen-shake' });
      addDamageNumber(myDamageTaken, 'me');
      spawnParticles('damage', 3);
      setActiveEffect('hit');
    }

    if (p1.currentHealth > (prevHealthRef.current.me || p1.currentHealth)) {
      setAnimationClasses({ me: 'anim-ability', opponent: '', screen: '' });
      spawnParticles('heal', 4);
      setActiveEffect('heal');
    }
    if (p2.currentHealth > (prevHealthRef.current.opponent || p2.currentHealth)) {
      setAnimationClasses({ me: '', opponent: 'anim-ability', screen: '' });
      spawnParticles('heal', 4);
    }

    if (myDamageTaken > 0 || opponentDamageTaken > 0) {
      setTimeout(() => setAnimationClasses({ me: '', opponent: '', screen: '' }), 600);
    }
    prevHealthRef.current = { me: p1.currentHealth, opponent: p2.currentHealth };

    if (matchState.status === 'finished' && !gameOverState) {
      const p1Wins = p1.wins || 0;
      const p2Wins = p2.wins || 0;
      if (p1Wins >= ROUNDS_TO_WIN || p2Wins >= ROUNDS_TO_WIN) {
        setGameOverState(matchState.winner === 'draw' ? 'draw' : 'win');
      }
    }
  }, [matchState, gameOverState]);

  const addDamageNumber = (amount: number, target: 'me' | 'opponent') => {
    const key = Date.now();
    setDamageNumbers(prev => [...prev, { amount, target, key }]);
    setTimeout(() => setDamageNumbers(prev => prev.filter(dn => dn.key !== key)), 1000);
  };

  const spawnParticles = (type: 'damage' | 'block' | 'heal' | 'ultimate', count: number) => {
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      id: ++particleId, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, type,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 800);
  };

  const handleSendReaction = (reaction: string, targetPlayerUid: string) => {
    if (reactionCooldown) return;
    rtdb.ref(`matches/${matchId}/lastReaction`).set({
      senderUid: "spectator", reaction, targetPlayerUid, key: Date.now().toString(),
    }).catch(() => {});
    setReactionCooldown(true);
    setTimeout(() => setReactionCooldown(false), 2000);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-950">
        <h2 className="text-xl font-bold text-red-400 mb-4">Error</h2>
        <p className="text-gray-300 mb-6">{error}</p>
        <Button onClick={onExit}>Exit</Button>
      </div>
    );
  }

  if (!matchState) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-950"><Spinner /></div>;
  }

  const { player1, player2 } = matchState;
  const turn = matchState.turn || 1;
  const currentRound = matchState.currentRound || 1;
  const currentTurnPlayerUid = matchState.currentTurnPlayerUid || '';
  const isFinished = matchState.status === 'finished';
  const isP1Turn = player1.uid === currentTurnPlayerUid;

  const winnerName = useMemo(() => {
    if (!matchState || !isFinished || !matchState.winner) return null;
    if (matchState.winner === 'draw') return 'DRAW';
    return matchState.player1.uid === matchState.winner ? matchState.player1.displayName : matchState.player2.displayName;
  }, [matchState, isFinished]);

  const p1Bird = player1.selectedBird;
  const p2Bird = player2.selectedBird;

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden ${animationClasses.screen} ${isEsports ? 'bg-gradient-to-b from-gray-950 via-blue-950/30 to-gray-950' : ''}`}>
      {(winterThemeActive || isEsports) && <Snowfall />}

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-black/60 via-black/40 to-black/60 backdrop-blur-md border-b border-white/10 z-30">
        <div className="flex items-center gap-2">
          {isEsports && <span className="text-lg">📺</span>}
          <span className="font-bold text-sm text-cyan-300 font-pixel">
            {isEsports ? 'ESPORTS SPECTATOR' : 'SPECTATOR MODE'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">Turn {turn}</span>
          {!isFinished && (
            <span className={`text-sm font-bold font-mono ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
              {timeLeft}s
            </span>
          )}
          <Button onClick={onExit} className="!py-1 !px-3 !text-xs">Exit</Button>
        </div>
      </div>

      {/* Round indicator */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/70 px-3 py-1 rounded-full border border-yellow-500/50">
        <span className="text-[10px] font-bold text-yellow-400">R{currentRound}</span>
        <span className="text-[10px] text-white">|</span>
        <span className="text-[10px] text-green-400">{player1.displayName?.split(' ')[0] || 'P1'} {player1.wins || 0}</span>
        <span className="text-[10px] text-gray-400">-</span>
        <span className="text-[10px] text-red-400">{(player2.wins || 0)} {player2.displayName?.split(' ')[0] || 'P2'}</span>
      </div>

      {/* Player info bars */}
      <div className="flex-shrink-0 flex gap-2 px-2 pt-1 z-20">
        <PlayerDisplay player={player1} side="left" />
        <div className="flex-shrink-0 w-16 flex items-center justify-center">
          <span className="font-pixel text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">VS</span>
        </div>
        <PlayerDisplay player={player2} side="right" />
      </div>

      {/* Battle Arena */}
      <div className="flex-grow flex flex-col items-center justify-center relative bg-black/20 border-2 border-black m-1 sm:m-2 overflow-hidden battle-scene-3d">
        {particles.map(p => <ParticleEffect key={p.id} particle={p} />)}

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

          {/* Opponent Bird */}
          {p2Bird && (
            <div className={`relative ${animationClasses.opponent}`}>
              <div className="bird-wrapper">
                <EmoteBubble payload={emoteDisplay.opponent} />
                <LottieBird bird={p2Bird} size="lg" animated={true} />
              </div>
            </div>
          )}

          {/* Center info */}
          <div className="flex flex-col items-center gap-1 bg-black/60 p-2 sm:p-3 border-2 border-black z-10 min-w-[100px]">
            <h2 className="text-sm sm:text-lg font-bold text-yellow-400 text-center">
              {isFinished ? "MATCH OVER" : `${isP1Turn ? player1.displayName : player2.displayName}'s Turn`}
            </h2>
            <p className="text-xs text-gray-400">Turn {turn}</p>
            {!isFinished && (
              <div className="w-full mt-1">
                <div className="w-full bg-gray-800 h-2 rounded-full border border-gray-600 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 bg-yellow-400" style={{ width: `${(timeLeft / config.MATCH_DURATION_SECONDS) * 100}%` }} />
                </div>
                <p className="text-xs font-bold text-center mt-0.5 text-gray-300">{timeLeft}s</p>
              </div>
            )}
          </div>

          {/* My Bird (player1) */}
          {p1Bird && (
            <div className={`relative ${animationClasses.me}`}>
              <div className="bird-wrapper">
                <EmoteBubble payload={emoteDisplay.me} />
                <LottieBird bird={p1Bird} size="lg" animated={true} />
              </div>
            </div>
          )}
        </div>

        {/* Game Over Overlay */}
        {gameOverState && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/50">
            {gameOverState === 'win' && (
              <>
                <VictoryAnimation type="victory" />
                <h1 className={`text-4xl sm:text-6xl font-bold font-pixel z-50 ${winnerName === 'DRAW' ? 'text-yellow-400' : 'text-green-400'}`} style={{textShadow:'0 0 30px rgba(74,222,128,0.6)'}}>
                  {winnerName === 'DRAW' ? "IT'S A DRAW!" : `${winnerName} WINS!`}
                </h1>
              </>
            )}
            {gameOverState === 'loss' && (
              <>
                <VictoryAnimation type="defeat" />
                <h1 className="text-4xl sm:text-6xl font-bold font-pixel text-red-500 z-50" style={{textShadow:'0 0 30px rgba(239,68,68,0.6)'}}>
                  {winnerName === 'DRAW' ? "IT'S A DRAW!" : `${winnerName} WINS!`}
                </h1>
              </>
            )}
            {gameOverState === 'draw' && (
              <h1 className="text-4xl sm:text-6xl font-bold font-pixel text-yellow-400 z-50" style={{textShadow:'0 0 30px rgba(250,204,21,0.6)'}}>
                IT'S A DRAW!
              </h1>
            )}
            <Button onClick={onExit} className="absolute bottom-8 !py-2 !px-6 z-50">Exit</Button>
          </div>
        )}

        <ReactionAnimation payload={reactionDisplay} />
      </div>

      {/* Match Log */}
      {matchState.log && matchState.log.length > 0 && (
        <div className="flex-shrink-0 px-3 py-1.5 bg-black/60 backdrop-blur-sm border-t border-white/10">
          <p className="text-[10px] text-gray-500 mb-0.5 font-pixel">BATTLE LOG</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {matchState.log.slice(-5).map((entry, i) => (
              <span key={i} className="text-[10px] text-gray-400 whitespace-nowrap font-mono">{entry}</span>
            ))}
          </div>
        </div>
      )}

      {/* Reactions */}
      <div className="flex-shrink-0 px-3 py-2 bg-black/40 backdrop-blur-sm border-t border-white/5 flex items-center justify-center gap-4">
        <span className="text-[10px] text-gray-500">React:</span>
        {REACTIONS.map(r => (
          <button key={r} onClick={() => handleSendReaction(r, player1.uid)} disabled={reactionCooldown} className="text-xl hover:scale-125 transition-transform disabled:opacity-40">{r}</button>
        ))}
        <span className="text-[10px] text-gray-600 mx-1">|</span>
        {REACTIONS.map(r => (
          <button key={`p2-${r}`} onClick={() => handleSendReaction(r, player2.uid)} disabled={reactionCooldown} className="text-xl hover:scale-125 transition-transform disabled:opacity-40">{r}</button>
        ))}
      </div>
    </div>
  );
};

export default SpectatorScreen;