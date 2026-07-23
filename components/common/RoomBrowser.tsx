import React, { useState, useEffect } from 'react';
import type { Player, CustomRoom } from '../../types';
import Button from './Button';
import { Spinner } from './Spinner';
import * as roomService from '../../services/roomService';
import { toast } from 'react-toastify';

interface RoomBrowserProps {
  player: Player;
  onEnterRoom: (room: CustomRoom) => void;
  onBack: () => void;
}

const RoomBrowser: React.FC<RoomBrowserProps> = ({ player, onEnterRoom, onBack }) => {
  const [rooms, setRooms] = useState<CustomRoom[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create modal state
  const [createType, setCreateType] = useState<'normal' | 'esports'>('normal');
  const [createPassword, setCreatePassword] = useState('');

  // Join modal state
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  // Password prompt for locked rooms
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<CustomRoom | null>(null);
  const [promptPassword, setPromptPassword] = useState('');

  useEffect(() => {
    const unsub = roomService.listenToAllRooms(setRooms);
    return unsub;
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const pw = createPassword.trim() || undefined;
      const room = await roomService.createRoom(player, createType, pw);
      toast.success('Room created!');
      onEnterRoom(room);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinById = async () => {
    if (!joinRoomId.trim()) { toast.error('Enter a Room ID.'); return; }
    setLoading(true);
    try {
      const pw = joinPassword.trim() || undefined;
      const room = await roomService.joinRoom(player, joinRoomId.trim(), pw);
      toast.success('Joined room!');
      onEnterRoom(room);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (room: CustomRoom) => {
    if (room.password) {
      setPasswordPromptRoom(room);
      setPromptPassword('');
      return;
    }
    if (room.status === 'full' && room.guestUid) {
      // Room is full — join as spectator
      return handleJoinAsSpectator(room);
    }
    setLoading(true);
    try {
      const joined = await roomService.joinRoom(player, room.id);
      toast.success('Joined room!');
      onEnterRoom(joined);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAsSpectator = async (room: CustomRoom) => {
    setLoading(true);
    try {
      await roomService.joinAsSpectator(player, room.id);
      toast.success('Joined as spectator!');
      onEnterRoom(room);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordJoin = async () => {
    if (!passwordPromptRoom) return;
    setLoading(true);
    try {
      const joined = await roomService.joinRoom(player, passwordPromptRoom.id, promptPassword.trim());
      toast.success('Joined room!');
      setPasswordPromptRoom(null);
      onEnterRoom(joined);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className="text-sm text-yellow-400 hover:underline">← Back</button>
        <h2 className="text-lg font-bold text-yellow-400">🛖 Room Lobby</h2>
        <div />
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto bg-black/30 rounded-lg border-2 border-black p-2 space-y-2">
        {rooms.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            <p className="text-3xl mb-2">🏠</p>
            <p>No rooms available. Create one!</p>
          </div>
        )}
        {rooms.map(room => (
          <div
            key={room.id}
            className="flex items-center justify-between bg-[#1a1a2e] border-2 border-black p-3 rounded-lg hover:border-yellow-500/50 transition cursor-pointer"
            onClick={() => handleQuickJoin(room)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                {room.hostPhotoURL ? (
                  <img src={room.hostPhotoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  '👤'
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{room.hostDisplayName}</p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{room.roomType === 'esports' ? '🏆 Esports' : '✉️ Normal'}</span>
                  <span>{room.guestUid ? '👥 2/2' : '👤 1/2'}</span>
                  {room.spectators && room.spectators.length > 0 && <span>👁 {room.spectators.length}</span>}
                  {room.password && <span className="text-yellow-500">🔒 Locked</span>}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {room.status === 'full' ? (
                <button className="text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded font-bold" onClick={e => { e.stopPropagation(); handleJoinAsSpectator(room); }}>
                  👁 Spectate
                </button>
              ) : room.password ? (
                <button className="text-xs bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded font-bold" onClick={e => { e.stopPropagation(); setPasswordPromptRoom(room); setPromptPassword(''); }}>
                  🔑 Join
                </button>
              ) : (
                <button className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded font-bold" onClick={e => { e.stopPropagation(); handleQuickJoin(room); }}>
                  Join
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-2">
        <button onClick={() => { setShowCreate(true); setShowJoin(false); }} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded border-2 border-black text-sm">
          ✚ Create Room
        </button>
        <button onClick={() => { setShowJoin(true); setShowCreate(false); }} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded border-2 border-black text-sm">
          🔍 Join Room
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-3 text-yellow-400">✚ Create Room</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setCreateType('normal')} className={`p-2 border-2 text-sm ${createType === 'normal' ? 'border-yellow-400 bg-yellow-900/50' : 'border-black bg-gray-900'}`}>
                  ✉️ Normal<br /><span className="text-[10px]">1 Card</span>
                </button>
                <button onClick={() => setCreateType('esports')} className={`p-2 border-2 text-sm ${createType === 'esports' ? 'border-yellow-400 bg-yellow-900/50' : 'border-black bg-gray-900'}`}>
                  🏆 Esports<br /><span className="text-[10px]">1 Card</span>
                </button>
              </div>
              <input
                type="text"
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                placeholder="Password (optional)"
                className="pixel-input text-center text-sm"
                maxLength={10}
              />
              <Button onClick={handleCreate} disabled={loading} className="w-full">{loading ? <Spinner/> : 'Create Room'}</Button>
              <button onClick={() => setShowCreate(false)} className="w-full text-xs text-gray-400 hover:underline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt for Locked Rooms */}
      {passwordPromptRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPasswordPromptRoom(null)}>
          <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-1 text-yellow-400">🔑 Password Required</h3>
            <p className="text-xs text-gray-400 text-center mb-3">Room: {passwordPromptRoom.hostDisplayName}</p>
            <div className="space-y-3">
              <input
                type="text"
                value={promptPassword}
                onChange={e => setPromptPassword(e.target.value)}
                placeholder="Enter room password"
                className="pixel-input text-center text-sm"
                maxLength={10}
                autoFocus
              />
              <Button onClick={handlePasswordJoin} disabled={loading} className="w-full">{loading ? <Spinner/> : 'Join Room'}</Button>
              <button onClick={() => setPasswordPromptRoom(null)} className="w-full text-xs text-gray-400 hover:underline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowJoin(false)}>
          <div className="w-full max-w-sm p-4 bg-[#2c2c54] border-2 border-black" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-3 text-yellow-400">🔍 Join Room</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                placeholder="Room ID"
                className="pixel-input text-center text-sm"
              />
              <input
                type="text"
                value={joinPassword}
                onChange={e => setJoinPassword(e.target.value)}
                placeholder="Password (if required)"
                className="pixel-input text-center text-sm"
                maxLength={10}
              />
              <Button onClick={handleJoinById} disabled={loading} className="w-full">{loading ? <Spinner/> : 'Join Room'}</Button>
              <button onClick={() => setShowJoin(false)} className="w-full text-xs text-gray-400 hover:underline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomBrowser;
