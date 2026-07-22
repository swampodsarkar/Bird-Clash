import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import { toast } from 'react-toastify';
import type { LimitedEvent } from '../../types';

const EventManagement: React.FC = () => {
  const [events, setEvents] = useState<LimitedEvent[]>([]);
  const [editing, setEditing] = useState<Partial<LimitedEvent>>({
    title: '', description: '', type: 'bonus_coins', startTime: Date.now(),
    endTime: Date.now() + 86400000, icon: '🎉', active: true,
    reward: { type: 'coins', amount: 1000 },
    condition: { type: 'wins', target: 3 },
  });

  useEffect(() => {
    const ref = rtdb.ref('limitedEvents');
    ref.on('value', snap => {
      if (snap.exists()) {
        const data: LimitedEvent[] = [];
        snap.forEach(child => {
          data.push({ id: child.key!, ...child.val() });
        });
        setEvents(data);
      }
    });
    return () => ref.off();
  }, []);

  const handleSave = async () => {
    if (!editing.title) { toast.error('Title required'); return; }
    try {
      if (editing.id) {
        await rtdb.ref(`limitedEvents/${editing.id}`).update(editing);
      } else {
        await rtdb.ref('limitedEvents').push().set({
          title: editing.title, description: editing.description, type: editing.type || 'bonus_coins',
          startTime: editing.startTime || Date.now(), endTime: editing.endTime || Date.now() + 86400000,
          icon: editing.icon || '🎉', active: editing.active ?? true,
          reward: editing.reward || { type: 'coins', amount: 1000 },
          condition: editing.condition || { type: 'wins', target: 3 },
        });
      }
      toast.success('Event saved!');
      setEditing({ title: '', description: '', type: 'bonus_coins', startTime: Date.now(), endTime: Date.now() + 86400000, icon: '🎉', active: true });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    await rtdb.ref(`limitedEvents/${id}`).remove();
    toast.success('Event deleted');
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-yellow-400">Limited Events</h2>
      <div className="space-y-2 bg-gray-800 p-4 rounded">
        <input value={editing.title || ''} onChange={e => setEditing({...editing, title: e.target.value})} placeholder="Event Title" className="w-full p-2 bg-gray-700 rounded text-white" />
        <input value={editing.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} placeholder="Description" className="w-full p-2 bg-gray-700 rounded text-white" />
        <div className="flex gap-2">
          <select value={editing.type} onChange={e => setEditing({...editing, type: e.target.value as any})} className="flex-1 p-2 bg-gray-700 rounded text-white">
            <option value="bonus_coins">Bonus Coins</option>
            <option value="bonus_gems">Bonus Gems</option>
            <option value="double_xp">Double XP</option>
            <option value="special_bird">Special Bird</option>
            <option value="special_battle">Special Battle</option>
          </select>
          <input value={editing.icon || '🎉'} onChange={e => setEditing({...editing, icon: e.target.value})} placeholder="Icon" className="w-16 p-2 bg-gray-700 rounded text-white text-center" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400">Start</label>
            <input type="datetime-local" value={editing.startTime ? new Date(editing.startTime).toISOString().slice(0,16) : ''} 
              onChange={e => setEditing({...editing, startTime: new Date(e.target.value).getTime()})} 
              className="w-full p-2 bg-gray-700 rounded text-white text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400">End</label>
            <input type="datetime-local" value={editing.endTime ? new Date(editing.endTime).toISOString().slice(0,16) : ''} 
              onChange={e => setEditing({...editing, endTime: new Date(e.target.value).getTime()})} 
              className="w-full p-2 bg-gray-700 rounded text-white text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-white text-sm">
          <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing({...editing, active: e.target.checked})} />
          Active
        </label>
        <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          {editing.id ? 'Update' : 'Create'} Event
        </button>
      </div>
      <div className="space-y-2">
        {events.map(e => (
          <div key={e.id} className="flex items-center justify-between bg-gray-800 p-3 rounded">
            <div>
              <span className="text-xl mr-2">{e.icon}</span>
              <span className="text-white font-bold">{e.title}</span>
              <span className={`ml-2 text-xs ${e.active ? 'text-green-400' : 'text-red-400'}`}>{e.active ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing({...e})} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
              <button onClick={() => handleDelete(e.id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventManagement;
