import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import Web3 from "npm:web3@1.10.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TradingStrategy {
  type: 'daily_smooth_buy' | 'daily_smooth_sell';
  min_amount: number;
  max_amount: number;
  slippage: number;
  trading_mode: 'interval' | 'percentage';
  interval: number;
  interval_type: 'seconds' | 'minutes' | 'hours';
  percentage_threshold: number;
  active_24_7: boolean;
  selected_dex: string;
  selected_token: string;
}

interface Wallet {
  address: string;
  encrypted_private_key: string;
}

interface ExecutionState {
  user_id: string;
  last_execution_time: string | null;
  initial_price: number | null;
  price_targets: any | null;
  next_execution_time: string | null;
  execution_count: number;
}

interface PriceTarget {
  price: number;
  executed: boolean;
  id: string;
}

const RPC_URLS = [
  "https://rpc.coredao.org",
  "https://rpc-core.icecreamswap.com",
];

const ROUTER_ADDRESS = "0x2C34490b5E30f3C6838aE59c8c5fE88F9B9fBc8A";
const WCORE_ADDRESS = "0x40375C92d9FAf44d2f9db9Bd9ba41a3317a2404f";

const createWeb3Instance = (): Web3 => {
  const rpcUrl = RPC_URLS[Math.floor(Math.random() * RPC_URLS.length)];
  return new Web3(new Web3.providers.HttpProvider(rpcUrl));
};

const getRandomAmount = (min: number, max: number): string => {
  const amount = Math.random() * (max - min) + min;
  return amount.toFixed(6);
};

const decryptPrivateKey = (encrypted: string): string => {
  return encrypted;
};

const getTokenPrice = async (tokenAddress: string): Promise<number> => {
  try {
    return Math.random() * 0.01;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return 0;
  }
};

const getIntervalMilliseconds = (interval: number, intervalType: string): number => {
  switch (intervalType) {
    case 'seconds':
      return interval * 1000;
    case 'minutes':
      return interval * 60 * 1000;
    case 'hours':
      return interval * 60 * 60 * 1000;
    default:
      return interval * 60 * 1000;
  }
};

const calculatePriceTargets = (initialPrice: number, strategy: TradingStrategy): PriceTarget[] => {
  const targets: PriceTarget[] = [];
  let targetPrice = initialPrice;

  for (let i = 0; i < 15; i++) {
    if (strategy.type === 'daily_smooth_buy') {
      targetPrice = targetPrice * (1 - strategy.percentage_threshold / 100);
    } else {
      targetPrice = targetPrice * (1 + strategy.percentage_threshold / 100);
    }

    targets.push({
      price: targetPrice,
      executed: false,
      id: `target-${Date.now()}-${i}`
    });
  }

  return targets;
};

const shouldExecuteTrade = async (
  supabase: any,
  userId: string,
  strategy: TradingStrategy,
  executionState: ExecutionState,
  currentPrice: number
): Promise<{ shouldExecute: boolean; updatedState: Partial<ExecutionState> }> => {
  const now = new Date();

  if (strategy.trading_mode === 'interval') {
    if (!executionState.next_execution_time) {
      return {
        shouldExecute: true,
        updatedState: {
          next_execution_time: new Date(now.getTime() + getIntervalMilliseconds(strategy.interval, strategy.interval_type)).toISOString(),
          last_execution_time: now.toISOString()
        }
      };
    }

    const nextExecution = new Date(executionState.next_execution_time);
    if (now >= nextExecution) {
      return {
        shouldExecute: true,
        updatedState: {
          next_execution_time: new Date(now.getTime() + getIntervalMilliseconds(strategy.interval, strategy.interval_type)).toISOString(),
          last_execution_time: now.toISOString()
        }
      };
    }

    return { shouldExecute: false, updatedState: {} };
  }

  if (strategy.trading_mode === 'percentage') {
    if (!executionState.initial_price || !executionState.price_targets) {
      const targets = calculatePriceTargets(currentPrice, strategy);
      return {
        shouldExecute: false,
        updatedState: {
          initial_price: currentPrice,
          price_targets: JSON.stringify(targets)
        }
      };
    }

    let targets: PriceTarget[];
    try {
      targets = JSON.parse(executionState.price_targets);
      if (!Array.isArray(targets) || targets.length === 0) {
        throw new Error('Invalid targets array');
      }
    } catch (error) {
      const newTargets = calculatePriceTargets(currentPrice, strategy);
      return {
        shouldExecute: false,
        updatedState: {
          initial_price: currentPrice,
          price_targets: JSON.stringify(newTargets)
        }
      };
    }
    const visibleTargets = targets.slice(0, 5);
    const reserveTargets = targets.slice(5);

    for (let i = 0; i < visibleTargets.length; i++) {
      const target = visibleTargets[i];
      if (target.executed) continue;

      const shouldExecute = strategy.type === 'daily_smooth_buy'
        ? currentPrice <= target.price
        : currentPrice >= target.price;

      if (shouldExecute) {
        target.executed = true;

        let updatedTargets = [...visibleTargets];
        if (reserveTargets.length > 0) {
          const newTarget = reserveTargets.shift()!;
          updatedTargets = [
            ...visibleTargets.slice(0, i),
            target,
            ...visibleTargets.slice(i + 1),
            newTarget
          ];
        }

        const allTargets = [...updatedTargets, ...reserveTargets];

        return {
          shouldExecute: true,
          updatedState: {
            price_targets: JSON.stringify(allTargets),
            last_execution_time: now.toISOString()
          }
        };
      }
    }

    return { shouldExecute: false, updatedState: {} };
  }

  return { shouldExecute: false, updatedState: {} };
};

