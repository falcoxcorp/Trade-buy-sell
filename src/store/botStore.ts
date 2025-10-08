import { create } from 'zustand';
import { BotStats, ActivityLog, Wallet, CustomToken, TradingStrategy } from '../types';
import { BUGS_TOKEN_ADDRESS } from '../utils/web3';
import { supabase } from '../lib/supabase';

interface PriceTarget {
  price: number;
  executed: boolean;
  id: string;
}

interface BotState {
  botRunning: boolean;
  wallets: Wallet[];
  customTokens: Record<string, CustomToken>;
  botStats: BotStats;
  activityLogs: ActivityLog[];
  totalVolume: number;
  volume24h: number;
  lastVolume24hReset: number;
  tradingStrategy: TradingStrategy;
  priceTargets: PriceTarget[];
  initialPrice: number | null;
  initialized: boolean;
  loading: boolean;
  initializeStore: (userId: string) => Promise<void>;
  setBotRunning: (running: boolean, userId: string) => Promise<void>;
  addWallet: (wallet: Wallet, userId: string) => Promise<void>;
  removeWallet: (address: string, userId: string) => Promise<void>;
  addCustomToken: (address: string, token: CustomToken, userId: string) => Promise<void>;
  removeCustomToken: (address: string, userId: string) => Promise<void>;
  addActivityLog: (log: ActivityLog, userId: string) => Promise<void>;
  updateBotStats: (stats: Partial<BotStats>, userId: string) => Promise<void>;
  updateTotalVolume: (amount: number, userId: string) => Promise<void>;
  updateTradingStrategy: (strategy: Partial<TradingStrategy>, userId: string) => Promise<void>;
  selectToken: (tokenAddress: string, userId: string) => Promise<void>;
  reset24hVolume: (userId: string) => Promise<void>;
  savePriceTargets: (targets: PriceTarget[], initialPrice: number, userId: string) => Promise<void>;
  clearPriceTargets: (userId: string) => Promise<void>;
  resetStore: () => void;
}

const defaultStrategy: TradingStrategy = {
  type: 'daily_smooth_buy',
  minAmount: 0.001,
  maxAmount: 0.01,
  slippage: 0.5,
  tradingMode: 'percentage',
  interval: 5,
  intervalType: 'minutes',
  percentageThreshold: 1.0,
  active24_7: true,
  selectedDex: 'falcoxswap',
  selectedToken: BUGS_TOKEN_ADDRESS
};

