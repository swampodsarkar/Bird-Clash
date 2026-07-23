import React, { useState } from 'react';
import Button from './Button';
import { Spinner } from './Spinner';

interface Props {
  onPurchase: () => Promise<void>;
  onClose: () => void;
  price: number;
}

const StarterPackModal: React.FC<Props> = ({ onPurchase, onClose, price = 50 }) => {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      await onPurchase();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.3)] p-6 text-center space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-6xl">🎁</div>
        <h2 className="font-pixel text-2xl text-orange-400">🔥 Starter Pack</h2>
        <p className="text-gray-300 text-sm">Limited time offer for new players!</p>
        <div className="grid grid-cols-2 gap-3 p-3 bg-black/50 rounded-lg border border-orange-500/30">
          <div className="text-center">
            <div className="text-3xl mb-1">🦅</div>
            <p className="text-yellow-400 font-bold">Epic Bird</p>
            <p className="text-xs text-gray-400">Eagle Eye</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">💎</div>
            <p className="text-purple-400 font-bold">100 Gems</p>
            <p className="text-xs text-gray-400">Premium currency</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">💰</div>
            <p className="text-yellow-400 font-bold">5000 Coins</p>
            <p className="text-xs text-gray-400">In-game cash</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">🐛</div>
            <p className="text-green-400 font-bold">50 Insects</p>
            <p className="text-xs text-gray-400">Bird food</p>
          </div>
        </div>
        <div className="text-2xl font-bold text-orange-400">
          ৳{price}
        </div>
        <Button onClick={handleBuy} disabled={loading} className="w-full !bg-orange-500 !border-orange-400 hover:!bg-orange-600">
          {loading ? <Spinner /> : '🎯 Buy Now!'}
        </Button>
        <button onClick={onClose} className="text-gray-400 text-xs underline">Maybe later</button>
      </div>
    </div>
  );
};

export default StarterPackModal;
