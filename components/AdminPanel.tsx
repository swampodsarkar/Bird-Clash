

import React, { useState, useEffect } from 'react';
import type { Player } from '../types';
import { rtdb } from '../services/firebase';
import firebase from 'firebase/compat/app';
import { Spinner } from './common/Spinner';
import Button from './common/Button';
import BackgroundManagement from './admin/BackgroundManagement';

interface AdminPanelProps {
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [users, setUsers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const usersRef = rtdb.ref('users');
        const userSnapshot = await usersRef.once('value');
        if (userSnapshot.exists()) {
            const usersData = userSnapshot.val();
            const userList = Object.keys(usersData).map(key => usersData[key] as Player);
            setUsers(userList);
        } else {
            setUsers([]);
        }
    } catch (error) {
        console.error("Failed to fetch users:", error);
        alert("Error: Could not fetch user data. Check permissions and network.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateCoins = async (uid: string, amount: number) => {
    try {
        const userRef = rtdb.ref(`users/${uid}`);
        await userRef.update({ coins: firebase.database.ServerValue.increment(amount) });
        fetchUsers(); // Refresh users
    } catch (error) {
        console.error("Failed to update coins:", error);
        alert("Error: Could not update user's coins. Check permissions and network.");
    }
  };

  const handleToggleBan = async (uid: string, isBanned: boolean) => {
    try {
        const userRef = rtdb.ref(`users/${uid}`);
        await userRef.update({ isBanned: !isBanned });
        fetchUsers(); // Refresh users
    } catch (error) {
        console.error("Failed to update ban status:", error);
        alert("Error: Could not update user's ban status. Check permissions and network.");
    }
  };

  const filteredUsers = users.filter(user =>
    (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] min-h-screen">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <Button onClick={onExit} variant="secondary" className="!py-2 !px-4 !text-sm">Exit Admin</Button>
        </div>
        
        <div className="mb-4">
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pixel-input"
            />
        </div>

        {loading ? <Spinner /> : (
          <div className="overflow-x-auto bg-gray-900 border-2 border-black">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3">Player</th>
                  <th scope="col" className="px-6 py-3">Coins</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.uid} className="bg-gray-900 border-b-2 border-black">
                    <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap">
                      {user.displayName || user.email}
                    </th>
                    <td className="px-6 py-4">{user.coins}</td>
                    <td className="px-6 py-4">
                      {user.isBanned ? <span className="text-red-500">Banned</span> : <span className="text-green-500">Active</span>}
                    </td>
                    <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                      <Button onClick={() => handleUpdateCoins(user.uid, 50)} variant="success" className="!p-1 !text-xs">+50</Button>
                      <Button onClick={() => handleUpdateCoins(user.uid, -50)} className="!p-1 !text-xs bg-yellow-600 hover:bg-yellow-700">-50</Button>
                      <Button onClick={() => handleToggleBan(user.uid, user.isBanned)} variant="danger" className="!p-1 !text-xs">
                        {user.isBanned ? 'Unban' : 'Ban'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="p-4 mt-4">
        <h2 className="text-xl font-bold mb-4">Background Management</h2>
        <BackgroundManagement />
      </div>
    </div>
  );
};

export default AdminPanel;