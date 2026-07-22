import React from 'react';
import { useRealtime } from '../hooks/useRealtime';

const Events: React.FC = () => {
    const { events } = useRealtime();

    if (events.length === 0) {
        return null; // Don't render if no events
    }

    return (
        <div className="p-4 bg-purple-900/50 border-2 border-black shadow-[4px_4px_0px_#000000] space-y-3">
            <h3 className="text-lg font-bold text-center text-purple-300">🎉 Live Events!</h3>
            <div className="space-y-2">
                {events.map(event => (
                    <div key={event.id} className="p-2 bg-gray-900 border-2 border-black">
                        <p className="font-bold text-sm text-purple-400">{event.title}</p>
                        <p className="text-xs text-gray-300">{event.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Events;
