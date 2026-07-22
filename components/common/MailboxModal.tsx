

import React, { useState, useEffect, useMemo } from 'react';
import type { Player, Notification, MailItem } from '../../types';
import * as playerService from '../../services/playerService';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from './Spinner';
import Button from './Button';
import { toast } from 'react-toastify';

interface MailboxModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player;
    globalNotifications: Notification[];
}

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

type MergedItem = (Notification & { mailType: 'global' }) | (MailItem & { mailType: 'personal' });

const MailboxModal: React.FC<MailboxModalProps> = ({ isOpen, onClose, player, globalNotifications }) => {
    const [activeTab, setActiveTab] = useState<'inbox' | 'report'>('inbox');
    const [mailItems, setMailItems] = useState<MailItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [duoActionId, setDuoActionId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = playerService.listenToMail(player.uid, (mail) => {
            setMailItems(mail);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, player.uid]);

    const mergedList = useMemo((): MergedItem[] => {
        const personalMail: MergedItem[] = mailItems
            .filter(m => m.status !== 'claimed') // Filter out claimed items
            .map(m => ({ ...m, mailType: 'personal' }));
        const globalMail: MergedItem[] = globalNotifications.map(n => ({ ...n, text: n.text, mailType: 'global' }));
        
        return [...personalMail, ...globalMail].sort((a, b) => b.timestamp - a.timestamp);
    }, [mailItems, globalNotifications]);

    const handleClaim = async (mailId: string) => {
        setClaimingId(mailId);
        try {
            await playerService.claimMailItem(player.uid, mailId);
            toast.success("Reward claimed!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setClaimingId(null);
        }
    };
    
    const handleAcceptDuo = async (mailItem: MailItem) => {
        setDuoActionId(mailItem.id);
        try {
            await playerService.acceptDuoRequest(player, mailItem);
            toast.success("You are now a Dynamic Duo!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setDuoActionId(null);
        }
    };

    const handleDeclineDuo = async (mailItem: MailItem) => {
        setDuoActionId(mailItem.id);
        try {
            await playerService.declineDuoRequest(player.uid, mailItem);
            toast.info("Duo request declined.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setDuoActionId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-lg h-[90vh] bg-[#1a1a2e] border-2 border-black shadow-[8px_8px_0px_#000000] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-2 border-b-2 border-black flex justify-between items-center">
                    <div className="flex">
                        <TabButton label="Inbox" isActive={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} />
                        <TabButton label="Report" isActive={activeTab === 'report'} onClick={() => setActiveTab('report')} />
                    </div>
                     <button onClick={onClose} className="text-3xl hover:text-yellow-400">&times;</button>
                </header>
                
                <main className="flex-grow overflow-y-auto">
                    {activeTab === 'inbox' ? (
                        <InboxView
                            player={player}
                            loading={loading}
                            items={mergedList}
                            claimingId={claimingId}
                            onClaim={handleClaim}
                            duoActionId={duoActionId}
                            onAcceptDuo={handleAcceptDuo}
                            onDeclineDuo={handleDeclineDuo}
                        />
                    ) : (
                        <ReportView player={player} onClose={onClose} />
                    )}
                </main>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ label: string, isActive: boolean, onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 font-bold text-sm ${isActive ? 'bg-yellow-400 text-black' : 'text-gray-300 hover:bg-gray-800'}`}>
        {label}
    </button>
);

interface InboxViewProps {
    player: Player;
    loading: boolean; 
    items: MergedItem[]; 
    claimingId: string | null; 
    onClaim: (id: string) => void;
    duoActionId: string | null;
    onAcceptDuo: (item: MailItem) => void;
    onDeclineDuo: (item: MailItem) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ player, loading, items, claimingId, onClaim, duoActionId, onAcceptDuo, onDeclineDuo }) => {
    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
    if (items.length === 0) return <p className="text-center text-gray-400 p-8">Your mailbox is empty.</p>;

    return (
        <div className="space-y-2 p-4">
            {items.map(item => {
                if (item.mailType === 'personal' && item.type === 'duo_request') {
                     const isActing = duoActionId === item.id;
                     return (
                        <div key={item.id} className="p-3 bg-pink-900/50 border-2 border-pink-500 space-y-2">
                             <div className="flex justify-between items-start">
                                <p className="text-sm text-pink-200">{item.message}</p>
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-4">{formatTimeAgo(item.timestamp)}</span>
                             </div>
                             <div className="flex justify-end items-center gap-2">
                                <Button onClick={() => onDeclineDuo(item)} disabled={isActing} variant="danger" className="!py-1 !px-3 !text-xs">Decline</Button>
                                <Button onClick={() => onAcceptDuo(item)} disabled={isActing} variant="success" className="!py-1 !px-3 !text-xs">{isActing ? <Spinner/> : "Accept"}</Button>
                             </div>
                        </div>
                     )
                }

                const message = 'text' in item ? item.text : item.message;
                const gift = 'gift' in item ? item.gift : undefined;
                const status = 'status' in item ? item.status : 'read';

                return (
                    <div key={item.id} className="p-3 bg-gray-900/50 border-2 border-black space-y-2">
                        <div className="flex justify-between items-start">
                            <p className="text-sm text-gray-200">{message}</p>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-4">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                        {gift && (
                             <div className="p-2 bg-black/30 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-yellow-300 flex items-center gap-2">
                                        <span className="text-2xl">{gift.icon || '🎁'}</span>
                                        <span>{gift.name || 'Admin Gift'}</span>
                                    </p>
                                </div>
                                <Button
                                    onClick={() => onClaim(item.id)}
                                    disabled={status === 'claimed' || !!claimingId}
                                    variant={status === 'claimed' ? 'secondary' : 'success'}
                                    className="!py-1 !px-3 !text-xs"
                                >
                                    {claimingId === item.id ? <Spinner /> : status === 'claimed' ? 'Claimed' : 'Claim'}
                                </Button>
                             </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};


const ReportView: React.FC<{ player: Player; onClose: () => void }> = ({ player, onClose }) => {
    const [category, setCategory] = useState('bug');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!details.trim()) {
            toast.error("Please provide details for your report.");
            return;
        }
        setLoading(true);
        try {
            await playerService.submitReport(player, category, details);
            toast.success("Your report has been submitted. Thank you!");
            onClose();
        } catch (e: any) {
            toast.error("Failed to submit report. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-center">Submit a Report</h3>
            <div>
                <label htmlFor="category" className="text-sm font-bold">Category</label>
                <select id="category" value={category} onChange={e => setCategory(e.target.value)} className="pixel-input">
                    <option value="bug">Bug Report</option>
                    <option value="player">Player Report</option>
                    <option value="feedback">Feedback / Suggestion</option>
                    <option value="other">Other</option>
                </select>
            </div>
             <div>
                <label htmlFor="details" className="text-sm font-bold">Details</label>
                <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} rows={5} placeholder="Please provide as much detail as possible..." className="pixel-input"></textarea>
            </div>
            <div className="text-center pt-2">
                <Button type="submit" disabled={loading} className="w-full max-w-xs">
                    {loading ? <Spinner /> : 'Submit Report'}
                </Button>
            </div>
        </form>
    );
};


export default MailboxModal;
