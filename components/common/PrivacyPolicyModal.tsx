import React from 'react';
import Button from './Button';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[51] p-4" onClick={onClose}>
      <div className="w-full max-w-md p-6 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-yellow-400 text-center mb-4">Privacy Policy</h2>
        
        <div className="space-y-3 text-sm text-gray-200 max-h-80 overflow-y-auto pr-2">
          <p>Last updated: October 26, 2023</p>
          
          <h3 className="font-bold text-lg pt-2">1. Information We Collect</h3>
          <p>We collect information you provide directly to us, such as when you create an account, and gameplay data to improve your experience. This includes your display name, email, and game progress.</p>

          <h3 className="font-bold text-lg pt-2">2. How We Use Information</h3>
          <p>We use the information we collect to operate, maintain, and provide you with the features and functionality of the game. We also use it to communicate with you, personalize your experience, and monitor for security purposes.</p>

          <h3 className="font-bold text-lg pt-2">3. Information Sharing</h3>
          <p>We do not sell your personal data to third parties. Your gameplay data, such as your display name and score, may be visible to other players on leaderboards.</p>

          <h3 className="font-bold text-lg pt-2">4. Data Security</h3>
          <p>We use reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access.</p>
          
          <h3 className="font-bold text-lg pt-2">5. Your Consent</h3>
          <p>By using our game, you consent to our privacy policy.</p>

          <h3 className="font-bold text-lg pt-2">6. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us at contact@birdclash.com.</p>
        </div>
        
        <div className="mt-6 text-center">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
