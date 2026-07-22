import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import type { Tournament, TournamentPlayer } from '../../types';
import * as esportsService from '../../services/esportsService';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';

type FormState = Omit<Tournament, 'id' | 'players' | 'playerCount' | 'createdAt' | 'status' | 'startTime'> & {
    startDate: string;
};

const initialFormState: FormState = {
    name: '',
    description: '',
    entryFee: { coins: 100 },
    prizePool: { coins: 1000 },
    maxPlayers: 16,
    startDate: '',
};

const EsportsManagement: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState(initialFormState);
    const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = esportsService.listenToTournaments(data => {
            setTournaments(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const val = name === 'maxPlayers' ? parseInt(value, 10) || 0 : value;
        setFormState(prev => ({ ...prev, [name]: val }));
    };

    const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const feeValue = parseInt(value, 10) || 0;
        const isCoins = name === 'feeCoins';
        setFormState(prev => ({ ...prev, entryFee: isCoins ? { coins: feeValue } : { gems: feeValue } }));
    };
    
    const handlePrizeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => {
            const newPrizePool = { ...prev.prizePool };
            if (name === 'nftCard') {
                 if (value === 'None') {
                    delete newPrizePool.nftCard;
                } else {
                    newPrizePool.nftCard = value as 'Bronze' | 'Silver' | 'Gold';
                }
            } else {
                newPrizePool[name as 'coins' | 'gems'] = parseInt(value, 10) || 0;
            }
            return { ...prev, prizePool: newPrizePool };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.startDate) {
            toast.error("Please select a start date and time.");
            return;
        }
        try {
            const { startDate, ...restOfForm } = formState;
            const startTime = new Date(startDate).getTime();

            if (startTime < Date.now()) {
                toast.error("Start date and time cannot be in the past.");
                return;
            }

            const finalPrizePool = { ...restOfForm.prizePool };
            if (!finalPrizePool.coins) delete finalPrizePool.coins;
            if (!finalPrizePool.gems) delete finalPrizePool.gems;
            
            const dataToSubmit = {
                ...restOfForm,
                prizePool: finalPrizePool,
                startTime,
                status: 'upcoming' as const
            };
            await esportsService.createTournament(dataToSubmit);
            toast.success("Tournament created!");
            setFormState(initialFormState);
        } catch (err: any) {
            toast.error(err.message);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this tournament? This cannot be undone.")) return;
        try {
            await esportsService.deleteTournament(id);
            toast.success("Tournament deleted.");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSetWinner = async (tournament: Tournament, winner: TournamentPlayer) => {
        if (!window.confirm(`Set ${winner.displayName} as the winner of ${tournament.name}? This will award the prize and finish the tournament.`)) return;
        setActionLoading(true);
        try {
            await esportsService.awardTournamentPrize(tournament, winner);
            toast.success(`${winner.displayName} has been awarded the prize!`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(false);
        }
    };
    
    const toggleExpand = (id: string) => {
        setExpandedTournamentId(prevId => prevId === id ? null : id);
    }

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-gray-800 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Create Tournament</h2>
                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                    <input name="name" value={formState.name} onChange={handleInputChange} placeholder="Tournament Name" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <textarea name="description" value={formState.description} onChange={handleInputChange} placeholder="Description" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="grid grid-cols-2 gap-2">
                        <input name="maxPlayers" type="number" value={formState.maxPlayers} onChange={handleInputChange} placeholder="Max Players" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                        <input name="startDate" type="datetime-local" value={formState.startDate} onChange={handleInputChange} className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    </div>

                    <fieldset className="p-2 border border-gray-600">
                        <legend className="text-xs px-1">Entry Fee</legend>
                        <input name="feeCoins" type="number" value={formState.entryFee.coins ?? ''} onChange={handleFeeChange} placeholder="Coin Fee" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <p className="text-center text-xs my-1">OR</p>
                        <input name="feeGems" type="number" value={formState.entryFee.gems ?? ''} onChange={handleFeeChange} placeholder="Gem Fee" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </fieldset>

                     <fieldset className="p-2 border border-gray-600">
                        <legend className="text-xs px-1">Prize Pool</legend>
                        <input name="coins" type="number" value={formState.prizePool.coins ?? ''} onChange={handlePrizeChange} placeholder="Coin Prize" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <input name="gems" type="number" value={formState.prizePool.gems ?? ''} onChange={handlePrizeChange} placeholder="Gem Prize" className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2"/>
                        <select name="nftCard" value={formState.prizePool.nftCard || 'None'} onChange={handlePrizeChange} className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2">
                            <option value="None">No NFT Prize</option>
                            <option value="Bronze">Bronze Card</option>
                            <option value="Silver">Silver Card</option>
                            <option value="Gold">Gold Card</option>
                        </select>
                    </fieldset>
                    
                    <button type="submit" className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Create Tournament</button>
                </form>
            </div>

            <div className="p-6 bg-gray-800 rounded-lg">
                 <h2 className="text-lg font-semibold mb-4">Current Tournaments</h2>
                 {loading ? <Spinner /> : (
                    <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-2">
                        {tournaments.map(t => {
                            const isExpanded = expandedTournamentId === t.id;
                            const players = t.players ? (Object.values(t.players) as TournamentPlayer[]) : [];
                            return (
                                <div key={t.id} className="p-3 bg-gray-700 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{t.name} <span className="text-xs text-gray-400">({t.playerCount || 0}/{t.maxPlayers})</span></p>
                                            <p className="text-xs text-blue-400">{t.status}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleExpand(t.id)} className="px-2 py-1 text-xs bg-gray-600 rounded hover:bg-gray-500">
                                                {isExpanded ? 'Hide' : 'View'}
                                            </button>
                                            <button onClick={() => handleDelete(t.id)} className="px-2 py-1 text-xs bg-red-600 rounded hover:bg-red-500">Delete</button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-gray-700">
                                            {t.winnerDisplayName && <p className="font-bold text-center text-yellow-300 mb-2">🏆 Winner: {t.winnerDisplayName}</p>}
                                            <h4 className="font-bold text-sm mb-2">Registered Players</h4>
                                            {players.length > 0 ? (
                                                <ul className="space-y-1 text-xs">
                                                    {players.map((p) => (
                                                        <li key={p.uid} className="flex justify-between items-center p-1 bg-gray-800">
                                                            <span>{p.displayName}</span>
                                                            {/* Fix: Add a derived 'active' state check to allow setting a winner for ongoing tournaments. */}
                                                            {( (Date.now() > t.startTime && t.status === 'upcoming') || t.status === 'finished') && !t.winnerUid && (
                                                                <button onClick={() => handleSetWinner(t, p)} disabled={actionLoading} className="px-2 py-1 text-xs bg-green-600 rounded hover:bg-green-500">Set as Winner</button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : <p className="text-xs text-gray-400">No players registered yet.</p>}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                 )}
            </div>
        </div>
    );
};

export default EsportsManagement;