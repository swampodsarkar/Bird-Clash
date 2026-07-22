import React, { useState } from 'react';
import type { Player, Friend } from '../../types';
import Button from './Button';
import PlayerAvatar from './PlayerAvatar';
// Fix: The teamService is not a module as the feature has been removed.
// The component is dead code. Gutting the component to resolve errors.
// import * as teamService from '../../services/teamService';
import { toast } from 'react-toastify';

interface InviteFriendForDuoModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
    teamId: string;
    onlineFriends: Friend[];
}

const InviteFriendForDuoModal: React.FC<InviteFriendForDuoModalProps> = ({ isOpen, onClose, player, teamId, onlineFriends }) => {
    if (!isOpen) return null;

    return null;
    /*
    const [invitingUid, setInvitingUid] = useState<string | null>(null);


    const handleInvite = async (friend: Friend) => {
        setInvitingUid(friend.uid);
        try {
            await teamService.sendTeamInvite(teamId, player, friend.uid);
            toast.success(`Invite sent to ${friend.displayName}!`);
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Failed to send invite.");
        } finally {
            setInvitingUid(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-3 text-yellow-400">Invite a Friend</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {onlineFriends.length > 0 ? onlineFriends.map(friend => (
                        <div key={friend.uid} className="flex items-center justify-between p-2 bg-gray-900 border-2 border-black">
                            <div className="flex items-center gap-2">
                                <PlayerAvatar 
                                    photoURL={friend.photoURL}
                                    uid={friend.uid}
                                    activeBadge={friend.activeBadge}
                                    sizeClassName="w-10 h-10"
                                    imgClassName="border-2 border-black"
                                />
                                <div>
                                    <p className="font-bold text-sm">{friend.displayName}</p>
                                    <p className="text-xs text-blue-400">{friend.rankPoints} RP</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => handleInvite(friend)}
                                disabled={!!invitingUid}
                                className="!py-1 !px-2 !text-xs"
                                variant="success"
                            >
                                {invitingUid === friend.uid ? '...' : 'Invite'}
                            </Button>
                        </div>
                    )) : (
                        <p className="text-center text-gray-400 py-4">No friends are currently online.</p>
                    )}
                </div>
                 <div className="mt-4 text-center">
                    <Button onClick={onClose} variant="secondary">Close</Button>
                </div>
            </div>
        </div>
    );
    */
};

export default InviteFriendForDuoModal;
