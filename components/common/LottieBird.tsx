import React from 'react';
import type { Bird } from '../../types';
import { useContentConfig } from '../../hooks/useContentConfig';
import LottieAnimation from './LottieAnimation';
import BirdAvatar from './BirdAvatar';

interface LottieBirdProps {
  bird: Bird | { id: string; icon: string; name: string };
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: { w: 'w-16 h-16', avatar: 48 },
  md: { w: 'w-24 h-24', avatar: 72 },
  lg: { w: 'w-32 h-32', avatar: 96 },
  xl: { w: 'w-48 h-48 md:w-64 md:h-64', avatar: 140 },
};

const LottieBird: React.FC<LottieBirdProps> = ({
  bird,
  className = '',
  imgClassName = '',
  style,
  animated = true,
  size = 'lg',
}) => {
  const { birdImages } = useContentConfig();
  const imageUrl = birdImages[bird.id];

  if (imageUrl) {
    return (
      <div className={`relative ${className}`} style={style}>
        <img
          src={imageUrl}
          alt={bird.name}
          className={`object-contain ${sizeMap[size].w} ${imgClassName} ${animated ? 'bird-idle' : ''}`}
          style={{ imageRendering: 'auto' }}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={style}>
      <LottieAnimation
        path={`/lottie/${bird.id}.json`}
        loop={animated}
        play={animated}
        className={`${sizeMap[size].w}`}
        fallback={
          <LottieAnimation
            path="/lottie/bird_default.json"
            loop={animated}
            play={animated}
            className={`${sizeMap[size].w}`}
            fallback={
              <div className={`${animated ? 'animate-bounce' : ''}`}>
                <BirdAvatar bird={bird} size={sizeMap[size].avatar} />
              </div>
            }
          />
        }
      />
    </div>
  );
};

export default LottieBird;
