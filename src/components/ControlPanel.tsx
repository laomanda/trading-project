"use client";

import { useTerminal } from "@/core/context";

import { cn, formatIDR } from "@/core/format";
import { ASSETS } from "@/core/config";
import { calcEMA, calcRSI } from "@/core/indicators";
import { Activity, ArrowDown, ArrowUp, ChevronDown, Wand2, Power, Layers, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import { getSoundEnabled } from "@/core/sound"; // Ensure this is exported or just use local logic if lazy loading. Since we lazy load in click, we might need to lazy load init too? No, let's import top level for UI state.

export function ControlPanel() {
  const { 
    asset, setAsset, 
    timeframe, setTimeframe, 
    position, balance,
    openPosition, closePosition,
    currentCandle, history
  } = useTerminal();

  // Calculate Indicators
  const [indicators, setIndicators] = useState({ trend: "---", rsi: "---", isBullish: false });

  // Sound State
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => {
      // Sync with localStorage on mount
      import('@/core/sound').then(mod => setSoundOn(mod.getSoundEnabled()));
  }, []);

  useEffect(() => {
    if (history.length < 50) return;
    
    const closes = history.map(c => c.close);
    // Add current candle if it exists for latest data
    if (currentCandle) closes.push(currentCandle.close);

    const emaFast = calcEMA(closes, 21);
    const emaSlow = calcEMA(closes, 65);
    const rsi = calcRSI(closes, 25);

    const lastEmaFast = emaFast[emaFast.length - 1];
    const lastEmaSlow = emaSlow[emaSlow.length - 1];
    const lastRsi = rsi[rsi.length - 1];

    setIndicators({
        trend: lastEmaFast > lastEmaSlow ? "BULLISH" : "BEARISH",
        isBullish: lastEmaFast > lastEmaSlow,
        rsi: lastRsi.toFixed(1)
    });
  }, [history, currentCandle]);

  const [tfOpen, setTfOpen] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceText, setAdviceText] = useState("");



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
                <span className="text-[9px] text-zinc-500 uppercase">Logic: Classic Scalper</span>
                <span className="text-sm font-bold text-white tracking-wide">SCANNING{dots}</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-400 font-mono items-center">
            <div>EMA Trend: <span className={cn(indicators.isBullish ? "text-emerald-400" : "text-rose-400")}>{indicators.trend}</span></div>
            <div className="flex justify-end">
                <button 
                    onClick={() => {
                        import('@/core/sound').then(mod => {
                            const newState = !mod.getSoundEnabled();
                            mod.setSoundEnabled(newState);
                            // Force re-render to update icon (using local state trick or just rely on react)
                            // Better: use local state for UI sync
                            setSoundOn(newState);
                        });
                    }}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                >
                    {soundOn ? <Volume2 className="w-3 h-3 text-emerald-400" /> : <VolumeX className="w-3 h-3 text-zinc-600" />}
                    <span>{soundOn ? "ON" : "OFF"}</span>
                </button>
            </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="p-4 space-y-6">
        
        {/* ASSET SELECTOR */}
        <div>
            <h2 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Target Asset</h2>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                {ASSETS.map(a => {
                    const isActive = asset === a.symbol;
                    const colorMap: Record<string, { active: string; dot: string; icon: string }> = {
                        emerald: { active: "bg-zinc-100 border-zinc-100", dot: "bg-emerald-500", icon: "bg-black text-white" },
                        blue: { active: "bg-zinc-100 border-zinc-100", dot: "bg-blue-500", icon: "bg-black text-white" },
                        yellow: { active: "bg-zinc-100 border-zinc-100", dot: "bg-yellow-500", icon: "bg-black text-white" },
                        violet: { active: "bg-zinc-100 border-zinc-100", dot: "bg-violet-500", icon: "bg-black text-white" },
                        cyan: { active: "bg-zinc-100 border-zinc-100", dot: "bg-cyan-500", icon: "bg-black text-white" },
                        teal: { active: "bg-zinc-100 border-zinc-100", dot: "bg-teal-500", icon: "bg-black text-white" },
                    };
                    const colors = colorMap[a.color] || colorMap.emerald;

                    return (
                        <button 
                            key={a.symbol}
                            onClick={() => setAsset(a.symbol)} 
                            className={cn(
                                "w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between group",
                                isActive 
                                    ? `${colors.active} shadow-[0_0_10px_rgba(255,255,255,0.1)]` 
                                    : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", isActive ? colors.icon : "bg-zinc-800 text-zinc-400 group-hover:text-white")}>{a.icon}</div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn("text-xs font-bold leading-none", isActive ? "text-black" : "text-zinc-300")}>{a.label}</span>
                                    </div>
                                    <span className="text-[9px] text-zinc-500 font-mono">{a.name}</span>
                                </div>
                            </div>
                            {isActive && <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", colors.dot)} />}
                        </button>
                    );
                })}
            </div>
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

                 <div className="mb-3 space-y-2">
                     <button 
                        onClick={askAdvice} 
                        disabled={adviceLoading}
                        className="w-full bg-white text-black hover:bg-zinc-200 text-[10px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-70 group"
                     >
                         {adviceLoading ? <Activity className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 group-hover:rotate-12 transition-transform" />} 
                         {adviceLoading ? 'ANALYZING MARKET...' : (adviceText ? 'ASK AGAIN' : 'ASK AI ADVICE')}
                     </button>
                     
                     {adviceText && (
                        <div className={cn(
                            "p-3 border rounded-lg text-[10px] font-mono leading-relaxed animate-in fade-in slide-in-from-top-2",
                            adviceText.includes("HOLD") || adviceText.includes("TAHAN") || adviceText.includes("WAIT") ? "bg-amber-950/20 border-amber-500/30 text-amber-200" :
                            adviceText.includes("PROFIT") || adviceText.includes("TP") ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200" :
                            adviceText.includes("CUT") || adviceText.includes("WARNING") ? "bg-rose-950/20 border-rose-500/30 text-rose-200" :
                            "bg-zinc-950/50 border-white/10 text-zinc-300"
                        )}>
                            <span className="font-bold uppercase mb-1 block opacity-70">AI Recommendation:</span>
                            {adviceText}
                        </div>
                     )}
                 </div>

                 <button 
                    onClick={() => currentCandle && closePosition(currentCandle.close, "Manual Close")} 
                    className="w-full bg-zinc-900 hover:bg-rose-950/30 border border-zinc-800 hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 text-[10px] py-2 rounded-lg transition-all font-medium"
                 >
                     CLOSE POSITION
                 </button>
            </div>
        )}

      </div>

      {/* BALANCE FOOTER */}
      <div className="mt-auto border-t border-white/10 bg-black/40 p-4">
        <div className="flex justify-between items-end">
            <div>
                <span className="text-[9px] text-zinc-500 block">MODAL SIMULASI</span>
                <span className={cn("text-sm font-bold font-mono", balance <= 0 ? "text-rose-500" : "text-white")}>
                    {formatIDR(balance)}
                </span>
            </div>
            <div className="text-right">
                <span className="text-[9px] text-zinc-500 block">STATUS</span>
                <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
            </div>
        </div>
      </div>

      {/* BANKRUPTCY MODAL */}
      {balance <= 10 && !position && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 text-center shadow-2xl max-w-xs animate-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Power className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Wallet Depleted</h3>
                  <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                      Modal simulasi Anda telah habis. Market sangat kejam, bukan?
                  </p>
                  <button 
                    onClick={() => {
                        // Hard reset via window reload to clear state cleanly or use internal reset
                        // Using internal reset is better UX
                        // We need to access resetHistory from context
                        // But resetHistory resets stats too. Maybe we need a specific "Re-inject Funds" function?
                        // For now, resetHistory is fine as "Game Over -> New Game"
                        // But I don't have resetHistory unpacked in ControlPanel. Let me check imports.
                        window.location.reload(); 
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                  >
                      RESET ACCOUNT
                  </button>
              </div>
          </div>
      )}
    </aside>
  );
}
