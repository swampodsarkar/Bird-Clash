
import React, { useState, useEffect, useMemo } from 'react';
// Fix: Imported 'ClanWarParticipant' to resolve type errors when casting war participants.
import type { Player, Clan, ClanWar, Bird, ClanMember, Battle, ClanWarParticipant } from '../types';
import Button from './common/Button';
import { Spinner } from './common/Spinner';
import * as clanWarService from '../services/clanWarService';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { rtdb } from '../services/firebase';
import { updateUserMatchStatus } from '../services/friendService';
import { Star } from 'lucide-react';

interface ClanWarScreenProps {
    clan: Clan;
    player: Player;
}

const CountdownTimer: React.FC<{ endTime: number; onEnd?: () => void }> = ({ endTime, onEnd }) => {
    const [timeLeft, setTimeLeft] = useState(endTime - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                clearInterval(timer);
                if (onEnd) onEnd();
            }
            setTimeLeft(remaining);
        }, 1000);
        return () => clearInterval(timer);
    }, [endTime, onEnd]);

    if (timeLeft <= 0) return <span>Time's up!</span>;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return <span>{`${days}d ${hours}h ${minutes}m ${seconds}s`}</span>;
};


const ClanWarScreen: React.FC<ClanWarScreenProps> = ({ clan, player }) => {
    const [war, setWar] = useState<ClanWar | null>(null);
    const [loading, setLoading] = useState(true);

    // Auto-update war state from prep -> battle -> finished
    useEffect(() => {
        if (!war) return;
        const now = Date.now();
        // Fix: Changed NodeJS.Timeout to number for browser compatibility.
        let timeoutId: number;

        if (war.status === 'preparation' && now < war.preparationEndTime) {
            timeoutId = window.setTimeout(() => clanWarService.updateWarState(war.id, 'battle_day'), war.preparationEndTime - now);
        } else if (war.status === 'battle_day' && now < war.battleDayEndTime) {
            timeoutId = window.setTimeout(() => clanWarService.updateWarState(war.id, 'finished'), war.battleDayEndTime - now);
        }

        return () => clearTimeout(timeoutId);
    }, [war]);


    useEffect(() => {
        if (!clan.currentWarId) {
            setLoading(false);
            setWar(null);
            return;
        }

        if (clan.currentWarId === 'searching') {
            setLoading(false);
            setWar(null);
            return;
        }
        
        setLoading(true);
        const unsubscribe = clanWarService.listenToClanWar(clan.currentWarId, (warData) => {
            setWar(warData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [clan.currentWarId]);

    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
    
    if (war) {
        switch(war.status) {
            case 'preparation': return <WarPreparationView war={war} clan={clan} player={player} />;
            case 'battle_day': return <WarBattleDayView war={war} clan={clan} player={player} />;
            case 'finished': return <WarFinishedView war={war} clan={clan} />;
            default: return <p>Unknown war state: {war.status}</p>;
        }
    }
    
    // If no active war, show registration screen
    return <WarRegistrationView clan={clan} player={player} />;
};

// --- REGISTRATION ---

const WarRegistrationView: React.FC<{ clan: Clan, player: Player }> = ({ clan, player }) => {
    const isLeader = player.uid === clan.leaderId;

    if (clan.currentWarId === 'searching') {
        return (
            <div className="p-8 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] text-center space-y-4">
                <h3 className="text-xl font-bold text-yellow-400">Searching for Opponent...</h3>
                <Spinner />
            </div>
        )
    }

    if (isLeader) {
        return <LeaderRegistrationView clan={clan} player={player} />;
    }
    return <MemberRegistrationView clan={clan} player={player} />;
};

const LeaderRegistrationView: React.FC<{ clan: Clan, player: Player }> = ({ clan, player }) => {
    const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set(Object.keys(clan.warRoster || {})));
    const [loading, setLoading] = useState(false);

    const members = useMemo(() => Object.values(clan.members || {}), [clan.members]);
    const roster = useMemo(() => Object.entries(clan.warRoster || {}), [clan.warRoster]);
    const confirmedCount = useMemo(() => roster.filter(([, data]) => data.status === 'confirmed').length, [roster]);

    const handleToggleMember = (uid: string) => {
        setSelectedUids(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) {
                newSet.delete(uid);
            } else {
                newSet.add(uid);
            }
            return newSet;
        });
    };

    const handleSetRoster = async () => {
        setLoading(true);
        try {
            await clanWarService.setWarRoster(clan, player.uid, Array.from(selectedUids));
            toast.success("War roster updated. Selected members must now confirm.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleFindWar = async () => {
        if (confirmedCount < 3) {
            toast.error("At least 3 members must confirm their participation.");
            return;
        }
        setLoading(true);
        try {
            await clanWarService.findWar(clan);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-4">
            <h3 className="text-lg font-bold text-center">Select War Roster</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-900 border-2 border-black">
                {members.map(member => (
                    <label key={member.uid} className="flex items-center gap-3 p-2 hover:bg-gray-800">
                        <input type="checkbox" checked={selectedUids.has(member.uid)} onChange={() => handleToggleMember(member.uid)} className="w-5 h-5"/>
                        <img src={member.photoURL || ''} alt="avatar" className="w-8 h-8 border-2 border-black" />
                        <span>{member.displayName}</span>
                    </label>
                ))}
            </div>
            <Button onClick={handleSetRoster} disabled={loading} className="w-full">Update Roster</Button>

            <div className="pt-4 border-t-2 border-black">
                <h4 className="font-semibold text-center mb-2">Current Roster ({roster.length}) - Confirmed: {confirmedCount}</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {roster.map(([uid, data]) => (
                        <div key={uid} className={`text-xs p-1 ${data.status === 'confirmed' ? 'text-green-300' : 'text-yellow-300'}`}>
                            {data.displayName} - {data.status}
                        </div>
                    ))}
                </div>
                <Button onClick={handleFindWar} disabled={loading || confirmedCount < 3} className="w-full mt-2">Find War ({confirmedCount} / {roster.length})</Button>
                {confirmedCount < 3 && <p className="text-xs text-center mt-1 text-gray-400">Minimum 3 confirmed members needed.</p>}
            </div>
        </div>
    );
};

const MemberRegistrationView: React.FC<{ clan: Clan, player: Player }> = ({ clan, player }) => {
    const myRosterInfo = clan.warRoster?.[player.uid];
    const ownedBirds = useMemo(() => player.ownedBirds ? Object.values(player.ownedBirds) : [], [player.ownedBirds]);
    const [selectedBirdId, setSelectedBirdId] = useState<string | null>(ownedBirds[0]?.id || null);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selectedBirdId) {
            toast.error("Please select a bird.");
            return;
        }
        const selectedBird = ownedBirds.find(b => b.id === selectedBirdId);
        if (!selectedBird) {
            toast.error("Selected bird not found.");
            return;
        }
        setLoading(true);
        try {
            await clanWarService.confirmWarParticipation(clan.id, player.uid, selectedBird);
            toast.success("Participation confirmed!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!myRosterInfo) {
        return <div className="p-4 text-center text-gray-300">The clan leader is selecting members for the war.</div>;
    }

    if (myRosterInfo.status === 'confirmed') {
        return <div className="p-4 text-center text-green-300 font-bold">You are confirmed for the war! Waiting for the leader to start the search.</div>
    }
    
    return (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-4">
            <h3 className="text-lg font-bold text-center text-yellow-400">You've Been Selected for War!</h3>
            <p className="text-center text-sm">Please confirm your participation and select your bird.</p>
            <select value={selectedBirdId || ''} onChange={e => setSelectedBirdId(e.target.value)} className="pixel-input">
                {ownedBirds.length > 0 ? ownedBirds.map(bird => (
                    <option key={bird.id} value={bird.id}>{bird.name} (Lvl {bird.level})</option>
                )) : <option>No birds owned</option>}
            </select>
            <Button onClick={handleConfirm} disabled={loading || ownedBirds.length === 0} className="w-full">
                {loading ? <Spinner /> : "Confirm Participation"}
            </Button>
        </div>
    );
};


// --- ACTIVE WAR VIEWS ---

const WarPreparationView: React.FC<{ war: ClanWar, clan: Clan, player: Player }> = ({ war, clan }) => {
    return (
        <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-4 text-center">
             <h3 className="text-lg font-bold">Preparation Day</h3>
             <div className="text-2xl font-bold text-yellow-400">
                <CountdownTimer endTime={war.preparationEndTime} />
             </div>
             <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-900 p-2 border-2 border-black">
                    <h4 className="font-bold">{war.clan1.clanName}</h4>
                    {Object.values(war.clan1.participants).map((p: ClanWarParticipant) => <p key={p.uid}>{p.displayName}</p>)}
                </div>
                <div className="bg-gray-900 p-2 border-2 border-black">
                    <h4 className="font-bold">{war.clan2?.clanName}</h4>
                    {war.clan2 && Object.values(war.clan2.participants).map((p: ClanWarParticipant) => <p key={p.uid}>{p.displayName}</p>)}
                </div>
             </div>
        </div>
    )
};

const WarBattleDayView: React.FC<{ war: ClanWar, clan: Clan, player: Player }> = ({ war, clan, player }) => {
    const { user } = useAuth();
    const myClanKey = war.clan1.clanId === clan.id ? 'clan1' : 'clan2';
    const opponentClanKey = myClanKey === 'clan1' ? 'clan2' : 'clan1';
    const me = war[myClanKey]?.participants[player.uid];

    const handleAttack = async (battleIndex: number) => {
        try {
            const match = await clanWarService.initiateWarAttack(war.id, battleIndex, clan, player);
            if(user) await updateUserMatchStatus(user.uid, match.id);
            // App state will change to IN_GAME via listener
        } catch (e: any) {
            toast.error(e.message);
        }
    };
    
    if (!war.clan2) return <p>Waiting for opponent data.</p>;

    return (
         <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-4">
            <h3 className="text-lg font-bold text-center">Battle Day</h3>
             <div className="text-2xl font-bold text-red-500 text-center">
                <CountdownTimer endTime={war.battleDayEndTime} />
             </div>
            <div className="flex justify-around items-center font-bold text-xl p-2 bg-black">
                <span>{war.clan1.clanName}</span>
                <span className="text-yellow-400">{war.clan1.score} - {war.clan2.score}</span>
                <span>{war.clan2.clanName}</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
                {war.battles?.map((battle, index) => {
                    // Fix: Add type assertion and null check to fix 'unknown' type errors.
                    const p1 = war.clan1.participants[battle.clan1ParticipantUid] as ClanWarParticipant | undefined;
                    const p2 = war.clan2!.participants[battle.clan2ParticipantUid] as ClanWarParticipant | undefined;

                    if (!p1 || !p2) {
                        return (
                            <div key={index} className="text-center text-red-400 text-xs p-2">
                                Participant data missing for this battle.
                            </div>
                        );
                    }
                    const canAttack = me && (p1.uid === me.uid || p2.uid === me.uid) && !me.hasAttacked;
                    return (
                        <div key={index} className="grid grid-cols-11 gap-2 items-center text-center p-2 bg-gray-900 border-2 border-black">
                            <div className="col-span-4 text-xs">
                                <p className="font-bold">{p1.displayName}</p>
                                {battle.status === 'finished' && battle.clan1ParticipantUid === battle.winnerUid && <div className="flex justify-center text-yellow-400"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></div>}
                            </div>
                            <div className="col-span-3 text-sm font-bold">
                                {battle.status === 'pending' && canAttack && (
                                    <Button onClick={() => handleAttack(index)} className="!py-1 !text-xs w-full">Attack</Button>
                                )}
                                {battle.status !== 'pending' && 'vs'}
                            </div>
                            <div className="col-span-4 text-xs">
                                <p className="font-bold">{p2.displayName}</p>
                                {battle.status === 'finished' && battle.clan2ParticipantUid === battle.winnerUid && <div className="flex justify-center text-yellow-400"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></div>}
                            </div>
                        </div>
                    )
                })}
            </div>
         </div>
    );
};

const WarFinishedView: React.FC<{ war: ClanWar, clan: Clan }> = ({ war, clan }) => {
    let resultText = "The war ended in a draw!";
    let resultColor = "text-yellow-400";
    if (war.clan1.score > (war.clan2?.score || 0)) {
        resultText = `${war.clan1.clanName} is victorious!`;
        if (war.clan1.clanId === clan.id) resultColor = "text-green-400";
    } else if ((war.clan2?.score || 0) > war.clan1.score) {
        resultText = `${war.clan2?.clanName} is victorious!`;
        if (war.clan2?.clanId === clan.id) resultColor = "text-green-400";
    }

    return (
         <div className="p-4 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] space-y-4 text-center">
            <h3 className="text-lg font-bold">War Finished!</h3>
            <p className={`text-2xl font-bold ${resultColor}`}>{resultText}</p>
            <div className="flex justify-around items-center font-bold text-xl p-2 bg-black">
                <span>{war.clan1.clanName}</span>
                <span className="text-yellow-400">{war.clan1.score} - {war.clan2?.score || 0}</span>
                <span>{war.clan2?.clanName}</span>
            </div>
            <p className="text-xs text-gray-400">A new war can be started soon.</p>
         </div>
    )
};

export default ClanWarScreen;
