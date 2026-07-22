import React from 'react';
import type { Player } from '../../types';
import { Home, Bird, ShoppingCart, Users } from 'lucide-react';

type Tab = 'CHALLENGE' | 'BIRDS' | 'STORE' | 'SOCIAL';

interface NavItemProps {
  label: string;
  tab: Tab;
  activeTab: string;
  onClick: (tab: Tab) => void;
  icon: React.ReactNode;
  hasIndicator?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ label, tab, activeTab, onClick, icon, hasIndicator }) => (
  <button
    onClick={() => onClick(tab)}
    className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 transition-colors duration-200 relative ${
      activeTab === tab ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
    }`}
  >
    {hasIndicator && <div className="absolute top-1 right-[25%] w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></div>}
    <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] flex items-center justify-center">{icon}</span>
    <span className="text-[10px] font-bold mt-1 font-pixel uppercase tracking-wider">{label}</span>
    {activeTab === tab && <div className="w-8 h-1 bg-yellow-400 mt-1 rounded-full shadow-[0_0_5px_yellow]"></div>}
  </button>
);

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  hasUnreadGlobalMessages: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, hasUnreadGlobalMessages }) => {
  const navItems = [
    { label: 'Lobby', tab: 'CHALLENGE', icon: <Home size={24} /> },
    { label: 'Birds', tab: 'BIRDS', icon: <Bird size={24} /> },
    { label: 'Store', tab: 'STORE', icon: <ShoppingCart size={24} /> },
    { label: 'Social', tab: 'SOCIAL', icon: <Users size={24} />, hasIndicator: hasUnreadGlobalMessages },
  ];

  return (
    <nav className="h-[70px] bg-black/50 backdrop-blur-md border-t-2 border-gray-800 flex items-stretch flex-shrink-0">
      {navItems.map(item =>
        <NavItem
          key={item.tab}
          label={item.label}
          tab={item.tab as Tab}
          activeTab={activeTab}
          onClick={setActiveTab}
          icon={item.icon}
          hasIndicator={item.hasIndicator}
        />
      )}
    </nav>
  );
};

export default BottomNav;
