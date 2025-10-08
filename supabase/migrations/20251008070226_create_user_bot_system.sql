/*
  # User Bot System - Multi-User Trading Bot Platform

  ## Overview
  This migration creates a complete multi-user trading bot system where each user can:
  - Register and manage their own account
  - Configure multiple wallets with encrypted private keys
  - Set trading parameters and strategies
  - Run independent bot instances that execute automatically
  - Track all activity, transactions, and logs separately

  ## Tables Created

  ### 1. user_profiles
  Extends Supabase auth.users with additional profile information
  - `id` (uuid, primary key) - Links to auth.users
  - `username` (text, unique) - Display name
  - `created_at` (timestamptz) - Account creation time
  - `updated_at` (timestamptz) - Last profile update

  ### 2. bot_configurations
  Stores bot trading parameters for each user
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Owner of the configuration
  - `name` (text) - Configuration name
  - `is_active` (boolean) - Whether bot is running
  - `trade_amount` (decimal) - Amount per trade
  - `slippage_tolerance` (decimal) - Max slippage percentage
  - `gas_price` (decimal) - Gas price setting
  - `stop_loss` (decimal) - Stop loss percentage
  - `take_profit` (decimal) - Take profit percentage
  - `trading_strategy` (text) - Strategy type
  - `max_trades_per_day` (integer) - Daily trade limit
  - `created_at`, `updated_at` (timestamptz)

  ### 3. user_wallets
  Stores encrypted wallet information per user
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `name` (text) - Wallet nickname
  - `address` (text) - Public wallet address
  - `encrypted_private_key` (text) - AES encrypted private key
  - `network` (text) - Blockchain network
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz)

  ### 4. trading_tokens
  User-specific token watchlist
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `symbol` (text) - Token symbol
  - `contract_address` (text) - Token contract
  - `network` (text) - Blockchain network
  - `is_monitored` (boolean) - Active monitoring
  - `target_buy_price` (decimal) - Buy trigger price
  - `target_sell_price` (decimal) - Sell trigger price
  - `created_at` (timestamptz)

  ### 5. bot_executions
  Tracks each bot execution cycle
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `config_id` (uuid, foreign key)
  - `started_at` (timestamptz) - Execution start
  - `completed_at` (timestamptz) - Execution end
  - `status` (text) - success/error/running
  - `trades_executed` (integer) - Number of trades
  - `error_message` (text) - Error details if any

  ### 6. transactions
  Complete transaction history per user
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `execution_id` (uuid, foreign key)
  - `wallet_id` (uuid, foreign key)
  - `token_id` (uuid, foreign key)
  - `transaction_hash` (text) - Blockchain tx hash
  - `type` (text) - buy/sell/swap
  - `amount` (decimal) - Trade amount
  - `price` (decimal) - Execution price
  - `gas_used` (decimal) - Gas consumed
  - `status` (text) - pending/confirmed/failed
  - `created_at` (timestamptz)

  ### 7. activity_logs
  Detailed activity logs per user
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `execution_id` (uuid, foreign key)
  - `level` (text) - info/warning/error
  - `message` (text) - Log message
  - `metadata` (jsonb) - Additional data
  - `created_at` (timestamptz)

  ## Security Implementation

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can ONLY access their own data
  - Strict policies enforce user_id = auth.uid()
  - No cross-user data leakage possible

  ### Data Isolation
  - Every table includes user_id for data segregation
  - Foreign key constraints ensure referential integrity
  - Indexes optimize user-specific queries

  ## Indexes
  Performance indexes on:
  - user_id columns (all tables)
  - Active bot configurations
  - Recent transactions
  - Activity logs by date

  ## Important Notes
  1. Private keys are stored ENCRYPTED - decryption happens in Edge Functions
  2. Each user's bot runs independently via automated Edge Function
  3. All timestamps use UTC timezone
  4. Soft deletes not implemented - use is_active flags
*/

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bot configurations table
CREATE TABLE IF NOT EXISTS bot_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Config',
  is_active boolean DEFAULT false,
  trade_amount decimal(20, 8) DEFAULT 0.1,
  slippage_tolerance decimal(5, 2) DEFAULT 2.0,
  gas_price decimal(20, 8) DEFAULT 0,
  stop_loss decimal(5, 2) DEFAULT 5.0,
  take_profit decimal(5, 2) DEFAULT 10.0,
  trading_strategy text DEFAULT 'momentum',
  max_trades_per_day integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  encrypted_private_key text NOT NULL,
  network text DEFAULT 'ethereum',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create trading tokens table
CREATE TABLE IF NOT EXISTS trading_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  contract_address text NOT NULL,
  network text DEFAULT 'ethereum',
  is_monitored boolean DEFAULT true,
  target_buy_price decimal(20, 8),
  target_sell_price decimal(20, 8),
  created_at timestamptz DEFAULT now()
);

-- Create bot executions table
CREATE TABLE IF NOT EXISTS bot_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id uuid REFERENCES bot_configurations(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running',
  trades_executed integer DEFAULT 0,
  error_message text
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES bot_executions(id) ON DELETE SET NULL,
  wallet_id uuid REFERENCES user_wallets(id) ON DELETE SET NULL,
  token_id uuid REFERENCES trading_tokens(id) ON DELETE SET NULL,
  transaction_hash text,
  type text NOT NULL,
  amount decimal(20, 8) NOT NULL,
  price decimal(20, 8),
  gas_used decimal(20, 8),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES bot_executions(id) ON DELETE SET NULL,
  level text DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_configs_user_active ON bot_configurations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON trading_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_user ON bot_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(user_id, created_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for bot_configurations
CREATE POLICY "Users can view own bot configs"
  ON bot_configurations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot configs"
  ON bot_configurations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot configs"
  ON bot_configurations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot configs"
  ON bot_configurations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_wallets
CREATE POLICY "Users can view own wallets"
  ON user_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON user_wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON user_wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON user_wallets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for trading_tokens
CREATE POLICY "Users can view own tokens"
  ON trading_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON trading_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON trading_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON trading_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bot_executions
CREATE POLICY "Users can view own executions"
  ON bot_executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions"
  ON bot_executions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);