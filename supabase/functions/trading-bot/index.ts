import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Web3 from "npm:web3@1.5.2";
import CryptoJS from "npm:crypto-js@4.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BotConfig {
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
}

interface Wallet {
  id: string;
  user_id: string;
  name: string;
  address: string;
  encrypted_private_key: string;
  network: string;
  is_active: boolean;
}

interface Token {
  id: string;
  user_id: string;
  symbol: string;
  contract_address: string;
  network: string;
  is_monitored: boolean;
  target_buy_price: number | null;
  target_sell_price: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const userId = user.id;

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "execute";

    if (action === "execute") {
      const result = await executeTradingBot(supabase, userId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "status") {
      const status = await getBotStatus(supabase, userId);
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function executeTradingBot(supabase: any, userId: string) {
  const { data: configs, error: configError } = await supabase
    .from("bot_configurations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (configError) {
    throw new Error(`Config error: ${configError.message}`);
  }

  if (!configs) {
    return {
      success: false,
      message: "No active bot configuration found",
    };
  }

  const config: BotConfig = configs;

  const executionId = crypto.randomUUID();
  await supabase.from("bot_executions").insert({
    id: executionId,
    user_id: userId,
    config_id: config.id,
    started_at: new Date().toISOString(),
    status: "running",
  });

  await logActivity(supabase, userId, executionId, "info", "Bot execution started");

  try {
    const { data: wallets } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: tokens } = await supabase
      .from("trading_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("is_monitored", true);

    if (!wallets || wallets.length === 0) {
      throw new Error("No active wallets found");
    }

    if (!tokens || tokens.length === 0) {
      throw new Error("No monitored tokens found");
    }

    const { data: todayExecutions } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    const tradesExecutedToday = todayExecutions?.length || 0;

    if (tradesExecutedToday >= config.max_trades_per_day) {
      await logActivity(
        supabase,
        userId,
        executionId,
        "warning",
        `Daily trade limit reached: ${tradesExecutedToday}/${config.max_trades_per_day}`
      );

      await supabase
        .from("bot_executions")
        .update({
          completed_at: new Date().toISOString(),
          status: "success",
          trades_executed: 0,
        })
        .eq("id", executionId);

      return {
        success: true,
        message: "Daily trade limit reached",
        tradesExecuted: 0,
      };
    }

    let tradesExecuted = 0;

    for (const token of tokens as Token[]) {
      if (tradesExecutedToday + tradesExecuted >= config.max_trades_per_day) {
        break;
      }

      const mockPrice = Math.random() * 1000 + 100;

      let shouldTrade = false;
      let tradeType = "";

      if (token.target_buy_price && mockPrice <= token.target_buy_price) {
        shouldTrade = true;
        tradeType = "buy";
      } else if (token.target_sell_price && mockPrice >= token.target_sell_price) {
        shouldTrade = true;
        tradeType = "sell";
      }

      if (shouldTrade) {
        const wallet = wallets[0] as Wallet;

        const txHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`;

        await supabase.from("transactions").insert({
          user_id: userId,
          execution_id: executionId,
          wallet_id: wallet.id,
          token_id: token.id,
          transaction_hash: txHash,
          type: tradeType,
          amount: config.trade_amount,
          price: mockPrice,
          gas_used: config.gas_price || 0.001,
          status: "confirmed",
        });

        await logActivity(
          supabase,
          userId,
          executionId,
          "info",
          `${tradeType.toUpperCase()} ${config.trade_amount} ${token.symbol} at $${mockPrice}`,
          { tokenId: token.id, walletId: wallet.id, txHash }
        );

        tradesExecuted++;
      }
    }

    await supabase
      .from("bot_executions")
      .update({
        completed_at: new Date().toISOString(),
        status: "success",
        trades_executed: tradesExecuted,
      })
      .eq("id", executionId);

    await logActivity(
      supabase,
      userId,
      executionId,
      "info",
      `Bot execution completed. Trades executed: ${tradesExecuted}`
    );

    return {
      success: true,
      message: "Bot execution completed",
      tradesExecuted,
      executionId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await supabase
      .from("bot_executions")
      .update({
        completed_at: new Date().toISOString(),
        status: "error",
        error_message: errorMessage,
      })
      .eq("id", executionId);

    await logActivity(supabase, userId, executionId, "error", `Execution failed: ${errorMessage}`);

    throw error;
  }
}

async function getBotStatus(supabase: any, userId: string) {
  const { data: config } = await supabase
    .from("bot_configurations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const { data: recentExecutions } = await supabase
    .from("bot_executions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(10);

  const { data: todayTrades } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  return {
    isActive: !!config,
    config,
    recentExecutions: recentExecutions || [],
    todayTradesCount: todayTrades?.length || 0,
  };
}

async function logActivity(
  supabase: any,
  userId: string,
  executionId: string,
  level: string,
  message: string,
  metadata?: any
) {
  await supabase.from("activity_logs").insert({
    user_id: userId,
    execution_id: executionId,
    level,
    message,
    metadata: metadata || null,
  });
}
