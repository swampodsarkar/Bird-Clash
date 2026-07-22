import React from 'react';
import type { Player } from '../../types';
import Button from './Button';

interface MembershipClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
    type: 'weekly' | 'monthly';
}

const MembershipClaimModal: React.FC<MembershipClaimModalProps> = ({ isOpen, onClose, player, type }) => {
    if (!isOpen) return null;

    const isWeekly = type === 'weekly';
    const duration = isWeekly ? 7 : 30;
    const dailyGems = isWeekly ? 60 : 80;
    const expires = isWeekly ? player.weeklyMembershipExpires : player.monthlyMembershipExpires;
    const claims = isWeekly ? player.weeklyClaims : player.monthlyClaims;
    const title = isWeekly ? 'Weekly Pass' : 'Monthly Pass';

    if (!expires || expires < Date.now()) {
        // This should not happen if the modal is opened correctly, but good to have a guard.
        onClose();
        return null;
    }
    
    // Estimate start date by subtracting duration from expiry. This can be slightly off due to how expiry is extended,
    // but it's the most reliable way without storing a start date.
    const startDate = new Date(expires - duration * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Array.from({ length: duration }, (_, i) => {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
        
        const isClaimed = claims?.includes(dateStr);
        const isPast = dayDate < today;
        const isToday = dayDate.getTime() === today.getTime();

        let status: 'claimed' | 'missed' | 'today' | 'upcoming' = 'upcoming';
        if (isClaimed) {
            status = 'claimed';
        } else if (isToday) {
            status = 'today';
        } else if (isPast) {
            status = 'missed';
        }

        return { day: i + 1, status };
    });

    const getStatusStyles = (status: 'claimed' | 'missed' | 'today' | 'upcoming') => {
        switch (status) {
            case 'claimed': return 'bg-green-600 border-green-400';
            case 'missed': return 'bg-red-800 border-red-600 opacity-60';
            case 'today': return 'bg-blue-600 border-blue-400 animate-pulse';
            case 'upcoming': return 'bg-gray-700 border-gray-500';
        }
    };

    return (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-md p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-center mb-4 text-yellow-400">{title} Daily Rewards</h3>
                <div className={`grid ${isWeekly ? 'grid-cols-7' : 'grid-cols-6'} gap-2 text-center`}>
                    {days.map(({ day, status }) => (
                        <div key={day} className={`p-2 border-2 ${getStatusStyles(status)} flex flex-col justify-center items-center rounded-sm`}>
                            <p className="font-bold text-sm">Day {day}</p>
                            <p className="text-xs">💎{dailyGems}</p>
                        </div>
                    ))}
                </div>
                 <div className="mt-4 text-center">
                    <Button onClick={onClose} variant="secondary">Close</Button>
                </div>
            </div>
        </div>
    );
};

export default MembershipClaimModal;
