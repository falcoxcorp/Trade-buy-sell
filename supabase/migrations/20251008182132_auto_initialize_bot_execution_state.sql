/*
  # Auto-initialize bot_execution_state when bot starts

  ## Purpose
  When a user starts the bot (is_running = true), automatically create their
  bot_execution_state entry to prevent errors in the Edge Function.

  ## Changes
  1. Create function to initialize bot_execution_state
  2. Create trigger on bot_sessions update/insert
*/

-- Function to initialize bot_execution_state
CREATE OR REPLACE FUNCTION public.initialize_bot_execution_state()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_running = true THEN
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
      NULL,
      0,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on bot_sessions changes
DROP TRIGGER IF EXISTS on_bot_session_started ON public.bot_sessions;
CREATE TRIGGER on_bot_session_started
  AFTER INSERT OR UPDATE ON public.bot_sessions
  FOR EACH ROW
  WHEN (NEW.is_running = true)
  EXECUTE FUNCTION public.initialize_bot_execution_state();
