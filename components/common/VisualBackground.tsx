import React, { useEffect, useRef } from 'react';

interface VisualBackgroundProps {
  type?: 'stars' | 'particles' | 'none';
  children: React.ReactNode;
}

const VisualBackground: React.FC<VisualBackgroundProps> = ({ type = 'stars', children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (type === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let particles: { x: number; y: number; size: number; speedX: number; speedY: number; alpha: number; alphaSpeed: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = type === 'stars' ? 80 : 30;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: type === 'stars' ? Math.random() * 2 + 0.5 : Math.random() * 4 + 1,
        speedX: type === 'stars' ? 0 : (Math.random() - 0.5) * 0.5,
        speedY: type === 'stars' ? -0.1 : (Math.random() - 0.5) * 0.5,
        alpha: Math.random(),
        alphaSpeed: (Math.random() - 0.5) * 0.01,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.alpha += p.alphaSpeed;
        if (p.alpha <= 0.1 || p.alpha >= 0.9) p.alphaSpeed *= -1;

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        if (type === 'stars') {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          const colors = ['rgba(250,204,21,', 'rgba(168,85,247,', 'rgba(59,130,246,', 'rgba(34,211,238,'];
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + p.alpha + ')';
        }
        ctx.fill();
      }

      animFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, [type]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default VisualBackground;
