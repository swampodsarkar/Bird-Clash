import React from 'react';
import type { Bird } from '../../types';
import { useContentConfig } from '../../hooks/useContentConfig';
import BirdAvatar from './BirdAvatar';

interface BirdIconProps {
    bird: Bird | { id: string, icon: string, name: string };
    className?: string;
    imgClassName?: string;
    style?: React.CSSProperties;
}

const BirdIcon: React.FC<BirdIconProps> = ({ bird, className, imgClassName, style }) => {
    const { birdImages } = useContentConfig();
    const imageUrl = birdImages[bird.id];

    if (imageUrl) {
        return (
            <img 
                src={imageUrl} 
                alt={bird.name}
                className={`${className} ${imgClassName} object-contain`}
                style={{ ...style, imageRendering: 'auto' }}
            />
        );
    }

    const size = className?.includes('text-[6rem]') ? 120 : className?.includes('text-5xl') ? 80 : 64;
    
    return (
        <div className={`inline-flex items-center justify-center ${className}`} style={style}>
            <BirdAvatar bird={bird} size={size} />
        </div>
    );
};

export default BirdIcon;
