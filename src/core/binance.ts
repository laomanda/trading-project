import { useEffect, useState, useRef } from 'react';

export type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

// Moved from useBinanceStream.ts
export function useBinanceStream(symbol: string = 'btcusdt', interval: string = '1m') {
  const [lastCandle, setLastCandle] = useState<CandleData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = `wss://stream.binance.com:443/ws/${symbol}@kline_${interval}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to Binance Stream for ${symbol}`);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const k = message.k;
      
      const candle: CandleData = {
        time: k.t / 1000, 
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
      };
      
      setLastCandle(candle);
    };

    ws.onerror = (err) => {
      console.error('Binance WS Error:', err);
    };

    return () => {
      if (ws.readyState === 1) { 
        ws.close();
      }
    };
  }, [symbol, interval]);

  return lastCandle;
}

export const fetchHistoricalData = async (symbol: string = 'BTCUSDT', interval: string = '1m', limit: number = 300) => {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const data = await response.json();
    
    return data.map((d: any) => ({
      time: d[0] / 1000,
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
    }));
  } catch (error) {
    console.error('Failed to fetch historical data:', error);
    return [];
  }
};
