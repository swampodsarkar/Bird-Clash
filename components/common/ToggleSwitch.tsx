import React from 'react';

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, onChange, disabled = false, comingSoon = false }) => {
  const isDisabled = disabled || comingSoon;
  return (
    <div className={`flex items-center justify-between ${isDisabled ? 'opacity-50' : ''}`}>
      <label htmlFor={label} className="text-sm font-bold flex-grow">
        {label}
        {comingSoon && <span className="text-xs text-gray-400 ml-2">(Coming Soon)</span>}
      </label>
      <button
        id={label}
        role="switch"
        aria-checked={enabled}
        onClick={() => !isDisabled && onChange(!enabled)}
        disabled={isDisabled}
        className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer border-2 border-black transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-green-500' : 'bg-gray-900'
        } ${isDisabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 transform bg-white border-2 border-black transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;