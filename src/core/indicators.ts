/**
 * Calculate Exponential Moving Average (EMA)
 * @param data Array of numbers (prices)
 * @param period Period for EMA
 * @returns Array of EMA values matching input length (padded with null/NaN at start)
 */
export function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  // Simple MA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
      if (i < data.length) sum += data[i];
  }
  const initialSMA = sum / period;

  let prevEMA = initialSMA;

  for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
          emaArray.push(NaN); // Not enough data
          continue;
      }
      if (i === period - 1) {
          emaArray.push(initialSMA);
          continue;
      }
      
      const ema = (data[i] - prevEMA) * k + prevEMA;
      emaArray.push(ema);
      prevEMA = ema;
  }
  
  return emaArray;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param data Array of numbers (prices)
 * @param period RSI Period
 * @returns Array of RSI values
 */
export function calcRSI(data: number[], period: number): number[] {
  const rsiArray: number[] = [];
  const changes: number[] = [];

  for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First Avg Gain/Loss
  for (let i = 0; i < period; i++) {
      const chg = changes[i];
      if (chg > 0) avgGain += chg;
      else avgLoss += Math.abs(chg);
  }
  
  avgGain /= period;
  avgLoss /= period;

  // Fill initial NaN
  for (let i = 0; i < period; i++) {
      rsiArray.push(NaN);
  }
  
  // First RSI
  let rs = avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  rsiArray.push(rsi);

  // Smooth subsequent steps
  for (let i = period + 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;

      rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
      rsiArray.push(rsi);
  }

  return rsiArray;
}
