import React from 'react';
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

interface PlayerAvatarProps {
    photoURL: string | null;
    uid: string;
    activeBadge?: BadgeType;
    sizeClassName: string;
    imgClassName?: string;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ photoURL, uid, activeBadge, sizeClassName, imgClassName = '' }) => {
  const badgeInfo = activeBadge ? BADGES[activeBadge] : null;
  const defaultPhoto = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${uid}`;

  return (
    <div className={`relative flex-shrink-0 ${sizeClassName}`}>
      <img 
        src={photoURL || defaultPhoto} 
        alt="avatar"
        className={`w-full h-full object-cover ${imgClassName}`} 
      />
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