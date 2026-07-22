import React, { useState, useEffect } from 'react';
import type { Tournament, TournamentBracket } from '../types';
import { getBrackets } from '../services/tournamentBracketService';

interface Props {
  tournament: Tournament;
  onBack: () => void;
  onStartMatch: (opponentUid: string) => void;
}

export const TournamentBracketScreen: React.FC<Props> = ({ tournament, onBack, onStartMatch }) => {
  const [brackets, setBrackets] = useState<TournamentBracket[]>([]);

  useEffect(() => {
    getBrackets(tournament.id).then(setBrackets);
    const interval = setInterval(() => {
      getBrackets(tournament.id).then(setBrackets);
    }, 5000);
    return () => clearInterval(interval);
  }, [tournament.id]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      padding: 16, fontFamily: "'Orbitron', sans-serif", color: '#fff',
      overflow: 'auto', zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer'
        }}>←</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>🏆 {tournament.name}</h2>
          <div style={{ fontSize: 12, color: '#aaa' }}>Tournament Bracket</div>
        </div>
      </div>

      {brackets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          Bracket generation in progress...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20, minHeight: '60vh' }}>
          {brackets.map((bracket) => (
            <div key={bracket.id} style={{ minWidth: 240 }}>
              <div style={{
                textAlign: 'center', fontWeight: 'bold', fontSize: 14,
                color: '#4ecca3', marginBottom: 12, padding: '4px 0',
                borderBottom: '1px solid rgba(78,204,163,0.3)'
              }}>
                Round {bracket.round}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bracket.matches.map((match, idx) => (
                  <div key={match.matchId} style={{
                    background: 'rgba(255,255,255,0.05)', borderRadius: 10,
                    padding: 12, border: match.status === 'finished' ? '1px solid #4ecca3' : '1px solid #333'
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0',
                      color: match.winnerUid === match.player1Uid ? '#4ecca3' : '#ccc'
                    }}>
                      <span style={{ fontSize: 13 }}>{match.player1Name || 'TBD'}</span>
                      {match.status === 'finished' && match.winnerUid === match.player1Uid && <span>👑</span>}
                    </div>
                    <div style={{ borderTop: '1px solid #333', margin: '2px 0' }} />
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0',
                      color: match.winnerUid === match.player2Uid ? '#4ecca3' : '#ccc'
                    }}>
                      <span style={{ fontSize: 13 }}>{match.player2Name || 'TBD'}</span>
                      {match.status === 'finished' && match.winnerUid === match.player2Uid && <span>👑</span>}
                    </div>
                    {match.status === 'pending' && match.player1Uid && match.player2Uid && match.player1Uid.length > 5 && match.player2Uid.length > 5 && (
                      <button onClick={() => onStartMatch(match.player1Uid)}
                        style={{
                          width: '100%', marginTop: 8, padding: '6px 0', borderRadius: 6,
                          border: 'none', background: '#e94560', color: '#fff', cursor: 'pointer',
                          fontSize: 11, fontWeight: 'bold'
                        }}>
                        ▶ Play Match
                      </button>
                    )}
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
