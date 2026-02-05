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

  // Parameters
  const emaFastPeriod = 21;
  const emaSlowPeriod = 65;
  const rsiFastPeriod = 25;
  const rsiSlowPeriod = 100;

  // Calculate
  const ema21 = calcEMA(closes, emaFastPeriod);
  const ema65 = calcEMA(closes, emaSlowPeriod);
  const rsi25 = calcRSI(closes, rsiFastPeriod);
  const rsi100 = calcRSI(closes, rsiSlowPeriod);

  // Get last values
  const lastEma21 = ema21[ema21.length - 1];
  const lastEma65 = ema65[ema65.length - 1];
  const lastRsi25 = rsi25[rsi25.length - 1];
  const lastRsi100 = rsi100[rsi100.length - 1];

  // Logic: Classic Scalper
  // LONG: EMA21 > EMA65 && RSI_Fast > RSI_Slow && Close > EMA21
  if (lastEma21 > lastEma65 && lastRsi25 > lastRsi100 && lastClose > lastEma21) {
      return { 
          type: "LONG", 
          price: lastClose, 
          time: lastTime,
          reason: `EMA${emaFastPeriod} > EMA${emaSlowPeriod} & RSI${rsiFastPeriod} > RSI${rsiSlowPeriod}`
      };
  }

  // SHORT: EMA21 < EMA65 && RSI_Fast < RSI_Slow && Close < EMA21
  if (lastEma21 < lastEma65 && lastRsi25 < lastRsi100 && lastClose < lastEma21) {
      return { 
          type: "SHORT", 
          price: lastClose, 
          time: lastTime,
          reason: `EMA${emaFastPeriod} < EMA${emaSlowPeriod} & RSI${rsiFastPeriod} < RSI${rsiSlowPeriod}`
      };
  }

  return { type: "NEUTRAL", price: lastClose, time: lastTime, reason: "No Signal" };
}
