/*
  # Add Bot Execution State Table

  ## Purpose
  This table stores the internal execution state of the bot for each user,
  allowing the bot to maintain memory between Edge Function invocations.

  ## New Table: bot_execution_state
  - `user_id` (uuid, unique) - One state per user
  - `last_execution_time` (timestamptz) - When the last trade was executed
  - `initial_price` (numeric) - Initial price for percentage mode
  - `price_targets` (jsonb) - Array of price targets for percentage mode
  - `next_execution_time` (timestamptz) - When the next trade should execute (for interval mode)
  - `execution_count` (integer) - Number of executions since bot started
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can only access their own state
*/

-- Create bot_execution_state table
CREATE TABLE IF NOT EXISTS bot_execution_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_execution_time timestamptz,
  initial_price numeric,
  price_targets jsonb,
  next_execution_time timestamptz,
  execution_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bot_execution_state_user_id ON bot_execution_state(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_execution_state_next_execution ON bot_execution_state(next_execution_time);

-- Enable Row Level Security
ALTER TABLE bot_execution_state ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own execution state" ON bot_execution_state;
DROP POLICY IF EXISTS "Users can insert own execution state" ON bot_execution_state;
DROP POLICY IF EXISTS "Users can update own execution state" ON bot_execution_state;

-- Policies for bot_execution_state
CREATE POLICY "Users can view own execution state"
  ON bot_execution_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution state"
  ON bot_execution_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own execution state"
  ON bot_execution_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to access all states (for Edge Function)
CREATE POLICY "Service role can access all execution states"
  ON bot_execution_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bot_execution_state_updated_at ON bot_execution_state;
CREATE TRIGGER update_bot_execution_state_updated_at BEFORE UPDATE ON bot_execution_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize execution state when bot starts
CREATE OR REPLACE FUNCTION public.initialize_bot_execution_state()
RETURNS TRIGGER AS $$
BEGIN
  -- When bot_sessions.is_running changes to true, initialize or reset execution state
  IF NEW.is_running = true AND (OLD.is_running IS NULL OR OLD.is_running = false) THEN
    INSERT INTO public.bot_execution_state (
      user_id,
      last_execution_time,
      initial_price,
      price_targets,
      next_execution_time,
      execution_count,
      updated_at
    )
    VALUES (
      NEW.user_id,
      NULL,
      NULL,
      NULL,
      now(), -- Can execute immediately
      0,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      last_execution_time = NULL,
      initial_price = NULL,
      price_targets = NULL,
      next_execution_time = now(),
      execution_count = 0,
      updated_at = now();
  END IF;
  
  -- When bot stops, keep the state for potential resume
  IF NEW.is_running = false AND OLD.is_running = true THEN
    UPDATE public.bot_execution_state
    SET updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to manage execution state when bot starts/stops
DROP TRIGGER IF EXISTS on_bot_session_change ON bot_sessions;
CREATE TRIGGER on_bot_session_change
  AFTER INSERT OR UPDATE ON bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.initialize_bot_execution_state();
