import { Candle } from "./market";
import { calcEMA, calcRSI } from "./indicators";

export interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  trades: {
    entryTime: number;
    entryPrice: number;
    exitPrice: number;
    side: "LONG" | "SHORT";
    pnl: number;
    result: "WIN" | "LOSS";
  }[];
}

// Simulates the "High Precision" strategy on historical data
export function runBacktest(candles: Candle[], maxTrades: number = 50): BacktestResult {
  const trades: BacktestResult["trades"] = [];
  
  if (candles.length < 250) {
    return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, trades: [] };
  }

  // Calculate all indicators upfront
  const closes = candles.map(c => c.close);
  const ema9 = calcEMA(closes, 9);
  const ema50 = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const rsi = calcRSI(closes, 14);

  // Simulation Parameters (Matching strategy.ts)
  const TP_PERCENT = 0.003; // 0.3% TP
  const SL_PERCENT = 0.001; // 0.1% SL (Tight SL for high win rate)
  const COOLDOWN_CANDLES = 15; // 15 candle cooldown (15 mins on 1m chart)

  let inPosition = false;
  let positionSide: "LONG" | "SHORT" = "LONG";
  let entryPrice = 0;
  let entryTime = 0;
  let tp = 0;
  let sl = 0;
  let cooldown = 0;

  // Start from candle 200 (need enough data for EMA200)
  for (let i = 200; i < candles.length && trades.length < maxTrades; i++) {
    const candle = candles[i];
    const lastEma9 = ema9[i];
    const lastEma50 = ema50[i];
    const lastEma200 = ema200[i];
    const lastRsi = rsi[i];
    const prevRsi = rsi[i - 1];

    // Cooldown decrement
    if (cooldown > 0) {
      cooldown--;
    }

    // Exit Check
    if (inPosition) {
      let exitPrice = 0;
      let result: "WIN" | "LOSS" = "WIN";

      if (positionSide === "LONG") {
        if (candle.low <= sl) {
          exitPrice = sl;
          result = "LOSS";
        } else if (candle.high >= tp) {
          exitPrice = tp;
          result = "WIN";
        }
      } else {
        if (candle.high >= sl) {
          exitPrice = sl;
          result = "LOSS";
        } else if (candle.low <= tp) {
          exitPrice = tp;
          result = "WIN";
        }
      }

      if (exitPrice > 0) {
        const pnl = positionSide === "LONG" 
          ? (exitPrice - entryPrice) / entryPrice * 100 
          : (entryPrice - exitPrice) / entryPrice * 100;

        trades.push({
          entryTime,
          entryPrice,
          exitPrice,
          side: positionSide,
          pnl,
          result
        });

        inPosition = false;
        cooldown = COOLDOWN_CANDLES; // Start cooldown after trade
      }
    }

    // Entry Check (Only if not in position and cooldown is 0)
    if (!inPosition && cooldown === 0) {
      const isUptrend = lastEma50 > lastEma200;
      const isDowntrend = lastEma50 < lastEma200;

      // LONG Setup (Uptrend + Dip)
      if (isUptrend && prevRsi < 55 && candle.close > lastEma9) {
        inPosition = true;
        positionSide = "LONG";
        entryPrice = candle.close;
        entryTime = candle.time;
        tp = entryPrice * (1 + TP_PERCENT);
        sl = entryPrice * (1 - SL_PERCENT);
      }

      // SHORT Setup (Downtrend + Rally)
      if (isDowntrend && prevRsi > 45 && candle.close < lastEma9) {
        inPosition = true;
        positionSide = "SHORT";
        entryPrice = candle.close;
        entryTime = candle.time;
        tp = entryPrice * (1 - TP_PERCENT);
        sl = entryPrice * (1 + SL_PERCENT);
      }
    }
  }

  const wins = trades.filter(t => t.result === "WIN").length;
  const losses = trades.filter(t => t.result === "LOSS").length;

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    trades
  };
}
