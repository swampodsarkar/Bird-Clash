import React, { useState } from 'react';
import Button from './Button';

interface TutorialModalProps {
  onComplete: () => void;
}

const tutorialSteps = [
  {
    icon: '👋',
    title: 'Welcome to Bird Clash Fever!',
    text: "Get ready for epic 1-v-1 bird battles! This quick tutorial will show you the ropes.",
  },
  {
    icon: '🎯',
    title: 'Your Mission',
    text: "Collect and train a team of powerful birds. Battle against other players in real-time to climb the ranks and become the ultimate Bird Master!",
  },
  {
    icon: '🏠',
    title: 'The Main Lobby',
    text: "This is your command center. Your equipped bird is displayed in the middle. Use the navigation buttons to explore different screens like the Store and your Collection.",
  },
  {
    icon: '🐦',
    title: 'Your Collection',
    text: "Visit the 'Birds' tab to see all your collected birds. Feed them insects to give them XP, which increases their Level, Power, and Health!",
  },
  {
    icon: '⚔️',
    title: 'How to Battle',
    text: "In a match, tap 'ATTACK' on your turn to deal damage. Use your bird's special 'Ability' for a strategic advantage! Reduce your opponent's health to zero to win.",
  },
  {
    icon: '🎉',
    title: "You're Ready!",
    text: "That's all you need to know to get started. Head to the lobby, press START, and begin your journey!",
  }
];

const TutorialModal: React.FC<TutorialModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const currentStep = tutorialSteps[step];
  const isLastStep = step === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
       <style>{`
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in { animation: fade-in 0.3s ease-out; }
        `}</style>
      <div 
        className="w-full max-w-md p-6 bg-gradient-to-br from-[#16213e] to-[#0f0c29] border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] text-center space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl drop-shadow-lg">{currentStep.icon}</div>
        
        <h2 className="font-pixel text-3xl text-white" style={{ textShadow: '0 0 10px #fff' }}>
            {currentStep.title}
        </h2>
        
        <p className="text-gray-300 text-lg min-h-[96px]">
            {currentStep.text}
        </p>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2">
            {tutorialSteps.map((_, index) => (
                <div key={index} className={`w-3 h-3 rounded-full border-2 border-black transition-colors ${index === step ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
            ))}
        </div>
        
        <div className="pt-4 flex gap-4">
            {step > 0 && (
                <Button onClick={handleBack} variant="secondary" className="w-full">Back</Button>
            )}
            <Button onClick={handleNext} className="w-full">
                {isLastStep ? "Let's Go!" : "Next"}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
