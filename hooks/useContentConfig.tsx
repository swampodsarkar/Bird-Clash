import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { rtdb } from '../services/firebase';
import type { StoreItem, RoyalePassTier } from '../types';
import { CURRENT_ROYALE_PASS_SEASON, BIRD_DEFINITIONS, INSECT_DEFINITIONS } from '../constants';

const getBirdCost = (rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'): { coins?: number, gems?: number } => {
    switch (rarity) {
        case 'Common':
            return { coins: 1000 };
        case 'Rare':
            return { gems: 150 };
        case 'Epic':
            return { gems: 500 };
        case 'Legendary':
            return { gems: 1200 };
        default:
            return { coins: 1000 };
    }
};

const defaultStoreItems: StoreItem[] = [
    ...Object.values(BIRD_DEFINITIONS).map(bird => ({
        id: `bird-store-${bird.id}`,
        name: bird.name,
        tier: bird.rarity,
        description: bird.skillDescription,
        cost: getBirdCost(bird.rarity),
        type: 'bird' as const,
        payload: { birdId: bird.id },
        icon: bird.icon,
    })),
    ...Object.values(INSECT_DEFINITIONS).map(insect => ({
        id: `insect-store-${insect.id}`,
        name: insect.name,
        tier: insect.rarity,
        description: `A tasty insect. Provides ${insect.xpValue} XP.`,
        cost: { coins: insect.rarity === 'Common' ? 2 : insect.rarity === 'Rare' ? 10 : 30 },
        type: 'insect' as const,
        payload: { insectId: insect.id },
        icon: insect.icon,
    })),
    {
        id: 'item_normal_card',
        name: 'Custom Room Card',
        tier: 'Common',
        description: 'Creates a standard custom room to play with a friend.',
        cost: { coins: 200 },
        type: 'normal_custom_card',
        payload: {},
        icon: '✉️',
    },
    {
        id: 'item_drone_card',
        name: 'Esports Card',
        tier: 'Epic',
        description: 'Creates a premium room with an enhanced spectator view for streaming.',
        cost: { gems: 200 },
        type: 'drone_custom_card',
        payload: {},
        icon: '📹',
    },
    {
        id: 'special-duo-card',
        name: 'Dynamic Duo Card',
        tier: 'Epic',
        description: 'Required to send a Dynamic Duo request to a friend.',
        cost: { gems: 100 },
        type: 'duo_card',
        payload: {},
        icon: '💌',
    },
    {
        id: 'special-name-change',
        name: 'Name Change Card',
        tier: 'Epic',
        description: 'Allows you to change your in-game display name once.',
        cost: { gems: 250 },
        type: 'name_change_card',
        payload: {},
        icon: '🏷️',
    },
    {
        id: 'emote-wink',
        name: 'Wink Emote',
        tier: 'Common',
        description: 'A cheeky wink for your opponent.',
        cost: { gems: 20 },
        type: 'emote',
        payload: { emote: '😉' },
        icon: '😉',
    },
    {
        id: 'emote-love',
        name: 'Love Emote',
        tier: 'Rare',
        description: 'Show some love!',
        cost: { gems: 50 },
        type: 'emote',
        payload: { emote: '😍' },
        icon: '😍',
    },
    {
        id: 'emote-skull',
        name: 'Skull Emote',
        tier: 'Epic',
        description: 'A deadly taunt.',
        cost: { gems: 100 },
        type: 'emote',
        payload: { emote: '💀' },
        icon: '💀',
    },
    {
        id: 'default-currency-1',
        name: 'Bag of Coins',
        tier: 'Currency',
        description: 'A handy bag of 500 coins.',
        cost: { gems: 50 },
        type: 'currency' as const,
        payload: { currency: 'coins', amount: 500 },
        icon: '💰',
    },
     {
        id: 'default-currency-2',
        name: 'Chest of Coins',
        tier: 'Currency',
        description: 'A heavy chest containing 2500 coins.',
        cost: { gems: 200 },
        type: 'currency' as const,
        payload: { currency: 'coins', amount: 2500 },
        icon: '📦',
    }
];

const defaultLobbyBackground = 'https://cdna.artstation.com/p/assets/images/images/000/886/426/large/wonpyo-park-.jpg?1435309178';
const defaultBattleBackground = 'https://external-preview.redd.it/16-bit-fantasy-rpg-battle-backgrounds-v0-c2qIjjVj_We5G7cgIkMji_LTlKWQn3bIp7LeJbBBB4s.png?format=pjpg&auto=webp&s=9cde6d659c49c77895a2e9d11038cc2800a16389';

