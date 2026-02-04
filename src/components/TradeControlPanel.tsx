"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/core/format";
import { ArrowUp, ArrowDown, BrainCircuit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTerminal, Position } from "@/core/context";
import { Candle } from "@/core/market";

export function TradeControlPanel() {
  const { 
      asset, setAsset, timeframe, setTimeframe, connectionStatus,
      balance, position, openPosition, closePosition, isLocked, cooldownCounter,
      lastSignal, currentCandle, history
  } = useTerminal();

  const timeframes = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h"];

  return (
    <div className="flex flex-col h-full gap-6 p-4 overflow-y-auto">
        
        {/* AI Status */}
        <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-white" />
                <span className="text-xs font-mono uppercase text-zinc-400">AI Engine</span>
            </div>
            {cooldownCounter > 0 ? (
                 <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                    COOLDOWN ({cooldownCounter})
                </Badge>
            ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] animate-pulse">
                    SCANNING
                </Badge>
            )}
        </div>

        {/* Asset Config */}
        <div className="space-y-3">
             <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Target Asset</label>
             <div className="grid grid-cols-2 gap-2">
                 {["BTCUSDT", "ETHUSDT"].map(a => (
                     <Button 
                        key={a} value={a} 
                        variant={asset === a ? "default" : "outline"}
                        className={cn("h-8 text-xs font-mono", asset === a ? "bg-white text-black" : "bg-transparent text-zinc-400")}
                        onClick={() => setAsset(a)}
                        disabled={isLocked}
                     >
                         {a}
                     </Button>
                 ))}
             </div>
        </div>

        <div className="space-y-3">
             <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Timeframe</label>
             <div className="grid grid-cols-4 gap-2">
                 {timeframes.map(tf => (
                     <Button 
                        key={tf} value={tf} 
                        variant={timeframe === tf ? "default" : "outline"}
                        className={cn("h-7 text-[10px] font-mono px-0", timeframe === tf ? "bg-white text-black" : "bg-transparent text-zinc-500 border-zinc-800")}
                        onClick={() => setTimeframe(tf)}
                        disabled={isLocked}
                     >
                         {tf}
                     </Button>
                 ))}
             </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Manual Trade */}
        <div className="space-y-3">
             <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Manual Override</label>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="success" disabled={isLocked || !currentCandle} className="h-10 border border-white/10" onClick={() => openPosition("LONG", currentCandle?.close || 0)}>
                    <ArrowUp className="w-4 h-4 mr-1" /> LONG
                 </Button>
                 <Button variant="danger" disabled={isLocked || !currentCandle} className="h-10 border border-white/10" onClick={() => openPosition("SHORT", currentCandle?.close || 0)}>
                    <ArrowDown className="w-4 h-4 mr-1" /> SHORT
                 </Button>
             </div>
        </div>

        {/* Active Trade Card */}
        {position && (
            <Card className="bg-black border border-white/20 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="h-1 w-full bg-white/20">
                    <div className="h-full bg-white w-[60%]" />
                </div>
                <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <Badge variant={position.side === "LONG" ? "success" : "destructive"} className="px-2">
                            {position.side} {position.leverage}X
                        </Badge>
                        <span className={cn("font-mono font-bold text-lg", (position.pnl || 0) >= 0 ? "text-white" : "text-rose-500")}>
                            {formatCurrency(position.pnl || 0)}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-zinc-500 uppercase mt-2">
                        <div className="flex flex-col">
                            <span>Entry</span>
                            <span className="text-white">{position.entryPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-center">
                            <span>TP</span>
                            <span className="text-emerald-400">{position.tp.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span>SL</span>
                            <span className="text-rose-400">{position.sl.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] uppercase border-white/10 hover:bg-white hover:text-black transition-colors" onClick={() => closePosition(0, "MANUAL")}>
                            Close Now
                        </Button>
                        <AskAIButton position={position} history={history} asset={asset} />
                    </div>
                </CardContent>
            </Card>
        )}

        {/* Last Signal Info */}
        {!position && lastSignal && (
             <div className="p-3 bg-zinc-900/30 border border-white/5 rounded">
                <span className="text-[9px] text-zinc-500 uppercase block mb-1">Last Signal</span>
                <div className="flex justify-between items-center">
                    <span className={cn("font-bold text-xs uppercase", lastSignal.type === "LONG" ? "text-emerald-500" : lastSignal.type === "SHORT" ? "text-rose-500" : "text-zinc-500")}>
                        {lastSignal.type}
                    </span>
                    <span className="text-[10px] text-zinc-500">{new Date(lastSignal.time * 1000).toLocaleTimeString()}</span>
                </div>
             </div>
        )}

        <div className="mt-auto pt-4 border-t border-white/5">
             <div className="flex justify-between items-end">
                 <div className="flex flex-col">
                     <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Sim Balance</span>
                     <span className="text-lg font-mono text-white font-medium">{formatCurrency(balance)}</span>
                 </div>
                 <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-white/5">
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", connectionStatus === "LIVE" ? "bg-emerald-500" : "bg-amber-500")} />
                    <span className="text-[9px] text-zinc-400 font-mono uppercase">{connectionStatus}</span>
                 </div>
             </div>
        </div>

     </div>
  );
}

function AskAIButton({ position, history, asset }: { position: Position, history: Candle[], asset: string }) {
    const [loading, setLoading] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);

    const handleAsk = async () => {
        setLoading(true);
        setAdvice(null);
        try {
            const lastCloses = history.slice(-20).map(c => c.close);
            const res = await fetch("/api/ai/advice", {
                method: "POST",
                body: JSON.stringify({
                    symbol: asset,
                    side: position.side,
                    entry: position.entryPrice,
                    pnl: position.pnl || 0,
                    lastCloses
                })
            });
            const data = await res.json();
            if (data.advice) setAdvice(data.advice);
        } catch {
            setAdvice("Failed to get advice.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <Button size="icon" variant="ghost" disabled={loading} onClick={handleAsk} className="h-7 w-full border border-white/5 mt-1 text-zinc-400 hover:text-white hover:bg-zinc-800">
                {loading ? <BrainCircuit className="w-3 h-3 animate-spin" /> : <span className="text-[10px] flex items-center justify-center gap-1"><BrainCircuit className="w-3 h-3" /> ASK AI</span>}
            </Button>
            {advice && (
                <div className="mt-2 p-2 bg-zinc-900 border border-emerald-500/20 text-[9px] text-emerald-100 rounded animate-in fade-in slide-in-from-top-1">
                    &quot;{advice}&quot;
                </div>
            )}
        </div>
    );
}
