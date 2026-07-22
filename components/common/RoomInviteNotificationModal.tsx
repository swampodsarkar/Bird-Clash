import React from 'react';
import type { RoomInvite } from '../../types';
import Button from './Button';
import PlayerAvatar from './PlayerAvatar';

interface RoomInviteNotificationModalProps {
  invite: RoomInvite;
  onAccept: () => void;
  onDecline: () => void;
}

const RoomInviteNotificationModal: React.FC<RoomInviteNotificationModalProps> = ({ invite, onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[101] p-4">
      <div className="w-full max-w-sm p-6 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] text-center space-y-4">
        <h2 className="text-xl font-bold text-yellow-400">Room Invite!</h2>
        <div className="flex justify-center">
            <PlayerAvatar 
                photoURL={invite.photoURL}
                uid={invite.from || ''}
                activeBadge={invite.activeBadge}
                sizeClassName="w-16 h-16"
                imgClassName="border-2 border-black bg-gray-700"
            />
        </div>
        <p className="text-lg">
          <span className="font-bold">{invite.from || 'A player'}</span> has invited you to their room!
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Button onClick={onAccept} variant="success">
            Accept
          </Button>
          <Button onClick={onDecline} variant="danger">
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomInviteNotificationModal;
