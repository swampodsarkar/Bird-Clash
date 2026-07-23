import React, { useState, useEffect } from 'react';
import Button from './Button';
import { rtdb } from '../../services/firebase';

interface SeasonalEventConfig {
    title: string;
    description: string;
    icon: string;
    endDate: string; // ISO date string
    gradientFrom: string;
    gradientTo: string;
    borderColor: string;
    active: boolean;
}

interface SeasonalEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SeasonalEventModal: React.FC<SeasonalEventModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<SeasonalEventConfig | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const ref = rtdb.ref('gameConfig/seasonalEvent');
    const listener = ref.on('value', snapshot => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val.active) {
          setConfig(val);
        } else {
          setConfig(null);
        }
      } else {
        setConfig(null);
      }
    });
    return () => ref.off('value', listener);
  }, []);

  useEffect(() => {
    if (!isOpen || !config) return;

    const calculateTimeLeft = () => {
        const eventDate = new Date(config.endDate).getTime();
        const now = Date.now();
        const difference = eventDate - now;

        if (difference <= 0) return null;

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000),
        };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, config]);

  const handleClose = () => {
    if (dontShowAgain) {
        sessionStorage.setItem('hideSeasonalEventModal', 'true');
    }
    onClose();
  };

  if (!isOpen || !config) return null;

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
        className="w-full max-w-md p-6 text-center space-y-4 border-2" 
        style={{
            background: `linear-gradient(135deg, ${config.gradientFrom || '#1e3a5f'}, ${config.gradientTo || '#0d2137'})`,
            borderColor: config.borderColor || '#3b82f6',
            boxShadow: `0 0 20px ${config.borderColor || 'rgba(59,130,246,0.5)'}`
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-4xl">{config.icon || '🎉'}</div>
        <h2 className="font-pixel text-3xl text-white" style={{ textShadow: '0 0 10px #fff, 0 0 20px #60a5fa' }}>
            {config.title}
        </h2>
        
        <p className="text-blue-200">
            {config.description}
        </p>
        
        {timeLeft ? (
             <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center my-4 font-pixel">
                {Object.entries(timeLeft).map(([interval, value]) => (
                    <div key={interval} className="p-2 bg-black/30 border-2 rounded-lg" style={{ borderColor: config.borderColor || '#3b82f6' }}>
                        <div className="text-2xl sm:text-4xl text-white">{String(value).padStart(2, '0')}</div>
                        <div className="text-[10px] sm:text-xs text-blue-300 uppercase">{interval}</div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-lg font-bold text-green-400 my-4">This event is now live!</p>
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