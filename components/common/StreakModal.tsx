import React from 'react';
import type { LoginStreak } from '../../types';
import { STREAK_REWARDS } from '../../constants';

interface Props {
  streak: LoginStreak;
  reward: { coins: number; gems: number } | null;
  onClose: () => void;
}

export const StreakModal: React.FC<Props> = ({ streak, reward, onClose }) => {
  const maxDay = 7;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: "'Orbitron', sans-serif"
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 16,
        padding: 24, maxWidth: 400, width: '90%', border: '1px solid #4ecca3',
        color: '#fff', textAlign: 'center'
      }}>
        <h2 style={{ color: '#4ecca3', marginBottom: 8, fontSize: 22 }}>🔥 Login Streak</h2>
        <div style={{ fontSize: 14, color: '#aaa', marginBottom: 16 }}>
          Day {streak.currentStreak} streak • Longest: {streak.longestStreak}
        </div>

        {reward && (
          <div style={{
            background: 'rgba(78,204,163,0.15)', borderRadius: 12, padding: 16, marginBottom: 16,
            border: '1px solid rgba(78,204,163,0.3)'
          }}>
            <div style={{ fontSize: 13, color: '#4ecca3', marginBottom: 8 }}>🎁 Daily Reward Claimed!</div>
            {reward.coins > 0 && <div style={{ fontSize: 16 }}>+{reward.coins} 🪙 Coins</div>}
            {reward.gems > 0 && <div style={{ fontSize: 16 }}>+{reward.gems} 💎 Gems</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: maxDay }, (_, i) => {
            const day = i + 1;
            const isClaimed = day <= streak.currentStreak;
            const isCurrent = day === streak.currentStreak;
            const r = STREAK_REWARDS[day];
            return (
              <div key={day} style={{
                width: 44, height: 44, borderRadius: '50%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', fontSize: 18,
                background: isCurrent ? '#4ecca3' : isClaimed ? 'rgba(78,204,163,0.2)' : '#1a1a2e',
                border: `2px solid ${isCurrent ? '#4ecca3' : isClaimed ? 'rgba(78,204,163,0.3)' : '#333'}`,
                color: isClaimed ? '#fff' : '#555',
                cursor: 'pointer', position: 'relative'
              }}>
                <div style={{ fontSize: 10, position: 'absolute', top: -16, color: '#aaa' }}>{day}</div>
                {isClaimed ? '✅' : (r.coins > 0 || r.gems > 0 ? '🎁' : '🔒')}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16, lineHeight: 1.6 }}>
          {Object.entries(STREAK_REWARDS).map(([day, r]) => (
            <span key={day} style={{ marginRight: 8 }}>
              Day {day}: {r.coins}🪙 {r.gems > 0 ? `${r.gems}💎` : ''}
            </span>
          ))}
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: 12, borderRadius: 8, border: '1px solid #555',
          background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 14
        }}>Close</button>
      </div>
    </div>
  );
};
