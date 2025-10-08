import React, { useEffect, useState } from 'react';
import { useBotStore } from '../store/botStore';
import { useUser } from '../hooks/useUser';
import { DexType, TradingMode } from '../types';
import { getTokenBalance, initializeWeb3, formatTokenAmount } from '../utils/web3';
import { AlertCircle } from 'lucide-react';

export const ConfigForm: React.FC = () => {
  const { userId } = useUser();
  const { tradingStrategy, updateTradingStrategy, wallets, customTokens } = useBotStore();
  const updateStrategy = (update: any) => updateTradingStrategy(update, userId);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [showSaveReminder, setShowSaveReminder] = useState(false);

  const updateTokenBalance = async () => {
    if (!tradingStrategy.selectedToken || wallets.length === 0 || tradingStrategy.type !== 'daily_smooth_sell') {
      setTokenBalance('0');
      return;
    }

    try {
      const web3 = await initializeWeb3();
      if (!web3) return;

      const balancePromises = wallets.map(wallet => 
        getTokenBalance(web3, tradingStrategy.selectedToken, wallet.address)
      );
      
      const balances = await Promise.all(balancePromises);
      const totalBalance = balances.reduce((sum, balance) => 
        sum.add(web3.utils.toBN(balance)), 
        web3.utils.toBN(0)
      );
      
      setTokenBalance(web3.utils.fromWei(totalBalance, 'ether'));
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance('0');
    }
  };

  useEffect(() => {
    updateTokenBalance();
    const interval = setInterval(updateTokenBalance, 30000);
    return () => clearInterval(interval);
  }, [tradingStrategy.selectedToken, tradingStrategy.type, wallets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tradingStrategy.minAmount >= tradingStrategy.maxAmount) {
      alert('Minimum amount must be less than maximum amount');
      return;
    }

    if (tradingStrategy.type === 'daily_smooth_buy' && tradingStrategy.minAmount < 0.001) {
      alert('Minimum amount must be at least 0.001 CORE');
      return;
    }

    if (tradingStrategy.type === 'daily_smooth_sell' && parseFloat(tokenBalance) < tradingStrategy.maxAmount) {
      alert(`Maximum amount cannot exceed your token balance (${tokenBalance})`);
      return;
    }

    if (tradingStrategy.slippage <= 0 || tradingStrategy.slippage > 100) {
      alert('Slippage must be between 0.1% and 100%');
      return;
    }

    if (tradingStrategy.tradingMode === 'percentage' && (tradingStrategy.percentageThreshold <= 0 || tradingStrategy.percentageThreshold > 100)) {
      alert('Percentage threshold must be between 0.1% and 100%');
      return;
    }

    setShowSaveReminder(false);
    alert('Configuration saved successfully');
  };

  const handleNumberInput = async (value: string, field: keyof typeof tradingStrategy) => {
    const number = parseFloat(value);
    if (!isNaN(number)) {
      if (tradingStrategy.type === 'daily_smooth_sell' && field === 'maxAmount' && number > parseFloat(tokenBalance)) {
        alert(`Cannot set maximum amount higher than your token balance (${tokenBalance})`);
        return;
      }
      await updateStrategy({ [field]: number });
      setShowSaveReminder(true);
    }
  };

  const getTokenSymbol = () => {
    if (!tradingStrategy.selectedToken) return 'Token';
    return customTokens[tradingStrategy.selectedToken]?.symbol || 'BUGS';
  };

  const getAmountLabel = () => {
    const baseText = tradingStrategy.type === 'daily_smooth_buy' ? 'CORE' : getTokenSymbol();
    if (tradingStrategy.type === 'daily_smooth_sell') {
      return `${baseText} (Balance: ${parseFloat(tokenBalance).toFixed(6)} ${getTokenSymbol()})`;
    }
    return baseText;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showSaveReminder && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-yellow-700">
            Remember to save your configuration after making changes!
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="strategy" className="form-label">Strategy:</label>
        <select
          id="strategy"
          className="select"
          value={tradingStrategy.type}
          onChange={async (e) => {
            const newType = e.target.value as 'daily_smooth_buy' | 'daily_smooth_sell';
            await updateStrategy({
              type: newType,
              minAmount: newType === 'daily_smooth_buy' ? 0.001 : 0,
              maxAmount: newType === 'daily_smooth_buy' ? 0.01 : 0
            });
            setShowSaveReminder(true);
            alert(`You've switched to ${newType === 'daily_smooth_buy' ? 'Buy' : 'Sell'} mode. Please review and save your configuration!`);
          }}
        >
          <option value="daily_smooth_buy">Daily Smooth Buy</option>
          <option value="daily_smooth_sell">Daily Smooth Sell</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="tradingMode" className="form-label">Trading Mode:</label>
        <select
          id="tradingMode"
          className="select"
          value={tradingStrategy.tradingMode}
          onChange={async (e) => {
            await updateStrategy({ tradingMode: e.target.value as TradingMode });
            setShowSaveReminder(true);
          }}
        >
          <option value="interval">Time Interval</option>
          <option value="percentage">Price Percentage</option>
        </select>
      </div>

      {tradingStrategy.tradingMode === 'interval' ? (
        <div className="form-group">
          <label htmlFor="intervalValue" className="form-label">
            Interval:
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              id="intervalValue"
              className="input"
              min="1"
              value={tradingStrategy.interval}
              onChange={(e) => handleNumberInput(e.target.value, 'interval')}
            />
            <select
              id="intervalType"
              className="select"
              value={tradingStrategy.intervalType}
              onChange={async (e) => {
                await updateStrategy({
                  intervalType: e.target.value as 'seconds' | 'minutes' | 'hours'
                });
                setShowSaveReminder(true);
              }}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label htmlFor="percentageThreshold" className="form-label">
            {tradingStrategy.type === 'daily_smooth_buy' ? 'Buy when price drops by (%)' : 'Sell when price increases by (%)'}:
          </label>
          <input
            type="number"
            id="percentageThreshold"
            className="input"
            min="0.1"
            max="100"
            step="0.1"
            value={tradingStrategy.percentageThreshold}
            onChange={(e) => handleNumberInput(e.target.value, 'percentageThreshold')}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="minAmount" className="form-label">
          Minimum Amount ({getAmountLabel()}):
        </label>
        <input
          type="number"
          id="minAmount"
          className="input"
          min={tradingStrategy.type === 'daily_smooth_buy' ? '0.001' : '0'}
          max={tradingStrategy.type === 'daily_smooth_buy' ? '100' : tokenBalance}
          step="0.000001"
          value={tradingStrategy.minAmount}
          onChange={(e) => handleNumberInput(e.target.value, 'minAmount')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="maxAmount" className="form-label">
          Maximum Amount ({getAmountLabel()}):
        </label>
        <input
          type="number"
          id="maxAmount"
          className="input"
          min={tradingStrategy.type === 'daily_smooth_buy' ? '0.001' : '0'}
          max={tradingStrategy.type === 'daily_smooth_buy' ? '100' : tokenBalance}
          step="0.000001"
          value={tradingStrategy.maxAmount}
          onChange={(e) => handleNumberInput(e.target.value, 'maxAmount')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="slippage" className="form-label">
          Slippage (%):
        </label>
        <input
          type="number"
          id="slippage"
          className="input"
          min="0.1"
          max="100"
          step="0.1"
          value={tradingStrategy.slippage}
          onChange={(e) => handleNumberInput(e.target.value, 'slippage')}
        />
      </div>

      <div className="form-group">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tradingStrategy.active24_7}
            onChange={async (e) => {
              await updateStrategy({ active24_7: e.target.checked });
              setShowSaveReminder(true);
            }}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-white">Active 24/7</span>
        </label>
      </div>

      <button type="submit" className="btn btn-primary w-full">
        Save Configuration
      </button>
    </form>
  );
};