import React, { useState } from 'react';
import type { Player, TopUpProduct } from '../../types';
import { TOP_UP_PRODUCTS } from '../../constants';
import Button from './Button';
import TopUpModal from './TopUpModal';

interface TopUpSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
}

const TopUpSelectionModal: React.FC<TopUpSelectionModalProps> = ({ isOpen, onClose, player }) => {
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<TopUpProduct | null>(null);

    const handleOpenPurchaseModal = (product: TopUpProduct) => {
        setSelectedProduct(product);
        setIsPurchaseModalOpen(true);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="w-full max-w-2xl p-4 bg-[#1a1a2e] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-center mb-4 text-yellow-400">Top Up</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto pr-2">
                        {TOP_UP_PRODUCTS.map(product => (
                            <div key={product.id} className={`p-4 bg-purple-800/50 border-2 border-black shadow-[4px_4px_0px_#000000] flex flex-col justify-between space-y-3`}>
                                <div className={`-m-4 mb-2 p-2 text-center border-b-2 border-black border-purple-400`}>
                                    <h3 className="font-bold text-base">{product.name}</h3>
                                </div>
                                <div className="flex-grow flex items-center justify-center text-center space-x-4">
                                    <span className="text-5xl">{product.icon}</span>
                                    <p className="text-sm text-gray-200">{product.description}</p>
                                </div>
                                <Button
                                    onClick={() => handleOpenPurchaseModal(product)}
                                    className="w-full !py-2 !text-xs mt-2"
                                    variant="success"
                                >
                                    Buy for {product.price} TK
                                </Button>
                            </div>
                        ))}
                    </div>
                     <div className="mt-4 text-center">
                        <Button onClick={onClose} variant="secondary">Close</Button>
                    </div>
                </div>
            </div>
            <TopUpModal
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                player={player}
                product={selectedProduct}
            />
        </>
    );
};

export default TopUpSelectionModal;
