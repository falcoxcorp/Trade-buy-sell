import React from 'react';
import { WalletForm } from './WalletForm';
import { ConfigFormNew } from './ConfigFormNew';
import { WalletBalances } from './WalletBalances';
import { TokenList } from './TokenList';
import { Bot, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-800">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-primary">
        <div className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-bold text-white">FalcoX Bot</h2>
        </div>
        <button
          onClick={() => signOut()}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-6 p-3 bg-gray-800 rounded-lg flex items-center gap-2">
        <User className="w-5 h-5 text-blue-400" />
        <span className="text-sm text-gray-300">{user?.email}</span>
      </div>

      <ConfigFormNew />
      <WalletForm />
      <WalletBalances />
      <TokenList />
    </div>
  );
};