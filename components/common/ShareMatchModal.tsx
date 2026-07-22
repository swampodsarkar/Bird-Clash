import React, { useRef } from 'react';
import type { Match } from '../../types';

interface Props {
  match: Match;
  myUid: string;
  myName: string;
  onClose: () => void;
}

export const ShareMatchModal: React.FC<Props> = ({ match, myUid, myName, onClose }) => {
  const shareRef = useRef<HTMLDivElement>(null);
  const isWinner = match.winner === myUid || match.winner === 'team1' || match.winner === 'team2';
  const opponent = match.player1.uid === myUid ? match.player2 : match.player1;
  const matchText = `🐦 Bird Clash Fever!\n\n${isWinner ? '🏆 VICTORY!' : '💀 DEFEAT'}\n${myName} vs ${opponent.displayName}\n${match.matchType.toUpperCase()} Mode\n\nDownload now: ${window.location.origin}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Bird Clash Fever', text: matchText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(matchText);
      alert('Match result copied to clipboard!');
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(matchText)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(matchText)}&u=${encodeURIComponent(window.location.origin)}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: "'Orbitron', sans-serif"
    }}>
      <div ref={shareRef} style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 16,
        padding: 24, maxWidth: 360, width: '90%', border: `1px solid ${isWinner ? '#4ecca3' : '#e94560'}`,
        color: '#fff', textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{isWinner ? '🏆' : '💀'}</div>
        <h2 style={{ color: isWinner ? '#4ecca3' : '#e94560', marginBottom: 4, fontSize: 20 }}>
          {isWinner ? 'VICTORY!' : 'DEFEAT'}
        </h2>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
          {myName} vs {opponent.displayName}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
          {match.matchType.toUpperCase()} • {match.turn} turns
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleShare} style={{
            padding: '12px 0', borderRadius: 8, border: 'none',
            background: '#4ecca3', color: '#1a1a2e', fontWeight: 'bold', cursor: 'pointer', fontSize: 14
          }}>
            📋 Copy Result
          </button>
          <button onClick={shareWhatsApp} style={{
            padding: '12px 0', borderRadius: 8, border: 'none',
            background: '#25D366', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 14
          }}>
            📱 Share WhatsApp
          </button>
          <button onClick={shareFacebook} style={{
            padding: '12px 0', borderRadius: 8, border: 'none',
            background: '#1877F2', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 14
          }}>
            👤 Share Facebook
          </button>
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: 10, marginTop: 12, borderRadius: 8, border: '1px solid #555',
          background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 13
        }}>Close</button>
      </div>
    </div>
  );
};
