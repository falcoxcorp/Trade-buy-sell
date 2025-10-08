import React, { useEffect, useState } from 'react';
import { getTokenPrice } from '../utils/web3';
import { useBotStore } from '../store/botStore';

export const MarketStats: React.FC = () => {
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { volume24h, lastVolume24hReset } = useBotStore(state => ({
    volume24h: state.volume24h,
    lastVolume24hReset: state.lastVolume24hReset
  }));
  const selectedToken = useBotStore(state => state.tradingStrategy.selectedToken);
  const customTokens = useBotStore(state => state.customTokens);
  const reset24hVolume = useBotStore(state => state.reset24hVolume);

  const getTokenName = () => {
    if (selectedToken in customTokens) {
      return customTokens[selectedToken].name;
    }
    return 'PIPI';
  };

  useEffect(() => {
    let mounted = true;
    let priceInterval: NodeJS.Timeout;

    const updatePrice = async () => {
      if (!mounted) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const price = await getTokenPrice(selectedToken);
        if (!mounted) return;
        
        setTokenPrice(price);
        if (price === 0) {
          setError('Unable to fetch current price');
        }
      } catch (error) {
        if (!mounted) return;
        setError('Price update failed');
        console.error('Price fetch error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    updatePrice();
    priceInterval = setInterval(updatePrice, 30000);

    const volumeInterval = setInterval(() => {
      if (!mounted) return;
      
      const now = Date.now();
      const hoursPassed = (now - lastVolume24hReset) / (1000 * 60 * 60);
      if (hoursPassed >= 24) {
        reset24hVolume();
      }
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(priceInterval);
      clearInterval(volumeInterval);
    };
  }, [selectedToken, lastVolume24hReset]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h4 className="text-sm text-gray-900">{getTokenName()} Price</h4>
        <div className="text-xl font-bold text-primary">
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
          ) : error ? (
            <div className="text-red-500 text-sm">{error}</div>
          ) : (
            `$${tokenPrice?.toFixed(14) ?? '0.00000000000000'}`
          )}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h4 className="text-sm text-gray-900">24h Volume</h4>
        <div className="text-xl font-bold text-primary">
          ${volume24h.toFixed(2)}
        </div>
      </div>
    </div>
  );
};