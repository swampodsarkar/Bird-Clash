import React from 'react';

const MaintenanceScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
            <div className="text-center p-8">
                <h1 className="text-4xl text-yellow-400 mb-4">🚧</h1>
                <h2 className="text-2xl font-bold">Server under maintenance!</h2>
                <p className="text-gray-400 mt-2">We'll be back shortly. Thanks for your patience.</p>
            </div>
        </div>
    );
};

export default MaintenanceScreen;
