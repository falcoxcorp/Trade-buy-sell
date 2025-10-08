import React, { useEffect, useState } from 'react';
import { useBotStore } from '../store/botStore';
import { initializeWeb3, getTokenBalance, getTokenPrice, WCORE_ADDRESS } from '../utils/web3';
import { Trash2, RefreshCw } from 'lucide-react';
import Web3 from 'web3';

interface TokenBalance {
  amount: string;
  usdValue: number;
}

interface WalletBalances {
  core: TokenBalance;
  [key: string]: TokenBalance;
}

export const WalletBalances: React.FC = () => {
  const wallets = useBotStore(state => state.wallets);
  const customTokens = useBotStore(state => state.customTokens);
  const removeWallet = useBotStore(state => state.removeWallet);
  const botRunning = useBotStore(state => state.botRunning);
  const activityLogs = useBotStore(state => state.activityLogs);
  const [balances, setBalances] = useState<Record<string, WalletBalances>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({ core: 0 });
  const [error, setError] = useState<string | null>(null);

  const fetchTokenPrices = async () => {
    try {
      setError(null);
      const tokenAddresses = [WCORE_ADDRESS, ...Object.keys(customTokens)];
      const pricePromises = tokenAddresses.map(address => getTokenPrice(address));
      const fetchedPrices = await Promise.all(pricePromises);

      const newPrices: Record<string, number> = {
        core: fetchedPrices[0]
      };

      tokenAddresses.slice(1).forEach((address, index) => {
        newPrices[address] = fetchedPrices[index + 1];
      });

      setPrices(newPrices);
      return newPrices;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('Error fetching token prices:', errorMessage);
      setError('Failed to fetch token prices. Using cached values.');
      return prices;
    }
  };

  const updateBalances = async (force = false) => {
    if (wallets.length === 0) {
      setLoading(false);
      return;
    }

    if (force) {
      setRefreshing(true);
    }

    try {
      setError(null);
      const web3 = await initializeWeb3();
      if (!web3) throw new Error('Failed to connect to Web3');

      const tokenPrices = await fetchTokenPrices();
      const newBalances: Record<string, WalletBalances> = {};

      for (const wallet of wallets) {
        const balances: WalletBalances = {
          core: { amount: '0', usdValue: 0 }
        };

        // Get CORE balance
        const coreBalance = await web3.eth.getBalance(wallet.address);
        const coreAmount = web3.utils.fromWei(coreBalance, 'ether');
        balances.core = {
          amount: coreAmount,
          usdValue: parseFloat(coreAmount) * tokenPrices.core
        };

        // Get custom tokens balances
        for (const [tokenAddress, tokenInfo] of Object.entries(customTokens)) {
          const tokenBalance = await getTokenBalance(web3, tokenAddress, wallet.address);
          const tokenAmount = web3.utils.fromWei(tokenBalance, 'ether');
          balances[tokenAddress] = {
            amount: tokenAmount,
            usdValue: parseFloat(tokenAmount) * (tokenPrices[tokenAddress] || 0)
          };
        }

        newBalances[wallet.address] = balances;
      }

      setBalances(newBalances);
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('Error updating balances:', errorMessage);
      setError('Failed to update balances. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update balances on component mount and when wallets/tokens change
  useEffect(() => {
    updateBalances();
  }, [wallets, customTokens]);

  // Update balances when new activity is logged (trades happen)
  useEffect(() => {
    if (activityLogs.length > 0) {
      updateBalances();
    }
  }, [activityLogs]);

  // Regular balance updates
  useEffect(() => {
    const interval = setInterval(() => updateBalances(), 30000);
    return () => clearInterval(interval);
  }, [wallets, customTokens]);

  const handleRefresh = () => {
    updateBalances(true);
  };

  const handleRemoveWallet = (address: string) => {
    if (botRunning) {
      alert('Please stop the bot before removing wallets');
      return;
    }
    
    if (confirm('Are you sure you want to remove this wallet?')) {
      removeWallet(address);
    }
  };

  if (loading && wallets.length > 0) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No wallets added yet
      </div>
    );
  }

  const getTokenName = (address: string): string => {
    if (address === 'core') return 'CORE';
    return customTokens[address]?.name || 'Unknown Token';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Wallet Balances</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-gray-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-gray-800"
          title="Refresh balances"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">{error}</p>
        </div>
      )}

      {wallets.map((wallet, index) => (
        <div 
          key={`wallet-${wallet.address}-${index}`} 
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-900">Wallet #{index + 1}</div>
              <div className="text-sm text-gray-900 break-all mt-1">{wallet.address}</div>
            </div>
            <button
              onClick={() => handleRemoveWallet(wallet.address)}
              disabled={botRunning}
              className={`p-2 rounded-full hover:bg-red-50 transition-colors ${
                botRunning ? 'opacity-50 cursor-not-allowed' : 'text-red-500 hover:text-red-600'
              }`}
              title={botRunning ? 'Stop the bot to remove wallets' : 'Remove wallet'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {Object.entries(balances[wallet.address] || {}).map(([tokenAddress, balance], balanceIndex) => (
              <div 
                key={`balance-${wallet.address}-${tokenAddress}-${balanceIndex}`}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-gray-900 font-medium">{getTokenName(tokenAddress)}:</span>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {parseFloat(balance.amount).toFixed(6)}
                  </div>
                  <div className="text-sm text-gray-500">
                    ${balance.usdValue.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};