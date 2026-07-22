import React, { useState, useEffect } from 'react';

interface RewardedAdModalProps {
  onClose: (rewarded: boolean) => void;
}

const RewardedAdModal: React.FC<RewardedAdModalProps> = ({ onClose }) => {
  const adDuration = 5; // 5 second ad
  const [timeLeft, setTimeLeft] = useState(adDuration);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleClose = (rewarded: boolean) => {
    onClose(rewarded);
  };
  
  const canClose = timeLeft <= 0;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg h-[90vh] bg-black border-2 border-gray-700 shadow-lg flex flex-col relative">
        {/* Ad Header */}
        <div className="p-2 flex justify-between items-center bg-gray-900 border-b-2 border-gray-700">
            <span className="text-xs text-gray-400">Advertisement</span>
            {canClose ? (
                <button onClick={() => handleClose(true)} className="text-3xl text-white hover:text-yellow-400 transition-colors">&times;</button>
            ) : (
                <span className="text-sm text-yellow-400 font-bold px-2 py-1 bg-black rounded-md">{timeLeft}s</span>
            )}
        </div>

        {/* Fake Ad Content */}
        <div className="flex-grow flex flex-col items-center justify-center bg-gray-800 text-white text-center p-4">
            <h2 className="text-2xl font-bold mb-4">Amazing Game XYZ</h2>
            <p className="mb-6">Download now and get a special bonus!</p>
            <div className="w-48 h-48 bg-gradient-to-br from-purple-500 to-indigo-600 border-4 border-black flex items-center justify-center animate-pulse">
                <span className="text-6xl">🚀</span>
            </div>
            <button className="mt-8 px-8 py-3 bg-green-500 text-white font-bold border-2 border-black shadow-[4px_4px_0px_#000] hover:bg-green-600 transition-colors">
                Install Now!
            </button>
        </div>

        {/* Ad Footer */}
        <div className="p-2 text-center text-xs text-gray-500 bg-gray-900 border-t-2 border-gray-700">
            Ad provided by Clash Fever Ads
        </div>
      </div>
    </div>
  );
};

export default RewardedAdModal;