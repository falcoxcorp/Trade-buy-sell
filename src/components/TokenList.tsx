import React, { useState } from 'react';
import { useBotStore } from '../store/botStore';
import { Plus, Trash2, ExternalLink, Check } from 'lucide-react';
import { BUGS_TOKEN_ADDRESS } from '../utils/web3';
import { DexType } from '../types';

export const TokenList: React.FC = () => {
  const { 
    customTokens, 
    addCustomToken, 
    removeCustomToken,
    tradingStrategy,
    selectToken 
  } = useBotStore();
  
  const [newToken, setNewToken] = useState({
    address: '',
    name: ''
  });

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.address || !newToken.name) return;

    addCustomToken(newToken.address.toLowerCase(), {
      symbol: newToken.name,
      name: newToken.name,
      decimals: 18,
      price: null,
      dex: tradingStrategy.selectedDex
    });

    setNewToken({ address: '', name: '' });
  };

  const handleSelectToken = (address: string) => {
    selectToken(address);
  };

  // Filter tokens based on current DEX
  const getFilteredTokens = () => {
    return Object.entries(customTokens).filter(([_, token]) => 
      token.dex === tradingStrategy.selectedDex
    );
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5" /> Trading Tokens
      </h3>

      {/* Default BUGS Token - Always available */}
      <div className="mb-4 bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-primary transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-white font-medium">BUGS</h4>
            <a 
              href={`https://scan.coredao.org/token/${BUGS_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 mt-1"
            >
              {BUGS_TOKEN_ADDRESS.slice(0, 6)}...{BUGS_TOKEN_ADDRESS.slice(-4)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={() => handleSelectToken(BUGS_TOKEN_ADDRESS)}
            className={`btn ${
              tradingStrategy.selectedToken === BUGS_TOKEN_ADDRESS
                ? 'btn-primary'
                : 'btn-secondary'
            } px-3 py-1 text-sm`}
          >
            {tradingStrategy.selectedToken === BUGS_TOKEN_ADDRESS ? (
              <><Check className="w-4 h-4 mr-1" /> Selected</>
            ) : (
              'Select'
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleAddToken} className="mb-6 space-y-4">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Contract Address"
            className="input bg-gray-800 text-white border-gray-700 w-full"
            value={newToken.address}
            onChange={(e) => setNewToken(prev => ({ ...prev, address: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Token Name"
            className="input bg-gray-800 text-white border-gray-700 w-full"
            value={newToken.name}
            onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn btn-primary w-full group">
          <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
          Add Token to FalcoX Swap
        </button>
      </form>

      <div className="space-y-4">
        {getFilteredTokens().map(([address, token]) => (
          <div key={address} className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-primary transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white font-medium">{token.name}</h4>
                <a 
                  href={`https://scan.coredao.org/token/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 mt-1"
                >
                  {address.slice(0, 6)}...{address.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectToken(address)}
                  className={`btn ${
                    tradingStrategy.selectedToken === address
                      ? 'btn-primary'
                      : 'btn-secondary'
                  } px-3 py-1 text-sm`}
                >
                  {tradingStrategy.selectedToken === address ? (
                    <><Check className="w-4 h-4 mr-1" /> Selected</>
                  ) : (
                    'Select'
                  )}
                </button>
                <button
                  onClick={() => removeCustomToken(address)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {token.price !== null && (
              <div className="mt-2 text-sm text-gray-400">
                Price: ${token.price.toFixed(8)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}