

import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import type { PurchaseRequest } from '../../types';
import * as purchaseService from '../../services/purchaseService';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';

const PurchaseManagement: React.FC = () => {
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        const requestsRef = rtdb.ref('purchase_requests').orderByChild('status').equalTo('pending');
        const listener = requestsRef.on('value', snapshot => {
            const data: PurchaseRequest[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            setRequests(data.reverse()); // Show newest first
            setLoading(false);
        });
        return () => requestsRef.off('value', listener);
    }, []);

    const handleAction = async (action: 'approve' | 'reject', requestId: string) => {
        setActionLoading(prev => ({ ...prev, [requestId]: true }));
        try {
            if (action === 'approve') {
                await purchaseService.approvePurchase(requestId);
                toast.success('Purchase approved!');
            } else {
                if(window.confirm('Are you sure you want to reject this purchase?')) {
                    await purchaseService.rejectPurchase(requestId);
                    toast.warn('Purchase rejected.');
                }
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: false }));
        }
    }

    return (
        <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Pending Purchase Requests</h2>
            {loading ? <Spinner /> :
             requests.length === 0 ? <p className="text-gray-400">No pending requests.</p> :
            (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {requests.map(req => (
                        <div key={req.id} className="p-4 bg-gray-900 border-2 border-black">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="font-semibold">{req.displayName}</p>
                                    <p className="text-xs text-gray-400 break-all">UID: {req.uid}</p>
                                    <p className="font-bold text-yellow-300">{req.productName} - {req.price} TK</p>
                                </div>
                                <div className="text-left md:text-right text-sm">
                                    <p>Method: <span className="font-mono uppercase">{req.paymentMethod}</span></p>
                                    <p>Sender: <span className="font-mono">{req.senderNumber}</span></p>
                                    <p className="break-all">TrxID: <span className="font-mono">{req.transactionId}</span></p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-700 flex justify-end gap-3">
                                <Button 
                                    onClick={() => handleAction('reject', req.id)} 
                                    disabled={actionLoading[req.id]}
                                    variant="danger"
                                    className="!py-1 !px-3 !text-xs"
                                >
                                    Reject
                                </Button>
                                <Button 
                                    onClick={() => handleAction('approve', req.id)} 
                                    disabled={actionLoading[req.id]}
                                    variant="success"
                                    className="!py-1 !px-3 !text-xs"
                                >
                                    {actionLoading[req.id] ? <Spinner /> : 'Approve'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PurchaseManagement;