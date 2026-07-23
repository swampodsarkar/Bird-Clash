import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, duration = 3000 }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0a1a] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="text-center">
        <div className="text-8xl mb-6 animate-pulse" style={{ animationDuration: '2s' }}>
          🎮
        </div>
        <h1
          className="text-5xl font-bold tracking-widest"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.3))',
          }}
        >
          SM STUDIO
        </h1>
        <div className="mt-4 h-1 w-32 mx-auto bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 rounded-full animate-pulse" />
        <p className="mt-4 text-gray-500 text-sm tracking-widest uppercase">Loading...</p>
      </div>
    </div>
  );
};

export default SplashScreen;
