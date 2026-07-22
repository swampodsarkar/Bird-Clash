import React from 'react';
import type { Invite } from '../../types';
import Button from './Button';
import PlayerAvatar from './PlayerAvatar';

interface InviteNotificationModalProps {
  invite: Invite;
  onAccept: () => void;
  onDecline: () => void;
}

const InviteNotificationModal: React.FC<InviteNotificationModalProps> = ({ invite, onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm p-6 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] text-center space-y-4">
        <h2 className="text-xl font-bold text-yellow-400">Game Invite!</h2>
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
          <span className="font-bold">{invite.from || 'A player'}</span> has invited you to a match!
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Button onClick={onAccept} className="bg-green-600 hover:bg-green-700">
            Accept
          </Button>
          <Button onClick={onDecline} className="bg-red-600 hover:bg-red-700">
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InviteNotificationModal;