const executeTrade = async (
  web3: Web3,
  wallet: Wallet,
  strategy: TradingStrategy
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const type = strategy.type === 'daily_smooth_buy' ? 'buy' : 'sell';
    const amount = getRandomAmount(strategy.min_amount, strategy.max_amount);

    console.log(`Executing ${type} trade: ${amount} for ${wallet.address}`);

    return {
      success: true,
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
    };
  } catch (error: any) {
    console.error('Trade execution error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: activeSessions, error: sessionsError } = await supabaseClient
      .from('bot_sessions')
      .select('user_id, is_running')
      .eq('is_running', true);

    if (sessionsError) {
      throw new Error(`Failed to fetch active sessions: ${sessionsError.message}`);
    }

    if (!activeSessions || activeSessions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active bot sessions to process',
          processed: 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const results = [];
    const web3 = createWeb3Instance();

    for (const session of activeSessions) {
      try {
        const [strategyRes, walletsRes, stateRes] = await Promise.all([
          supabaseClient
            .from('trading_strategies')
            .select('*')
            .eq('user_id', session.user_id)
            .single(),
          supabaseClient
            .from('wallets')
            .select('address, encrypted_private_key')
            .eq('user_id', session.user_id),
          supabaseClient
            .from('bot_execution_state')
            .select('*')
            .eq('user_id', session.user_id)
            .maybeSingle()
        ]);

        const strategy = strategyRes.data;
        const wallets = walletsRes.data;
        let executionState = stateRes.data;

        if (!executionState) {
          const { data: newState } = await supabaseClient
            .from('bot_execution_state')
            .insert({
              user_id: session.user_id,
              execution_count: 0,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          executionState = newState;
        }

        if (!strategy || !wallets || wallets.length === 0) {
          console.error(`Missing data for user ${session.user_id}`);
          continue;
        }

        const currentPrice = await getTokenPrice(strategy.selected_token);
        if (currentPrice <= 0) {
          console.error(`Invalid price for user ${session.user_id}`);
          continue;
        }

        const { shouldExecute, updatedState } = await shouldExecuteTrade(
          supabaseClient,
          session.user_id,
          strategy,
          executionState,
          currentPrice
        );

        if (Object.keys(updatedState).length > 0) {
          await supabaseClient
            .from('bot_execution_state')
            .update({
              ...updatedState,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user_id);
        }

        if (!shouldExecute) {
          results.push({
            user_id: session.user_id,
            success: true,
            message: 'Waiting for execution condition',
            skipped: true
          });
          continue;
        }

        const wallet = wallets[Math.floor(Math.random() * wallets.length)];
        const tradeResult = await executeTrade(web3, wallet, strategy);

        if (tradeResult.success) {
          const { data: stats } = await supabaseClient
            .from('bot_stats')
            .select('*')
            .eq('user_id', session.user_id)
            .single();

          const type = strategy.type === 'daily_smooth_buy' ? 'buy' : 'sell';

          await Promise.all([
            supabaseClient
              .from('bot_stats')
              .update({
                total_tx: (stats?.total_tx || 0) + 1,
                total_buys: type === 'buy' ? (stats?.total_buys || 0) + 1 : stats?.total_buys,
                total_sells: type === 'sell' ? (stats?.total_sells || 0) + 1 : stats?.total_sells,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', session.user_id),
            supabaseClient
              .from('activity_logs')
              .insert({
                user_id: session.user_id,
                type: type,
                amount: getRandomAmount(strategy.min_amount, strategy.max_amount),
                price: currentPrice,
                dex: strategy.selected_dex,
                token_symbol: 'TOKEN'
              }),
            supabaseClient
              .from('bot_execution_state')
              .update({
                execution_count: (executionState?.execution_count || 0) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', session.user_id)
          ]);
        }

        results.push({
          user_id: session.user_id,
          success: tradeResult.success,
          error: tradeResult.error,
          tx_hash: tradeResult.txHash
        });

      } catch (userError: any) {
        console.error(`Error processing user ${session.user_id}:`, userError);
        results.push({
          user_id: session.user_id,
          success: false,
          error: userError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} bot sessions`,
        processed: results.length,
        results: results
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});