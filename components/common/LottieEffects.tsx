import React, { useEffect, useState } from 'react';
import LottieAnimation from './LottieAnimation';

interface EffectProps {
  show: boolean;
  onComplete?: () => void;
}

const AttackEffect: React.FC<EffectProps> = ({ show, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 600);
      return () => clearTimeout(timer);
    }
    return;
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <LottieAnimation
        path="/lottie/attack.json"
        loop={false}
        play={true}
        className="w-48 h-48"
        fallback={
          <div className="animate-ping text-6xl">⚡</div>
        }
      />
    </div>
  );
};

const ShieldEffect: React.FC<EffectProps> = ({ show, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
    return;
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <LottieAnimation
        path="/lottie/shield.json"
        loop={false}
        play={true}
        className="w-40 h-40"
        fallback={
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75" />
            <div className="text-5xl animate-pulse">🛡️</div>
          </div>
        }
      />
    </div>
  );
};

const HealEffect: React.FC<EffectProps> = ({ show, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 700);
      return () => clearTimeout(timer);
    }
    return;
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <LottieAnimation
        path="/lottie/heal.json"
        loop={false}
        play={true}
        className="w-40 h-40"
        fallback={
          <div className="text-5xl animate-bounce">💚</div>
        }
      />
    </div>
  );
};

const UltimateEffect: React.FC<EffectProps> = ({ show, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return;
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <LottieAnimation
        path="/lottie/ultimate.json"
        loop={false}
        play={true}
        className="w-56 h-56"
        fallback={
          <div className="text-7xl animate-ping">💥</div>
        }
      />
    </div>
  );
};

const HitEffect: React.FC<EffectProps> = ({ show, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 400);
      return () => clearTimeout(timer);
    }
    return;
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <LottieAnimation
        path="/lottie/hit.json"
        loop={false}
        play={true}
        className="w-full h-full"
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1">
              {['💥', '✨', '💫', '⭐', '🔥', '✨', '💥', '⭐', '💫'].map((e, i) => (
                <span key={i} className="animate-ping" style={{ animationDelay: `${i * 0.05}s` }}>{e}</span>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
};

export { AttackEffect, ShieldEffect, HealEffect, UltimateEffect, HitEffect };
