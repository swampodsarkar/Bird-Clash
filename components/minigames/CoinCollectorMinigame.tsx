import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Player } from '../../types';
import Button from '../common/Button';

interface Item {
  id: number;
  type: 'coin' | 'bomb';
  x: number; // percentage
  y: number; // pixels
  rotation: number;
}

interface CoinCollectorMinigameProps {
  player: Player;
  onGameEnd: (score: number) => void;
}

const CoinCollectorMinigame: React.FC<CoinCollectorMinigameProps> = ({ player, onGameEnd }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [birdPosition, setBirdPosition] = useState({ x: 50 }); // x is percentage
  const [hitFlash, setHitFlash] = useState(false);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  // Fix: Initialize useRef with null to prevent calling cancelAnimationFrame with an undefined value.
  const animationFrameId = useRef<number | null>(null);
  const birdPositionRef = useRef(birdPosition);
  
  const playerBird = player.ownedBirds?.[player.equippedBirdId || ''] || { icon: '🐦' };
  
  const BIRD_WIDTH_PERCENT = 8;
  const BIRD_SIZE_PX = 60;
  const ITEM_SIZE_PX = 40;
  const ITEM_SPEED_PX = 5;

  // Keep ref in sync with state for use in animation frame
  useEffect(() => {
    birdPositionRef.current = birdPosition;
  }, [birdPosition]);

  // Game Loop and Timers
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Countdown timer
    const countdown = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(countdown);
                setGameState('ended');
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    // Item spawner
    const itemSpawner = setInterval(() => {
        const type = Math.random() > 0.2 ? 'coin' : 'bomb'; // 80% coin, 20% bomb
        setItems(prev => [...prev, {
            id: Date.now() + Math.random(),
            type,
            x: Math.random() * 95,
            y: -50,
            rotation: Math.random() * 360,
        }]);
    }, 450);

    // Main game loop
    const loop = () => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) {
            animationFrameId.current = requestAnimationFrame(loop);
            return;
        }

        const gameAreaHeight = gameArea.clientHeight;
        const gameAreaWidth = gameArea.clientWidth;

        const birdY = gameAreaHeight - 80;
        const birdRect = {
            left: (birdPositionRef.current.x / 100) * gameAreaWidth,
            right: ((birdPositionRef.current.x / 100) * gameAreaWidth) + BIRD_SIZE_PX,
            top: birdY,
            bottom: birdY + BIRD_SIZE_PX,
        };

        setItems(prevItems => {
            const newItems = [];
            let scoreChange = 0;
            let bombsHit = 0;

            for (const item of prevItems) {
                const itemX = (item.x / 100) * gameAreaWidth;
                const itemRect = { left: itemX, right: itemX + ITEM_SIZE_PX, top: item.y, bottom: item.y + ITEM_SIZE_PX };
                
                // Check for collision
                if (birdRect.left < itemRect.right && birdRect.right > itemRect.left && birdRect.top < itemRect.bottom && birdRect.bottom > itemRect.top) {
                    if (item.type === 'coin') {
                        scoreChange += 10;
                    } else {
                        scoreChange -= 50;
                        bombsHit++;
                    }
                    continue; // Item collected/hit, so remove it
                }

                // Move item down
                const newItem = { ...item, y: item.y + ITEM_SPEED_PX };

                // Keep if not off-screen
                if (newItem.y < gameAreaHeight) {
                    newItems.push(newItem);
                }
            }
            
            if (bombsHit > 0) {
                setHitFlash(true);
                setTimeout(() => setHitFlash(false), 300);
            }
            
            if (scoreChange !== 0) {
                setScore(s => Math.max(0, s + scoreChange));
            }

            return newItems;
        });
        
        animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);

    // Cleanup
    return () => {
        clearInterval(countdown);
        clearInterval(itemSpawner);
        // Fix: Add a guard to ensure cancelAnimationFrame is called with a valid ID.
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [gameState]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let newXPercent = (x / rect.width) * 100 - (BIRD_WIDTH_PERCENT / 2);
    newXPercent = Math.max(0, Math.min(newXPercent, 100 - BIRD_WIDTH_PERCENT));
    setBirdPosition({ x: newXPercent });
  }, [gameState]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    let newXPercent = (x / rect.width) * 100 - (BIRD_WIDTH_PERCENT / 2);
    newXPercent = Math.max(0, Math.min(newXPercent, 100 - BIRD_WIDTH_PERCENT));
    setBirdPosition({ x: newXPercent });
  }, [gameState]);


  const renderGameState = () => {
    switch (gameState) {
      case 'ended':
        return (
          <div className="text-center p-4">
            <h2 className="text-4xl font-bold text-yellow-400 font-pixel">Game Over!</h2>
            <p className="text-2xl mt-4">You collected <span className="font-bold">{score}</span> coins!</p>
            <Button onClick={() => onGameEnd(score)} className="mt-8">Back to Lobby</Button>
          </div>
        );
      case 'ready':
        return (
          <div className="text-center p-4">
            <h2 className="text-4xl font-bold text-yellow-400 font-pixel">Coin Rush</h2>
            <p className="mt-4 text-lg">Collect falling coins with your bird.</p>
            <p className="text-red-400">Avoid the bombs!</p>
            <p className="mt-2">You have 30 seconds.</p>
            <Button onClick={() => setGameState('playing')} className="mt-8 w-48 !py-4 !text-2xl">Start!</Button>
          </div>
        );
      case 'playing':
        return (
          <div ref={gameAreaRef} onMouseMove={handleMouseMove} onTouchMove={handleTouchMove} className="w-full h-full cursor-none overflow-hidden relative">
            <style>{`
                @keyframes hit-flash-anim {
                    from { opacity: 0.7; }
                    to { opacity: 0; }
                }
                .hit-flash {
                    animation: hit-flash-anim 0.3s ease-out forwards;
                }
            `}</style>
            {hitFlash && <div className="absolute inset-0 bg-red-600 pointer-events-none hit-flash" />}
            <div className="absolute top-4 left-4 flex items-center gap-4 z-10">
                <Button onClick={() => setGameState('ended')} variant="danger" className="!py-1 !px-3 !text-xs">Exit</Button>
                <div className="text-xl font-bold bg-black/50 p-2 rounded">Time: {timeLeft}s</div>
            </div>
            <div className="absolute top-4 right-4 text-xl font-bold bg-black/50 p-2 rounded z-10">💰 {score}</div>
            
            {items.map(item => (
              <div key={item.id} style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}px`,
                transform: `rotate(${item.rotation}deg)`,
                fontSize: `${ITEM_SIZE_PX}px`,
                filter: `drop-shadow(0 0 5px ${item.type === 'coin' ? 'yellow' : 'red'})`
              }}>
                {item.type === 'coin' ? '💰' : '💣'}
              </div>
            ))}
            
            <div style={{
              position: 'absolute',
              left: `${birdPosition.x}%`,
              bottom: '20px',
              fontSize: `${BIRD_SIZE_PX}px`,
              width: `${BIRD_WIDTH_PERCENT}%`,
              textAlign: 'center',
              filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))'
            }}>
              {playerBird.icon}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/80" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'1\'/%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'1\'/%3E%3Ccircle cx=\'90\' cy=\'90\' r=\'1\'/%3E%3Ccircle cx=\'10\' cy=\'90\' r=\'1\'/%3E%3Ccircle cx=\'90\' cy=\'10\' r=\'1\'/%3E%3Ccircle cx=\'30\' cy=\'70\' r=\'1\'/%3E%3Ccircle cx=\'70\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}>
      <div className="w-full max-w-4xl h-[90vh] bg-gradient-to-br from-[#16213e] to-[#0f0c29] border-4 border-yellow-400 shadow-lg flex items-center justify-center">
        {renderGameState()}
      </div>
    </div>
  );
};

export default CoinCollectorMinigame;