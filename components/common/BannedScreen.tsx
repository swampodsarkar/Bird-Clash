import React from 'react';
import { auth } from '../../services/firebase';
import Button from './Button';

const BannedScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[9998] animate-fade-in">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-in-out; }
            `}</style>
            <div className="text-center p-8">
                <h1 className="text-6xl text-red-500 mb-4">❌</h1>
                <h2 className="text-3xl font-bold">You are BANNED</h2>
                <Button onClick={() => auth.signOut()} variant="danger" className="mt-8">
                    Logout
                </Button>
            </div>
        </div>
    );
};

export default BannedScreen;
