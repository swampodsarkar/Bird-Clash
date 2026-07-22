import React, { useState } from 'react';
import type { Player } from '../../types';
import { getRankInfo } from '../../utils/helpers';

interface PlayerRankDisplayProps {
    player: Player;
    className?: string;
}

const PlayerRankDisplay: React.FC<PlayerRankDisplayProps> = ({ player, className }) => {
    const [showRp, setShowRp] = useState(false);
    const { tier, rankName } = getRankInfo(player.rankPoints);

    return (
        <div 
            className={`flex items-center space-x-2 cursor-pointer ${className}`}
            onClick={() => setShowRp(!showRp)}
            title="Click to see Rank Points"
        >
            <span className="text-xl">{tier.icon}</span>
            <div className="text-left">
                <p className="text-sm font-bold font-pixel leading-none">{rankName}</p>
                {showRp && (
                    <p className="text-xs text-blue-300 leading-tight animate-fade-in">{player.rankPoints} RP</p>
                )}
            </div>
        </div>
    );
};

export default PlayerRankDisplay;
