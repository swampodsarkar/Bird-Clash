import React, { useState } from 'react';
import type { Player, Friend } from '../../types';
import Button from './Button';
import PlayerAvatar from './PlayerAvatar';
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
};

export default InviteFriendForDuoModal;
