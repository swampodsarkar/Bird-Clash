import React, { useState, useEffect } from 'react';
import type { Player, CustomRoom, Friend } from '../../types';
import Button from './Button';
import { Spinner } from './Spinner';
import PlayerAvatar from './PlayerAvatar';
import * as roomService from '../../services/roomService';
import { listenToFriends } from '../../services/friendService';
import { toast } from 'react-toastify';

interface RoomViewProps {
    room: CustomRoom;
    player: Player;
    onLeave: () => void;
}

const InviteFriendModal: React.FC<{ player: Player, room: CustomRoom, onClose: () => void }> = ({ player, room, onClose }) => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [invitingUid, setInvitingUid] = useState<string|null>(null);

    useEffect(() => {
        const unsub = listenToFriends(player.uid, (allFriends) => {
            setFriends(allFriends.filter(f => f.status === 'friends'));
        });
        return unsub;
    }, [player.uid]);

    const handleInvite = async (friendUid: string) => {
        setInvitingUid(friendUid);
        try {
            await roomService.inviteToRoom(player, friendUid, room.id);
            toast.success("Invite sent!");
        } catch(e: any) {
            toast.error(e.message);
        } finally {
            setInvitingUid(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3 text-yellow-400">Invite Friends</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {friends.map(friend => (
                        <div key={friend.uid} className="flex items-center justify-between p-2 bg-gray-900">
                             <p>{friend.displayName}</p>
                             <Button onClick={() => handleInvite(friend.uid)} disabled={!!invitingUid} className="!py-1 !text-xs">
                                 {invitingUid === friend.uid ? <Spinner/> : "Invite"}
                             </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
};

const RoomView: React.FC<RoomViewProps> = ({ room, player, onLeave }) => {
    const [loading, setLoading] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const isHost = player.uid === room.hostUid;

    const handleStart = async () => {
        setLoading(true);
        try {
            await roomService.startMatch(room);
            // The match start is handled by App.tsx listener
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleCopyId = () => {
        navigator.clipboard.writeText(room.id);
        toast.info("Room ID copied to clipboard!");
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 space-y-4">
            <div className="p-4 bg-black/50 border-2 border-black text-center">
                <p className="text-sm text-gray-300">Room ID</p>
                <h2 className="text-2xl font-bold font-mono tracking-widest text-yellow-400 cursor-pointer" onClick={handleCopyId}>{room.id}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                <div className="p-4 bg-blue-900/80 border-2 border-blue-400 text-center space-y-2">
                    <PlayerAvatar photoURL={room.hostPhotoURL} uid={room.hostUid} sizeClassName="w-20 h-20 mx-auto" imgClassName="border-2 border-black"/>
                    <p className="font-bold">{room.hostDisplayName}</p>
                    <p className="text-xs text-blue-300">(Host)</p>
                </div>
                <div className="p-4 bg-gray-800/80 border-2 border-gray-600 text-center space-y-2 flex flex-col justify-center items-center">
                    {room.guestUid ? (
                        <>
                            <PlayerAvatar photoURL={room.guestPhotoURL} uid={room.guestUid} sizeClassName="w-20 h-20 mx-auto" imgClassName="border-2 border-black"/>
                            <p className="font-bold">{room.guestDisplayName}</p>
                        </>
                    ) : (
                        <>
                           <Spinner/>
                           <p className="text-sm text-gray-400 mt-2">Waiting for player...</p>
                        </>
                    )}
                </div>
            </div>

            <div className="w-full max-w-lg space-y-2">
                {isHost && (
                    <Button onClick={handleStart} disabled={loading || room.status !== 'full'} className="w-full !py-3">
                        {loading ? <Spinner/> : "Start Match"}
                    </Button>
                )}
                {!isHost && (
                    <p className="text-center text-gray-300 p-3">Waiting for the host to start the match...</p>
                )}
                 <Button onClick={() => setIsInviteModalOpen(true)} className="w-full !py-2" variant="secondary">Invite Friend</Button>
                 <Button onClick={onLeave} className="w-full !py-2" variant="danger">Leave Room</Button>
            </div>
            {isInviteModalOpen && <InviteFriendModal player={player} room={room} onClose={() => setIsInviteModalOpen(false)} />}
        </div>
    );
};

export default RoomView;
