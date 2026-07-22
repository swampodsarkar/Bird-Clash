import React from 'react';
import type { Notification } from '../../types';

interface NotificationsPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onClear: () => void;
}

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose, onClear }) => {
    return (
        <div className="absolute top-20 right-4 w-80 max-w-sm bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] z-50 animate-fade-in-down">
            <style>{`
                @keyframes fade-in-down {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.2s ease-out; }
            `}</style>
            <div className="flex justify-between items-center p-3 border-b-2 border-black">
                <h3 className="font-bold text-yellow-400">Notifications</h3>
                <button onClick={onClose} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto space-y-2">
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <div key={notif.id} className="p-2 bg-gray-900/50 border-b border-gray-700">
                            <p className="text-sm text-gray-200">{notif.text}</p>
                            <p className="text-xs text-gray-400 text-right mt-1">{formatTimeAgo(notif.timestamp)}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-400 p-4">No new notifications.</p>
                )}
            </div>
            {notifications.length > 0 && (
                 <div className="p-2 border-t-2 border-black text-center">
                    <button onClick={onClear} className="text-xs text-blue-300 hover:underline">Mark as Read &amp; Close</button>
                 </div>
            )}
        </div>
    );
};

export default NotificationsPanel;