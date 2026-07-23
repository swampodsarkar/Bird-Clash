import React from 'react';
import type { Bird } from '../../types';

const BIRD_COLORS: Record<string, { bg: string; accent: string; glow: string }> = {
  B001: { bg: 'from-yellow-400 to-amber-600', accent: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },     // Tappy
  B002: { bg: 'from-cyan-400 to-blue-600', accent: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },          // Swiftwing
  B003: { bg: 'from-red-400 to-rose-600', accent: '#e11d48', glow: 'rgba(225,29,72,0.5)' },           // Robbin
  B004: { bg: 'from-yellow-300 to-yellow-500', accent: '#eab308', glow: 'rgba(234,179,8,0.5)' },      // Voltbeak
  B005: { bg: 'from-amber-700 to-yellow-600', accent: '#d97706', glow: 'rgba(217,119,6,0.5)' },       // Eagle Eye
  B006: { bg: 'from-sky-300 to-indigo-500', accent: '#6366f1', glow: 'rgba(99,102,241,0.5)' },        // Frostbeak
  B007: { bg: 'from-emerald-400 to-teal-600', accent: '#14b8a6', glow: 'rgba(20,184,166,0.5)' },      // Quillshot
  B010: { bg: 'from-orange-400 to-red-500', accent: '#f97316', glow: 'rgba(249,115,22,0.5)' },        // Pecky
  B015: { bg: 'from-pink-400 to-purple-600', accent: '#d946ef', glow: 'rgba(217,70,239,0.5)' },       // Crested Lark
  B017: { bg: 'from-indigo-800 to-blue-900', accent: '#1e3a5f', glow: 'rgba(30,58,95,0.5)' },         // Nightjar
  B021: { bg: 'from-gray-600 to-gray-900', accent: '#4b5563', glow: 'rgba(75,85,99,0.5)' },           // Storm Petrel
  B023: { bg: 'from-blue-400 to-cyan-600', accent: '#0ea5e9', glow: 'rgba(14,165,233,0.5)' },         // Kingfisher
  B027: { bg: 'from-teal-200 to-blue-400', accent: '#2dd4bf', glow: 'rgba(45,212,191,0.5)' },         // Glacierwing
  B028: { bg: 'from-red-600 to-orange-500', accent: '#dc2626', glow: 'rgba(220,38,38,0.5)' },         // Magmafinch
  B029: { bg: 'from-cyan-200 to-blue-500', accent: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },         // Tempest Tern
  B046: { bg: 'from-fuchsia-400 to-pink-600', accent: '#d946ef', glow: 'rgba(217,70,239,0.5)' },      // Mirage Macaw
  B047: { bg: 'from-stone-600 to-stone-900', accent: '#78716c', glow: 'rgba(120,113,108,0.5)' },      // Juggernaut Jay
  B048: { bg: 'from-violet-400 to-purple-700', accent: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },      // Quasar Toucan
  B049: { bg: 'from-zinc-700 to-zinc-900', accent: '#3f3f46', glow: 'rgba(63,63,70,0.5)' },           // Grave Warden Crow
  B051: { bg: 'from-green-500 to-emerald-800', accent: '#059669', glow: 'rgba(5,150,105,0.5)' },       // Wyrm-Pecker
};

const RARITY_STYLES: Record<string, { border: string; shadow: string; label: string }> = {
  Common: { border: 'border-gray-500', shadow: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]', label: 'text-gray-300' },
  Rare: { border: 'border-blue-500', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]', label: 'text-blue-300' },
  Epic: { border: 'border-purple-500', shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]', label: 'text-purple-300' },
  Legendary: { border: 'border-yellow-400', shadow: 'shadow-[0_0_20px_rgba(250,204,21,0.5)]', label: 'text-yellow-300' },
};

const hashName = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

interface BirdAvatarProps {
  bird: Bird | { id: string; name: string; rarity?: string };
  size?: number;
  className?: string;
}

const BirdAvatar: React.FC<BirdAvatarProps> = ({ bird, size = 80, className = '' }) => {
  const colors = BIRD_COLORS[bird.id] || BIRD_COLORS['B001'];
  const rarity = (bird as Bird).rarity || 'Common';
  const rarityStyle = RARITY_STYLES[rarity] || RARITY_STYLES['Common'];

  const name = bird.name;
  const initial = name.charAt(0).toUpperCase();
  const hash = hashName(name);
  const pattern = hash % 4;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full border-2 ${rarityStyle.border} ${rarityStyle.shadow} ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colors.bg})`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Inner decorative pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
        {pattern === 0 && (
          <>
            <circle cx="50" cy="50" r="30" fill="white" opacity="0.1" />
            <circle cx="50" cy="50" r="15" fill="white" opacity="0.15" />
          </>
        )}
        {pattern === 1 && (
          <>
            <path d="M30,50 Q50,20 70,50 Q50,80 30,50Z" fill="white" opacity="0.1" />
            <path d="M40,50 Q50,35 60,50 Q50,65 40,50Z" fill="white" opacity="0.15" />
          </>
        )}
        {pattern === 2 && (
          <>
            <rect x="25" y="25" width="50" height="50" rx="10" fill="white" opacity="0.1" />
            <rect x="37" y="37" width="26" height="26" rx="5" fill="white" opacity="0.15" />
          </>
        )}
        {pattern === 3 && (
          <>
            <polygon points="50,20 65,40 60,65 40,65 35,40" fill="white" opacity="0.1" />
            <polygon points="50,30 58,43 55,58 45,58 42,43" fill="white" opacity="0.15" />
          </>
        )}
      </svg>

      {/* Initial letter */}
      <span
        className="relative z-10 font-bold text-white select-none"
        style={{
          fontSize: size * 0.42,
          textShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.2)',
          fontFamily: "'Orbitron', sans-serif",
        }}
      >
        {initial}
      </span>

      {/* Rarity indicator dot */}
      <div
        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black"
        style={{
          background: rarity === 'Legendary' ? 'linear-gradient(135deg, #facc15, #eab308)' :
                      rarity === 'Epic' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' :
                      rarity === 'Rare' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                      'linear-gradient(135deg, #9ca3af, #6b7280)',
        }}
      />
    </div>
  );
};

export default BirdAvatar;
