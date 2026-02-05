"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Candle } from './market';
import { Signal } from './strategy';

export interface Position {
  id: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  size: number;
  leverage: number;
  tp: number;
  sl: number;
  timestamp: number;
  pnl?: number;
}

export interface Trade {
  id: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  size: number;
  leverage: number;
  pnl: number;
  timestamp: number;
  exitTime: number;
  reason: string;
}

interface TerminalStats {
  winrate: number;
  totalPnL: number;
  tradeCount: number;
  last10Results: ("WIN" | "LOSS")[];
}

interface TerminalContextType {
  // Config
  asset: string;
  timeframe: string;
  setAsset: (asset: string) => void;
  setTimeframe: (tf: string) => void;
  connectionStatus: "CONNECTING" | "LIVE" | "POLLING" | "SIMULATED" | "ERROR";
  setConnectionStatus: (status: "CONNECTING" | "LIVE" | "POLLING" | "SIMULATED" | "ERROR") => void;

  // Market Data
  currentCandle: Candle | null;
  setCurrentCandle: (c: Candle | null) => void;
  history: Candle[];
  setHistory: (h: Candle[]) => void;

  // Simulation
  balance: number;
  position: Position | null;
  lastSignal: Signal | null;
  cooldownCounter: number;
  
  // Trades & Stats
  trades: Trade[];
  stats: TerminalStats;
  resetHistory: () => void;

  // Logs
  logs: string[];
  addLog: (msg: string) => void;

  openPosition: (side: "LONG" | "SHORT", price: number) => void;
  closePosition: (price: number, reason?: string) => void;
  updatePositionPnL: (currentPrice: number) => void;
  setLastSignal: (s: Signal | null) => void;
  decrementCooldown: () => void;
  
  isLocked: boolean;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [asset, setAssetRaw] = useState("BTCUSDT");
  const [timeframe, setTimeframeRaw] = useState("1m");
  const [connectionStatus, setConnectionStatus] = useState<TerminalContextType["connectionStatus"]>("CONNECTING");
  
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  const [history, setHistory] = useState<Candle[]>([]);

  const [balance, setBalance] = useState(50000); 
  const [position, setPosition] = useState<Position | null>(null);
  const [lastSignal, setLastSignal] = useState<Signal | null>(null);
  const [cooldownCounter, setCooldownCounter] = useState(0);

  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useCallback((msg: string) => {
      const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
      setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  // Trade History
  const [trades, setTrades] = useState<Trade[]>([]);

  // Load from LocalStorage on Mount
  useEffect(() => {
    const savedTrades = localStorage.getItem("qai_trades");
    const savedBalance = localStorage.getItem("qai_balance");
    if (savedTrades) {
        try {
            setTrades(JSON.parse(savedTrades));
        } catch(e) {}
    }
    if (savedBalance) {
        setBalance(parseFloat(savedBalance));
    }
  }, []);

  // Save Balance on change
  useEffect(() => {
      localStorage.setItem("qai_balance", balance.toString());
  }, [balance]);

  const isLocked = !!position;

  const setAsset = (a: string) => {
      if (isLocked) return;
      setAssetRaw(a);
      setCooldownCounter(0); 
      addLog(`Asset switched to ${a}`);
  };

  const setTimeframe = (t: string) => {
      if (isLocked) return;
      setTimeframeRaw(t);
      addLog(`Timeframe set to ${t}`);
  };

  const positionRef = React.useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);

  const openPosition = useCallback((side: "LONG" | "SHORT", price: number) => {
      // Check ref instead of state to avoid dependency
      if (positionRef.current) return;
      
      const leverage = 20;
      const tpPerc = 0.0025; 
      const slPerc = 0.0015; 

      const tp = side === "LONG" ? price * (1 + tpPerc) : price * (1 - tpPerc);
      const sl = side === "LONG" ? price * (1 - slPerc) : price * (1 + slPerc);

      setPosition({
          id: Date.now().toString(),
          side,
          entryPrice: price,
          size: 1000, 
          leverage,
          tp,
          sl,
          timestamp: Date.now(),
          pnl: 0
      });
  }, []);

  const closePosition = useCallback((price: number, reason: string = "MANUAL") => {
      const pos = positionRef.current;
      if (!pos) return;
      
      const multiplier = pos.side === "LONG" ? 1 : -1;
      const rawPnlPerc = (price - pos.entryPrice) / pos.entryPrice * multiplier;
      const realizedPnL = pos.size * pos.leverage * rawPnlPerc; // Gross PnL

      // Create Record
      const newTrade: Trade = {
          ...pos,
          exitPrice: price,
          exitTime: Date.now(),
          pnl: realizedPnL,
          reason
      };

      setTrades(prev => {
          const updated = [newTrade, ...prev].slice(0, 50); // Max 50
          localStorage.setItem("qai_trades", JSON.stringify(updated));
          return updated;
      });

      setBalance(prev => prev + realizedPnL);
      setPosition(null);
      setCooldownCounter(2); 
  }, []);

  const updatePositionPnL = useCallback((currentPrice: number) => {
       setPosition(prev => {
           if (!prev) return null;
           const multiplier = prev.side === "LONG" ? 1 : -1;
           const rawPnlPerc = (currentPrice - prev.entryPrice) / prev.entryPrice * multiplier;
           const pnlAmt = (prev.size * prev.leverage) * rawPnlPerc;
           
           // Optimization: Don't update if PnL is effectively same to avoid extra renders?
           // For now, this functional update removes 'position' dependency which is key.
           return { ...prev, pnl: pnlAmt };
       });
  }, []);

  const decrementCooldown = useCallback(() => {
      setCooldownCounter(prev => Math.max(0, prev - 1));
  }, []);

  const resetHistory = useCallback(() => {
      setTrades([]);
      localStorage.removeItem("qai_trades");
      setBalance(50000); // Reset Balance too? User said "Reset History". Usually implies stats. I'll reset balance to default for simulation sake.
  }, []);

  // Stats derivation
  const stats = React.useMemo(() => {
      const totalTrades = trades.length;
      if (totalTrades === 0) return { winrate: 0, totalPnL: 0, tradeCount: 0, last10Results: [] };

      const wins = trades.filter(t => t.pnl > 0).length;
      const winrate = (wins / totalTrades) * 100;
      const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
      const last10Results = trades.slice(0, 10).map(t => t.pnl > 0 ? "WIN" : "LOSS") as ("WIN" | "LOSS")[];

      return { winrate, totalPnL, tradeCount: totalTrades, last10Results };
  }, [trades]);

  return (
    <TerminalContext.Provider value={{ 
        asset, setAsset, 
        timeframe, setTimeframe, 
        connectionStatus, setConnectionStatus,
        currentCandle, setCurrentCandle,
        history, setHistory,
        balance, position, lastSignal, cooldownCounter,
        trades, stats, resetHistory,
        logs, addLog,
        openPosition, closePosition, updatePositionPnL, setLastSignal, decrementCooldown,
        isLocked
    }}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
}
