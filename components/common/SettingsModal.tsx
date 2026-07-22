import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import Button from './Button';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import { toast } from 'react-toastify';
import { useRealtime } from '../../hooks/useRealtime';
import ToggleSwitch from './ToggleSwitch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsButtonGroupProps<T extends string | number> {
    label: string;
    options: T[];
    selectedValue: T;
    onSelect: (value: T) => void;
}

const SettingsButtonGroup = <T extends string | number>({ label, options, selectedValue, onSelect }: SettingsButtonGroupProps<T>) => (
    <div className="space-y-2">
        <label className="text-sm font-bold">{label}</label>
        <div className="flex bg-gray-900 border-2 border-black p-0.5">
            {options.map(option => (
                <button
                    key={option}
                    onClick={() => onSelect(option)}
                    className={`flex-1 py-1 text-xs font-bold transition-colors duration-200
                        ${selectedValue === option ? 'bg-blue-500 text-white' : 'hover:bg-gray-800'}`}
                >
                    {option}
                </button>
            ))}
        </div>
    </div>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    graphicsQuality, setGraphicsQuality,
    fps, setFps,
    musicVolume, setMusicVolume,
    fastAnimationMode, setFastAnimationMode,
    enablePushNotifications, setEnablePushNotifications
  } = useSettings();
  const { patchVersion } = useRealtime();
  
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

  if (!isOpen) return null;

  const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="border-b-2 border-black mb-4 mt-6">
        <h3 className="text-base font-bold text-gray-300 pb-1">{title}</h3>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="w-full max-w-sm p-6 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-bold text-yellow-400 text-center mb-4">Settings</h2>
          
          <div className="space-y-4">
            <SectionHeader title="Game Info" />
            <div className="flex items-center justify-between text-sm py-2 px-1">
              <span className="font-bold">Game Version</span>
              <span className="font-semibold text-green-400">v{patchVersion}</span>
            </div>

            <SectionHeader title="Server Info" />
            <div className="flex items-center justify-between text-sm py-2 px-1">
              <span className="font-bold">Server Location</span>
              <span className="font-semibold text-green-400">BD Server</span>
            </div>
            
            <SectionHeader title="Audio" />
            <div className="space-y-2">
                <ToggleSwitch
                    label="Sound Effects"
                    enabled={enablePushNotifications}
                    onChange={setEnablePushNotifications}
                />
                <label htmlFor="musicVolume" className="text-sm font-bold">Music Volume</label>
                <input
                    id="musicVolume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-900 border-2 border-black rounded-lg appearance-none cursor-pointer"
                    style={{'--thumb-color': '#facc15'} as React.CSSProperties}
                />
            </div>

            <SectionHeader title="Graphics & Gameplay" />
              <SettingsButtonGroup
                  label="Quality"
                  options={['Low', 'Medium', 'High']}
                  selectedValue={graphicsQuality}
                  onSelect={setGraphicsQuality}
              />
              <SettingsButtonGroup
                  label="FPS Target"
                  options={[60, 90, 120]}
                  selectedValue={fps}
                  onSelect={setFps}
              />
              <div className="pt-2">
                <ToggleSwitch 
                    label="Fast Animation Mode" 
                    enabled={fastAnimationMode} 
                    onChange={setFastAnimationMode} 
                />
              </div>

            <SectionHeader title="Legal & Info" />
              <Button
                  variant="secondary"
                  className="w-full !text-sm !py-2"
                  onClick={() => setIsPrivacyPolicyOpen(true)}
              >
                  Privacy Policy
              </Button>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500">
              <p>Developed by Swampod X Mithun</p>
          </div>

          <div className="mt-4 text-center">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
      <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} />
    </>
  );
};

export default SettingsModal;