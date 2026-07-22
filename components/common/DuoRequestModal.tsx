import React from 'react';
import type { Player } from '../../types';
import Button from './Button';

interface DuoRequestModalProps {
  player: Player;
  onAccept: () => void;
  onDecline: () => void;
}

const DuoRequestModal: React.FC<DuoRequestModalProps> = ({ player, onAccept, onDecline }) => {
  const partnerName = player.dynamicDuo?.partnerDisplayName;

  if (!player.dynamicDuo || player.dynamicDuo.status !== 'pending_received') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm p-6 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] text-center space-y-4">
        <h2 className="text-xl font-bold text-pink-400">Dynamic Duo Request!</h2>
        <p className="text-lg">
          <span className="font-bold">{partnerName || 'A player'}</span> wants to form a Dynamic Duo with you!
        </p>
        <p className="text-xs text-gray-400">If you accept, you'll be partners until you decide to break up.</p>
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

export default DuoRequestModal;
