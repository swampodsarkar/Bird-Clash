import type { TopUpProduct, Quest, RankTier } from './types';

export interface GameConfig {
    MATCH_DURATION_SECONDS: number;
    RANK_ENTRY_FEE_COINS: number;
    RANK_WINNER_REWARD_COINS: number;
    CLASSIC_ENTRY_FEE_COINS: number;
    CLASSIC_WINNER_REWARD_COINS: number;
    DAILY_LOGIN_BONUS_COINS: number;
    INVITE_FRIEND_BONUS_COINS: number;
    DEFAULT_RANK_POINT_WIN: number;
    DEFAULT_RANK_POINT_LOSS: number;
    CLAN_CREATE_COST_COINS: number;
    lobbyMusicUrl: string;
    TURN_TIMER_SECONDS: number;
    TURN_TIMER_WARNING_SECONDS: number;
    BLOCK_COOLDOWN_TURNS: number;
}

export const defaultGameConfig: GameConfig = {
    MATCH_DURATION_SECONDS: 30,
    RANK_ENTRY_FEE_COINS: 0,
    RANK_WINNER_REWARD_COINS: 20,
    CLASSIC_ENTRY_FEE_COINS: 10,
    CLASSIC_WINNER_REWARD_COINS: 20,
    DAILY_LOGIN_BONUS_COINS: 10,
    INVITE_FRIEND_BONUS_COINS: 50,
    DEFAULT_RANK_POINT_WIN: 15,
    DEFAULT_RANK_POINT_LOSS: 7,
    CLAN_CREATE_COST_COINS: 1000,
    lobbyMusicUrl: 'https://cdn.pixabay.com/download/audio/2022/08/04/audio_2d81b016b8.mp3',
    TURN_TIMER_SECONDS: 30,
    TURN_TIMER_WARNING_SECONDS: 10,
    BLOCK_COOLDOWN_TURNS: 3,
};

// The user's provided API key for ImgBB image hosting service.
export const IMGBB_API_KEY = 'fe3e06e5bbecab856c63cf7e6a50a251';

export const RANK_TIERS: RankTier[] = [
    { name: 'Bronze I', minPoints: 0, maxPoints: 999, icon: '🥉', winPoints: 50, lossPoints: 10 },
    { name: 'Bronze II', minPoints: 1000, maxPoints: 1099, icon: '🥉', winPoints: 50, lossPoints: 10 },
    { name: 'Bronze III', minPoints: 1100, maxPoints: 1199, icon: '🥉', winPoints: 50, lossPoints: 10 },
    { name: 'Silver I', minPoints: 1200, maxPoints: 1299, icon: '🥈', winPoints: 45, lossPoints: 15 },
    { name: 'Silver II', minPoints: 1300, maxPoints: 1399, icon: '🥈', winPoints: 45, lossPoints: 15 },
    { name: 'Silver III', minPoints: 1400, maxPoints: 1499, icon: '🥈', winPoints: 45, lossPoints: 15 },
    { name: 'Gold I', minPoints: 1500, maxPoints: 1599, icon: '🥇', winPoints: 40, lossPoints: 20 },
    { name: 'Gold II', minPoints: 1600, maxPoints: 1699, icon: '🥇', winPoints: 40, lossPoints: 20 },
    { name: 'Gold III', minPoints: 1700, maxPoints: 1799, icon: '🥇', winPoints: 40, lossPoints: 20 },
    { name: 'Gold IV', minPoints: 1800, maxPoints: 1899, icon: '🥇', winPoints: 40, lossPoints: 20 },
    { name: 'Platinum I', minPoints: 1900, maxPoints: 2049, icon: '💠', winPoints: 35, lossPoints: 25 },
    { name: 'Platinum II', minPoints: 2050, maxPoints: 2199, icon: '💠', winPoints: 35, lossPoints: 25 },
    { name: 'Platinum III', minPoints: 2200, maxPoints: 2349, icon: '💠', winPoints: 35, lossPoints: 25 },
    { name: 'Platinum IV', minPoints: 2350, maxPoints: 2499, icon: '💠', winPoints: 35, lossPoints: 25 },
    { name: 'Diamond I', minPoints: 2500, maxPoints: 2649, icon: '💎', winPoints: 30, lossPoints: 30 },
    { name: 'Diamond II', minPoints: 2650, maxPoints: 2799, icon: '💎', winPoints: 30, lossPoints: 30 },
    { name: 'Diamond III', minPoints: 2800, maxPoints: 2949, icon: '💎', winPoints: 30, lossPoints: 30 },
    { name: 'Diamond IV', minPoints: 2950, maxPoints: 3199, icon: '💎', winPoints: 30, lossPoints: 30 },
    { name: 'Heroic', minPoints: 3200, maxPoints: 3599, icon: '🔥', winPoints: 25, lossPoints: 35 },
    { name: 'Master', minPoints: 3600, maxPoints: 3999, icon: '⭐', winPoints: 20, lossPoints: 40 },
    { name: 'Grandmaster', minPoints: 4000, maxPoints: Infinity, icon: '👑', winPoints: 15, lossPoints: 45 },
];

