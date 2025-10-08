import React from 'react';
import { useBotStore } from '../store/botStore';
import Web3 from 'web3';

export const ActivityLog: React.FC = () => {
  const activityLogs = useBotStore(state => state.activityLogs);

  const formatTokenAmount = (amount: string, price: number): string => {
    const coreAmount = parseFloat(amount);
    const tokenAmount = coreAmount / price;
    return `${coreAmount.toFixed(6)} CORE (${tokenAmount.toFixed(6)} ${activityLogs[0]?.tokenSymbol})`;
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Recent Activity</h3>
      <div className="max-h-[200px] overflow-y-auto space-y-2">
        {activityLogs.map((log, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              log.type === 'buy' 
                ? 'bg-blue-50 border-l-4 border-blue-500'
                : 'bg-pink-50 border-l-4 border-pink-500'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">
                {log.type === 'buy' ? 'Buy' : 'Sell'}: {formatTokenAmount(log.amount, log.price)} ({log.dex})
              </span>
              <span className="text-sm text-gray-900">{log.timestamp}</span>
            </div>
            <div className="text-sm text-gray-900">
              Price: ${log.price.toFixed(14)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};