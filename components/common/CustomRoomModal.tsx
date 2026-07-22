import React, { useState } from 'react';
import type { Player, CustomRoom } from '../../types';
import Button from './Button';
import { Spinner } from './Spinner';
import * as roomService from '../../services/roomService';
import { toast } from 'react-toastify';

interface CustomRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
    onEnterRoom: (room: CustomRoom) => void;
}

const CustomRoomModal: React.FC<CustomRoomModalProps> = ({ isOpen, onClose, player, onEnterRoom }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
    const [roomType, setRoomType] = useState<'normal' | 'drone'>('normal');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async () => {
        setLoading(true);
        try {
            const newRoom = await roomService.createRoom(player, roomType);
            toast.success(`Room ${newRoom.id} created!`);
            onEnterRoom(newRoom);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!joinRoomId.trim()) {
            toast.error("Please enter a Room ID.");
            return;
        }
        setLoading(true);
        try {
            const room = await roomService.joinRoom(player, joinRoomId.trim());
            onEnterRoom(room);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3 text-yellow-400">Custom Match</h3>

                <div className="flex border-b-2 border-black mb-4">
                    <button onClick={() => setActiveTab('create')} className={`w-1/2 py-2 font-bold text-sm ${activeTab === 'create' ? 'bg-yellow-400 text-black' : 'bg-gray-800'}`}>Create</button>
                    <button onClick={() => setActiveTab('join')} className={`w-1/2 py-2 font-bold text-sm ${activeTab === 'join' ? 'bg-yellow-400 text-black' : 'bg-gray-800'}`}>Join</button>
                </div>

                {activeTab === 'create' && (
                    <div className="space-y-4">
                        <p className="text-sm text-center">Choose room type:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setRoomType('normal')} className={`p-2 border-2 ${roomType === 'normal' ? 'border-yellow-400 bg-yellow-900/50' : 'border-black bg-gray-900'}`}>
                                <p className="font-bold">✉️ Normal</p>
                                <p className="text-xs">Cost: 1 Normal Card</p>
                                <p className="text-xs">You have: {player.normalCustomCards || 0}</p>
                            </button>
                             <button onClick={() => setRoomType('drone')} className={`p-2 border-2 ${roomType === 'drone' ? 'border-yellow-400 bg-yellow-900/50' : 'border-black bg-gray-900'}`}>
                                <p className="font-bold">📹 Drone</p>
                                <p className="text-xs">Cost: 1 Drone Card</p>
                                <p className="text-xs">You have: {player.droneCustomCards || 0}</p>
                            </button>
                        </div>
                        <Button onClick={handleCreate} disabled={loading} className="w-full">{loading ? <Spinner/> : "Create Room"}</Button>
                    </div>
                )}
                
                {activeTab === 'join' && (
                    <div className="space-y-4">
                         <p className="text-sm text-center">Enter Room ID to join:</p>
                         <input type="text" value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)} placeholder="Room ID" className="pixel-input text-center"/>
                         <Button onClick={handleJoin} disabled={loading} className="w-full">{loading ? <Spinner/> : "Join Room"}</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomRoomModal;