const defaultRoyalePassTiers: RoyalePassTier[] = [
    {
        id: 'default-tier-1',
        level: 1,
        xp: 0,
        freeReward: { type: 'coins', amount: 50, name: '50 Coins', icon: '💰' },
        premiumReward: { type: 'gems', amount: 10, name: '10 Gems', icon: '💎' },
    },
    {
        id: 'default-tier-2',
        level: 2,
        xp: 100,
        freeReward: { type: 'item', itemId: 'I001', amount: 1, name: 'Common Worm', icon: '🐛' },
        premiumReward: { type: 'item', itemId: 'I003', amount: 1, name: 'Juicy Beetle', icon: '🐞' },
    },
    {
        id: 'default-tier-3',
        level: 3,
        xp: 250,
        freeReward: { type: 'coins', amount: 100, name: '100 Coins', icon: '💰' },
        premiumReward: { type: 'coins', amount: 250, name: '250 Coins', icon: '💰' },
    },
    {
        id: 'default-tier-4',
        level: 4,
        xp: 500,
        freeReward: { type: 'item', itemId: 'I002', amount: 2, name: 'Glow Worms', icon: '✨' },
        premiumReward: { type: 'item', itemId: 'I005', amount: 1, name: 'Golden Dragonfly', icon: '🦗' },
    },
    {
        id: 'default-tier-5',
        level: 5,
        xp: 1000,
        freeReward: { type: 'coins', amount: 250, name: '250 Coins', icon: '💰' },
        premiumReward: { type: 'bird', itemId: 'B003', name: "Robbin'", icon: '🐧' },
    }
];


interface ContentConfigContextType {
    storeItems: StoreItem[];
    royalePassTiers: RoyalePassTier[];
    birdImages: { [birdId: string]: string };
    lobbyBackground: string;
    battleBackground: string;
    loading: boolean;
}

const ContentConfigContext = createContext<ContentConfigContextType>({
    storeItems: [],
    royalePassTiers: [],
    birdImages: {},
    lobbyBackground: defaultLobbyBackground,
    battleBackground: defaultBattleBackground,
    loading: true,
});

export const ContentConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
    const [royalePassTiers, setRoyalePassTiers] = useState<RoyalePassTier[]>([]);
    const [birdImages, setBirdImages] = useState<{ [birdId: string]: string }>({});
    const [backgroundImages, setBackgroundImages] = useState<{ lobby: string, battle: string }>({ lobby: '', battle: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storeRef = rtdb.ref('store_items');
        const passRef = rtdb.ref(`royale_pass_definitions/${CURRENT_ROYALE_PASS_SEASON}/tiers`);
        const birdImagesRef = rtdb.ref('contentConfig/birdImages');
        const backgroundImagesRef = rtdb.ref('contentConfig/backgroundImages');

        let storeLoaded = false;
        let passLoaded = false;
        let birdImagesLoaded = false;
        let backgroundsLoaded = false;

        const checkLoading = () => {
            if (storeLoaded && passLoaded && birdImagesLoaded && backgroundsLoaded) {
                setLoading(false);
            }
        };
        
        const onError = (refName: string) => (error: Error) => {
            console.error(`Failed to load ${refName}:`, error.message);
            // Treat loading as complete even on error to avoid infinite loading screens.
            if (refName === 'store_items') {
                setStoreItems(defaultStoreItems); // Fallback to defaults on error
                storeLoaded = true;
            }
            if (refName === 'royale_pass_definitions') {
                setRoyalePassTiers(defaultRoyalePassTiers); // Fallback to defaults on error
                passLoaded = true;
            }
            if (refName === 'birdImages') {
                setBirdImages({});
                birdImagesLoaded = true;
            }
            if (refName === 'backgroundImages') {
                setBackgroundImages({ lobby: '', battle: '' });
                backgroundsLoaded = true;
            }
            checkLoading();
        };

        const storeListener = storeRef.on('value', (snapshot) => {
            const items: StoreItem[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    items.push({ id: child.key!, ...child.val() });
                });
                setStoreItems(items);
            } else {
                setStoreItems(defaultStoreItems); // Set defaults if DB is empty
            }
            storeLoaded = true;
            checkLoading();
        }, onError('store_items'));

        const passListener = passRef.on('value', (snapshot) => {
            const tiers: RoyalePassTier[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    tiers.push({ id: child.key!, ...child.val() });
                });
                setRoyalePassTiers(tiers.sort((a, b) => a.level - b.level));
            } else {
                setRoyalePassTiers(defaultRoyalePassTiers); // Set defaults if DB is empty
            }
            passLoaded = true;
            checkLoading();
        }, onError('royale_pass_definitions'));

        const birdImagesListener = birdImagesRef.on('value', (snapshot) => {
            setBirdImages(snapshot.val() || {});
            birdImagesLoaded = true;
            checkLoading();
        }, onError('birdImages'));

        const backgroundImagesListener = backgroundImagesRef.on('value', (snapshot) => {
            setBackgroundImages(snapshot.val() || {});
            backgroundsLoaded = true;
            checkLoading();
        }, onError('backgroundImages'));

        return () => {
            storeRef.off('value', storeListener);
            passRef.off('value', passListener);
            birdImagesRef.off('value', birdImagesListener);
            backgroundImagesRef.off('value', backgroundImagesListener);
        };
    }, []);

    const value = { storeItems, royalePassTiers, birdImages, loading,
        lobbyBackground: backgroundImages.lobby || defaultLobbyBackground,
        battleBackground: backgroundImages.battle || defaultBattleBackground,
     };

    return <ContentConfigContext.Provider value={value}>{children}</ContentConfigContext.Provider>;
};

export const useContentConfig = () => useContext(ContentConfigContext);