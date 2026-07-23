import React from 'react';
import LottieAnimation from './LottieAnimation';

interface VictoryAnimationProps {
  type: 'victory' | 'defeat';
}

const VictoryAnimation: React.FC<VictoryAnimationProps> = ({ type }) => {
  if (type === 'victory') {
    return (
      <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
        <LottieAnimation
          path="/lottie/victory.json"
          loop={true}
          play={true}
          className="w-full h-full"
          fallback={
            <div className="relative w-full h-full">
              {Array.from({ length: 30 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute text-2xl animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                >
                  {['⭐', '✨', '🎉', '🌟', '💫', '🏆'][Math.floor(Math.random() * 6)]}
                </span>
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl animate-bounce">🏆</span>
              </div>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
      <LottieAnimation
        path="/lottie/defeat.json"
        loop={true}
        play={true}
        className="w-full h-full"
        fallback={
          <div className="relative w-full h-full">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-xl animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1}s`,
                }}
              >
                {['💔', '😢', '💀', '😞', '💨'][Math.floor(Math.random() * 5)]}
              </span>
            ))}
          </div>
        }
      />
    </div>
  );
};

export default VictoryAnimation;