export const ADMIN_UID = 'mnFIIa37J2Tusva0efCp7M3tgE83'; // IMPORTANT: Replace with your actual Firebase Admin User UID
export const CURRENT_ROYALE_PASS_SEASON = 'season_1';

export const TOP_UP_PRODUCTS: TopUpProduct[] = [
    {
        id: 'gems_100',
        type: 'gems',
        name: '100 Gems',
        description: 'A pouch of 100 shiny gems.',
        price: 75,
        payload: { gems: 100 },
        icon: '💎'
    },
    {
        id: 'gems_300',
        type: 'gems',
        name: '300 Gems',
        description: 'A bag of 300 shiny gems.',
        price: 180,
        payload: { gems: 300 },
        icon: '💰'
    },
    {
        id: 'gems_500',
        type: 'gems',
        name: '500 Gems',
        description: 'A box of 500 shiny gems.',
        price: 260,
        payload: { gems: 500 },
        icon: '📦'
    },
    {
        id: 'gems_1000',
        type: 'gems',
        name: '1000 Gems',
        description: 'A chest of 1000 shiny gems.',
        price: 750,
        payload: { gems: 1000 },
        icon: '👑'
    },
    {
        id: 'weekly_membership',
        type: 'weekly_membership',
        name: 'Weekly Pass',
        description: 'Get 60 gems daily for 7 days! (Total 420)',
        price: 150,
        payload: { durationDays: 7, dailyGems: 60 },
        icon: '📅'
    },
    {
        id: 'monthly_membership',
        type: 'monthly_membership',
        name: 'Monthly Pass',
        description: 'Get 80 gems daily for 30 days! (Total 2400)',
        price: 750,
        payload: { durationDays: 30, dailyGems: 80 },
        icon: '🗓️'
    }
];

export const DAILY_QUESTS: Quest[] = [
  { id: 'q_play_ranked_2', description: 'Play 2 Ranked Matches', type: 'playRanked', target: 2, reward: { type: 'coins', amount: 1000 } },
  { id: 'q_play_classic_5', description: 'Play 5 Classic Matches', type: 'playClassic', target: 5, reward: { type: 'coins', amount: 2000 } },
  { id: 'q_deal_damage_500', description: 'Deal 500 total damage', type: 'dealDamage', target: 500, reward: { type: 'coins', amount: 500 } },
];

export const REFERRAL_REWARDS = {
  INVITER_GEMS: 50,
  INVITER_COINS: 500,
  REFERRED_GEMS: 25,
  REFERRED_COINS: 200,
  MAX_REFERRALS: 50,
};

export const STREAK_REWARDS: { [day: number]: { coins: number; gems: number } } = {
  1: { coins: 100, gems: 0 },
  2: { coins: 200, gems: 0 },
  3: { coins: 300, gems: 5 },
  4: { coins: 500, gems: 0 },
  5: { coins: 700, gems: 10 },
  6: { coins: 1000, gems: 0 },
  7: { coins: 2000, gems: 25 },
};

