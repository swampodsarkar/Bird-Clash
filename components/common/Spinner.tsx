import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <>
      <style>{`
        .pixel-spinner {
          width: 28px;
          height: 28px;
          position: relative;
          animation: pixel-spinner-anim 1s infinite linear;
        }
        .pixel-spinner::before,
        .pixel-spinner::after {
          content: '';
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: #3b82f6;
        }
        .pixel-spinner::before {
          top: 0;
          left: 0;
        }
        .pixel-spinner::after {
          top: 0;
          right: 0;
          animation: pixel-spinner-anim-after 1s infinite linear;
        }
        @keyframes pixel-spinner-anim {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pixel-spinner-anim-after {
          50% { transform: translate(0, 16px); }
        }
      `}</style>
      <div className="pixel-spinner"></div>
    </>
  );
};