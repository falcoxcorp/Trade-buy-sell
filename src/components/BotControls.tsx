import React, { useEffect, useRef, useState } from 'react';
import { useBotStore } from '../store/botStore';
import { initializeWeb3, executeTrade, getTokenPrice, getTokenBalance } from '../utils/web3';
import { format } from 'date-fns';
import Web3 from 'web3';
import { AlertCircle } from 'lucide-react';
import { PriceTargets } from './PriceTargets';

interface PriceTarget {
  price: number;
  executed: boolean;
  id: string;
}

export const BotControls: React.FC = () => {
  const { 
    botRunning, 
    setBotRunning, 
    tradingStrategy, 
    wallets,
    addActivityLog,
    updateBotStats,
    updateTotalVolume,
    botStats,
    customTokens
  } = useBotStore();
  
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef<number>(0);
  const initialPriceRef = useRef<number | null>(null);
  const priceTargetsRef = useRef<PriceTarget[]>([]);
  const reconnectAttemptsRef = useRef<number>(0);
  const MAX_ERRORS = 3;
  const ERROR_RESET_TIME = 5 * 60 * 1000;
  const MAX_RECONNECT_ATTEMPTS = 100; // High number for persistent reconnection
  const RECONNECT_DELAY = 5000; // 5 seconds between reconnection attempts

  const getRandomAmount = (min: number, max: number): string => {
    const amount = Math.random() * (max - min) + min;
    return amount.toFixed(6);
  };

  const getTokenSymbol = (address: string): string => {
    return customTokens[address]?.name || 'PIPI';
  };

  const calculatePriceTargets = async () => {
    if (!tradingStrategy.selectedToken || tradingStrategy.tradingMode !== 'percentage') {
      return;
    }

    const currentPrice = await getTokenPrice(tradingStrategy.selectedToken);
    if (currentPrice <= 0) {
      throw new Error('Could not get initial token price');
    }

    initialPriceRef.current = currentPrice;
    const targets: PriceTarget[] = [];
    let targetPrice = currentPrice;

    // Calculate 15 price targets (5 visible + 10 reserve)
    for (let i = 0; i < 15; i++) {
      if (tradingStrategy.type === 'daily_smooth_buy') {
        targetPrice = targetPrice * (1 - tradingStrategy.percentageThreshold / 100);
      } else {
        targetPrice = targetPrice * (1 + tradingStrategy.percentageThreshold / 100);
      }
      
      targets.push({
        price: targetPrice,
        executed: false,
        id: `target-${Date.now()}-${i}`
      });
    }

    priceTargetsRef.current = targets;
    console.log('Initial price targets calculated:', targets);
  };

  const checkPriceTargets = async (currentPrice: number): Promise<boolean> => {
    if (!initialPriceRef.current || priceTargetsRef.current.length === 0) {
      return false;
    }

    const visibleTargets = priceTargetsRef.current.slice(0, 5);
    const reserveTargets = priceTargetsRef.current.slice(5);

    for (let i = 0; i < visibleTargets.length; i++) {
      const target = visibleTargets[i];
      if (target.executed) continue;

      const shouldExecute = tradingStrategy.type === 'daily_smooth_buy'
        ? currentPrice <= target.price
        : currentPrice >= target.price;

      if (shouldExecute) {
        target.executed = true;
        
        if (reserveTargets.length > 0) {
          const newTarget = reserveTargets.shift()!;
          priceTargetsRef.current = [
            ...visibleTargets.slice(0, i),
            target,
            ...visibleTargets.slice(i + 1),
            newTarget,
            ...reserveTargets
          ];
        }

        return true;
      }
    }

    return false;
  };

  const reconnect = async (): Promise<boolean> => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError('Maximum reconnection attempts reached. Please check your internet connection and restart the bot.');
      setBotRunning(false);
      return false;
    }

    try {
      setReconnecting(true);
      const web3 = await initializeWeb3();
      if (!web3) {
        throw new Error('Failed to initialize Web3');
      }

      reconnectAttemptsRef.current = 0;
      setReconnecting(false);
      setError(null);
      return true;
    } catch (error) {
      reconnectAttemptsRef.current++;
      console.error(`Reconnection attempt ${reconnectAttemptsRef.current} failed:`, error);
      return false;
    }
  };

  const executeTradingStrategy = async () => {
    if (!botRunning) return;

    if (wallets.length === 0) {
      setError('No wallets available');
      setBotRunning(false);
      return;
    }

    if (!tradingStrategy.selectedToken) {
      setError('No token selected for trading');
      setBotRunning(false);
      return;
    }

    let web3 = await initializeWeb3();
    if (!web3) {
      setError('Network connection lost. Attempting to reconnect...');
      const reconnected = await reconnect();
      if (!reconnected) {
        await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
        return;
      }
      web3 = await initializeWeb3();
      if (!web3) return;
    }

    try {
      const currentPrice = await getTokenPrice(tradingStrategy.selectedToken);
      if (currentPrice <= 0) {
        throw new Error('Invalid token price received');
      }

      if (tradingStrategy.tradingMode === 'percentage' && !initialPriceRef.current) {
        await calculatePriceTargets();
      }

      let shouldTrade = false;
      if (tradingStrategy.tradingMode === 'percentage') {
        shouldTrade = await checkPriceTargets(currentPrice);
      } else {
        shouldTrade = true;
      }

      if (!shouldTrade) {
        return;
      }

      const wallet = wallets[Math.floor(Math.random() * wallets.length)];
      const type = tradingStrategy.type === 'daily_smooth_buy' ? 'buy' : 'sell';
      const amount = getRandomAmount(tradingStrategy.minAmount, tradingStrategy.maxAmount);

      const receipt = await executeTrade(
        web3,
        tradingStrategy.selectedDex,
        type,
        amount,
        Math.floor(tradingStrategy.slippage * 10),
        wallet,
        tradingStrategy.selectedToken
      );

      if (!receipt || !receipt.status) {
        throw new Error('Transaction failed');
      }

      errorCountRef.current = 0;
      setError(null);

      updateBotStats({
        totalTx: botStats.totalTx + 1,
        totalBuys: type === 'buy' ? botStats.totalBuys + 1 : botStats.totalBuys,
        totalSells: type === 'sell' ? botStats.totalSells + 1 : botStats.totalSells,
      });

      const tokenSymbol = getTokenSymbol(tradingStrategy.selectedToken);
      addActivityLog({
        type,
        amount,
        timestamp: format(new Date(), 'HH:mm:ss'),
        price: currentPrice,
        dex: tradingStrategy.selectedDex,
        tokenSymbol
      });

      updateTotalVolume(parseFloat(amount) * currentPrice);
    } catch (error) {
      console.error('Trading error:', error);
      errorCountRef.current++;
      
      if (error instanceof Error) {
        if (error.message.includes('network') || 
            error.message.includes('connection') || 
            error.message.includes('Failed to fetch')) {
          setError('Network connection lost. Attempting to reconnect...');
          const reconnected = await reconnect();
          if (!reconnected) {
            await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
          }
          return;
        }
        
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }

      if (errorCountRef.current >= MAX_ERRORS) {
        const stopMessage = `Bot stopped: ${MAX_ERRORS} consecutive errors occurred`;
        console.error(stopMessage);
        setError(stopMessage);
        setBotRunning(false);
        return;
      }

      setTimeout(() => {
        errorCountRef.current = 0;
        setError(null);
      }, ERROR_RESET_TIME);
    }
  };

  useEffect(() => {
    if (botRunning) {
      if (!tradingStrategy.selectedToken) {
        setError('No token selected for trading');
        setBotRunning(false);
        return;
      }

      errorCountRef.current = 0;
      reconnectAttemptsRef.current = 0;
      initialPriceRef.current = null;
      priceTargetsRef.current = [];
      
      executeTradingStrategy();

      const monitoringInterval = tradingStrategy.tradingMode === 'percentage' ? 10000 : 
        tradingStrategy.intervalType === 'seconds' ? tradingStrategy.interval * 1000 :
        tradingStrategy.intervalType === 'minutes' ? tradingStrategy.interval * 60 * 1000 :
        tradingStrategy.interval * 60 * 60 * 1000;

      intervalRef.current = setInterval(executeTradingStrategy, monitoringInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      initialPriceRef.current = null;
      priceTargetsRef.current = [];
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [botRunning, tradingStrategy]);

  const handleStart = () => {
    if (!tradingStrategy.selectedToken) {
      setError('Please select a token for trading first');
      return;
    }
    if (wallets.length === 0) {
      setError('Please add at least one wallet first');
      return;
    }
    setError(null);
    initialPriceRef.current = null;
    priceTargetsRef.current = [];
    reconnectAttemptsRef.current = 0;
    setBotRunning(true);
  };

  const handleStop = () => {
    setBotRunning(false);
    setError(null);
    initialPriceRef.current = null;
    priceTargetsRef.current = [];
    reconnectAttemptsRef.current = 0;
  };

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {reconnecting && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-2"></div>
            <span className="text-yellow-700">Attempting to reconnect...</span>
          </div>
        </div>
      )}

      <div className="status bg-gray-100 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm ${
            botRunning 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {botRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        {botRunning && (
          <div className="mt-2 text-sm text-gray-900">
            {tradingStrategy.type === 'daily_smooth_buy' ? 'Buying' : 'Selling'} {getTokenSymbol(tradingStrategy.selectedToken)}{' '}
            {tradingStrategy.tradingMode === 'interval' ? (
              `every ${tradingStrategy.interval} ${tradingStrategy.intervalType}`
            ) : (
              `when price ${tradingStrategy.type === 'daily_smooth_buy' ? 'drops' : 'increases'} by ${tradingStrategy.percentageThreshold}%`
            )}{' '}
            on {tradingStrategy.selectedDex}
          </div>
        )}
      </div>

      <PriceTargets />
      
      <div className="flex gap-4">
        <button
          onClick={handleStart}
          disabled={botRunning}
          className={`btn flex-1 ${
            botRunning 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'btn-primary'
          }`}
        >
          Start Bot
        </button>
        <button
          onClick={handleStop}
          disabled={!botRunning}
          className={`btn flex-1 ${
            !botRunning 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'btn-secondary'
          }`}
        >
          Stop Bot
        </button>
      </div>
    </div>
  );
};