import React from 'react';

const Snowfall: React.FC = () => {
  const snowflakeCount = 150;
  const snowflakes = Array.from({ length: snowflakeCount }).map((_, i) => {
    const style = {
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 20 + 20}s`, // 20 to 40 seconds
      animationDelay: `${Math.random() * 20}s`,
      opacity: Math.random() * 0.5 + 0.3,
      transform: `scale(${Math.random() * 0.5 + 0.5})`,
    };
    return <div key={i} className="snowflake" style={style}></div>;
  });

  return (
    <>
      <style>{`
        .snow-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: -1;
        }
        .snowflake {
          position: absolute;
          top: -10px;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #60a5fa;
          animation: fall linear infinite;
        }
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
          }
        }
      `}</style>
      <div className="snow-container">
        {snowflakes}
      </div>
    </>
  );
};

export default Snowfall;