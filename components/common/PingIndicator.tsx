import React, { useState, useEffect, useRef } from 'react';

const rtdbUrl = 'https://bird-clash-default-rtdb.asia-southeast1.firebasedatabase.app';

const PingIndicator: React.FC = () => {
  const [ping, setPing] = useState<number | null>(null);
  const [status, setStatus] = useState<'checking' | 'good' | 'fair' | 'poor' | 'offline'>('checking');
  const intervalRef = useRef<number | null>(null);

  const checkPing = async () => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${rtdbUrl}/.json?shallow=true&_=${Date.now()}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      const ms = Date.now() - start;
      setPing(ms);
      if (ms < 150) setStatus('good');
      else if (ms < 300) setStatus('fair');
      else setStatus('poor');
    } catch {
      setStatus('offline');
      setPing(null);
    }
  };

  useEffect(() => {
    checkPing();
    intervalRef.current = window.setInterval(checkPing, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const colors = {
    checking: 'bg-gray-500',
    good: 'bg-green-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
    offline: 'bg-red-700 animate-pulse',
  };

  const labels = {
    checking: '...',
    good: ping ? `${ping}ms` : '',
    fair: ping ? `${ping}ms` : '',
    poor: ping ? `${ping}ms` : '',
    offline: 'OFF',
  };

  return (
    <div className="flex items-center gap-1 text-[10px] font-bold" title={`Server: ${status.toUpperCase()}${ping ? ` (${ping}ms)` : ''}`}>
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className={status === 'offline' ? 'text-red-400' : status === 'poor' ? 'text-red-300' : 'text-gray-400'}>
        {labels[status]}
      </span>
    </div>
  );
};

export default PingIndicator;
