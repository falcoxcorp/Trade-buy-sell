import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'falcox-secure-key-2024';

export function encryptPrivateKey(privateKey: string): string {
  return CryptoJS.AES.encrypt(privateKey, ENCRYPTION_KEY).toString();
}

export function decryptPrivateKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function useBotConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['botConfig', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_configurations')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('bot_configurations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botConfig'] });
    },
  });

  return { config, isLoading, updateConfig };
}

export function useWallets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addWallet = useMutation({
    mutationFn: async (wallet: { name: string; address: string; privateKey: string; network: string }) => {
      const { error } = await supabase.from('user_wallets').insert({
        user_id: user!.id,
        name: wallet.name,
        address: wallet.address,
        encrypted_private_key: encryptPrivateKey(wallet.privateKey),
        network: wallet.network,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });

  const removeWallet = useMutation({
    mutationFn: async (walletId: string) => {
      const { error } = await supabase
        .from('user_wallets')
        .delete()
        .eq('id', walletId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });

  return { wallets, isLoading, addWallet, removeWallet };
}

export function useTokens() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['tokens', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_tokens')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addToken = useMutation({
    mutationFn: async (token: {
      symbol: string;
      contract_address: string;
      network: string;
      target_buy_price?: number;
      target_sell_price?: number;
    }) => {
      const { error } = await supabase.from('trading_tokens').insert({
        user_id: user!.id,
        ...token,
        is_monitored: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
  });

  const removeToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('trading_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
  });

  const updateToken = useMutation({
    mutationFn: async ({ tokenId, updates }: { tokenId: string; updates: any }) => {
      const { error } = await supabase
        .from('trading_tokens')
        .update(updates)
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
  });

  return { tokens, isLoading, addToken, removeToken, updateToken };
}

export function useTransactions() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return { transactions, isLoading };
}

export function useActivityLogs() {
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activityLogs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  return { logs, isLoading };
}

export function useBotExecution() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const executeBot = useMutation({
    mutationFn: async () => {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-bot?action=execute`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute bot');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });

  const getBotStatus = useQuery({
    queryKey: ['botStatus', user?.id],
    queryFn: async () => {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-bot?action=status`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get bot status');
      }

      return await response.json();
    },
    enabled: !!user && !!session,
    refetchInterval: 10000,
  });

  return { executeBot, botStatus: getBotStatus.data };
}
