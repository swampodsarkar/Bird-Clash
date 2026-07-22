import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { rtdb } from '../services/firebase';
import { toast } from 'react-toastify';
import type { GameEvent, Notification } from '../types';

interface RealtimeContextType {
    maintenanceMode: boolean;
    isUpdateRequired: boolean;
    patchSizeMB: number;
    patchVersion: number;
    events: GameEvent[];
    notifications: Notification[];
}

const RealtimeContext = createContext<RealtimeContextType>({
    maintenanceMode: false,
    isUpdateRequired: false,
    patchSizeMB: 4,
    patchVersion: 1,
    events: [],
    notifications: [],
});

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isUpdateRequired, setIsUpdateRequired] = useState(false);
    const [patchSizeMB, setPatchSizeMB] = useState(4);
    const [patchVersion, setPatchVersion] = useState(1);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const isInitialEventsLoad = useRef(true);
    const isInitialNotificationLoad = useRef(true);
    const lastNotifId = useRef<string | null>(null);

    useEffect(() => {
        const maintenanceRef = rtdb.ref('status/maintenance');
        const updateRef = rtdb.ref('status/isUpdateRequired');
        const patchSizeRef = rtdb.ref('status/patchSizeMB');
        const patchVersionRef = rtdb.ref('status/patchVersion');

        const maintenanceListener = maintenanceRef.on('value', (snapshot) => {
            setMaintenanceMode(snapshot.val() === true);
        });

        const updateListener = updateRef.on('value', (snapshot) => {
            setIsUpdateRequired(snapshot.val() === true);
        });

        const patchSizeListener = patchSizeRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                setPatchSizeMB(snapshot.val());
            }
        });
        
        const patchVersionListener = patchVersionRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                setPatchVersion(snapshot.val());
            }
        });

        return () => {
            maintenanceRef.off('value', maintenanceListener);
            updateRef.off('value', updateListener);
            patchSizeRef.off('value', patchSizeListener);
            patchVersionRef.off('value', patchVersionListener);
        };
    }, []);

    useEffect(() => {
        const notificationsRef = rtdb.ref('notifications').orderByChild('timestamp').limitToLast(20);
        const listener = notificationsRef.on('value', (snapshot) => {
            const data: Notification[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            const sortedData = data.reverse();
            setNotifications(sortedData);

            if (isInitialNotificationLoad.current) {
                isInitialNotificationLoad.current = false;
                if (sortedData.length > 0) {
                    lastNotifId.current = sortedData[0].id;
                }
                return;
            }

            if (sortedData.length > 0 && sortedData[0].id !== lastNotifId.current) {
                toast.info(`🔔 ${sortedData[0].text}`);
                lastNotifId.current = sortedData[0].id;
            }
        });
        return () => notificationsRef.off('value', listener);
    }, []);

    useEffect(() => {
        const eventsRefListener = rtdb.ref('events');
        const listener = eventsRefListener.on('value', (snapshot) => {
            const eventsData: GameEvent[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    eventsData.push({ id: child.key!, ...child.val() });
                });
            }

            if (isInitialEventsLoad.current) {
                isInitialEventsLoad.current = false;
            } else if (eventsData.length > 0) { // Only toast if there are events
                toast.success('🎉 An event has been created or updated!');
            }
            setEvents(eventsData);
        });
        return () => eventsRefListener.off('value', listener);
    }, []);

    const value = { maintenanceMode, isUpdateRequired, patchSizeMB, patchVersion, events, notifications };

    return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => useContext(RealtimeContext);