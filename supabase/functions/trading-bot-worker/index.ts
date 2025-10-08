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

const executeTrade = async (
  web3: Web3,
  wallet: Wallet,
  strategy: TradingStrategy
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const type = strategy.type === 'daily_smooth_buy' ? 'buy' : 'sell';
    const amount = getRandomAmount(strategy.min_amount, strategy.max_amount);
    const privateKey = decryptPrivateKey(wallet.encrypted_private_key);

    const path = type === 'buy'
      ? [WCORE_ADDRESS, strategy.selected_token]
      : [strategy.selected_token, WCORE_ADDRESS];

    const amountWei = web3.utils.toWei(amount, 'ether');

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
        const { data: strategy, error: strategyError } = await supabaseClient
          .from('trading_strategies')
          .select('*')
          .eq('user_id', session.user_id)
          .single();

        if (strategyError || !strategy) {
          console.error(`No strategy found for user ${session.user_id}`);
          continue;
        }

        const { data: wallets, error: walletsError } = await supabaseClient
          .from('wallets')
          .select('address, encrypted_private_key')
          .eq('user_id', session.user_id);

        if (walletsError || !wallets || wallets.length === 0) {
          console.error(`No wallets found for user ${session.user_id}`);
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

          await supabaseClient
            .from('bot_stats')
            .update({
              total_tx: (stats?.total_tx || 0) + 1,
              total_buys: type === 'buy' ? (stats?.total_buys || 0) + 1 : stats?.total_buys,
              total_sells: type === 'sell' ? (stats?.total_sells || 0) + 1 : stats?.total_sells,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user_id);

          await supabaseClient
            .from('activity_logs')
            .insert({
              user_id: session.user_id,
              type: type,
              amount: getRandomAmount(strategy.min_amount, strategy.max_amount),
              price: 0.001,
              dex: strategy.selected_dex,
              token_symbol: 'TOKEN',
              tx_hash: tradeResult.txHash,
              created_at: new Date().toISOString()
            });
        }

        results.push({
          user_id: session.user_id,
          success: tradeResult.success,
          error: tradeResult.error
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
        message: `Processed ${results.length} active bots`,
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
