import React, { useState } from 'react';
import { useBotStore } from '../store/botStore';
import { useAuth } from '../contexts/AuthContext';
import { initializeWeb3 } from '../utils/web3';

export const WalletForm: React.FC = () => {
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const addWallet = useBotStore(state => state.addWallet);

  const formatPrivateKey = (key: string): string => {
    // Remove '0x' prefix if present
    let formattedKey = key.toLowerCase().replace('0x', '');
    
    // Add '0x' prefix if not present
    if (!formattedKey.startsWith('0x')) {
      formattedKey = '0x' + formattedKey;
    }

    // Ensure the key is 64 characters (32 bytes) long
    if (formattedKey.length !== 66) { // 64 chars + '0x' prefix
      throw new Error('Invalid private key length. Must be 32 bytes (64 characters)');
    }

    // Validate hex characters
    if (!/^0x[0-9a-f]{64}$/.test(formattedKey)) {
      throw new Error('Invalid private key format. Must contain only hex characters');
    }

    return formattedKey;
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateKey.trim()) {
      alert('Please enter a valid private key');
      return;
    }

    setLoading(true);
    try {
      const formattedKey = formatPrivateKey(privateKey);
      const web3 = await initializeWeb3();
      if (!web3) throw new Error('Failed to connect to network');

      const account = web3.eth.accounts.privateKeyToAccount(formattedKey);
      if (!user) throw new Error('User not authenticated');
      await addWallet({
        address: account.address,
        privateKey: formattedKey
      }, user.id);

      setPrivateKey('');
      alert('Wallet added successfully');
    } catch (error) {
      alert('Error adding wallet: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-group mt-8">
      <form onSubmit={handleAddWallet}>
        <label htmlFor="walletKey" className="form-label">
          Add Wallet:
        </label>
        <input
          type="text"
          id="walletKey"
          className="input"
          placeholder="Private Key"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
        <button 
          type="submit" 
          className="btn btn-primary mt-2 w-full"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Wallet'}
        </button>
      </form>
    </div>
  );
};