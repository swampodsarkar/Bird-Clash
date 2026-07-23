
import type firebase from 'firebase/compat/app';

export interface AuthContextType {
  user: firebase.User | null;
  loading: boolean;
}

export type PowerUpType = 'doubleTaps' | 'freeze' | 'bomb';

export interface RankTier {
  name: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  winPoints: number;
  lossPoints: number;
}

export interface PowerUpSpawn {
    id: string;
    type: PowerUpType;
    x: number; // percentage
    y: number; // percentage
}

export interface ActiveEffects {
    shield?: number;
    burn?: { turns: number; damage: number };
    defenseBuff?: boolean;
    stunned?: boolean;
    adrenaline?: boolean;
    invulnerable?: boolean;
    doubleAttack?: boolean;
    blocking?: boolean;
}

export interface RoyalePassReward {
    type: 'coins' | 'gems' | 'item' | 'skin' | 'title' | 'bird';
    amount?: number; // for coins/gems
    itemId?: string; // for store items
    name?: string; // for skins/titles
    icon?: string;
}

export interface RoyalePassTier {
    id: string; // Firebase key
    level: number;
    xp: number; // Total XP required to reach this level
    freeReward?: RoyalePassReward;
    premiumReward?: RoyalePassReward;
}

export interface PlayerRoyalePassProgress {
    seasonId: string;
    level: number;
    xp: number;
    hasPremium: boolean;
    // Format: { "1": ["free", "premium"], "2": ["free"] }
    claimedRewards: { [level: number]: ('free' | 'premium')[] };
}

export interface Bird {
    id: string;
    name: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    skillDescription: string;
    skillPower: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    icon: string;
    maxHealth: number;
    powerLevel?: number;
    healthLevel?: number;
    abilityType?: 'SHIELD' | 'STUN_CHANCE' | 'BURN' | 'DEFENSE_BUFF' | 'ATTACK_BUFF';
    abilityValue?: number;
    abilityCooldown?: number;
    abilityDescription?: string;
    ultimateType?: 'MASSIVE_DAMAGE' | 'FULL_HEAL' | 'INVULNERABILITY' | 'DOUBLE_ATTACK';
    ultimateValue?: number;
    ultimateCooldown?: number;
    ultimateDescription?: string;
}

export interface Insect {
    id: string;
    name: string;
    rarity: 'Common' | 'Rare';
    xpValue: number;
    icon: string;
}

export interface Potion {
    id: string;
    name: string;
    type: 'health_potion' | 'damage_booster';
    value: number;
    icon: string;
    description: string;
}

export interface Quest {
  id: string;
  description: string;
  type: 'playRanked' | 'playClassic' | 'dealDamage';
  target: number;
  reward: {
    type: 'coins';
    amount: number;
  };
}

export interface PlayerQuestProgress {
  [questId: string]: {
    progress: number;
    claimed: boolean;
  };
}

export interface DynamicDuo {
  partnerUid: string;
  partnerDisplayName: string;
  status: 'pending_sent' | 'pending_received' | 'active';
  since: number;
}

export interface ReferralData {
  referralCode: string;
  referredBy?: string;
  referrals: { [uid: string]: { timestamp: number; rewarded: boolean } };
  referralRewardsClaimed: number;
}

export interface LoginStreak {
  currentStreak: number;
  longestStreak: number;
  lastClaimDate: string;
  nextRewardDay: number;
}

export interface LimitedEvent {
  id: string;
  title: string;
  description: string;
  type: 'special_bird' | 'bonus_coins' | 'bonus_gems' | 'double_xp' | 'special_battle';
  startTime: number;
  endTime: number;
  reward?: { type: 'coins' | 'gems' | 'bird' | 'insect'; amount?: number; itemId?: string };
  condition?: { type: 'wins' | 'matches' | 'damage'; target: number };
  icon: string;
  active: boolean;
}

export interface TournamentBracket {
  id: string;
  tournamentId: string;
  round: number;
  matches: BracketMatch[];
}

export interface BracketMatch {
  matchId: string;
  player1Uid: string;
  player1Name: string;
  player2Uid: string;
  player2Name: string;
  winnerUid: string | null;
  status: 'pending' | 'active' | 'finished';
}

export interface Player {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  coins: number;
  gems: number;
  rankPoints: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  clanId: string | null;
  lastLogin: number;
  isBanned?: boolean;
  isBlacklisted?: boolean;
  mineCapacity: number;
  mineLastCollected: number;
  mineRate: number; // coins per hour
  nfts: string[];
  unlockedTitles?: string[];
  activeTitle?: string | null;
  activeBadge?: 'Owner' | 'Moderator' | 'Content Creator' | null;
  unlockedBadges?: ('Owner' | 'Moderator' | 'Content Creator')[];
  currentWarContributions?: {
      wins: number;
      totalDamage: number;
  }
  royalePass?: PlayerRoyalePassProgress;
  ownedBirds?: { [birdId: string]: Bird };
  equippedBirdId?: string;
  inventory?: {
      insects?: { [insectId: string]: number };
      potions?: { [potionId: string]: number };
  };
  goldSpins?: number;
  diamondSpins?: number;
  weeklyMembershipExpires?: number;
  monthlyMembershipExpires?: number;
  lastMembershipClaim?: number;
  weeklyClaims?: string[]; // 'YYYY-MM-DD'
  monthlyClaims?: string[]; // 'YYYY-MM-DD'
  currentWarId?: string;
  quests?: {
    lastReset: number;
    progress: PlayerQuestProgress;
  };
  lastRankReset?: number;
  dynamicDuo?: DynamicDuo;
  ownedEmotes?: string[];
  equippedEmotes?: string[];
  dynamicDuoCards?: number;
  eventGemsToppedUp?: number;
  eventTopUpRewardClaimed?: boolean;
  statusMessage?: string;
  nameChangeCards?: number;
  hasCompletedTutorial?: boolean;
  dailyRankPoints?: number;
  weeklyRankPoints?: number;
  lastDailyReset?: number;
  lastWeeklyReset?: number;
  normalCustomCards?: number;
  droneCustomCards?: number;
  totalGemsToppedUp?: number;
  consecutiveLosses?: number;
  referral?: ReferralData;
  loginStreak?: LoginStreak;
  totalMatches?: number;
  totalWins?: number;
  totalDamage?: number;
  consecutiveWins?: number;
  achievementPoints?: number;
  lastFreeSpinDate?: string;
  hasPurchasedStarterPack?: boolean;
  unlockedAchievements?: string[];
}

export interface ClanMember {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    rankPoints: number;
    activeBadge?: 'Owner' | 'Moderator' | 'Content Creator';
}

export interface Clan {
    id: string;
    name: string;
    tag: string;
    leaderId: string;
    members: { [uid: string]: ClanMember };
    memberCount: number;
    totalRankPoints: number;
    description: string;
    createdAt: number;
    currentWarId?: string;
    warRoster?: { [uid: string]: { 
        status: 'selected' | 'confirmed'; 
        bird?: Bird; 
        displayName: string | null;
        photoURL: string | null;
        rankPoints: number;
    } };
}

export interface RoundResult {
  roundNumber: number;
  winner: string | null;
  player1Health: number;
  player2Health: number;
}

export interface MatchPlayer {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    damageDealt: number;
    rankPoints: number;
    clanId?: string | null;
    clanTag?: string | null;
    selectedBird: Bird;
    currentHealth: number;
    activeBadge?: 'Owner' | 'Moderator' | 'Content Creator';
    isBot?: boolean;
    equippedEmotes?: string[];
    abilityCooldownLeft?: number;
    abilityUsesLeft?: number;
    ultimateCooldownLeft?: number;
    potions?: { [potionId: string]: number };
    activeEffects?: ActiveEffects;
    healUsesLeft?: number;
    wins?: number;
    perfectMeter?: number;
}

export interface TurnTimer {
    currentTurnStartTime: number;
    turnDuration: number;
}

export interface PersistentMatchState {
    matchId: string;
    playerUid: string;
    lastTurn: number;
    status: string;
}

export interface Match {
    id: string;
    player1: MatchPlayer;
    player2: MatchPlayer;
    player3?: MatchPlayer;
    player4?: MatchPlayer;
    team1_uids?: string[];
    team2_uids?: string[];
    status: 'active' | 'finished' | 'invited' | 'declined';
    winner: string | 'draw' | 'team1' | 'team2' | null;
    createdAt: number;
    startTime: number;
    matchType: 'rank' | 'classic' | 'war' | 'esports';
    matchMode?: '1v1' | '2v2';
    warContext?: {
        warId: string;
        battleIndex: number;
    };
    turn: number;
    currentRound: number;
    rounds: RoundResult[];
    currentTurnPlayerUid: string;
    turnOrder?: string[];
    defeatedUids?: string[];
    log?: string[];
    lastEmote?: {
        senderUid: string;
        emote: string;
        key: string;
    },
    lastReaction?: {
        senderUid: string;
        reaction: string;
        targetPlayerUid: string;
        key: string;
    };
    isNormalized?: boolean;
    turnTimer?: TurnTimer;
    roundTimerEndTime?: number;
}

export interface MatchResult {
    outcome: 'win' | 'loss' | 'draw';
    myDamageDealt: number;
    opponentDamageDealt: number;
    myTeamDamageDealt?: number;
    opponentTeamDamageDealt?: number;
    matchType: 'rank' | 'classic' | 'war' | 'esports';
}

export interface MatchHistoryEntry {
    matchId: string;
    opponentDisplayName: string;
    opponentPhotoURL: string;
    myDamageDealt: number;
    opponentDamageDealt: number;
    outcome: 'win' | 'loss' | 'draw';
    matchType: 'rank' | 'classic' | 'war' | 'esports';
    rankPointChange: number;
    timestamp: number;
}

export interface Invite {
    matchId: string;
    from: string;
    photoURL: string;
    activeBadge?: 'Owner' | 'Moderator' | 'Content Creator';
}

export interface RoomInvite {
    roomId: string;
    from: string;
    photoURL: string;
    activeBadge?: 'Owner' | 'Moderator' | 'Content Creator';
}

