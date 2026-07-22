import React, { useState } from 'react';
import type { Player } from '../../types';
import { getReferralLink, getReferralCount } from '../../services/referralService';
import { REFERRAL_REWARDS } from '../../constants';

interface Props {
  player: Player;
  onClose: () => void;
  onApplyCode: (code: string) => Promise<void>;
}

export const ReferralModal: React.FC<Props> = ({ player, onClose, onApplyCode }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const referralCode = player.referral?.referralCode || '';
  const referralLink = getReferralLink(referralCode);
  const referralCount = getReferralCount(player);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setSuccess('Link copied!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onApplyCode(code.trim());
      setCode('');
      setSuccess('Referral code applied!');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: "'Orbitron', sans-serif"
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 16,
        padding: 24, maxWidth: 420, width: '90%', border: '1px solid #e94560',
        color: '#fff', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', color: '#e94560', marginBottom: 20, fontSize: 22 }}>🎉 Refer & Earn</h2>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: '#aaa', marginBottom: 4 }}>Your Referral Code</div>
          <div style={{
            fontSize: 28, fontWeight: 'bold', letterSpacing: 4, color: '#4ecca3',
            background: 'rgba(78,204,163,0.1)', padding: '8px 16px', borderRadius: 8,
            display: 'inline-block'
          }}>{referralCode}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={handleCopy} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
            background: '#e94560', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13
          }}>
            {success === 'Link copied!' ? '✅ Copied!' : '📋 Copy Link'}
          </button>
          <button onClick={() => {
            const url = `https://wa.me/?text=Join%20Bird%20Clash%20Fever%21%20Use%20my%20code%3A%20${referralCode}%20${referralLink}`;
            window.open(url, '_blank');
          }} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
            background: '#25D366', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13
          }}>
            📱 Share WhatsApp
          </button>
        </div>

        <div style={{
          background: 'rgba(78,204,163,0.1)', borderRadius: 8, padding: 12, marginBottom: 16,
          display: 'flex', justifyContent: 'space-around', textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4ecca3' }}>{referralCount}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>Friends Joined</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ffd700' }}>{referralCount * REFERRAL_REWARDS.INVITER_GEMS}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>Gems Earned</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff6b6b' }}>{referralCount * REFERRAL_REWARDS.INVITER_COINS}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>Coins Earned</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>Rewards per referral:</div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            You get {REFERRAL_REWARDS.INVITER_GEMS} gems + {REFERRAL_REWARDS.INVITER_COINS} coins<br/>
            Friend gets {REFERRAL_REWARDS.REFERRED_GEMS} gems + {REFERRAL_REWARDS.REFERRED_COINS} coins
          </div>
        </div>

        <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>Have a referral code?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code" maxLength={8}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #444',
                background: '#0f3460', color: '#fff', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase'
              }} />
            <button onClick={handleApply} disabled={loading || !code.trim()}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: code.trim() ? '#4ecca3' : '#333', color: '#fff',
                fontWeight: 'bold', cursor: code.trim() ? 'pointer' : 'default', fontSize: 13
              }}>
              {loading ? '...' : 'Apply'}
            </button>
          </div>
          {error && <div style={{ color: '#e94560', fontSize: 12, marginTop: 4 }}>{error}</div>}
          {success && <div style={{ color: '#4ecca3', fontSize: 12, marginTop: 4 }}>{success}</div>}
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: 12, borderRadius: 8, border: '1px solid #555',
          background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 14
        }}>Close</button>
      </div>
    </div>
  );
};
