import React, { useEffect } from 'react';
import { useBotStore } from '../store/botStore';
import { useUser } from '../hooks/useUser';
import { ActivityChart } from './ActivityChart';
import { BotControls } from './BotControls';
import { MarketStats } from './MarketStats';
import { ActivityLog } from './ActivityLog';
import { ExternalLink, Twitter, MessageCircle, Phone } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { userId } = useUser();
  const { botStats, activityLogs, initializeStore, loading } = useBotStore();

  useEffect(() => {
    if (userId) {
      initializeStore(userId);
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bot configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 border-b-2 border-primary pb-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            FalcoX Trading Bot Dashboard
          </h2>
          <div className="text-sm text-gray-600 mt-1">
            Total Transactions: <span className="font-semibold text-primary">{botStats.totalTx}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 mt-4 lg:mt-0">
          <div className="flex flex-wrap gap-4">
            <a
              href="https://falcox.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Web <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://swap.falcox.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Swap <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://xfortune.falcox.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              XFortune <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://airdrop.falcox.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Airdrop <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://pompfun.falcox.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Pomp Fun <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href="https://x.com/FalcoX_Corp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors group"
            >
              <Twitter className="w-4 h-4 group-hover:text-primary" />
              Twitter
            </a>
            <a
              href="https://t.me/Falco_X_CORP"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors group"
            >
              <MessageCircle className="w-4 h-4 group-hover:text-primary" />
              Telegram
            </a>
            <a
              href="https://chat.whatsapp.com/FJN3cenhMJLH58C9WyzsUr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors group"
            >
              <Phone className="w-4 h-4 group-hover:text-primary" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {botStats.totalTx === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-6 flex items-start gap-2">
          <div className="text-blue-700">
            <p className="font-semibold mb-2">Welcome to your Trading Bot!</p>
            <p className="text-sm">
              Configure your strategy below and click "Start Bot". Your bot will run automatically in the cloud,
              even when you close this page or turn off your computer. All your settings are saved automatically.
            </p>
          </div>
        </div>
      )}

      <MarketStats />
      <BotControls />

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Bot Statistics</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-gray-900">Total Transactions</div>
            <div className="text-2xl font-bold text-primary">{botStats.totalTx}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-gray-900">Total Buys</div>
            <div className="text-2xl font-bold text-primary">{botStats.totalBuys}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-gray-900">Total Sells</div>
            <div className="text-2xl font-bold text-primary">{botStats.totalSells}</div>
          </div>
        </div>
      </div>

      <ActivityLog />
      <ActivityChart />
    </div>
  );
};