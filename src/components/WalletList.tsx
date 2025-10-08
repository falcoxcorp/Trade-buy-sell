import React, { useEffect } from 'react';
import { useBotStore } from '../store/botStore';
import { formatTokenAmount, getTokenBalance, initializeWeb3 } from '../utils/web3';
import { WCORE_ADDRESS, PIPI_LOL_TOKEN_ADDRESS } from '../utils/web3';

export const WalletList: React.FC = () => {
  const wallets = useBotStore(state => state.wallets);
  const customTokens = useBotStore(state => state.customTokens);

  useEffect(() => {
    const updateBalances = async () => {
      const web3 = await initializeWeb3();
      if (!web3) return;

      // Update balances logic here
    };

    updateBalances();
    const interval = setInterval(updateBalances, 30000);
    return () => clearInterval(interval);
  }, [wallets, customTokens]);

  return (
    <div className="wallet-section mt-8">
      <h3 className="text-lg font-semibold mb-4">Connected Wallets</h3>
      <div className="space-y-4">
        {wallets.map((wallet, index) => (
          <div key={wallet.address} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="font-medium text-gray-900">Wallet #{index + 1}</div>
            <div className="text-sm text-gray-500 break-all mt-1">{wallet.address}</div>
            <div className="mt-2 text-sm">
              <div className="text-primary">Loading balances...</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};