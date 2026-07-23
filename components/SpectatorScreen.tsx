import React, { useState, useEffect, useMemo } from 'react';
import type { Match, MatchPlayer } from '../types';
import { rtdb } from '../services/firebase';
import type firebase from 'firebase/compat/app';
import { useGameConfig } from '../hooks/useGameConfig';
import { isWinterThemeActive } from '../utils/helpers';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import Snowfall from './common/Snowfall';

interface SpectatorScreenProps {
  matchId: string;
  onExit: () => void;
}

const REACTIONS = ['👍', '🎉', '👏'];

const HealthBar: React.FC<{ current: number; max: number; color: string }> = ({ current, max, color }) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="relative w-full h-6 sm:h-8 bg-gray-900 border-2 border-gray-600 rounded-lg overflow-hidden shadow-inner">
      <div
        className="h-full transition-all duration-500 ease-out rounded-r-md"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs sm:text-sm font-bold text-white font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {Math.max(0, current)} / {max}
        </span>
      </div>
      {/* Segment markers */}
      <div className="absolute inset-0 flex">
        {[25, 50, 75].map(mark => (
          <div key={mark} className="h-full w-px bg-white/20" style={{ marginLeft: `${mark}%` }} />
        ))}
      </div>
    </div>
  );
};

const PlayerCard: React.FC<{ player: MatchPlayer; side: 'left' | 'right'; isTurn: boolean }> = ({ player, side, isTurn }) => {
  if (!player || !player.selectedBird) return null;
  const bird = player.selectedBird;
  return (
    <div className={`flex flex-col ${side === 'left' ? 'items-start' : 'items-end'} gap-1.5 w-full max-w-xs`}>
      {/* Avatar & Name */}
      <div className={`flex ${side === 'left' ? 'flex-row' : 'flex-row-reverse'} items-center gap-2`}>
        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 ${isTurn ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'border-gray-500'} overflow-hidden bg-gray-800`}>
          {player.photoURL ? (
            <img src={player.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">{bird.icon}</div>
          )}
        </div>
        <div className={`flex flex-col ${side === 'right' ? 'items-end' : 'items-start'}`}>
          <p className="font-bold text-sm sm:text-base text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{player.displayName}</p>
          <p className="text-[10px] text-gray-400 font-mono">
            {bird.name} Lv.{bird.level} {bird.rarity}
          </p>
        </div>
      </div>

      {/* Health Bar */}
      <div className="w-full">
        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 px-0.5">
          <span>HP</span>
          <span>{bird.skillPower} ATK</span>
        </div>
        <HealthBar current={player.currentHealth} max={bird.maxHealth} color={side === 'left' ? '#3b82f6' : '#ef4444'} />
      </div>

      {/* Damage Dealt */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-xs text-gray-500">⚔️ Damage:</span>
        <span className="text-sm font-bold font-mono text-yellow-400">{player.damageDealt}</span>
      </div>

      {/* Active Effects */}
      {player.activeEffects && Object.keys(player.activeEffects).length > 0 && (
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {player.activeEffects.shield && <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/40">🛡 +{player.activeEffects.shield}</span>}
          {player.activeEffects.burn && <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded border border-red-500/40">🔥 {player.activeEffects.burn.damage}/t</span>}
          {player.activeEffects.invulnerable && <span className="text-[10px] bg-yellow-900/60 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/40">✨ INVINCIBLE</span>}
          {player.activeEffects.defenseBuff && <span className="text-[10px] bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded border border-green-500/40">🛡 DEF UP</span>}
          {player.activeEffects.doubleAttack && <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/40">⚔️×2</span>}
          {player.activeEffects.stunned && <span className="text-[10px] bg-gray-900/60 text-gray-300 px-1.5 py-0.5 rounded border border-gray-500/40">💫 STUNNED</span>}
        </div>
      )}
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
  const isEsports = matchState?.matchType === 'esports';

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

  useEffect(() => {
    if (!matchState || matchState.status !== 'active') return;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - matchState.startTime) / 1000;
      setTimeLeft(Math.max(0, config.MATCH_DURATION_SECONDS - Math.ceil(elapsed)));
    }, 500);
    return () => clearInterval(timer);
  }, [matchState, config.MATCH_DURATION_SECONDS]);

  const handleSendReaction = (reaction: string, targetPlayerUid: string) => {
    if (reactionCooldown) return;
    rtdb.ref(`matches/${matchId}/lastReaction`).set({
      senderUid: "spectator", reaction, targetPlayerUid, key: Date.now().toString(),
    }).catch(() => {});
    setReactionCooldown(true);
    setTimeout(() => setReactionCooldown(false), 2000);
  };

  const turn = matchState?.turn || 1;
  const currentTurnPlayerUid = matchState?.currentTurnPlayerUid || '';
  const isFinished = matchState?.status === 'finished';

  const winnerName = useMemo(() => {
    if (!matchState || !isFinished || !matchState.winner) return null;
    if (matchState.winner === 'draw') return 'DRAW';
    return matchState.player1.uid === matchState.winner ? matchState.player1.displayName : matchState.player2.displayName;
  }, [matchState, isFinished]);

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
  const isP1Turn = player1.uid === currentTurnPlayerUid;

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden ${isEsports ? 'bg-gradient-to-b from-gray-950 via-blue-950/30 to-gray-950' : ''}`}>
      {(winterThemeActive || isEsports) && <Snowfall />}

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-black/60 via-black/40 to-black/60 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          {isEsports && <span className="text-lg">📺</span>}
          <span className="font-bold text-sm text-cyan-300 font-pixel">
            {isEsports ? 'ESPORTS SPECTATOR' : 'SPECTATOR MODE'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">Turn {turn}/10</span>
          {!isFinished && (
            <span className={`text-sm font-bold font-mono ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
              {timeLeft}s
            </span>
          )}
          <Button onClick={onExit} className="!py-1 !px-3 !text-xs">Exit</Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-grow flex flex-col items-center justify-center p-4 gap-6">
        {/* Player 1 (Top or Left) */}
        <PlayerCard player={player1} side="left" isTurn={isP1Turn} />

        {/* VS / Status */}
        <div className="flex flex-col items-center">
          {isFinished ? (
            <div className="px-6 py-2 bg-gradient-to-r from-yellow-600/80 to-yellow-800/80 border-2 border-yellow-400 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.2)]">
              <p className="text-lg font-bold font-pixel text-white">
                {winnerName === 'DRAW' ? "IT'S A DRAW!" : `${winnerName} WINS!`}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-pixel text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">VS</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* Player 2 (Bottom or Right) */}
        <PlayerCard player={player2} side="right" isTurn={!isP1Turn} />
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
          <button
            key={r}
            onClick={() => handleSendReaction(r, player1.uid)}
            disabled={reactionCooldown}
            className="text-xl hover:scale-125 transition-transform disabled:opacity-40"
          >{r}</button>
        ))}
        <span className="text-[10px] text-gray-600 mx-1">|</span>
        {REACTIONS.map(r => (
          <button
            key={`p2-${r}`}
            onClick={() => handleSendReaction(r, player2.uid)}
            disabled={reactionCooldown}
            className="text-xl hover:scale-125 transition-transform disabled:opacity-40"
          >{r}</button>
        ))}
      </div>
    </div>
  );
};

export default SpectatorScreen;