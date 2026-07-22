



import React, { useState } from 'react';
import GameSettings from './GameSettings';
import PlayerManagement from './PlayerManagement';
import StoreManagement from './StoreManagement';
import RoyalePassManagement from './RoyalePassManagement';
import PurchaseManagement from './PurchaseManagement';
import Button from '../common/Button';
import { auth } from '../../services/firebase';
import { ToastContainer } from 'react-toastify';
import EsportsManagement from './EsportsManagement';
import ReportManagement from './ReportManagement';
import BirdImageManagement from './BirdImageManagement';
import BackgroundManagement from './BackgroundManagement';
import EventManagement from './EventManagement';

type Tab = 'Game Settings' | 'Players' | 'Store' | 'Royale Pass' | 'Purchases' | 'Esports' | 'Reports' | 'Bird Images' | 'Backgrounds' | 'Events';

interface AdminViewProps {
    onExit: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ onExit }) => {
    const [activeTab, setActiveTab] = useState<Tab>('Game Settings');

    const renderContent = () => {
        switch (activeTab) {
            case 'Game Settings': return <GameSettings />;
            case 'Players': return <PlayerManagement />;
            case 'Store': return <StoreManagement />;
            case 'Royale Pass': return <RoyalePassManagement />;
            case 'Purchases': return <PurchaseManagement />;
            case 'Esports': return <EsportsManagement />;
            case 'Reports': return <ReportManagement />;
            case 'Bird Images': return <BirdImageManagement />;
            case 'Backgrounds': return <BackgroundManagement />;
            case 'Events': return <EventManagement />;
            default: return null;
        }
    };

    const NavItem: React.FC<{ label: Tab }> = ({ label }) => (
        <button
            onClick={() => setActiveTab(label)}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === label ? 'bg-yellow-400 text-black' : 'text-white hover:bg-gray-800'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen text-white p-4">
             <header className="mb-6 p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] flex justify-between items-center">
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <div className="flex items-center gap-4">
                     <Button onClick={onExit} variant="secondary" className="!py-2 !px-4 !text-sm">
                        Play Game
                    </Button>
                    <Button
                        onClick={() => auth.signOut()}
                        variant="danger"
                        className="!py-2 !px-4 !text-sm"
                    >
                        Logout
                    </Button>
                </div>
            </header>
            <main>
                <nav className="mb-6 p-2 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-wrap gap-2">
                    <NavItem label="Game Settings" />
                    <NavItem label="Players" />
                    <NavItem label="Store" />
                    <NavItem label="Royale Pass" />
                    <NavItem label="Purchases" />
                    <NavItem label="Esports" />
                    <NavItem label="Reports" />
                    <NavItem label="Bird Images" />
                    <NavItem label="Backgrounds" />
                </nav>
                <div>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminView;