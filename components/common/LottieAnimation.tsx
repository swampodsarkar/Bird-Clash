import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

interface Props {
  path?: string;
  url?: string;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const LottieAnimation: React.FC<Props> = ({
  path,
  url,
  width = 200,
  height = 200,
  loop = true,
  autoplay = true,
  style,
  className,
}) => {
  const [animationData, setAnimationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const sourceUrl = path 
    ? (path.startsWith('http') ? path : `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`)
    : url;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    if (!sourceUrl) { setLoading(false); return; }
    fetch(sourceUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(data => {
        if (mounted) { setAnimationData(data); setLoading(false); }
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [sourceUrl]);

  if (loading) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }} className={className}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#4ecca3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!animationData) return null;

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      style={{ width, height, ...style }}
      className={className}
    />
  );
};

export default LottieAnimation;