export const useBotStore = create<BotState>()((set, get) => ({
  botRunning: false,
  wallets: [],
  customTokens: {},
  botStats: {
    totalTx: 0,
    totalBuys: 0,
    totalSells: 0,
  },
  activityLogs: [],
  totalVolume: 0,
  volume24h: 0,
  lastVolume24hReset: Date.now(),
  tradingStrategy: defaultStrategy,
  priceTargets: [],
  initialPrice: null,
  initialized: false,
  loading: false,

  initializeStore: async (userId: string) => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const [walletsRes, customTokensRes, strategyRes, sessionRes, statsRes, logsRes, executionStateRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', userId),
        supabase.from('custom_tokens').select('*').eq('user_id', userId),
        supabase.from('trading_strategies').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('bot_sessions').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('bot_stats').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('bot_execution_state').select('*').eq('user_id', userId).maybeSingle()
      ]);

      const wallets = walletsRes.data || [];
      const customTokensArray = customTokensRes.data || [];
      const customTokens: Record<string, CustomToken> = {};
      customTokensArray.forEach((token: any) => {
        customTokens[token.address] = {
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          price: null,
          dex: token.dex
        };
      });

      const strategy = strategyRes.data;
      const session = sessionRes.data;
      const stats = statsRes.data;
      const logs = logsRes.data || [];
      const executionState = executionStateRes.data;

      if (!strategy) {
        await supabase.from('trading_strategies').insert({
          user_id: userId,
          ...defaultStrategy,
          min_amount: defaultStrategy.minAmount,
          max_amount: defaultStrategy.maxAmount,
          trading_mode: defaultStrategy.tradingMode,
          interval_type: defaultStrategy.intervalType,
          percentage_threshold: defaultStrategy.percentageThreshold,
          active_24_7: defaultStrategy.active24_7,
          selected_dex: defaultStrategy.selectedDex,
          selected_token: defaultStrategy.selectedToken
        });
      }

      set({
        wallets: wallets.map((w: any) => ({
          address: w.address,
          privateKey: w.encrypted_private_key
        })),
        customTokens,
        tradingStrategy: strategy ? {
          type: strategy.type,
          minAmount: Number(strategy.min_amount),
          maxAmount: Number(strategy.max_amount),
          slippage: Number(strategy.slippage),
          tradingMode: strategy.trading_mode,
          interval: strategy.interval,
          intervalType: strategy.interval_type,
          percentageThreshold: Number(strategy.percentage_threshold),
          active24_7: strategy.active_24_7,
          selectedDex: strategy.selected_dex,
          selectedToken: strategy.selected_token
        } : defaultStrategy,
        botRunning: session?.is_running || false,
        botStats: stats ? {
          totalTx: stats.total_tx,
          totalBuys: stats.total_buys,
          totalSells: stats.total_sells
        } : { totalTx: 0, totalBuys: 0, totalSells: 0 },
        totalVolume: Number(stats?.total_volume || 0),
        volume24h: Number(stats?.volume_24h || 0),
        lastVolume24hReset: stats?.last_volume_24h_reset ? new Date(stats.last_volume_24h_reset).getTime() : Date.now(),
        priceTargets: executionState?.price_targets ? JSON.parse(executionState.price_targets) : [],
        initialPrice: executionState?.initial_price ? Number(executionState.initial_price) : null,
        activityLogs: logs.map((log: any) => ({
          type: log.type,
          amount: log.amount,
          timestamp: new Date(log.created_at).toLocaleTimeString(),
          price: Number(log.price),
          dex: log.dex,
          tokenSymbol: log.token_symbol
        })),
        initialized: true,
        loading: false
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ loading: false });
    }
  },

  setBotRunning: async (running: boolean, userId: string) => {
    set({ botRunning: running });
    await supabase
      .from('bot_sessions')
      .upsert({
        user_id: userId,
        is_running: running,
        started_at: running ? new Date().toISOString() : undefined,
        stopped_at: !running ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      });
  },

  addWallet: async (wallet: Wallet, userId: string) => {
    set((state) => ({ wallets: [...state.wallets, wallet] }));
    await supabase.from('wallets').insert({
      user_id: userId,
      address: wallet.address,
      encrypted_private_key: wallet.privateKey
    });
  },

  removeWallet: async (address: string, userId: string) => {
    set((state) => ({
      wallets: state.wallets.filter(w => w.address !== address)
    }));
    await supabase.from('wallets').delete().eq('user_id', userId).eq('address', address);
  },

  addCustomToken: async (address: string, token: CustomToken, userId: string) => {
    set((state) => ({
      customTokens: { ...state.customTokens, [address]: token }
    }));
    await supabase.from('custom_tokens').insert({
      user_id: userId,
      address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      dex: token.dex
    });
  },

  removeCustomToken: async (address: string, userId: string) => {
    const state = get();
    const { [address]: _, ...rest } = state.customTokens;

    if (state.tradingStrategy.selectedToken === address) {
      await get().updateTradingStrategy({ selectedToken: BUGS_TOKEN_ADDRESS }, userId);
    }

    set({ customTokens: rest });
    await supabase.from('custom_tokens').delete().eq('user_id', userId).eq('address', address);
  },

  addActivityLog: async (log: ActivityLog, userId: string) => {
    set((state) => ({
      activityLogs: [log, ...state.activityLogs].slice(0, 50)
    }));
    await supabase.from('activity_logs').insert({
      user_id: userId,
      type: log.type,
      amount: log.amount,
      price: log.price,
      dex: log.dex,
      token_symbol: log.tokenSymbol,
      created_at: new Date().toISOString()
    });
  },

  updateBotStats: async (stats: Partial<BotStats>, userId: string) => {
    set((state) => ({
      botStats: { ...state.botStats, ...stats }
    }));

    const updateData: any = { updated_at: new Date().toISOString() };
    if (stats.totalTx !== undefined) updateData.total_tx = stats.totalTx;
    if (stats.totalBuys !== undefined) updateData.total_buys = stats.totalBuys;
    if (stats.totalSells !== undefined) updateData.total_sells = stats.totalSells;

    await supabase.from('bot_stats').update(updateData).eq('user_id', userId);
  },

  updateTotalVolume: async (amount: number, userId: string) => {
    const state = get();
    const now = Date.now();
    const hoursPassed = (now - state.lastVolume24hReset) / (1000 * 60 * 60);

    if (hoursPassed >= 24) {
      set({
        totalVolume: state.totalVolume + amount,
        volume24h: amount,
        lastVolume24hReset: now
      });
      await supabase.from('bot_stats').update({
        total_volume: state.totalVolume + amount,
        volume_24h: amount,
        last_volume_24h_reset: new Date(now).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    } else {
      set({
        totalVolume: state.totalVolume + amount,
        volume24h: state.volume24h + amount
      });
      await supabase.from('bot_stats').update({
        total_volume: state.totalVolume + amount,
        volume_24h: state.volume24h + amount,
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    }
  },

  updateTradingStrategy: async (strategy: Partial<TradingStrategy>, userId: string) => {
    set((state) => ({
      tradingStrategy: { ...state.tradingStrategy, ...strategy }
    }));

    const updateData: any = { updated_at: new Date().toISOString() };
    if (strategy.type !== undefined) updateData.type = strategy.type;
    if (strategy.minAmount !== undefined) updateData.min_amount = strategy.minAmount;
    if (strategy.maxAmount !== undefined) updateData.max_amount = strategy.maxAmount;
    if (strategy.slippage !== undefined) updateData.slippage = strategy.slippage;
    if (strategy.tradingMode !== undefined) updateData.trading_mode = strategy.tradingMode;
    if (strategy.interval !== undefined) updateData.interval = strategy.interval;
    if (strategy.intervalType !== undefined) updateData.interval_type = strategy.intervalType;
    if (strategy.percentageThreshold !== undefined) updateData.percentage_threshold = strategy.percentageThreshold;
    if (strategy.active24_7 !== undefined) updateData.active_24_7 = strategy.active24_7;
    if (strategy.selectedDex !== undefined) updateData.selected_dex = strategy.selectedDex;
    if (strategy.selectedToken !== undefined) updateData.selected_token = strategy.selectedToken;

    await supabase.from('trading_strategies').update(updateData).eq('user_id', userId);
  },

  selectToken: async (tokenAddress: string, userId: string) => {
    await get().updateTradingStrategy({ selectedToken: tokenAddress }, userId);
  },

  reset24hVolume: async (userId: string) => {
    set({
      volume24h: 0,
      lastVolume24hReset: Date.now()
    });
    await supabase.from('bot_stats').update({
      volume_24h: 0,
      last_volume_24h_reset: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);
  },

  savePriceTargets: async (targets: PriceTarget[], initialPrice: number, userId: string) => {
    set({ priceTargets: targets, initialPrice });
    await supabase.from('bot_execution_state').upsert({
      user_id: userId,
      price_targets: JSON.stringify(targets),
      initial_price: initialPrice,
      updated_at: new Date().toISOString()
    });
  },

  clearPriceTargets: async (userId: string) => {
    set({ priceTargets: [], initialPrice: null });
    await supabase.from('bot_execution_state').update({
      price_targets: null,
      initial_price: null,
      last_execution_time: null,
      next_execution_time: null,
      execution_count: 0,
      updated_at: new Date().toISOString()
    }).eq('user_id', userId);
  },

  resetStore: () => {
    set({
      botRunning: false,
      wallets: [],
      customTokens: {},
      botStats: {
        totalTx: 0,
        totalBuys: 0,
        totalSells: 0,
      },
      activityLogs: [],
      totalVolume: 0,
      volume24h: 0,
      lastVolume24hReset: Date.now(),
      tradingStrategy: defaultStrategy,
      priceTargets: [],
      initialPrice: null,
      initialized: false,
      loading: false
    });
  }
}));