export const FALLBACK_BOT_NAMES = [
    'Abdullah', 'Abir', 'Adnan', 'Afnan', 'Ahmed', 'Ahnaf', 'Akash', 'Alif', 'Amin', 'Anik', 'Anis', 'Arafat', 'Arham', 'Arif', 'Arifin', 'Arman', 'Asif', 'Atik', 'Ayan', 'Ayon', 'Azmain', 'Bappy', 'Bashar', 'Bilal', 'Dipu', 'Emon', 'Enamul', 'Fahad', 'Fahim', 'Faisal', 'Farhan', 'Faruque', 'Habib', 'Hamid', 'Hasan', 'Hasib', 'Hridoy', 'Ibrahim', 'Imran', 'Iqbal', 'Irfan', 'Ishraq', 'Jahid', 'Jamal', 'Jamil', 'Jisan', 'Joy', 'Kabir', 'Kamal', 'Karim', 'Khalid', 'Mahbub', 'Mahfuz', 'Mahmud', 'Masud', 'Mehedi', 'Minhaj', 'Mizan', 'Mohammad', 'Mohsin', 'Monir', 'Morshed', 'Mushfiqur', 'Nabil', 'Nadim', 'Nafis', 'Nahid', 'Nayeem', 'Nazmul', 'Nibir', 'Parvez', 'Rafan', 'Rafiq', 'Rafsan', 'Rahim', 'Rahman', 'Rahat', 'Rajib', 'Raju', 'Rakib', 'Rashed', 'Riad', 'Rifat', 'Rohan', 'Rubel', 'Sabbir', 'Sadman', 'Saiful', 'Sakib', 'Shakib', 'Salman', 'Sameer', 'Shanto', 'Shihab', 'Shuvo', 'Siam', 'Sumon', 'Tahsin', 'Tamim', 'Tanvir', 'Tariq'
];

// --- BIRD & INSECT DEFINITIONS ---

