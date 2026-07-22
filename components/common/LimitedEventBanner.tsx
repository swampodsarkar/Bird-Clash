import React, { useState, useEffect } from 'react';
import type { LimitedEvent } from '../../types';
import { getActiveEvents } from '../../services/eventService';

interface Props {
  onEventClick?: (event: LimitedEvent) => void;
}

export const LimitedEventBanner: React.FC<Props> = ({ onEventClick }) => {
  const [events, setEvents] = useState<LimitedEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    getActiveEvents().then(setEvents);
    const interval = setInterval(() => {
      getActiveEvents().then(setEvents);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (events.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % events.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [events.length]);

  if (events.length === 0) return null;

  const event = events[currentIndex];
  if (!event) return null;

  const timeLeft = Math.max(0, Math.floor((event.endTime - Date.now()) / 1000));
  const hours = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);

  return (
    <div onClick={() => onEventClick?.(event)} style={{
      background: 'linear-gradient(90deg, #e94560, #ff6b6b)', borderRadius: 10,
      padding: '10px 16px', margin: '8px 0', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: "'Orbitron', sans-serif", color: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 24 }}>{event.icon}</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>{event.title}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{event.description}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, whiteSpace: 'nowrap' }}>
        <div>{hours}h {mins}m</div>
        <div style={{ opacity: 0.7 }}>left</div>
      </div>
    </div>
  );
};
