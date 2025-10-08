import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BotStats, ActivityLog, Wallet, CustomToken, TradingStrategy, DexType } from '../types';
import { BUGS_TOKEN_ADDRESS } from '../utils/web3';

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
  setBotRunning: (running: boolean) => void;
  addWallet: (wallet: Wallet) => void;
  removeWallet: (address: string) => void;
  addCustomToken: (address: string, token: CustomToken) => void;
  removeCustomToken: (address: string) => void;
  addActivityLog: (log: ActivityLog) => void;
  updateBotStats: (stats: Partial<BotStats>) => void;
  updateTotalVolume: (amount: number) => void;
  updateTradingStrategy: (strategy: Partial<TradingStrategy>) => void;
  selectToken: (tokenAddress: string) => void;
  reset24hVolume: () => void;
}

const defaultStrategy: TradingStrategy = {
  type: 'daily_smooth_buy',
  minAmount: 0.001,
  maxAmount: 0.01,
  slippage: 0.5,
  tradingMode: 'interval',
  interval: 5,
  intervalType: 'minutes',
  percentageThreshold: 1.0,
  active24_7: true,
  selectedDex: 'falcoxswap',
  selectedToken: BUGS_TOKEN_ADDRESS
};

export const useBotStore = create<BotState>()(
  persist(
    (set) => ({
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
      setBotRunning: (running) => set({ botRunning: running }),
      addWallet: (wallet) => set((state) => ({ 
        wallets: [...state.wallets, wallet] 
      })),
      removeWallet: (address) => set((state) => ({
        wallets: state.wallets.filter(w => w.address !== address)
      })),
      addCustomToken: (address, token) => set((state) => ({
        customTokens: { ...state.customTokens, [address]: token }
      })),
      removeCustomToken: (address) => set((state) => {
        const { [address]: _, ...rest } = state.customTokens;
        if (state.tradingStrategy.selectedToken === address) {
          return {
            customTokens: rest,
            tradingStrategy: {
              ...state.tradingStrategy,
              selectedToken: BUGS_TOKEN_ADDRESS
            }
          };
        }
        return { customTokens: rest };
      }),
      addActivityLog: (log) => set((state) => ({
        activityLogs: [log, ...state.activityLogs].slice(0, 50)
      })),
      updateBotStats: (stats) => set((state) => ({
        botStats: { ...state.botStats, ...stats }
      })),
      updateTotalVolume: (amount) => set((state) => {
        const now = Date.now();
        const hoursPassed = (now - state.lastVolume24hReset) / (1000 * 60 * 60);
        
        if (hoursPassed >= 24) {
          return {
            totalVolume: state.totalVolume + amount,
            volume24h: amount,
            lastVolume24hReset: now
          };
        }
        
        return {
          totalVolume: state.totalVolume + amount,
          volume24h: state.volume24h + amount
        };
      }),
      updateTradingStrategy: (strategy) => set((state) => {
        const newStrategy = { ...state.tradingStrategy, ...strategy };
        return { tradingStrategy: newStrategy };
      }),
      selectToken: (tokenAddress) => set((state) => ({
        tradingStrategy: { ...state.tradingStrategy, selectedToken: tokenAddress }
      })),
      reset24hVolume: () => set(() => ({
        volume24h: 0,
        lastVolume24hReset: Date.now()
      })),
    }),
    {
      name: 'falcox-trading-bot',
      partialize: (state) => ({
        wallets: state.wallets,
        customTokens: state.customTokens,
        botStats: state.botStats,
        tradingStrategy: state.tradingStrategy,
        totalVolume: state.totalVolume,
        volume24h: state.volume24h,
        lastVolume24hReset: state.lastVolume24hReset,
      }),
    }
  )
);