
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { rtdb } from '../services/firebase';
import { defaultGameConfig, GameConfig } from '../constants';
import { toast } from 'react-toastify';

const GameConfigContext = createContext<GameConfig>(defaultGameConfig);

export const GameConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<GameConfig>(defaultGameConfig);
    const isInitialLoad = useRef(true);

    useEffect(() => {
        const configRef = rtdb.ref('gameConfig');
        const listener = configRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                setConfig({ ...defaultGameConfig, ...snapshot.val() });
                if (isInitialLoad.current) {
                    isInitialLoad.current = false;
                } else {
                    toast.info('⚙️ Game configuration updated!');
                }
            }
        });

        return () => configRef.off('value', listener);
    }, []);

    return <GameConfigContext.Provider value={config}>{children}</GameConfigContext.Provider>;
};

export const useGameConfig = () => useContext(GameConfigContext);
