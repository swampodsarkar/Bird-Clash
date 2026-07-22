
import React, { useState } from 'react';
import type { Player, TopUpProduct } from '../../types';
import Button from './Button';
import { Spinner } from './Spinner';
import * as purchaseService from '../../services/purchaseService';
import { toast } from 'react-toastify';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
    product: TopUpProduct | null;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, player, product }) => {
    const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
    const [transactionId, setTransactionId] = useState('');
    const [senderNumber, setSenderNumber] = useState('');
    const [loading, setLoading] = useState(false);
    
    if (!isOpen || !product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionId.trim() || !senderNumber.trim()) {
            toast.error("Please fill in all fields.");
            return;
        }
        setLoading(true);
        try {
            await purchaseService.createPurchaseRequest(player, product, paymentMethod, transactionId, senderNumber);
            toast.success("Purchase request submitted! It will be processed shortly.");
            onClose();
            setTransactionId('');
            setSenderNumber('');
        } catch (err: any) {
            toast.error(err.message || "Failed to submit request.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-md p-4 bg-[#2c2c54] border-2 border-black shadow-[6px_6px_0px_#000000]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-center mb-2 text-yellow-400">Confirm Purchase</h3>
                <p className="text-center text-sm font-semibold">{product.name} - {product.price} TK</p>
                
                <div className="my-4 p-3 bg-gray-900 border-2 border-black text-center">
                    <p className="text-sm">Please send money to:</p>
                    <p className="font-bold text-lg text-yellow-300 tracking-widest">01767882562</p>
                    <p className="text-xs text-gray-400">(Bkash / Nagad / Rocket)</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="pixel-input">
                        <option value="bkash">Bkash</option>
                        <option value="nagad">Nagad</option>
                        <option value="rocket">Rocket</option>
                    </select>
                    <input type="text" value={senderNumber} onChange={e => setSenderNumber(e.target.value)} placeholder="Your Phone Number" className="pixel-input" required />
                    <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Transaction ID (TrxID)" className="pixel-input" required />
                    
                    <div className="flex gap-4 pt-2">
                        <Button type="button" onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Spinner /> : 'Submit'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TopUpModal;
