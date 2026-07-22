import React, { useState, useEffect } from 'react';
import Button from './Button';

interface UpdateRequiredScreenProps {
  onUpdateComplete: (version: number) => void;
  patchSizeMB: number;
  patchVersion: number;
}

const UpdateRequiredScreen: React.FC<UpdateRequiredScreenProps> = ({ onUpdateComplete, patchSizeMB, patchVersion }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState(0);
  
  const totalSizeMB = patchSizeMB || 4; // Use prop with a fallback

  useEffect(() => {
    if (!isDownloading) return;

    const downloadSpeedMBps = 5; // As requested
    const durationSeconds = totalSizeMB / downloadSpeedMBps;
    const intervalDurationMs = 50;
    const totalSteps = (durationSeconds * 1000) / intervalDurationMs;
    const progressIncrement = 100 / totalSteps;

    const interval = setInterval(() => {
      setProgress(prev => {
        const nextProgress = prev + progressIncrement;
        if (nextProgress >= 100) {
          clearInterval(interval);
          setDownloadedMB(totalSizeMB);
          setProgress(100);
          setTimeout(() => onUpdateComplete(patchVersion), 1000); // Wait a moment before closing
          return 100;
        }
        setDownloadedMB((nextProgress / 100) * totalSizeMB);
        return nextProgress;
      });
    }, intervalDurationMs);

    return () => clearInterval(interval);
  }, [isDownloading, onUpdateComplete, totalSizeMB, patchVersion]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-in-out; }
      `}</style>
      <div className="w-full max-w-md p-6 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000] text-center space-y-4">
        <h2 className="text-2xl font-bold text-yellow-400">Update Required (v{patchVersion})</h2>
        
        {!isDownloading ? (
          <>
            <p className="text-gray-300">A new update is available. Please download it to continue playing.</p>
            <Button onClick={() => setIsDownloading(true)} variant="success" className="w-full">
              Update Game ({totalSizeMB} MB)
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-300">Downloading update...</p>
            <div className="w-full bg-black border-2 border-gray-500 p-1">
              <div 
                className="h-5 bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm font-mono text-gray-400">
              {downloadedMB.toFixed(2)} MB / {totalSizeMB.toFixed(2)} MB ({Math.floor(progress)}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateRequiredScreen;