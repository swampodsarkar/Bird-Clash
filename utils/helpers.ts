import { RANK_TIERS } from '../constants';
import type { RankTier } from '../types';

export interface RankInfo {
    tier: RankTier;
    rankName: string; // e.g., Bronze 1
}

export const getRankTier = (rankPoints: number): RankTier => {
    // Find the tier where the player's points fall within the range.
    const tier = RANK_TIERS.find(t => rankPoints >= t.minPoints && rankPoints <= t.maxPoints);
    
    // Handle edge cases: if points are above the highest defined tier, or below the lowest.
    if (!tier) {
      if (rankPoints >= RANK_TIERS[RANK_TIERS.length - 1].minPoints) {
        return RANK_TIERS[RANK_TIERS.length - 1]; // Grandmaster
      }
      return RANK_TIERS[0]; // Bronze I
    }
    
    return tier;
};

export const getRankInfo = (rankPoints: number): RankInfo => {
    const tier = getRankTier(rankPoints);
    return {
        tier,
        rankName: tier.name,
    };
};

export const isWinterThemeActive = (): boolean => {
    // This function will enable the winter theme for two months.
    // Set the start date to the day of deployment.
    // Example: October 27, 2024
    const themeStartDate = new Date('2024-10-27T00:00:00Z'); 
    
    const themeEndDate = new Date(themeStartDate);
    themeEndDate.setMonth(themeEndDate.getMonth() + 2); // Add two months

    const now = new Date();
    return now >= themeStartDate && now < themeEndDate;
};
