import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      bot_configurations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_active: boolean;
          trade_amount: number;
          slippage_tolerance: number;
          gas_price: number;
          stop_loss: number;
          take_profit: number;
          trading_strategy: string;
          max_trades_per_day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          is_active?: boolean;
          trade_amount?: number;
          slippage_tolerance?: number;
          gas_price?: number;
          stop_loss?: number;
          take_profit?: number;
          trading_strategy?: string;
          max_trades_per_day?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_active?: boolean;
          trade_amount?: number;
          slippage_tolerance?: number;
          gas_price?: number;
          stop_loss?: number;
          take_profit?: number;
          trading_strategy?: string;
          max_trades_per_day?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_wallets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string;
          encrypted_private_key: string;
          network: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address: string;
          encrypted_private_key: string;
          network?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string;
          encrypted_private_key?: string;
          network?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      trading_tokens: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          contract_address: string;
          network: string;
          is_monitored: boolean;
          target_buy_price: number | null;
          target_sell_price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          contract_address: string;
          network?: string;
          is_monitored?: boolean;
          target_buy_price?: number | null;
          target_sell_price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          contract_address?: string;
          network?: string;
          is_monitored?: boolean;
          target_buy_price?: number | null;
          target_sell_price?: number | null;
          created_at?: string;
        };
      };
      bot_executions: {
        Row: {
          id: string;
          user_id: string;
          config_id: string | null;
          started_at: string;
          completed_at: string | null;
          status: string;
          trades_executed: number;
          error_message: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          execution_id: string | null;
          wallet_id: string | null;
          token_id: string | null;
          transaction_hash: string | null;
          type: string;
          amount: number;
          price: number | null;
          gas_used: number | null;
          status: string;
          created_at: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          execution_id: string | null;
          level: string;
          message: string;
          metadata: any;
          created_at: string;
        };
      };
    };
  };
};
