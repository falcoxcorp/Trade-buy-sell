import React, { useEffect, useState } from 'react';
import { useBotStore } from '../store/botStore';
import { getTokenPrice } from '../utils/web3';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const PriceTargets: React.FC = () => {
  const {
    tradingStrategy,
    botRunning,
    priceTargets: storedPriceTargets,
    initialPrice: storedInitialPrice
  } = useBotStore();
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError('Could not fetch current token price');
      }
    };

    updateCurrentPrice();
    const interval = setInterval(updateCurrentPrice, 10000);
    return () => clearInterval(interval);
  }, [tradingStrategy.selectedToken]);

  if (tradingStrategy.tradingMode !== 'percentage') {
    return null;
  }

  const visibleTargets = storedPriceTargets.slice(0, 5);
  const hasTargets = visibleTargets.length > 0;

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
      ) : !hasTargets ? (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <p className="text-blue-700">
            {botRunning
              ? 'Price targets will be calculated when bot starts...'
              : 'Start the bot to generate price targets based on current market price'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentPrice && (
            <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-gray-900">Current Price:</span>
              <span className="text-primary font-bold">${currentPrice.toFixed(14)}</span>
            </div>
          )}

          {storedInitialPrice && (
            <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-gray-900">Initial Price (at bot start):</span>
              <span className="text-primary font-bold">${storedInitialPrice.toFixed(14)}</span>
            </div>
          )}

          {visibleTargets.map((target, index) => (
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
              <span className={`font-bold ${target.executed ? 'text-green-600 line-through' : 'text-primary'}`}>
                ${target.price.toFixed(14)}
              </span>
            </div>
          ))}

          <div className="mt-4 text-sm text-gray-600 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
            <p className="font-semibold text-yellow-800 mb-1">
              {botRunning ? '🤖 Bot is Active' : '⏸️ Bot is Stopped'}
            </p>
            <p className="text-yellow-700">
              {botRunning ? (
                <>
                  {tradingStrategy.type === 'daily_smooth_buy'
                    ? `Bot will execute BUY when price drops to these target levels`
                    : `Bot will execute SELL when price rises to these target levels`}
                  {'. '}
                  These targets persist even if you close the page.
                </>
              ) : (
                <>
                  These targets will be cleared when you stop the bot. Start the bot to activate automated trading at these price levels.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
