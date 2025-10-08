import React, { useEffect, useState } from 'react';
import { useBotStore } from '../store/botStore';
import { getTokenPrice } from '../utils/web3';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface PriceTarget {
  price: number;
  executed: boolean;
  id: string;
}

export const PriceTargets: React.FC = () => {
  const { tradingStrategy, botRunning, activityLogs } = useBotStore();
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [initialPrice, setInitialPrice] = useState<number | null>(null);
  const [priceTargets, setPriceTargets] = useState<PriceTarget[]>([]);
  const [reserveTargets, setReserveTargets] = useState<PriceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculatePriceTargets = async (forceRecalculate = false) => {
    if (!tradingStrategy.selectedToken || tradingStrategy.tradingMode !== 'percentage') {
      setPriceTargets([]);
      setReserveTargets([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const price = await getTokenPrice(tradingStrategy.selectedToken);
      
      if (price <= 0) {
        setError('Could not fetch current token price');
        return;
      }

      setCurrentPrice(price);

      // Only calculate new targets if bot is not running or we're forcing a recalculation
      if (!botRunning || forceRecalculate) {
        setInitialPrice(price);
        const allTargets: PriceTarget[] = [];
        let targetPrice = price;

        // Calculate 15 price targets (5 visible + 10 reserve)
        for (let i = 0; i < 15; i++) {
          if (tradingStrategy.type === 'daily_smooth_buy') {
            targetPrice = targetPrice * (1 - tradingStrategy.percentageThreshold / 100);
          } else {
            targetPrice = targetPrice * (1 + tradingStrategy.percentageThreshold / 100);
          }
          allTargets.push({
            price: targetPrice,
            executed: false,
            id: `target-${Date.now()}-${i}`
          });
        }

        // Split targets into visible and reserve
        setPriceTargets(allTargets.slice(0, 5));
        setReserveTargets(allTargets.slice(5));
      }
    } catch (error) {
      setError('Failed to calculate price targets');
      console.error('Error calculating price targets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for executed trades and update targets
  useEffect(() => {
    if (!botRunning || priceTargets.length === 0) return;

    const lastLog = activityLogs[0];
    if (!lastLog) return;

    const updatedTargets = [...priceTargets];
    let targetExecuted = false;

    for (let i = 0; i < updatedTargets.length; i++) {
      const target = updatedTargets[i];
      if (target.executed) continue;

      const priceMatch = tradingStrategy.type === 'daily_smooth_buy'
        ? lastLog.price <= target.price
        : lastLog.price >= target.price;

      if (priceMatch) {
        target.executed = true;
        targetExecuted = true;
        break;
      }
    }

    if (targetExecuted && reserveTargets.length > 0) {
      // Remove executed targets
      const activeTargets = updatedTargets.filter(t => !t.executed);
      
      // Add new targets from reserve
      const neededTargets = 5 - activeTargets.length;
      const newTargets = reserveTargets.slice(0, neededTargets);
      const remainingReserve = reserveTargets.slice(neededTargets);

      setPriceTargets([...activeTargets, ...newTargets]);
      setReserveTargets(remainingReserve);

      // If reserve is getting low, calculate more targets
      if (remainingReserve.length < 5) {
        const lastTarget = remainingReserve[remainingReserve.length - 1] || newTargets[newTargets.length - 1];
        let targetPrice = lastTarget.price;
        const additionalTargets: PriceTarget[] = [];

        for (let i = 0; i < 10; i++) {
          if (tradingStrategy.type === 'daily_smooth_buy') {
            targetPrice = targetPrice * (1 - tradingStrategy.percentageThreshold / 100);
          } else {
            targetPrice = targetPrice * (1 + tradingStrategy.percentageThreshold / 100);
          }
          additionalTargets.push({
            price: targetPrice,
            executed: false,
            id: `target-${Date.now()}-${remainingReserve.length + i}`
          });
        }

        setReserveTargets([...remainingReserve, ...additionalTargets]);
      }
    }
  }, [activityLogs, botRunning]);

  // Recalculate targets when bot starts or trading strategy changes
  useEffect(() => {
    if (!botRunning) {
      calculatePriceTargets(true);
    }
  }, [botRunning, tradingStrategy.selectedToken, tradingStrategy.percentageThreshold, tradingStrategy.type, tradingStrategy.tradingMode]);

  // Update current price periodically
  useEffect(() => {
    const updateCurrentPrice = async () => {
      if (!tradingStrategy.selectedToken) return;
      
      try {
        const price = await getTokenPrice(tradingStrategy.selectedToken);
        if (price > 0) {
          setCurrentPrice(price);
        }
      } catch (error) {
        console.error('Error updating current price:', error);
      }
    };

    const interval = setInterval(updateCurrentPrice, 10000);
    return () => clearInterval(interval);
  }, [tradingStrategy.selectedToken]);

  if (tradingStrategy.tradingMode !== 'percentage') {
    return null;
  }

  return (
    <div className="mt-6 bg-gray-100 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {tradingStrategy.type === 'daily_smooth_buy' ? 'Buy Targets' : 'Sell Targets'}
      </h3>

      {error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`loading-skeleton-${i}`} className="animate-pulse flex space-x-4">
              <div className="h-6 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {currentPrice && (
            <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-gray-900">Current Price:</span>
              <span className="text-primary font-bold">${currentPrice.toFixed(14)}</span>
            </div>
          )}

          {initialPrice && botRunning && (
            <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-gray-900">Initial Price:</span>
              <span className="text-primary font-bold">${initialPrice.toFixed(14)}</span>
            </div>
          )}
          
          {priceTargets.map((target, index) => (
            <div 
              key={target.id}
              className={`flex justify-between items-center p-2 bg-white rounded-lg border ${
                target.executed 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Target {index + 1}:</span>
                {target.executed && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
              <span className={`font-bold ${target.executed ? 'text-green-600' : 'text-primary'}`}>
                ${target.price.toFixed(14)}
              </span>
            </div>
          ))}

          <div className="mt-4 text-sm text-gray-600">
            {botRunning ? (
              <p>
                {tradingStrategy.type === 'daily_smooth_buy'
                  ? `Bot will buy when price drops to target levels`
                  : `Bot will sell when price rises to target levels`}
              </p>
            ) : (
              <p>
                {tradingStrategy.type === 'daily_smooth_buy'
                  ? `Bot will buy when price drops by ${tradingStrategy.percentageThreshold}% from each level`
                  : `Bot will sell when price increases by ${tradingStrategy.percentageThreshold}% from each level`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};