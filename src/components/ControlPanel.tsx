"use client";

import { useTerminal } from "@/core/context";
import { cn } from "@/core/format";
import { Activity, ArrowDown, ArrowUp, ChevronDown, Wand2, Power, Layers } from "lucide-react";
import { useState, useEffect } from "react";

export function ControlPanel() {
  const { 
    asset, setAsset, 
    timeframe, setTimeframe, 
    position, balance,
    openPosition, closePosition,
    currentCandle, history
  } = useTerminal();

  const [tfOpen, setTfOpen] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceText, setAdviceText] = useState("");

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // Simulated AI Signal Status
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleManualTrade = (side: "LONG" | "SHORT") => {
      if (position) return;
      if (!currentCandle) return;
      openPosition(side, currentCandle.close);
  };

  const askAdvice = async () => {
      if (!position) return;
      setAdviceLoading(true);
      setAdviceText("");
      
      try {
          // Fetch advice from API
          const res = await fetch("/api/ai/advice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  symbol: asset,
                  side: position.side,
                  entry: position.entryPrice,
                  pnl: position.pnl || 0,
                  lastCloses: history.slice(-50).map(c => c.close)
              })
          });
          const data = await res.json();
          setAdviceText(data.advice || "No advice received.");
      } catch (e) {
          setAdviceText("Error connecting to AI.");
      } finally {
          setAdviceLoading(false);
      }
  };

  return (
    <aside className="w-72 bg-slate-900 border-r border-white/10 flex flex-col z-10 overflow-y-auto shrink-0 font-sans">
      {/* AI STATUS HEADER */}
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI ENGINE STATUS</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center gap-4 relative overflow-hidden mb-2">
            <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                <div className="relative z-10 text-blue-400">
                    <Layers className="w-5 h-5 animate-spin-slow" />
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 uppercase">Logic: High Precision</span>
                <span className="text-sm font-bold text-white tracking-wide">AUTO-TRADING{dots}</span>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-400 font-mono">
            <div>Interval: <span className="text-cyan-400">15 MIN</span></div>
            <div>Target: <span className="text-emerald-400">99.7% WIN</span></div>
        </div>
        <div className="mt-2 text-[9px] text-zinc-500 font-mono">
            Strategy: Trend + Correction (Buy Dip / Sell Rally)
        </div>
      </div>

      {/* CONTROLS */}
      <div className="p-4 space-y-6">
        
        {/* ASSET SELECTOR */}
        <div>
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Target Asset</h2>
            <button 
                onClick={() => setAsset('BTCUSDT')} 
                className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg border transition flex items-center justify-between mb-2",
                    asset === 'BTCUSDT' ? "bg-white/10 border-yellow-500/50" : "bg-black/20 border-white/5 hover:bg-white/5"
                )}
            >
                <div className="flex items-center gap-2">
                    <span className="text-yellow-500 font-bold">₿</span>
                    <span className="text-xs font-bold text-zinc-200">BTC/USDT</span>
                </div>
            </button>
            <button 
                onClick={() => setAsset('ETHUSDT')}
                className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg border transition flex items-center justify-between",
                    asset === 'ETHUSDT' ? "bg-white/10 border-blue-500/50" : "bg-black/20 border-white/5 hover:bg-white/5"
                )}
            >
                <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-bold">Ξ</span>
                    <span className="text-xs font-bold text-zinc-200">ETH/USDT</span>
                </div>
            </button>
        </div>

        {/* TIMEFRAME */}
        <div className="relative">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Timeframe</h2>
            <button 
                onClick={() => setTfOpen(!tfOpen)} 
                className="w-full flex items-center justify-between bg-black/20 border border-white/10 text-zinc-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/5 transition"
            >
                <span>{timeframe}</span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>
            
            {tfOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-1 grid grid-cols-3 gap-1">
                        {['1m', '3m', '5m', '15m', '30m', '1h', '4h'].map(tf => (
                            <button 
                                key={tf}
                                onClick={() => { setTimeframe(tf); setTfOpen(false); }} 
                                className="text-[10px] text-zinc-300 hover:text-white hover:bg-white/10 py-1 rounded"
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* MANUAL OVERRIDE */}
        <div>
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Manual Override</h2>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => handleManualTrade('LONG')}
                    disabled={!!position}
                    className="disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/10 hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                >
                    <ArrowUp className="w-3 h-3" /> LONG
                </button>
                <button 
                    onClick={() => handleManualTrade('SHORT')}
                    disabled={!!position}
                    className="disabled:opacity-50 disabled:cursor-not-allowed bg-rose-500/10 hover:bg-rose-600/20 border border-rose-500/30 hover:border-rose-500 text-rose-400 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                >
                    <ArrowDown className="w-3 h-3" /> SHORT
                </button>
            </div>
        </div>

        {/* ACTIVE POSITION CARD */}
        {position && (
             <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-lg animate-in slide-in-from-left-2 fade-in duration-300">
                 <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                     <span className="text-xs font-bold text-zinc-400">Position</span>
                     <span className={cn("text-xs font-bold", position.side === 'LONG' ? "text-emerald-400" : "text-rose-400")}>
                        {position.side} 20x
                     </span>
                 </div>
                 <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-zinc-400">PnL (Est)</span>
                     <span className={cn("text-xs font-mono font-bold", (position.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {formatIDR(position.pnl || 0)}
                     </span>
                 </div>
                 <div className="space-y-1 text-[10px] mb-3">
                     <div className="flex justify-between"><span className="text-zinc-500">Entry</span><span className="text-white font-mono">{position.entryPrice.toFixed(2)}</span></div>
                     <div className="flex justify-between"><span className="text-zinc-500">TP</span><span className="text-emerald-400 font-mono">{position.tp.toFixed(2)}</span></div>
                     <div className="flex justify-between"><span className="text-zinc-500">SL</span><span className="text-rose-400 font-mono">{position.sl.toFixed(2)}</span></div>
                 </div>

                 <div className="mb-2">
                     <button 
                        onClick={askAdvice} 
                        disabled={adviceLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[10px] font-bold py-1.5 rounded transition flex items-center justify-center gap-1 shadow-lg shadow-indigo-500/20 disabled:opacity-70"
                     >
                         {adviceLoading ? <Activity className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 text-yellow-300" />} 
                         {adviceLoading ? 'Analyzing...' : 'Ask AI Advice'}
                     </button>
                     {adviceText && (
                        <div className="mt-2 p-2 bg-indigo-900/40 border border-indigo-500/30 rounded text-[10px] text-zinc-300 italic">
                            AI: {adviceText}
                        </div>
                     )}
                 </div>

                 <button 
                    onClick={() => currentCandle && closePosition(currentCandle.close, "Manual Close")} 
                    className="w-full bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] py-1.5 rounded transition"
                 >
                     Close Now
                 </button>
            </div>
        )}

      </div>

      {/* BALANCE FOOTER */}
      <div className="mt-auto border-t border-white/10 bg-black/40 p-4">
        <div className="flex justify-between items-end">
            <div>
                <span className="text-[9px] text-zinc-500 block">MODAL SIMULASI</span>
                <span className="text-sm font-bold text-white font-mono">{formatIDR(balance)}</span>
            </div>
            <div className="text-right">
                <span className="text-[9px] text-zinc-500 block">STATUS</span>
                <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
            </div>
        </div>
      </div>
    </aside>
  );
}
