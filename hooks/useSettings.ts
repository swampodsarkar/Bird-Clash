
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { soundManager } from '../utils/sound';

type GraphicsQuality = 'Low' | 'Medium' | 'High';
type FPS = 60 | 90 | 120;

interface Settings {
  enablePushNotifications: boolean;
  soundEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  fps: FPS;
  musicVolume: number;
  fastAnimationMode: boolean;
}

interface SettingsContextType extends Settings {
  setEnablePushNotifications: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setFps: (fps: FPS) => void;
  setMusicVolume: (volume: number) => void;
  setFastAnimationMode: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getStoredValue = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
        return defaultValue;
    }
}

// Fix: Explicitly type as a React.FC with required children to fix type inference issues in consuming components.
const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [enablePushNotifications, setEnablePushNotificationsState] = useState<boolean>(() => getStoredValue('settings-pushNotifications', false));
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => getStoredValue('settings-soundEnabled', true));
  const [graphicsQuality, setGraphicsQualityState] = useState<GraphicsQuality>(() => getStoredValue('settings-graphicsQuality', 'Medium'));
  const [fps, setFpsState] = useState<FPS>(() => getStoredValue('settings-fps', 60));
  const [musicVolume, setMusicVolumeState] = useState<number>(() => getStoredValue('settings-musicVolume', 0.5));
  const [fastAnimationMode, setFastAnimationModeState] = useState<boolean>(() => getStoredValue('settings-fastAnim', false));


  useEffect(() => { localStorage.setItem('settings-pushNotifications', JSON.stringify(enablePushNotifications)); }, [enablePushNotifications]);
  useEffect(() => { localStorage.setItem('settings-soundEnabled', JSON.stringify(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem('settings-graphicsQuality', JSON.stringify(graphicsQuality)); }, [graphicsQuality]);
  useEffect(() => { localStorage.setItem('settings-fps', JSON.stringify(fps)); }, [fps]);
  useEffect(() => { localStorage.setItem('settings-musicVolume', JSON.stringify(musicVolume)); }, [musicVolume]);
  useEffect(() => { localStorage.setItem('settings-fastAnim', JSON.stringify(fastAnimationMode)); }, [fastAnimationMode]);

  const setEnablePushNotifications = (enabled: boolean) => setEnablePushNotificationsState(enabled);
  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundManager.setEnabled(enabled);
  };
  const setGraphicsQuality = (quality: GraphicsQuality) => setGraphicsQualityState(quality);
  const setFps = (fps: FPS) => setFpsState(fps);
  const setMusicVolume = (volume: number) => setMusicVolumeState(volume);
  const setFastAnimationMode = (enabled: boolean) => setFastAnimationModeState(enabled);

  const value = {
    enablePushNotifications,
    soundEnabled,
    graphicsQuality,
    fps,
    musicVolume,
    fastAnimationMode,
    setEnablePushNotifications,
    setSoundEnabled,
    setGraphicsQuality,
    setFps,
    setMusicVolume,
    setFastAnimationMode,
  };

  // Fix: Replaced JSX with React.createElement to prevent parsing errors in a .ts file.
  return React.createElement(SettingsContext.Provider, { value }, children);
};

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export { SettingsProvider, useSettings };