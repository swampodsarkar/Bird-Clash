import React from 'react';
import type { Bird } from '../../types';
import { useContentConfig } from '../../hooks/useContentConfig';

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
                style={{ ...style, imageRendering: 'auto' }} // Override pixelated rendering for custom images
            />
        );
    }
    
    return (
        <span className={className} style={style}>
            {bird.icon}
        </span>
    );
};

export default BirdIcon;
