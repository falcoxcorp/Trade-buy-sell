/*
  # Add Trading Bot Specific Tables

  ## New Tables
  
  ### 1. wallets (if not exists)
  - Stores user wallet information with encrypted private keys
  
  ### 2. custom_tokens
  - User-defined custom tokens for trading
  
  ### 3. trading_strategies
  - One strategy per user with trading parameters
  
  ### 4. bot_sessions
  - Tracks if user's bot is running or stopped
  
  ### 5. bot_stats
  - Trading statistics per user
  
  ### 6. Updated activity_logs
  - Enhanced activity logs specific for trading

  ## Security
  - All tables have RLS enabled
  - Users can only access their own data
*/

-- Create wallets table (simple version for our bot)
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address text NOT NULL,
  encrypted_private_key text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create custom_tokens table
CREATE TABLE IF NOT EXISTS custom_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  decimals integer NOT NULL DEFAULT 18,
  dex text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create trading_strategies table (one per user)
CREATE TABLE IF NOT EXISTS trading_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  type text NOT NULL DEFAULT 'daily_smooth_buy',
  min_amount numeric NOT NULL DEFAULT 0.001,
  max_amount numeric NOT NULL DEFAULT 0.01,
  slippage numeric NOT NULL DEFAULT 0.5,
  trading_mode text NOT NULL DEFAULT 'interval',
  interval integer NOT NULL DEFAULT 5,
  interval_type text NOT NULL DEFAULT 'minutes',
  percentage_threshold numeric NOT NULL DEFAULT 1.0,
  active_24_7 boolean NOT NULL DEFAULT true,
  selected_dex text NOT NULL DEFAULT 'falcoxswap',
  selected_token text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create bot_sessions table (one per user)
CREATE TABLE IF NOT EXISTS bot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_running boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  stopped_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create bot_stats table (one per user)
CREATE TABLE IF NOT EXISTS bot_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_tx integer NOT NULL DEFAULT 0,
  total_buys integer NOT NULL DEFAULT 0,
  total_sells integer NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0,
  volume_24h numeric NOT NULL DEFAULT 0,
  last_volume_24h_reset timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_tokens_user_id ON custom_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON wallets;

DROP POLICY IF EXISTS "Users can view own custom tokens" ON custom_tokens;
DROP POLICY IF EXISTS "Users can insert own custom tokens" ON custom_tokens;
DROP POLICY IF EXISTS "Users can delete own custom tokens" ON custom_tokens;

DROP POLICY IF EXISTS "Users can view own trading strategy" ON trading_strategies;
DROP POLICY IF EXISTS "Users can insert own trading strategy" ON trading_strategies;
DROP POLICY IF EXISTS "Users can update own trading strategy" ON trading_strategies;

DROP POLICY IF EXISTS "Users can view own bot session" ON bot_sessions;
DROP POLICY IF EXISTS "Users can insert own bot session" ON bot_sessions;
DROP POLICY IF EXISTS "Users can update own bot session" ON bot_sessions;

DROP POLICY IF EXISTS "Users can view own bot stats" ON bot_stats;
DROP POLICY IF EXISTS "Users can insert own bot stats" ON bot_stats;
DROP POLICY IF EXISTS "Users can update own bot stats" ON bot_stats;

-- Policies for wallets
CREATE POLICY "Users can view own wallets"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON wallets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for custom_tokens
CREATE POLICY "Users can view own custom tokens"
  ON custom_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom tokens"
  ON custom_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom tokens"
  ON custom_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for trading_strategies
CREATE POLICY "Users can view own trading strategy"
  ON trading_strategies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trading strategy"
  ON trading_strategies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading strategy"
  ON trading_strategies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for bot_sessions
CREATE POLICY "Users can view own bot session"
  ON bot_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot session"
  ON bot_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot session"
  ON bot_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for bot_stats
CREATE POLICY "Users can view own bot stats"
  ON bot_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot stats"
  ON bot_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot stats"
  ON bot_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_trading_strategies_updated_at ON trading_strategies;
CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON trading_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bot_sessions_updated_at ON bot_sessions;
CREATE TRIGGER update_bot_sessions_updated_at BEFORE UPDATE ON bot_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bot_stats_updated_at ON bot_stats;
CREATE TRIGGER update_bot_stats_updated_at BEFORE UPDATE ON bot_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize user data on signup
CREATE OR REPLACE FUNCTION public.initialize_bot_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Create bot stats
  INSERT INTO public.bot_stats (user_id, created_at, updated_at)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create bot session
  INSERT INTO public.bot_sessions (user_id, is_running, updated_at)
  VALUES (NEW.id, false, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize data on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_init_bot_data ON auth.users;
CREATE TRIGGER on_auth_user_created_init_bot_data
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_bot_user_data();
