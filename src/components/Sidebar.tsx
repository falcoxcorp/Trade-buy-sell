import React from 'react';
import { WalletForm } from './WalletForm';
import { ConfigForm } from './ConfigForm';
import { WalletBalances } from './WalletBalances';
import { TokenList } from './TokenList';
import { Bot } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-800">
      <h2 className="text-2xl font-bold text-white mb-6 text-center border-b-2 border-primary pb-4 flex items-center justify-center gap-2">
        <Bot className="w-8 h-8 text-primary" />
        FalcoX Trading Bot
      </h2>
      
      <ConfigForm />
      <WalletForm />
      <WalletBalances />
      <TokenList />
    </div>
  );
};