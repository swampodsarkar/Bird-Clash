import React, { useState } from 'react';

const LazyLottie = React.lazy(() => import('react-lottie-player'));

interface LottieAnimationProps {
  animationData?: object;
  path?: string;
  loop?: boolean;
  play?: boolean;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({
  animationData,
  path,
  loop = true,
  play = true,
  speed = 1,
  className,
  style,
  fallback,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!animationData && !path) {
    return <>{fallback || null}</>;
  }

  if (hasError) {
    return <>{fallback || null}</>;
  }

  if (!animationData && path) {
    return (
      <React.Suspense fallback={<>{fallback || null}</>}>
        <LazyLottie
          path={path}
          loop={loop}
          play={play}
          speed={speed}
          className={className}
          style={style}
          onError={() => setHasError(true)}
        />
      </React.Suspense>
    );
  }

  return (
    <React.Suspense fallback={<>{fallback || null}</>}>
      <LazyLottie
        animationData={animationData}
        loop={loop}
        play={play}
        speed={speed}
        className={className}
        style={style}
        onError={() => setHasError(true)}
      />
    </React.Suspense>
  );
};

export default LottieAnimation;
