import React from 'react';
import { useBotStore } from '../store/botStore';
import { ActivityChart } from './ActivityChart';
import { BotControls } from './BotControls';
import { MarketStats } from './MarketStats';
import { ActivityLog } from './ActivityLog';
import { ExternalLink, Twitter, MessageCircle, Phone } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { botStats, activityLogs } = useBotStore();

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