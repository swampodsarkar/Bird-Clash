import React from 'react';
import type { Bird } from '../../types';
import { useContentConfig } from '../../hooks/useContentConfig';
import LottieAnimation from './LottieAnimation';

interface LottieBirdProps {
  bird: Bird | { id: string; icon: string; name: string };
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: { w: 'w-16 h-16', icon: 'text-3xl' },
  md: { w: 'w-24 h-24', icon: 'text-5xl' },
  lg: { w: 'w-32 h-32', icon: 'text-6xl' },
  xl: { w: 'w-48 h-48 md:w-64 md:h-64', icon: 'text-8xl md:text-9xl' },
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
              <span className={`${sizeMap[size].icon} ${animated ? 'animate-bounce' : ''}`}>
                {bird.icon}
              </span>
            }
          />
        }
      />
    </div>
  );
};

export default LottieBird;
