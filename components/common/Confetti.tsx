
import React from 'react';

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => {
  return <div className="absolute w-2 h-4" style={style}></div>;
};

export const Confetti: React.FC = () => {
  const confettiCount = 100;
  const colors = ['#fde047', '#86efac', '#818cf8', '#f472b6', '#67e8f9'];

  const confetti = Array.from({ length: confettiCount }).map((_, i) => {
    const style: React.CSSProperties = {
      left: `${Math.random() * 100}%`,
      animation: `fall ${Math.random() * 2 + 3}s linear ${Math.random() * 4}s infinite`,
      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      transform: `rotate(${Math.random() * 360}deg)`,
    };
    return <ConfettiPiece key={i} style={style} />;
  });

  return (
    <>
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {confetti}
      </div>
    </>
  );
};