// BIRD DEFINITIONS
export const BIRD_DEFINITIONS: { [key: string]: { id: string; name: string; rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'; skillDescription: string; baseAttackPower: number; attackPowerPerLevel: number; icon: string; baseXpToNextLevel: number; baseHealth: number; healthPerLevel: number; abilityType?: 'SHIELD' | 'STUN_CHANCE' | 'BURN' | 'DEFENSE_BUFF'; abilityValue?: number; abilityCooldown?: number; abilityDescription?: string; ultimateType?: 'MASSIVE_DAMAGE' | 'FULL_HEAL' | 'INVULNERABILITY' | 'DOUBLE_ATTACK'; ultimateValue?: number; ultimateCooldown?: number; ultimateDescription?: string; } } = {
  // 5 Common
  'B001': { id: 'B001', name: 'Tappy', rarity: 'Common', skillDescription: 'A reliable companion.', baseAttackPower: 10, attackPowerPerLevel: 2, icon: '🐦', baseXpToNextLevel: 100, baseHealth: 200, healthPerLevel: 20, abilityType: 'SHIELD', abilityValue: 20, abilityCooldown: 4, abilityDescription: 'Minor Shield: Creates a 20 HP shield.', ultimateType: 'FULL_HEAL', ultimateCooldown: 8, ultimateDescription: 'Restores all health.' },
  'B002': { id: 'B002', name: 'Swiftwing', rarity: 'Common', skillDescription: 'Fast and nimble.', baseAttackPower: 12, attackPowerPerLevel: 3, icon: '🕊️', baseXpToNextLevel: 120, baseHealth: 180, healthPerLevel: 18, abilityType: 'DEFENSE_BUFF', abilityCooldown: 4, abilityDescription: 'Evasion: Reduces opponent\'s next attack by 50%.', ultimateType: 'DOUBLE_ATTACK', ultimateCooldown: 7, ultimateDescription: 'Next attack hits twice.' },
  'B010': { id: 'B010', name: 'Pecky', rarity: 'Common', skillDescription: 'Known for its rapid pecks.', baseAttackPower: 13, attackPowerPerLevel: 3, icon: '🐔', baseXpToNextLevel: 115, baseHealth: 210, healthPerLevel: 21, abilityType: 'SHIELD', abilityValue: 25, abilityCooldown: 4, abilityDescription: 'Harden: Creates a 25 HP shield.', ultimateType: 'MASSIVE_DAMAGE', ultimateValue: 50, ultimateCooldown: 6, ultimateDescription: 'Deals 50 massive damage.' },
  'B015': { id: 'B015', name: 'Crested Lark', rarity: 'Common', skillDescription: 'Proud and defiant.', baseAttackPower: 13, attackPowerPerLevel: 3, icon: '🐥', baseXpToNextLevel: 135, baseHealth: 215, healthPerLevel: 22, abilityType: 'DEFENSE_BUFF', abilityCooldown: 4, abilityDescription: 'Defiance: Reduces opponent\'s next attack by 50%.', ultimateType: 'INVULNERABILITY', ultimateCooldown: 8, ultimateDescription: 'Immune to damage for 1 turn.' },
  'B017': { id: 'B017', name: 'Nightjar', rarity: 'Common', skillDescription: 'Master of the night.', baseAttackPower: 15, attackPowerPerLevel: 2, icon: '🦉', baseXpToNextLevel: 150, baseHealth: 200, healthPerLevel: 20, abilityType: 'SHIELD', abilityValue: 30, abilityCooldown: 4, abilityDescription: 'Night Guard: Creates a 30 HP shield.', ultimateType: 'MASSIVE_DAMAGE', ultimateValue: 60, ultimateCooldown: 7, ultimateDescription: 'Deals 60 massive damage.' },
  // 5 Rare
  'B003': { id: 'B003', name: 'Robbin\'', rarity: 'Rare', skillDescription: 'A sturdy fighter.', baseAttackPower: 25, attackPowerPerLevel: 5, icon: '🐧', baseXpToNextLevel: 250, baseHealth: 350, healthPerLevel: 35, abilityType: 'SHIELD', abilityValue: 40, abilityCooldown: 3, abilityDescription: 'Bulwark: Creates a 40 HP shield.', ultimateType: 'FULL_HEAL', ultimateCooldown: 8, ultimateDescription: 'Restores all health.' },
  'B004': { id: 'B004', name: 'Voltbeak', rarity: 'Rare', skillDescription: 'Shockingly powerful.', baseAttackPower: 20, attackPowerPerLevel: 4, icon: '⚡', baseXpToNextLevel: 300, baseHealth: 320, healthPerLevel: 32, abilityType: 'STUN_CHANCE', abilityValue: 10, abilityCooldown: 0, abilityDescription: '10% chance on attack to stun the opponent for 1 turn.', ultimateType: 'DOUBLE_ATTACK', ultimateCooldown: 6, ultimateDescription: 'Next attack hits twice.' },
  'B021': { id: 'B021', name: 'Storm Petrel', rarity: 'Rare', skillDescription: 'Brings the fury of the storm.', baseAttackPower: 30, attackPowerPerLevel: 7, icon: '🐦‍⬛', baseXpToNextLevel: 350, baseHealth: 360, healthPerLevel: 36, abilityType: 'DEFENSE_BUFF', abilityCooldown: 3, abilityDescription: 'Gale Force: Reduces opponent\'s next attack by 50%.', ultimateType: 'MASSIVE_DAMAGE', ultimateValue: 100, ultimateCooldown: 7, ultimateDescription: 'Deals 100 massive damage.' },
  'B023': { id: 'B023', name: 'Kingfisher', rarity: 'Rare', skillDescription: 'A regal and swift diver.', baseAttackPower: 24, attackPowerPerLevel: 5, icon: '🦆', baseXpToNextLevel: 290, baseHealth: 370, healthPerLevel: 37, abilityType: 'SHIELD', abilityValue: 50, abilityCooldown: 3, abilityDescription: 'Aqua Shield: Creates a 50 HP shield.', ultimateType: 'INVULNERABILITY', ultimateCooldown: 8, ultimateDescription: 'Immune to damage for 1 turn.' },
  'B046': { id: 'B046', name: 'Mirage Macaw', rarity: 'Rare', skillDescription: 'Creates dazzling illusions.', baseAttackPower: 21, attackPowerPerLevel: 9, icon: '🦜', baseXpToNextLevel: 350, baseHealth: 300, healthPerLevel: 30, abilityType: 'DEFENSE_BUFF', abilityCooldown: 3, abilityDescription: 'Illusion: Reduces opponent\'s next attack by 50%.', ultimateType: 'DOUBLE_ATTACK', ultimateCooldown: 7, ultimateDescription: 'Next attack hits twice.' },
  // 10 Epic
  'B005': { id: 'B005', name: 'Eagle Eye', rarity: 'Epic', skillDescription: 'A true predator.', baseAttackPower: 50, attackPowerPerLevel: 10, icon: '🦅', baseXpToNextLevel: 500, baseHealth: 500, healthPerLevel: 50, abilityType: 'SHIELD', abilityValue: 75, abilityCooldown: 3, abilityDescription: 'Aegis Wing: Creates a 75 HP shield.', ultimateType: 'MASSIVE_DAMAGE', ultimateValue: 150, ultimateCooldown: 6, ultimateDescription: 'Deals 150 massive damage.' },
  'B006': { id: 'B006', name: 'Frostbeak', rarity: 'Epic', skillDescription: 'Chills foes to the bone.', baseAttackPower: 45, attackPowerPerLevel: 9, icon: '🦢', baseXpToNextLevel: 600, baseHealth: 550, healthPerLevel: 55, abilityType: 'DEFENSE_BUFF', abilityValue: 50, abilityCooldown: 3, abilityDescription: 'Reduces opponent\'s next attack by 50%.', ultimateType: 'INVULNERABILITY', ultimateCooldown: 7, ultimateDescription: 'Immune to damage for 1 turn.' },
  'B007': { id: 'B007', name: 'Quillshot', rarity: 'Epic', skillDescription: 'A ranged attacker.', baseAttackPower: 60, attackPowerPerLevel: 12, icon: '🦚', baseXpToNextLevel: 750, baseHealth: 480, healthPerLevel: 48, abilityType: 'DEFENSE_BUFF', abilityCooldown: 3, abilityDescription: 'Barbed Defense: Reduces opponent\'s next attack by 50%.', ultimateType: 'DOUBLE_ATTACK', ultimateCooldown: 6, ultimateDescription: 'Next attack hits twice.' },
  'B027': { id: 'B027', name: 'Glacierwing', rarity: 'Epic', skillDescription: 'Encased in ancient ice.', baseAttackPower: 52, attackPowerPerLevel: 10, icon: '🧊', baseXpToNextLevel: 620, baseHealth: 580, healthPerLevel: 58, abilityType: 'SHIELD', abilityValue: 80, abilityCooldown: 4, abilityDescription: 'Ice Barrier: Creates an 80 HP shield.', ultimateType: 'FULL_HEAL', ultimateCooldown: 8, ultimateDescription: 'Restores all health.' },
  'B028': { id: 'B028', name: 'Magmafinch', rarity: 'Epic', skillDescription: 'A bird of molten rock.', baseAttackPower: 65, attackPowerPerLevel: 13, icon: '🔥', baseXpToNextLevel: 700, baseHealth: 500, healthPerLevel: 50, abilityType: 'BURN', abilityValue: 25, abilityCooldown: 3, abilityDescription: 'Attacks and burns the opponent for 25 damage over 2 turns.', ultimateType: 'MASSIVE_DAMAGE', ultimateValue: 200, ultimateCooldown: 7, ultimateDescription: 'Deals 200 massive damage.' },
  'B029': { id: 'B029', name: 'Tempest Tern', rarity: 'Epic', skillDescription: 'Commands hurricane winds.', baseAttackPower: 60, attackPowerPerLevel: 12, icon: '🌪️', baseXpToNextLevel: 680, baseHealth: 530, healthPerLevel: 53, abilityType: 'DEFENSE_BUFF', abilityCooldown: 4, abilityDescription: 'Eye of the Storm: Reduces opponent\'s next attack by 50%.', ultimateType: 'INVULNERABILITY', ultimateCooldown: 8, ultimateDescription: 'Immune to damage for 1 turn.' },
  'B047': { id: 'B047', name: 'Juggernaut Jay', rarity: 'Epic', skillDescription: 'An unstoppable force.', baseAttackPower: 62, attackPowerPerLevel: 12, icon: '🗿', baseXpToNextLevel: 700, baseHealth: 650, healthPerLevel: 65, abilityType: 'SHIELD', abilityValue: 100, abilityCooldown: 3, abilityDescription: 'Creates a 100 HP shield.', ultimateType: 'MASSIVE_DAMAGE', ultimateValue: 180, ultimateCooldown: 6, ultimateDescription: 'Deals 180 massive damage.' },
  'B048': { id: 'B048', name: 'Quasar Toucan', rarity: 'Epic', skillDescription: 'Channels cosmic energy.', baseAttackPower: 70, attackPowerPerLevel: 14, icon: '💫', baseXpToNextLevel: 800, baseHealth: 550, healthPerLevel: 55, abilityType: 'SHIELD', abilityValue: 90, abilityCooldown: 4, abilityDescription: 'Cosmic Ward: Creates a 90 HP shield.', ultimateType: 'DOUBLE_ATTACK', ultimateCooldown: 7, ultimateDescription: 'Next attack hits twice.' },
  'B049': { id: 'B049', name: 'Grave Warden Crow', rarity: 'Epic', skillDescription: 'Watches over the fallen.', baseAttackPower: 60, attackPowerPerLevel: 12, icon: '💀', baseXpToNextLevel: 750, baseHealth: 600, healthPerLevel: 60, abilityType: 'DEFENSE_BUFF', abilityCooldown: 4, abilityDescription: 'Grave Shroud: Reduces opponent\'s next attack by 50%.', ultimateType: 'FULL_HEAL', ultimateCooldown: 9, ultimateDescription: 'Restores all health.' },
  'B051': { id: 'B051', name: 'Wyrm-Pecker', rarity: 'Epic', skillDescription: 'Said to have dragon blood.', baseAttackPower: 75, attackPowerPerLevel: 15, icon: '🐲', baseXpToNextLevel: 900, baseHealth: 620, healthPerLevel: 62, abilityType: 'SHIELD', abilityValue: 110, abilityCooldown: 4, abilityDescription: 'Dragon Scales: Creates a 110 HP shield.', ultimateType: 'MASSIVE_DAMAGE', ultimateValue: 250, ultimateCooldown: 8, ultimateDescription: 'Deals 250 massive damage.' },
};

export const POTION_DEFINITIONS: { [key: string]: { id: string; name: string; type: 'health_potion' | 'damage_booster'; value: number; icon: string; description: string; cost: number; } } = {
  'P001': { id: 'P001', name: 'Small Health Potion', type: 'health_potion', value: 100, icon: '🧪', description: 'Restores 100 HP.', cost: 50 },
  'P002': { id: 'P002', name: 'Large Health Potion', type: 'health_potion', value: 300, icon: '💉', description: 'Restores 300 HP.', cost: 120 },
  'P003': { id: 'P003', name: 'Damage Booster', type: 'damage_booster', value: 50, icon: '🔥', description: 'Increases next attack damage by 50%.', cost: 100 },
};


// INSECT DEFINITIONS
export const INSECT_DEFINITIONS: { [key: string]: { id: string; name: string; rarity: 'Common' | 'Rare' | 'Epic'; xpValue: number; icon: string; giftCost: number; } } = {
  'I001': { id: 'I001', name: 'Common Worm', rarity: 'Common', xpValue: 10, icon: '🐛', giftCost: 5 },
  'I002': { id: 'I002', name: 'Glow Worm', rarity: 'Common', xpValue: 15, icon: '✨', giftCost: 8 },
  'I003': { id: 'I003', name: 'Juicy Beetle', rarity: 'Rare', xpValue: 50, icon: '🐞', giftCost: 25 },
  'I004': { id: 'I004', name: 'Spiky Caterpillar', rarity: 'Rare', xpValue: 60, icon: '🌵', giftCost: 30 },
  'I005': { id: 'I005', name: 'Golden Dragonfly', rarity: 'Epic', xpValue: 150, icon: '🦗', giftCost: 75 },
  // 50+ New Insects
  'I006': { id: 'I006', name: 'Leaf Bug', rarity: 'Common', xpValue: 12, icon: '🍃', giftCost: 6 },
  'I007': { id: 'I007', name: 'Tiny Ant', rarity: 'Common', xpValue: 8, icon: '🐜', giftCost: 4 },
  'I008': { id: 'I008', name: 'Fuzzy Moth', rarity: 'Common', xpValue: 14, icon: '🦋', giftCost: 7 },
  'I009': { id: 'I009', name: 'Common Fly', rarity: 'Common', xpValue: 10, icon: '🦟', giftCost: 5 },
  'I010': { id: 'I010', name: 'Little Spider', rarity: 'Common', xpValue: 11, icon: '🕷️', giftCost: 6 },
  'I011': { id: 'I011', name: 'Dewdrop Flea', rarity: 'Common', xpValue: 9, icon: '💧', giftCost: 5 },
  'I012': { id: 'I012', name: 'Pebble Mite', rarity: 'Common', xpValue: 13, icon: '🪨', giftCost: 7 },
  'I013': { id: 'I013', name: 'Grasshopper', rarity: 'Common', xpValue: 16, icon: '🦗', giftCost: 8 },
  'I014': { id: 'I014', name: 'Doodlebug', rarity: 'Common', xpValue: 18, icon: '✏️', giftCost: 9 },
  'I015': { id: 'I015', name: 'Stink Bug', rarity: 'Common', xpValue: 20, icon: '💨', giftCost: 10 },
  'I016': { id: 'I016', name: 'Honeybee', rarity: 'Common', xpValue: 22, icon: '🐝', giftCost: 11 },
  'I017': { id: 'I017', name: 'Ladybug', rarity: 'Common', xpValue: 25, icon: '🐞', giftCost: 13 },
  'I018': { id: 'I018', name: 'Inchworm', rarity: 'Common', xpValue: 19, icon: '📏', giftCost: 10 },
  'I019': { id: 'I019', name: 'Gnat Swarm', rarity: 'Common', xpValue: 28, icon: '🌫️', giftCost: 14 },
  'I020': { id: 'I020', name: 'Fruit Fly', rarity: 'Common', xpValue: 23, icon: '🍎', giftCost: 12 },
  'I021': { id: 'I021', name: 'Pill Bug', rarity: 'Common', xpValue: 26, icon: '💊', giftCost: 13 },
  'I022': { id: 'I022', name: 'Mosquito', rarity: 'Common', xpValue: 30, icon: '🩸', giftCost: 15 },
  'I023': { id: 'I023', name: 'Earthworm', rarity: 'Common', xpValue: 24, icon: '🪱', giftCost: 12 },
  'I024': { id: 'I024', name: 'Firefly', rarity: 'Common', xpValue: 27, icon: '🔦', giftCost: 14 },
  'I025': { id: 'I025', name: 'Click Beetle', rarity: 'Common', xpValue: 29, icon: '🖱️', giftCost: 15 },
  'I026': { id: 'I026', name: 'Armored Weevil', rarity: 'Rare', xpValue: 55, icon: '🛡️', giftCost: 28 },
  'I027': { id: 'I027', name: 'Stag Beetle', rarity: 'Rare', xpValue: 65, icon: '🦌', giftCost: 33 },
  'I028': { id: 'I028', name: 'Bombardier Beetle', rarity: 'Rare', xpValue: 70, icon: '💣', giftCost: 35 },
  'I029': { id: 'I029', name: 'Jewel Wasp', rarity: 'Rare', xpValue: 75, icon: '💎', giftCost: 38 },
  'I030': { id: 'I030', name: 'Giant Centipede', rarity: 'Rare', xpValue: 80, icon: '⛓️', giftCost: 40 },
  'I031': { id: 'I031', name: 'Tarantula Hawk', rarity: 'Rare', xpValue: 85, icon: '🦅', giftCost: 43 },
  'I032': { id: 'I032', name: 'Scorpion', rarity: 'Rare', xpValue: 90, icon: '🦂', giftCost: 45 },
  'I033': { id: 'I033', name: 'Praying Mantis', rarity: 'Rare', xpValue: 95, icon: '🙏', giftCost: 48 },
  'I034': { id: 'I034', name: 'Luna Moth', rarity: 'Rare', xpValue: 100, icon: '🌕', giftCost: 50 },
  'I035': { id: 'I035', name: 'Walking Stick', rarity: 'Rare', xpValue: 62, icon: '🌲', giftCost: 31 },
  'I036': { id: 'I036', name: 'Rhinoceros Beetle', rarity: 'Rare', xpValue: 110, icon: '🦏', giftCost: 55 },
  'I037': { id: 'I037', name: 'Atlas Moth', rarity: 'Rare', xpValue: 120, icon: '🗺️', giftCost: 60 },
  'I038': { id: 'I038', name: 'Goliath Beetle', rarity: 'Rare', xpValue: 130, icon: '🗿', giftCost: 65 },
  'I039': { id: 'I039', name: 'Lantern Fly', rarity: 'Rare', xpValue: 78, icon: '🏮', giftCost: 39 },
  'I040': { id: 'I040', name: 'Thorn Bug', rarity: 'Rare', xpValue: 88, icon: '🌹', giftCost: 44 },
  'I041': { id: 'I041', name: 'Titan Beetle', rarity: 'Epic', xpValue: 200, icon: '🏆', giftCost: 100 },
  'I042': { id: 'I042', name: 'Hercules Beetle', rarity: 'Epic', xpValue: 220, icon: '💪', giftCost: 110 },
  'I043': { id: 'I043', name: 'Phantom Butterfly', rarity: 'Epic', xpValue: 250, icon: '👻', giftCost: 125 },
  'I044': { id: 'I044', name: 'Sunstone Cicada', rarity: 'Epic', xpValue: 280, icon: '☀️', giftCost: 140 },
  'I045': { id: 'I045', name: 'Meteor Mite', rarity: 'Epic', xpValue: 300, icon: '☄️', giftCost: 150 },
  'I046': { id: 'I046', name: 'Void-Laced Larva', rarity: 'Epic', xpValue: 320, icon: '⚫', giftCost: 160 },
  'I047': { id: 'I047', name: 'Chrono-Cricket', rarity: 'Epic', xpValue: 350, icon: '⏳', giftCost: 175 },
  'I048': { id: 'I048', name: 'Galactic Grub', rarity: 'Epic', xpValue: 400, icon: '🌌', giftCost: 200 },
  'I049': { id: 'I049', name: 'Rainbow Scarab', rarity: 'Epic', xpValue: 180, icon: '🌈', giftCost: 90 },
  'I050': { id: 'I050', name: 'Obsidian Roach', rarity: 'Epic', xpValue: 160, icon: '🖤', giftCost: 80 },
  'I051': { id: 'I051', name: 'Volcanic Slug', rarity: 'Rare', xpValue: 115, icon: '🌋', giftCost: 58 },
  'I052': { id: 'I052', name: 'Glacier Gnat', rarity: 'Rare', xpValue: 105, icon: '🧊', giftCost: 53 },
  'I053': { id: 'I053', name: 'Snail', rarity: 'Common', xpValue: 35, icon: '🐌', giftCost: 18 },
  'I054': { id: 'I054', name: 'Caterpillar', rarity: 'Common', xpValue: 32, icon: '🐛', giftCost: 16 },
  'I055': { id: 'I055', name: 'Dung Beetle', rarity: 'Common', xpValue: 40, icon: '💩', giftCost: 20 },
  'I056': { id: 'I056', name: 'Queen Ant', rarity: 'Epic', xpValue: 500, icon: '👑', giftCost: 250 },
};