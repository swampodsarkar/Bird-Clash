import React, { useState, useEffect } from 'react';
import Button from './Button';

interface SeasonalEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const calculateTimeLeft = () => {
    const eventDate = new Date('2025-12-10T00:00:00Z').getTime();
    const now = new Date().getTime();
    const difference = eventDate - now;

    if (difference <= 0) {
        return null;
    }

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
    };
};

const SeasonalEventModal: React.FC<SeasonalEventModalProps> = ({ isOpen, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleClose = () => {
    if (dontShowAgain) {
        sessionStorage.setItem('hideWinterverseModal', 'true');
    }
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={handleClose}>
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
        `}</style>
      <div 
        className="w-full max-w-md p-6 bg-gradient-to-br from-blue-900 to-indigo-900 border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-center space-y-4" 
        onClick={e => e.stopPropagation()}
      >
        <div className="text-4xl">❄️</div>
        <h2 className="font-pixel text-3xl text-white" style={{ textShadow: '0 0 10px #fff, 0 0 20px #60a5fa' }}>
            Winterverse is Coming
        </h2>
        
        <p className="text-blue-200">
            Get ready for a new season of chilly clashes, festive rewards, and frosty new birds!
        </p>
        
        {timeLeft ? (
             <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center my-4 font-pixel">
                {Object.entries(timeLeft).map(([interval, value]) => (
                    <div key={interval} className="p-2 bg-black/30 border-2 border-blue-400/50 rounded-lg">
                        <div className="text-2xl sm:text-4xl text-white">{String(value).padStart(2, '0')}</div>
                        <div className="text-[10px] sm:text-xs text-blue-300 uppercase">{interval}</div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-lg font-bold text-green-400 my-4">The Winterverse event is now live!</p>
        )}

        <div className="pt-4 space-y-3">
            <div className="flex items-center justify-center gap-2">
                <input type="checkbox" id="dont-show" checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <label htmlFor="dont-show" className="text-sm text-gray-300 cursor-pointer">Don't show again this session</label>
            </div>
            <Button onClick={handleClose} className="w-full">
                Continue
            </Button>
        </div>
      </div>
    </div>
  );
};

export default SeasonalEventModal;