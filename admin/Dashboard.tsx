
import React, { useState } from 'react';
import GameSettings from './components/GameSettings';
import PlayerManagement from './components/PlayerManagement';
import StoreManagement from './components/StoreManagement';
import RoyalePassManagement from './components/RoyalePassManagement';

type Tab = 'Game Settings' | 'Players' | 'Store' | 'Royale Pass';

interface DashboardProps {
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<Tab>('Game Settings');

    const renderContent = () => {
        switch (activeTab) {
            case 'Game Settings': return <GameSettings />;
            case 'Players': return <PlayerManagement />;
            case 'Store': return <StoreManagement />;
            case 'Royale Pass': return <RoyalePassManagement />;
            default: return null;
        }
    };

    const NavItem: React.FC<{ label: Tab }> = ({ label }) => (
        <button
            onClick={() => setActiveTab(label)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === label ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 shadow-md">
                <div className="admin-container px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold">Clash Fever Admin</h1>
                    <button
                        onClick={onLogout}
                        className="px-3 py-1 text-sm bg-red-600 rounded-md hover:bg-red-700"
                    >
                        Logout
                    </button>
                </div>
            </header>
            <main className="admin-container p-4">
                <nav className="mb-6 p-2 bg-gray-800 rounded-lg flex space-x-2">
                    <NavItem label="Game Settings" />
                    <NavItem label="Players" />
                    <NavItem label="Store" />
                    <NavItem label="Royale Pass" />
                </nav>
                <div>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
