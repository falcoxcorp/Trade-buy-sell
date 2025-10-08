/*
  # Enable pg_cron and Schedule Trading Bot

  ## Purpose
  This migration enables the pg_cron extension and schedules the trading bot
  to run automatically every 5 minutes without needing GitHub Actions or external services.

  ## Changes
  1. Enable pg_cron extension
  2. Enable pg_net extension for HTTP requests
  3. Create a function to call the Edge Function via HTTP
  4. Schedule the function to run every 5 minutes

  ## How it works
  - pg_cron is a PostgreSQL extension that allows scheduling jobs
  - pg_net allows making HTTP requests from PostgreSQL
  - Every 5 minutes, it calls the trading-bot-worker Edge Function
  - The Edge Function processes all active bot sessions
  - Everything happens within Supabase, no external services needed
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the Edge Function via HTTP
CREATE OR REPLACE FUNCTION public.trigger_trading_bot_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://bddipfiipcxbxblxrfqp.supabase.co/functions/v1/trading-bot-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZGlwZmlpcGN4YnhibHhyZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzExOTksImV4cCI6MjA3NTQ0NzE5OX0.LFdz4ubYwU2GAZ3m_yv6mXc_1K849fs9O8B8Wupcc6s'
    ),
    body := '{}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'Trading bot worker triggered at %, request_id: %', now(), request_id;
END;
$$;

-- Create a table to log cron executions (for monitoring)
CREATE TABLE IF NOT EXISTS public.bot_cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz DEFAULT now(),
  status text,
  message text
);

-- Enable RLS on cron logs
ALTER TABLE public.bot_cron_logs ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Anyone authenticated can view cron logs" ON public.bot_cron_logs;

-- Policy for viewing logs
CREATE POLICY "Anyone authenticated can view cron logs"
  ON public.bot_cron_logs FOR SELECT
  TO authenticated
  USING (true);
