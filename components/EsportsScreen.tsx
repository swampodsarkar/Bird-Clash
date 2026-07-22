import React, { useState, useEffect } from 'react';
import type { Player, Tournament } from '../types';
import { useAuth } from '../hooks/useAuth';
import * as esportsService from '../services/esportsService';
import { Spinner } from './common/Spinner';
import Button from './common/Button';
import { toast } from 'react-toastify';
import { Coins, Gem, Image as ImageIcon, Swords } from 'lucide-react';
import { BracketView } from './esports/BracketView';
import { createBracket } from '../services/tournamentBracketService';

interface EsportsScreenProps {
    player: Player;
}

const nftCardStyles: { [key in 'Bronze' | 'Silver' | 'Gold']: string } = {
    Bronze: 'text-orange-400',
    Silver: 'text-gray-300',
    Gold: 'text-yellow-400',
};

const EsportsScreen: React.FC<EsportsScreenProps> = ({ player }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [registeringId, setRegisteringId] = useState<string | null>(null);
    const [viewBracketId, setViewBracketId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = esportsService.listenToTournaments((data) => {
            setTournaments(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRegister = async (tournament: Tournament) => {
        setRegisteringId(tournament.id);
        try {
            await esportsService.registerForTournament(player, tournament);
            toast.success(`Successfully registered for ${tournament.name}!`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setRegisteringId(null);
        }
    };

    const handleViewBracket = async (tournament: Tournament) => {
        if (tournament.status === 'upcoming') {
            await createBracket(tournament);
        }
        setViewBracketId(tournament.id);
    };

    const viewingTournament = viewBracketId ? tournaments.find(t => t.id === viewBracketId) : null;

    if (viewingTournament) {
        return <BracketView tournament={viewingTournament} onBack={() => setViewBracketId(null)} />;
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl text-center font-bold text-yellow-400">🏆 Esports Tournaments</h2>
            {tournaments.length === 0 ? (
                <p className="text-center text-gray-400 p-8">No active tournaments right now. Check back later!</p>
            ) : (
                <div className="space-y-4">
                    {tournaments.map(t => {
                        const isRegistered = t.players && t.players[player.uid];
                        const isFull = (t.playerCount || 0) >= t.maxPlayers;
                        const canRegister = t.status === 'upcoming' && !isRegistered && !isFull;
                        const fee = t.entryFee.coins ? <><Coins size={12} /> {t.entryFee.coins}</> : <><Gem size={12} /> {t.entryFee.gems}</>;
                        const startDate = new Date(t.startTime).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric'
                        });
                        const isActive = t.status === 'upcoming' && Date.now() > t.startTime;

                        return (
                            <div key={t.id} className={`p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-3`}>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-yellow-300">{t.name}</h3>
                                    <span className={`px-2 py-1 text-xs font-bold border-2 border-black ${
                                        t.status === 'upcoming' && !isActive ? 'bg-blue-500' :
                                        isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
                                    }`}>{isActive ? 'ACTIVE' : t.status.toUpperCase()}</span>
                                </div>
                                <p className="text-sm text-gray-300">{t.description}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-600">
                                    <div>
                                        <p className="font-bold">Prize Pool</p>
                                        {t.prizePool.coins && <p className="flex items-center gap-1"><Coins size={12} /> {t.prizePool.coins} Coins</p>}
                                        {t.prizePool.gems && <p className="flex items-center gap-1"><Gem size={12} /> {t.prizePool.gems} Gems</p>}
                                        {t.prizePool.nftCard && <p className="flex items-center gap-1"><ImageIcon size={12} /> <span className={`font-bold ${nftCardStyles[t.prizePool.nftCard]}`}>{t.prizePool.nftCard}</span> Card</p>}
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-1">Fee: <span className="font-bold flex items-center gap-1">{fee}</span></div>
                                        <p>Slots: <span className="font-bold">{t.playerCount || 0} / {t.maxPlayers}</span></p>
                                        <p>Starts: <span className="font-bold">{startDate}</span></p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {t.status === 'upcoming' && (
                                        <Button
                                            onClick={() => handleRegister(t)}
                                            disabled={!canRegister || registeringId === t.id}
                                            className="flex-1"
                                        >
                                            {registeringId === t.id ? <Spinner /> : isRegistered ? 'Registered' : isFull ? 'Full' : 'Register'}
                                        </Button>
                                    )}
                                    {(isRegistered || t.status === 'active' || t.status === 'finished') && (
                                        <Button
                                            onClick={() => handleViewBracket(t)}
                                            variant="secondary"
                                            className="flex-1"
                                        >
                                            <Swords size={14} className="inline mr-1" />
                                            Bracket
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default EsportsScreen;
