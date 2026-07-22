import React, { useState, useEffect } from 'react';
import type { Tournament, TournamentBracket } from '../../types';
import { getBrackets } from '../../services/tournamentBracketService';
import { Spinner } from '../common/Spinner';

interface Props {
  tournament: Tournament;
  onBack: () => void;
}

export const BracketView: React.FC<Props> = ({ tournament, onBack }) => {
  const [brackets, setBrackets] = useState<TournamentBracket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrackets(tournament.id).then(data => {
      setBrackets(data);
      setLoading(false);
    });
    const interval = setInterval(() => {
      getBrackets(tournament.id).then(setBrackets);
    }, 10000);
    return () => clearInterval(interval);
  }, [tournament.id]);

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-2 flex items-center gap-1">
        ← Back to Tournaments
      </button>
      <h3 className="text-lg font-bold text-yellow-300 mb-4">🏆 {tournament.name} - Bracket</h3>
      {loading ? (
        <div className="flex justify-center p-8"><Spinner /></div>
      ) : brackets.length === 0 ? (
        <p className="text-gray-400 text-center p-4">Bracket not yet generated.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 300 }}>
          {brackets.map(bracket => (
            <div key={bracket.id} className="min-w-[200px]">
              <div className="text-center font-bold text-sm text-blue-400 mb-3 border-b border-blue-400/30 pb-1">
                Round {bracket.round}
              </div>
              <div className="space-y-2">
                {bracket.matches.map(match => (
                  <div key={match.matchId} className={`p-3 rounded-lg border ${match.status === 'finished' ? 'border-green-500/50 bg-green-500/10' : 'border-gray-600 bg-[#1a1a2e]'}`}>
                    <div className={`flex justify-between text-sm ${match.winnerUid === match.player1Uid ? 'text-green-400' : 'text-gray-300'}`}>
                      <span className="truncate max-w-[120px]">{match.player1Name}</span>
                      {match.winnerUid === match.player1Uid && <span>👑</span>}
                    </div>
                    <div className="border-t border-gray-600 my-1" />
                    <div className={`flex justify-between text-sm ${match.winnerUid === match.player2Uid ? 'text-green-400' : 'text-gray-300'}`}>
                      <span className="truncate max-w-[120px]">{match.player2Name}</span>
                      {match.winnerUid === match.player2Uid && <span>👑</span>}
                    </div>
                    <div className={`text-xs mt-1 ${match.status === 'finished' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {match.status === 'finished' ? '✓ Finished' : '⏳ Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
