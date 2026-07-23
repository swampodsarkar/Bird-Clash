import React, { useEffect, useState } from 'react';

interface Props {
  title: string;
  icon?: string;
  onComplete: () => void;
}

const TitleUnlockAnimation: React.FC<Props> = ({ title, icon = '🏆', onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]">
      <div className="text-center animate-bounce">
        <div className="text-8xl mb-4">{icon}</div>
        <h2 className="font-pixel text-3xl text-yellow-400 mb-2" style={{ textShadow: '0 0 20px rgba(250,204,21,0.5)' }}>
          NEW TITLE UNLOCKED!
        </h2>
        <p className="text-2xl text-white font-bold">"{title}"</p>
      </div>
    </div>
  );
};

export default TitleUnlockAnimation;
