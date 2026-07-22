import React, { useState, useEffect } from 'react';

interface PostLoginLoadingScreenProps {
  onComplete: () => void;
}

const loadingMessages = [
  "Loading Assets...",
  "Optimizing Network...",
  "Optimizing FPS for your Device...",
];

const PostLoginLoadingScreen: React.FC<PostLoginLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500); // Wait half a second before completing
          return 100;
        }

        if (newProgress > 66 && messageIndex < 2) {
          setMessageIndex(2);
        } else if (newProgress > 33 && messageIndex < 1) {
          setMessageIndex(1);
        }
        
        return newProgress;
      });
    }, 40); // 40ms * 100 = 4000ms = 4 seconds load time

    return () => clearInterval(interval);
  }, [onComplete, messageIndex]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold text-yellow-300 mb-4 font-pixel" style={{ textShadow: '0 0 15px rgba(255,255,255,0.4), 3px 3px 0px #2c3e50' }}>
          BIRD CLASH FEVER
        </h1>
        <div className="w-full bg-black border-2 border-gray-500 p-1 rounded-md shadow-lg">
          <div 
            className="h-6 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100 ease-linear rounded-sm"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="mt-4 text-lg text-white font-semibold" style={{textShadow: '1px 1px 2px #000'}}>
          {loadingMessages[messageIndex]} {progress}%
        </p>
      </div>
    </div>
  );
};

export default PostLoginLoadingScreen;