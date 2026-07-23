import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import type { GameEvent } from '../../types';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import { useGameConfig } from '../../hooks/useGameConfig';

const GameSettings: React.FC = () => {
    const gameConfig = useGameConfig();
    const [maintenance, setMaintenance] = useState(false);
    const [isUpdateRequired, setIsUpdateRequired] = useState(false);
    const [patchSizeMB, setPatchSizeMB] = useState(4);
    const [notification, setNotification] = useState('');
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [loading, setLoading] = useState(true);
    const [lobbyMusicUrl, setLobbyMusicUrl] = useState('');
    const [seasonalTitle, setSeasonalTitle] = useState('');
    const [seasonalDesc, setSeasonalDesc] = useState('');
    const [seasonalIcon, setSeasonalIcon] = useState('🎉');
    const [seasonalEndDate, setSeasonalEndDate] = useState('');
    const [seasonalGradFrom, setSeasonalGradFrom] = useState('#1e3a5f');
    const [seasonalGradTo, setSeasonalGradTo] = useState('#0d2137');
    const [seasonalBorder, setSeasonalBorder] = useState('#3b82f6');
    const [seasonalActive, setSeasonalActive] = useState(false);

    useEffect(() => {
        setLobbyMusicUrl(gameConfig.lobbyMusicUrl);
    }, [gameConfig.lobbyMusicUrl]);

    useEffect(() => {
        const seasonalRef = rtdb.ref('gameConfig/seasonalEvent');
        seasonalRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const val = snapshot.val();
                setSeasonalTitle(val.title || '');
                setSeasonalDesc(val.description || '');
                setSeasonalIcon(val.icon || '🎉');
                setSeasonalEndDate(val.endDate ? new Date(val.endDate).toISOString().slice(0, 16) : '');
                setSeasonalGradFrom(val.gradientFrom || '#1e3a5f');
                setSeasonalGradTo(val.gradientTo || '#0d2137');
                setSeasonalBorder(val.borderColor || '#3b82f6');
                setSeasonalActive(val.active || false);
            }
        });
        return () => seasonalRef.off('value');
    }, []);

    useEffect(() => {
        const maintenanceRef = rtdb.ref('status/maintenance');
        const updateRef = rtdb.ref('status/isUpdateRequired');
        const patchSizeRef = rtdb.ref('status/patchSizeMB');
        const eventsRef = rtdb.ref('events');
        
        const maintenanceListener = maintenanceRef.on('value', snapshot => {
            setMaintenance(snapshot.val() === true);
        });

        const updateListener = updateRef.on('value', snapshot => {
            setIsUpdateRequired(snapshot.val() === true);
        });

        const patchSizeListener = patchSizeRef.on('value', snapshot => {
            if (snapshot.exists()) {
                setPatchSizeMB(snapshot.val());
            }
        });

        const eventsListener = eventsRef.on('value', snapshot => {
            const data: GameEvent[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            setEvents(data);
            setLoading(false);
        });

        return () => {
            maintenanceRef.off('value', maintenanceListener);
            updateRef.off('value', updateListener);
            patchSizeRef.off('value', patchSizeListener);
            eventsRef.off('value', eventsListener);
        };
    }, []);

    const handleToggleMaintenance = async () => {
        try {
            await rtdb.ref('status/maintenance').set(!maintenance);
            toast.success(`Maintenance mode ${!maintenance ? 'enabled' : 'disabled'}.`);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleToggleUpdate = async () => {
        try {
            const newUpdateStatus = !isUpdateRequired;
            const updates: { [key: string]: any } = {
                'status/isUpdateRequired': newUpdateStatus
            };
            if (newUpdateStatus) {
                // When enabling, also set the patch size
                updates['status/patchSizeMB'] = patchSizeMB;
            }
            await rtdb.ref().update(updates);
            toast.success(`Game update requirement ${newUpdateStatus ? 'enabled' : 'disabled'}.`);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await rtdb.ref('notifications').push({
                text: notification,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            toast.success('Notification sent!');
            setNotification('');
        } catch (e: any) {
            toast.error(e.message);
        }
    };
    
    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventTitle || !eventDesc) return;
        try {
            await rtdb.ref('events').push({ title: eventTitle, description: eventDesc });
            toast.success('Event added!');
            setEventTitle('');
            setEventDesc('');
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            await rtdb.ref(`events/${id}`).remove();
            toast.success('Event removed.');
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const handleSetLobbyMusic = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await rtdb.ref('gameConfig/lobbyMusicUrl').set(lobbyMusicUrl);
            toast.success('Lobby music updated for all players!');
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleResetTopUpEvent = async () => {
        if (!window.confirm("ARE YOU SURE? This will reset the top-up event progress for ALL players and allow them to claim the reward again.")) {
            return;
        }
        setLoading(true);
        try {
            const usersRef = rtdb.ref('users');
            const usersSnapshot = await usersRef.once('value');
            if (usersSnapshot.exists()) {
                const updates: { [key: string]: any } = {};
                usersSnapshot.forEach(child => {
                    updates[`/${child.key}/eventGemsToppedUp`] = null;
                    updates[`/${child.key}/eventTopUpRewardClaimed`] = null;
                });
                await rtdb.ref('users').update(updates);
                toast.success("Top-up event progress reset for all players.");
            }
        } catch (e: any) {
            toast.error(`Failed to reset event: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveSeasonalEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await rtdb.ref('gameConfig/seasonalEvent').set({
                title: seasonalTitle,
                description: seasonalDesc,
                icon: seasonalIcon,
                endDate: new Date(seasonalEndDate).toISOString(),
                gradientFrom: seasonalGradFrom,
                gradientTo: seasonalGradTo,
                borderColor: seasonalBorder,
                active: seasonalActive,
            });
            toast.success('Seasonal event updated!');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="space-y-8">
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Core Settings</h2>
                <div className="flex items-center justify-between">
                    <p>Maintenance Mode</p>
                    <Button onClick={handleToggleMaintenance} variant={maintenance ? 'danger' : 'success'}>
                        {maintenance ? 'Turn Off' : 'Turn On'}
                    </Button>
                </div>
                <div className="flex flex-col items-start justify-between mt-4 pt-4 border-t border-gray-700 space-y-3">
                    <div className="flex justify-between w-full items-center">
                        <p>Force Game Update</p>
                        <Button onClick={handleToggleUpdate} variant={isUpdateRequired ? 'danger' : 'success'}>
                            {isUpdateRequired ? 'Turn Off' : 'Turn On'}
                        </Button>
                    </div>
                    <div className="w-full">
                        <label htmlFor="patchSize" className="text-sm text-gray-300">Patch Size (MB)</label>
                        <input
                            id="patchSize"
                            type="number"
                            value={patchSizeMB}
                            onChange={e => setPatchSizeMB(Number(e.target.value))}
                            placeholder="e.g., 4"
                            className="pixel-input w-full mt-1"
                        />
                    </div>
                </div>
            </div>

            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Global Lobby Music</h2>
                <form onSubmit={handleSetLobbyMusic} className="flex gap-4">
                    <input type="url" value={lobbyMusicUrl} onChange={e => setLobbyMusicUrl(e.target.value)} placeholder="https://example.com/music.mp3" className="pixel-input flex-grow" />
                    <Button type="submit">Set Music</Button>
                </form>
            </div>

            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Send Global Notification</h2>
                <form onSubmit={handleSendNotification} className="flex gap-4">
                    <input type="text" value={notification} onChange={e => setNotification(e.target.value)} placeholder="Notification text..." className="pixel-input flex-grow" />
                    <Button type="submit">Send</Button>
                </form>
            </div>

            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Seasonal Event Popup</h2>
                <form onSubmit={handleSaveSeasonalEvent} className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={seasonalTitle} onChange={e => setSeasonalTitle(e.target.value)} placeholder="Title (e.g. Winterverse)" className="pixel-input" />
                        <input type="text" value={seasonalIcon} onChange={e => setSeasonalIcon(e.target.value)} placeholder="Icon (emoji)" className="pixel-input" />
                    </div>
                    <textarea value={seasonalDesc} onChange={e => setSeasonalDesc(e.target.value)} placeholder="Description" className="pixel-input" rows={2} />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">End Date/Time</label>
                            <input type="datetime-local" value={seasonalEndDate} onChange={e => setSeasonalEndDate(e.target.value)} className="pixel-input w-full" />
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={seasonalActive} onChange={e => setSeasonalActive(e.target.checked)} className="w-4 h-4" />
                                <span>Active</span>
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Gradient From</label>
                            <input type="color" value={seasonalGradFrom} onChange={e => setSeasonalGradFrom(e.target.value)} className="w-full h-8 cursor-pointer" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Gradient To</label>
                            <input type="color" value={seasonalGradTo} onChange={e => setSeasonalGradTo(e.target.value)} className="w-full h-8 cursor-pointer" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Border Color</label>
                            <input type="color" value={seasonalBorder} onChange={e => setSeasonalBorder(e.target.value)} className="w-full h-8 cursor-pointer" />
                        </div>
                    </div>
                    <Button type="submit">Save Seasonal Event</Button>
                </form>
            </div>
            
            <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Manage Live Events</h2>
                <form onSubmit={handleAddEvent} className="space-y-4 mb-6">
                    <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Event Title" className="pixel-input" />
                    <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Event Description" className="pixel-input" rows={2}></textarea>
                    <Button type="submit">Add Event</Button>
                </form>
                 <div className="mt-4 pt-4 border-t border-gray-700">
                    <h3 className="text-base font-semibold mb-2">Reset Top-Up Event</h3>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-300">Reset progress for all players.</p>
                        <Button onClick={handleResetTopUpEvent} variant="danger">
                            Reset All
                        </Button>
                    </div>
                </div>
                <div className="space-y-2 mt-6">
                    <h3 className="text-base font-semibold">Current Events</h3>
                    {loading ? <p>Loading events...</p> : events.map(event => (
                        <div key={event.id} className="p-3 bg-gray-900 border-2 border-black flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{event.title}</p>
                                <p className="text-sm text-gray-300">{event.description}</p>
                            </div>
                            <Button onClick={() => handleDeleteEvent(event.id)} variant="danger" className="!py-1 !px-2 !text-xs">Delete</Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GameSettings;