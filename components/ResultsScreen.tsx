
import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Match, MatchResult, Player, PowerUpType } from '../types';
import { rtdb } from '../services/firebase';
import type firebase from 'firebase/compat/app';
import { 
    updatePlayerCoins, 
    updatePlayerRankPointsAndClan, 
    recordMatchHistory, 
    checkAndAwardTitles,
    addRoyalePassXp,
    addPlayerXpAndLevelUp
} from '../services/playerService';
import * as clanWarService from '../services/clanWarService';
import { Confetti } from './common/Confetti';
import Button from './common/Button';
import { useGameConfig } from '../hooks/useGameConfig';
import { getRankInfo } from '../utils/helpers';

const AnimatedCounter: React.FC<{ target: number, duration?: number }> = ({ target, duration = 1000 }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(count);
    countRef.current = count;

    useEffect(() => {
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }, [target, duration]);

    return <span>{count}</span>;
};

interface ResultsScreenProps {
  data: {
    result: MatchResult;
    match: Match;
  };
  currentUserId: string;
  onPlayAgain: () => void;
  playerData: Player;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ data, currentUserId, onPlayAgain, playerData }) => {
  const { result, match } = data;
  const config = useGameConfig();
  const processingComplete = useRef(false);
  const isWarMatch = match.matchType === 'war';
  const [showLog, setShowLog] = useState(false);
  const [streakProtected, setStreakProtected] = useState(false);
  const [closeCallBonus, setCloseCallBonus] = useState(0);

  const { me, opponent } = useMemo(() => {
    if (match.player1.uid === currentUserId) {
      return { me: match.player1, opponent: match.player2 };
    }
    return { me: match.player2, opponent: match.player1 };
  }, [match, currentUserId]);

  useEffect(() => {
    const applyChanges = async () => {
        if (processingComplete.current) return;
        processingComplete.current = true;
        
        try {
            if (isWarMatch && match.warContext) {
                 await clanWarService.recordWarAttackResult(
                    match.warContext.warId,
                    match.warContext.battleIndex,
                    result.outcome === 'win' ? me.uid : opponent.uid,
                    result.outcome
                );
            } else {
                // This logic applies to the single player
                const isRanked = result.matchType === 'rank';
                let trophyChange = 0;
                let coinChange = 0;
                let closeCallAmount = 0;

                if (isRanked) {
                    const { tier } = getRankInfo(playerData.rankPoints);
                    if (result.outcome === 'win') {
                        coinChange = config.RANK_WINNER_REWARD_COINS;
                        trophyChange = tier.winPoints;
                    } else if (result.outcome === 'loss') {
                        // --- Retention Logic: Close Call Bonus ---
                        const opponentRemainingHealth = opponent.currentHealth;
                        const opponentMaxHealth = opponent.selectedBird.maxHealth;
                        if (opponentRemainingHealth > 0 && (opponentRemainingHealth / opponentMaxHealth) <= 0.15) {
                            // If opponent had <= 15% HP left, give a consolation prize (50% of win reward)
                            closeCallAmount = Math.floor(config.RANK_WINNER_REWARD_COINS * 0.5);
                            coinChange += closeCallAmount;
                            setCloseCallBonus(closeCallAmount);
                        }

                        // --- Streak Protection Logic ---
                        if ((playerData.consecutiveLosses || 0) >= 2) {
                            trophyChange = 0;
                            setStreakProtected(true);
                        } else {
                            trophyChange = -tier.lossPoints;
                        }
                    }
                } else { // Classic
                    const entryFee = config.CLASSIC_ENTRY_FEE_COINS;
                    const winnerReward = config.CLASSIC_WINNER_REWARD_COINS;
                    if (result.outcome === 'win') {
                        coinChange = winnerReward - entryFee;
                    } else if (result.outcome === 'loss') {
                        coinChange = -entryFee;
                    }
                }

                if (coinChange !== 0) {
                    await updatePlayerCoins(currentUserId, coinChange);
                }
                
                if (isRanked) {
                    await updatePlayerRankPointsAndClan(currentUserId, trophyChange);
                }

                await recordMatchHistory(currentUserId, match, result, trophyChange);
                await checkAndAwardTitles(currentUserId);
                
                const xpGained = result.outcome === 'win' ? 25 : 10;
                await addRoyalePassXp(currentUserId, xpGained);

                const xpForLevel = result.outcome === 'win' ? 200 : result.outcome === 'loss' ? 150 : 175;
                await addPlayerXpAndLevelUp(currentUserId, xpForLevel);
            }
        } catch (error) {
            console.error("Failed to update player stats after match:", error);
        }
    };
    applyChanges();
  }, [result, match, currentUserId, playerData, config, isWarMatch, me, opponent]);
  
  const getTitle = () => {
    switch(result.outcome) {
      case 'win': return "VICTORY!";
      case 'loss': return "DEFEAT";
      case 'draw': return "DRAW";
    }
  };
  
  const getRewardInfo = () => {
    const isRanked = result.matchType === 'rank';
    
    if (isRanked) {
        const { tier } = getRankInfo(playerData.rankPoints);
        let trophyChange = 0;
        if (result.outcome === 'win') trophyChange = tier.winPoints;
        else if (result.outcome === 'loss') {
             if (streakProtected) trophyChange = 0;
             else trophyChange = -tier.lossPoints;
        }

        const coinChange = (result.outcome === 'win' ? config.RANK_WINNER_REWARD_COINS : 0) + closeCallBonus;
        
        let coinMessage = '';
        if (result.outcome === 'win') coinMessage = 'You received a bonus for your victory!';
        else if (closeCallBonus > 0) coinMessage = 'Close call! Consolation reward earned.';
        else coinMessage = 'Better luck next time.';

        return { 
            coins: coinChange,
            trophies: trophyChange, 
            coinMessage
        };
    } else { // Classic
        const entryFee = config.CLASSIC_ENTRY_FEE_COINS;
        const winnerReward = config.CLASSIC_WINNER_REWARD_COINS;
        let coinChange = 0;
        let coinMessage = "The match was a draw.";

        if (result.outcome === 'win') {
            coinChange = winnerReward - entryFee;
            coinMessage = `You won ${winnerReward} coins!`;
        } else if (result.outcome === 'loss') {
            coinChange = -entryFee;
            coinMessage = `You lost the ${entryFee} coin entry fee.`;
        }
        return { coins: coinChange, trophies: 0, coinMessage };
    }
  };
  
  if (isWarMatch) {
    const stars = result.outcome === 'win' ? 3 : 0;
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center relative overflow-hidden p-4">
            {result.outcome === 'win' && <Confetti />}
            <div className="p-6 sm:p-8 bg-[#2c2c54]/90 backdrop-blur-sm border-2 border-black shadow-[8px_8px_0px_#000000] w-full max-w-md">
                <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-yellow-400" style={{ textShadow: '2px 2px 0px #000' }}>
                    {getTitle()}
                </h1>
                <p className="text-2xl font-bold text-white">
                    You earned <span className="text-yellow-300">{stars} ★</span> for your clan!
                </p>
                 <div className="my-6 grid grid-cols-2 gap-4 text-lg">
                    <div className="bg-gray-900/50 border-2 border-black p-2">
                        <p className="text-xs text-blue-300">Your Damage</p>
                        <p className="font-bold text-2xl text-blue-400"><AnimatedCounter target={result.myDamageDealt} /></p>
                    </div>
                    <div className="bg-gray-900/50 border-2 border-black p-2">
                        <p className="text-xs text-red-300">Opponent's Damage</p>
                        <p className="font-bold text-2xl text-red-400"><AnimatedCounter target={result.opponentDamageDealt} /></p>
                    </div>
                </div>
                <Button onClick={onPlayAgain} className="w-full mt-4">
                    Return to Clan
                </Button>
            </div>
        </div>
    )
  }

  const rewardInfo = getRewardInfo();
  const titleColor = result.outcome === 'win' ? 'text-yellow-400' : result.outcome === 'loss' ? 'text-red-500' : 'text-gray-300';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center relative overflow-hidden p-4">
      {result.outcome === 'win' && <Confetti />}
      <div className="p-6 sm:p-8 bg-[#2c2c54]/90 backdrop-blur-sm border-2 border-black shadow-[8px_8px_0px_#000000] w-full max-w-md">
        <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${titleColor}`} style={{ textShadow: '2px 2px 0px #000' }}>{getTitle()}</h1>
        
        <div className="my-6 grid grid-cols-2 gap-4 text-lg">
          <div className="bg-gray-900/50 border-2 border-black p-2">
            <p className="text-xs text-blue-300">Your Damage</p>
            <p className="font-bold text-2xl text-blue-400"><AnimatedCounter target={result.myDamageDealt} /></p>
          </div>
           <div className="bg-gray-900/50 border-2 border-black p-2">
            <p className="text-xs text-red-300">Opponent's Damage</p>
            <p className="font-bold text-2xl text-red-400"><AnimatedCounter target={result.opponentDamageDealt} /></p>
          </div>
        </div>
        
        <div className="mb-6 space-y-2 bg-black/20 p-3 border-2 border-black relative">
            {streakProtected && (
                <div className="absolute -top-3 right-[-10px] bg-yellow-500 text-black text-xs font-bold px-2 py-1 rotate-12 border-2 border-white shadow-lg animate-pulse">
                    MERCY SHIELD ACTIVE!
                </div>
            )}
            {closeCallBonus > 0 && (
                 <div className="absolute -top-3 left-[-10px] bg-blue-500 text-white text-xs font-bold px-2 py-1 -rotate-12 border-2 border-white shadow-lg">
                    SO CLOSE!
                </div>
            )}
            <p className="text-sm font-semibold text-yellow-500">{rewardInfo.coinMessage}</p>
            <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                <p className={rewardInfo.coins >= 0 ? 'text-green-400' : 'text-red-400'}>
                   {rewardInfo.coins >= 0 ? '+' : ''}<AnimatedCounter target={Math.abs(rewardInfo.coins)} /> 💰
                </p>
                {result.matchType === 'rank' && (
                    <p className={rewardInfo.trophies >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {rewardInfo.trophies >= 0 ? '+' : ''}<AnimatedCounter target={Math.abs(rewardInfo.trophies)} /> RP
                    </p>
                )}
            </div>
        </div>
        
        <div className="space-y-4">
            <Button onClick={() => setShowLog(!showLog)} variant="secondary" className="w-full !py-2 !text-xs">
                {showLog ? 'Hide Battle Log' : 'View Battle Log'}
            </Button>
            
            {showLog && (
                <div className="max-h-40 overflow-y-auto bg-black/50 p-2 text-xs text-left text-gray-300 font-mono border border-gray-600 mb-2">
                    {match.log?.map((entry, idx) => (
                        <p key={idx}>{entry}</p>
                    ))}
                </div>
            )}

            <Button onClick={onPlayAgain} className="w-full">
              Play Again
            </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
