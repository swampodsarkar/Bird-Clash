import React, { useState } from 'react';
import { Crown, Shield, Video } from 'lucide-react';

type BadgeType = 'Owner' | 'Moderator' | 'Content Creator';

interface BadgeInfo {
  icon: React.ReactNode;
  glowColor: string;
  name: BadgeType;
}

const BADGES: { [key in BadgeType]: BadgeInfo } = {
  'Owner': { icon: <Crown size={16} className="text-yellow-400" fill="currentColor" />, glowColor: 'rgba(255, 215, 0, 0.8)', name: 'Owner' },
  'Moderator': { icon: <Shield size={16} className="text-blue-400" fill="currentColor" />, glowColor: 'rgba(0, 191, 255, 0.8)', name: 'Moderator' },
  'Content Creator': { icon: <Video size={16} className="text-pink-400" fill="currentColor" />, glowColor: 'rgba(255, 20, 147, 0.8)', name: 'Content Creator' },
};

const AVATAR_COLORS = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-yellow-500 to-amber-500',
  'from-teal-500 to-cyan-600',
  'from-indigo-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-red-500 to-orange-500',
  'from-cyan-500 to-blue-600',
];

const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
};

const getInitials = (uid: string, displayName?: string): string => {
  const name = displayName || uid;
  const parts = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

interface PlayerAvatarProps {
    photoURL: string | null;
    uid: string;
    activeBadge?: BadgeType;
    sizeClassName: string;
    imgClassName?: string;
    displayName?: string;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ photoURL, uid, activeBadge, sizeClassName, imgClassName = '', displayName }) => {
  const [imgError, setImgError] = useState(false);
  const badgeInfo = activeBadge ? BADGES[activeBadge] : null;
  const defaultPhoto = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${uid}`;
  const showImg = (photoURL || defaultPhoto) && !imgError;
  const colorIndex = hashCode(uid) % AVATAR_COLORS.length;
  const initials = getInitials(uid, displayName);

  return (
    <div className={`relative flex-shrink-0 ${sizeClassName}`}>
      {showImg ? (
        <img 
          src={photoURL || defaultPhoto} 
          alt="avatar"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${imgClassName}`} 
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${AVATAR_COLORS[colorIndex]} text-white font-bold text-sm border border-black ${imgClassName}`}>
          {initials}
        </div>
      )}
      {badgeInfo && (
        <span
          className="absolute -top-1 -right-1 text-base"
          title={badgeInfo.name}
          style={{ filter: `drop-shadow(0 0 4px ${badgeInfo.glowColor}) drop-shadow(0 0 2px ${badgeInfo.glowColor})` }}
        >
          {badgeInfo.icon}
        </span>
      )}
    </div>
  );
};

export default PlayerAvatar;