import React from 'react';

export interface Wallet {
  address: string;
  privateKey: string;
}

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  isCustom: boolean;
}

export interface CustomToken {
  symbol: string;
  name: string;
  decimals: number;
  price: number | null;
  dex: DexType;
}

export interface BotStats {
  totalTx: number;
  totalBuys: number;
  totalSells: number;
}

export interface ActivityLog {
  type: 'buy' | 'sell';
  amount: string;
  timestamp: string;
  price: number;
  dex: string;
  tokenSymbol: string;
}

export type DexType = 'falcoxswap';

export interface DexConfig {
  name: string;
  routerAddress: string;
  type: DexType;
}

export type TradingMode = 'interval' | 'percentage';

export interface TradingStrategy {
  type: 'daily_smooth_buy' | 'daily_smooth_sell';
  minAmount: number;
  maxAmount: number;
  slippage: number;
  tradingMode: TradingMode;
  interval: number;
  intervalType: 'seconds' | 'minutes' | 'hours';
  percentageThreshold: number;
  active24_7: boolean;
  selectedDex: DexType;
  selectedToken: string;
}