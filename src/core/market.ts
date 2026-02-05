import { useState, useEffect, useRef } from "react";
import { useTerminal } from "./context";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Helper
const getTfSeconds = (tf: string) => {
    const unit = tf.slice(-1);
    const val = parseInt(tf);
    if (unit === 'm') return val * 60;
    if (unit === 'h') return val * 3600;
    if (unit === 'd') return val * 86400;
    return 60;
};

// Mock Data Generator
const generateMockCandle = (prev: Candle, intervalSeconds: number = 60): Candle => {
    const volatility = 0.001; // 0.1% volatility
    const change = prev.close * (Math.random() - 0.5) * volatility;
    const close = prev.close + change;
    const high = Math.max(prev.close, close) + Math.random() * 50;
    const low = Math.min(prev.close, close) - Math.random() * 50;
    return {
        time: prev.time + intervalSeconds,
        open: prev.close,
        high,
        low,
        close,
        volume: Math.random() * 10
    };
};

const INITIAL_MOCK_PRICE = 95000;

export function useMarketData() {
  const { asset, timeframe, setConnectionStatus, connectionStatus } = useTerminal();
  const [data, setData] = useState<Candle[]>([]);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const dataRef = useRef<Candle[]>([]); // Ref to avoid closure staleness issues in intervals
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load History (REST via Proxy)
  useEffect(() => {
    let isMounted = true;
    
    const loadHistory = async () => {
        setConnectionStatus("CONNECTING");
        try {
            // Use local proxy to avoid CORS
            const res = await fetch(`/api/market/kline?symbol=${asset.toUpperCase()}&interval=${timeframe}&limit=500`);
            if (!res.ok) throw new Error("REST API Error");
            
            const raw = await res.json();
            const candles: Candle[] = raw.map((d: any) => ({
                time: d[0] / 1000,
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            }));
            
            if (isMounted) {
                setData(candles);
                dataRef.current = candles;
                if (candles.length > 0) {
                    setCurrentCandle(candles[candles.length - 1]);
                }
                setConnectionStatus("LIVE"); // Assume LIVE initially, WS will take over or fail to polling
            }
        } catch (error) {
            console.warn("Market Data load failed:", error);
            // Retry or keep Loading? forcing Simulated only if explicitly totally broken?
            // Let's try to default to simulated ONLY if totally unrecoverable, but user wants real data.
            // For now, let's fall back to polling if history fails? No, need history for chart underlay.
            // Fallback to simulated for now if it truly fails, but Proxy should fix 99% of cases.
             setConnectionStatus("SIMULATED");
        }
    };

    loadHistory();

    return () => { isMounted = false; };
  }, [asset, timeframe, setConnectionStatus]);

  // 2. WebSocket & Realtime Updates
  useEffect(() => {
    // We want to try connecting unless explicitly manually disconnected (which we don't have yet)
    // If status is SIMULATED, we might still want to try connecting if the user changes asset? 
    // Actually, getting out of SIMULATED mode requires a trigger. 
    // Let's allow trying to connect if we are not explicitly in a "Manual Sim" mode. 
    // For now, simple logic: Try to connect.
    
    if (ws.current) {
        ws.current.close();
        ws.current = null;
    }
    if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
    }

    const startPolling = () => {
       // Polling Fallback via Proxy
       if (pollingRef.current) clearInterval(pollingRef.current);
       
       pollingRef.current = setInterval(async () => {
           try {
               const res = await fetch(`/api/market/kline?symbol=${asset.toUpperCase()}&interval=${timeframe}&limit=1`);
               const raw = await res.json();
               if (!raw || !raw[0]) return;
               
               const d = raw[0]; // Last formed or current forming? check API. Usually last closed or current.
               // Binance klines returns current open candle as last element.
               // If limit=1, we verify time.
               
               const candle: Candle = {
                   time: d[0] / 1000,
                   open: parseFloat(d[1]),
                   high: parseFloat(d[2]),
                   low: parseFloat(d[3]),
                   close: parseFloat(d[4]),
                   volume: parseFloat(d[5])
               };
               setCurrentCandle(candle);
           } catch (e) {
               console.warn("Polling failed");
               // Don't switch to SIMULATED immediately, just retry
           }
       }, 2000); // Poll every 2s
    };

    const connectWS = (endpointIndex = 0) => {
        const wsEndpoints = [
            "wss://stream.binance.com:9443",
            "wss://stream.binance.com:443",
            "wss://data-stream.binance.vision",
        ];

        if (endpointIndex >= wsEndpoints.length) {
            console.warn("All WebSocket endpoints failed. Switching to POLLING.");
            setConnectionStatus("POLLING");
            startPolling();
            return;
        }

        const baseUrl = wsEndpoints[endpointIndex];
        const symbolLower = asset.toLowerCase();
        const wsUrl = `${baseUrl}/ws/${symbolLower}@kline_${timeframe}`;
        
        console.log(`Trying WebSocket: ${baseUrl} ...`);

        try {
            const socket = new WebSocket(wsUrl);
            ws.current = socket;

            socket.onopen = () => {
                console.log("WebSocket Connected:", baseUrl);
                setConnectionStatus("LIVE");
            };

            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (!message.k) return;
                
                const k = message.k;
                const candle: Candle = {
                    time: k.t / 1000,
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c),
                    volume: parseFloat(k.v)
                };

                setCurrentCandle(candle);

                // Update data array carefully
                setData(prev => {
                    const last = prev[prev.length - 1];
                    if (!last) return [candle];
                    
                    // Prevent Time Travel (Crash Protection)
                    if (candle.time < last.time) {
                         // Likely late packet or conflict with simulation
                         return prev;
                    }

                    if (candle.time === last.time) {
                        const newList = [...prev];
                        newList[newList.length - 1] = candle;
                        return newList;
                    } else {
                        const newList = [...prev, candle];
                        if (newList.length > 500) return newList.slice(-500);
                        return newList;
                    }
                });
            };

            socket.onerror = () => {
                console.warn(`WS Error (${baseUrl}). Trying next...`);
                socket.close(); // This will trigger onclose
            };

            socket.onclose = (e) => {
                // If invalid close (error), try next endpoint
                if (!e.wasClean) {
                     // Check if this was the current active socket before trying next
                     // to avoid race conditions is tricky, but simple recursion works for connection phase.
                     // But we need to delay slightly to avoid spam
                     setTimeout(() => {
                         if (connectionStatus !== "LIVE" && connectionStatus !== "SIMULATED") {
                             connectWS(endpointIndex + 1);
                         }
                     }, 500);
                } else {
                     // Clean close?
                }
            };

        } catch (e) {
            console.warn("WS Setup Error:", e);
            connectWS(endpointIndex + 1);
            return;
        }
    };
    
    // Always try to connect (Real Mode default)
    connectWS();

    return () => {
        if (ws.current) ws.current.close();
        if (pollingRef.current) clearInterval(pollingRef.current);
    };

  }, [asset, timeframe, setConnectionStatus]);

  // Simulation Interval (if Simulation Mode Active)
  useEffect(() => {
    if (connectionStatus !== "SIMULATED") return;

    console.log("Starting Simulation Mode (Real-time Tempo)...");
    
    // Use global helper
    const tfSeconds = getTfSeconds(timeframe);
    let ticks = 0; // Local counter for this effect closure

    const interval = setInterval(() => {
        setCurrentCandle(prev => {
            if (!prev) return null;
            
            ticks++;
            const isNewCandle = ticks >= tfSeconds;

            if (isNewCandle) {
                // Time to close the candle and start a new one
                ticks = 0;
                // Use global generateMockCandle with tfSeconds
                const next = generateMockCandle(prev, tfSeconds); 
                
                // Safely update history
                setData(d => {
                    if (d.length === 0) return [prev];
                    const last = d[d.length - 1];
                    if (last.time === prev.time) {
                        // Update existing last candle (it was the 'forming' one)
                        const copy = [...d];
                        copy[copy.length - 1] = prev;
                        return copy;
                    }
                    // Append new closed candle
                    return [...d, prev].slice(-500);
                }); 
                
                return next;
            } else {
                // Update existing candle (volatility)
                // Lower volatility for realistic "tempo" (User Request)
                const volatility = 0.00002; // ~0.002% per tick
                const change = prev.close * (Math.random() - 0.5) * volatility;
                const newPrice = prev.close + change;
                
                return {
                    ...prev,
                    close: newPrice,
                    high: Math.max(prev.high, newPrice),
                    low: Math.min(prev.low, newPrice),
                    // Volume accumulates
                    volume: (prev.volume || 0) + Math.random() * 5
                };
            }
        });
    }, 1000); // 1 second real-time tick

    return () => clearInterval(interval);
  }, [connectionStatus, timeframe]);

  return { data, currentCandle };
}
