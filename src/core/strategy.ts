import { calcEMA, calcRSI } from "./indicators";
import { Candle } from "./market";

export interface Signal {
  type: "LONG" | "SHORT" | "NEUTRAL";
  price: number;
  time: number;
  reason: string;
}

export function detectSignal(candles: Candle[]): Signal {
  if (candles.length < 100) return { type: "NEUTRAL", price: 0, time: 0, reason: "Not enough data" };

  const closes = candles.map(c => c.close);
  const lastClose = closes[closes.length - 1];
  const lastTime = candles[candles.length - 1].time;

  // Parameters for High Accuracy "Trend + Correction" Strategy
  const emaFastPeriod = 9;
  const emaTrendPeriod = 50;
  const emaMajorTrendPeriod = 200;
  const rsiPeriod = 14;

  // Calculate Indicators
  const ema9 = calcEMA(closes, emaFastPeriod);
  const ema50 = calcEMA(closes, emaTrendPeriod);
  const ema200 = calcEMA(closes, emaMajorTrendPeriod);
  const rsi = calcRSI(closes, rsiPeriod);

  // Get recent values
  const lastEma9 = ema9[ema9.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  const lastEma200 = ema200[ema200.length - 1];
  const lastRsi = rsi[rsi.length - 1];
  const prevRsi = rsi[rsi.length - 2];

  // Helper: Detect Trend
  const isUptrend = lastEma50 > lastEma200;
  const isDowntrend = lastEma50 < lastEma200;

  // STRATEGY: "Correction Scalper" (Win Rate Optimized)
  
  // 1. SETUP: UPTREND
  // We want to Buy the Dip (Correction)
  if (isUptrend) {
      // Condition: RSI was Oversold/Low (< 45) and is now turning up OR Price bounced off EMA50
      // Simplification: RSI dipped below 45 (Strict Dip) and Price closes back above EMA9
      const isDip = prevRsi < 45; // Stricter Dip
      const momentumRecovered = lastClose > lastEma9;
      
      if (isDip && momentumRecovered) {
          return { 
             type: "LONG", 
             price: lastClose, 
             time: lastTime, 
             reason: `TREND UP (Buy Deep Dip): RSI ${lastRsi.toFixed(1)} < 45 & Price > EMA9` 
          };
      }
  }

  // 2. SETUP: DOWNTREND
  // We want to Sell the Rally (Correction)
  if (isDowntrend) {
      // Condition: RSI was Overbought/High (> 55) and is now turning down OR Price rejected ema50
      // Simplification: RSI spiked above 55 (Strict Rally) and Price closes back below EMA9
      const isRally = prevRsi > 55; // Stricter Rally
      const momentumResumed = lastClose < lastEma9;

      if (isRally && momentumResumed) {
          return { 
             type: "SHORT", 
             price: lastClose, 
             time: lastTime, 
             reason: `TREND DOWN (Sell Rally): RSI ${lastRsi.toFixed(1)} > 45 & Price < EMA9` 
          };
      }
  }

  return { type: "NEUTRAL", price: lastClose, time: lastTime, reason: "Waiting for Setup" };
}