export interface RoomSpectator {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export interface CustomRoom {
  id: string;
  hostUid: string;
  hostDisplayName: string;
  hostPhotoURL: string | null;
  guestUid: string | null;
  guestDisplayName: string | null;
  guestPhotoURL: string | null;
  status: 'waiting' | 'full' | 'in_game';
  roomType: 'normal' | 'esports';
  matchId: string | null;
  password?: string;
  createdAt: number;
}

export interface Friend {
    uid: string;
    displayName: string;
    photoURL: string;
    rankPoints: number;
    status: 'pending_sent' | 'pending_received' | 'friends';
    activeBadge?: 'Owner' | 'Moderator' | 'Content Creator';
}

export interface UserPresence {
    isOnline: boolean;
    lastChanged: number;
    inMatch?: string | null;
}

export interface FoodRequest {
  id: string;
  requesterUid: string;
  requesterName: string;
  requesterPhotoURL: string | null;
  insectId: string;
  insectName: string;
  insectIcon: string;
  requestedAmount: number;
  donatedAmount: number;
  donators: { [uid: string]: number }; // uid: amount donated
  timestamp: number;
  status: 'active' | 'completed';
}

export interface ChatMessage {
    id: string;
    uid: string;
    displayName: string;
    photoURL: string | null;
    activeBadge?: 'Owner' | 'Moderator' | 'Content Creator';
    text: string;
    timestamp: number;
    type?: 'text' | 'food_request';
    foodRequestId?: string;
}


export interface StoreItem {
    id: string;
    name: string;
    tier: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Currency';
    description: string;
    cost: {
        coins?: number;
        gems?: number;
    };
    type: 'bird' | 'insect' | 'upgrade' | 'currency' | 'emote' | 'duo_card' | 'name_change_card' | 'normal_custom_card' | 'drone_custom_card';
    payload: any;
    icon: string;
}

export interface Notification {
    id: string;
    text: string;
    timestamp: number;
}

export interface GiftPayload {
    type: 'coins' | 'gems' | 'bird' | 'insect' | 'badge' | 'drone_custom_card';
    itemId?: string; // for bird or insect
    amount?: number; // for coins, gems, or insect quantity
    badgeName?: 'Owner' | 'Moderator' | 'Content Creator';
    icon?: string;
    name?: string;
}

export interface MailItem {
    id: string;
    type: 'gift' | 'message' | 'duo_request';
    message: string;
    timestamp: number;
    status: 'unread' | 'read' | 'claimed';
    gift?: GiftPayload;
    duoRequest?: {
        fromUid: string;
        fromDisplayName: string;
    };
}

export interface Report {
    reporterUid: string;
    reporterName: string | null;
    reportedUid: string;
    reportedName: string | null;
    matchId: string;
    category: string;
    details: string;
    timestamp: number;
    status: 'new' | 'investigating' | 'resolved';
}


export interface GameEvent {
    id: string;
    title: string;
    description: string;
}

export interface TopUpProduct {
    id: string;
    type: 'gems' | 'weekly_membership' | 'monthly_membership';
    name: string;
    description: string;
    price: number;
    payload: {
        gems?: number;
        durationDays?: number;
        dailyGems?: number;
    },
    icon: string;
}

export interface PurchaseRequest {
    id: string;
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    productId: string;
    productName: string;
    price: number;
    paymentMethod: 'bkash' | 'nagad' | 'rocket';
    transactionId: string;
    senderNumber: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: number;
}

export interface TournamentPlayer {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    rankPoints: number;
}

export interface Tournament {
    id: string;
    name: string;
    description: string;
    // Fix: Add 'active' to status to allow for type-safe comparisons in components.
    status: 'upcoming' | 'active' | 'finished';
    entryFee: {
        coins?: number;
        gems?: number;
    };
    prizePool: {
        coins?: number;
        gems?: number;
        nftCard?: 'Bronze' | 'Silver' | 'Gold';
    };
    maxPlayers: number;
    playerCount: number;
    players: { [uid: string]: TournamentPlayer };
    createdAt: number;
    startTime: number;
    winnerUid?: string;
    winnerDisplayName?: string;
}


// --- CLAN WAR TYPES ---

export interface ClanWarParticipant {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    rankPoints: number;
    selectedBird: Bird;
    hasAttacked: boolean;
    starsEarned: number;
}

export interface Battle {
    clan1ParticipantUid: string;
    clan2ParticipantUid: string;
    matchId: string | null;
    winnerUid: string | null;
    stars: number;
    status: 'pending' | 'active' | 'finished';
}

export interface ClanWar {
    id: string;
    status: 'preparation' | 'battle_day' | 'finished';
    clan1: {
        clanId: string;
        clanName: string;
        clanTag: string;
        participants: { [uid: string]: ClanWarParticipant };
        score: number;
    };
    clan2: {
        clanId: string;
        clanName: string;
        clanTag: string;
        participants: { [uid: string]: ClanWarParticipant };
        score: number;
    };
    preparationEndTime: number;
    battleDayEndTime: number;
    battles: Battle[];
    winnerClanId: string | null;
    createdAt: number;
}
