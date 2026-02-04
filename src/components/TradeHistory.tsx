"use client";

import { useTerminal } from "@/core/context";
import { formatCurrency, cn } from "@/core/format";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function TradeHistory() {
  const { trades, stats, resetHistory } = useTerminal();

  return (
    <div className="flex flex-col h-full bg-black/50">
      
      {/* Stats Header */}
      <div className="p-3 border-b border-white/5 space-y-3">
          <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-zinc-500 uppercase">System Performance</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10"
                onClick={resetHistory}
                title="Reset History"
              >
                  <Trash2 className="w-3 h-3" />
              </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                  <span className="block text-[9px] text-zinc-500 uppercase">Winrate</span>
                  <span className={cn("text-sm font-mono font-bold", stats.winrate >= 50 ? "text-emerald-400" : "text-rose-400")}>
                      {stats.winrate.toFixed(1)}%
                  </span>
              </div>
              <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                  <span className="block text-[9px] text-zinc-500 uppercase">Total PnL</span>
                  <span className={cn("text-sm font-mono font-bold", stats.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatCurrency(stats.totalPnL)}
                  </span>
              </div>
              <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                  <span className="block text-[9px] text-zinc-500 uppercase">Trades</span>
                  <span className="text-sm font-mono font-bold text-white">
                      {stats.tradeCount}
                  </span>
              </div>
          </div>

          {/* Health Bar */}
          <div className="space-y-1">
              <span className="text-[9px] text-zinc-600 uppercase">Recent Performance (Last 10)</span>
              <div className="flex gap-1 h-1.5">
                  {Array.from({ length: 10 }).map((_, i) => {
                       const resultAtIndex = stats.last10Results[9 - i]; 
                       return (
                           <div 
                                key={i}
                                className={cn(
                                    "flex-1 rounded-full opacity-80",
                                    resultAtIndex === "WIN" ? "bg-emerald-500" : 
                                    resultAtIndex === "LOSS" ? "bg-rose-500" : 
                                    "bg-zinc-800"
                                )}
                           />
                       );
                  })}
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-auto">
          <table className="w-full text-[10px] font-mono whitespace-nowrap">
              <thead className="bg-zinc-900/80 sticky top-0 text-zinc-500 uppercase">
                  <tr>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Entry</th>
                      <th className="px-3 py-2 text-right">Exit</th>
                      <th className="px-3 py-2 text-right">PnL</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {trades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{new Date(trade.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' })}</td>
                          <td className="px-3 py-2">
                              <span className={cn(trade.side === "LONG" ? "text-emerald-500" : "text-rose-500")}>
                                  {trade.side}
                              </span>
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-300">{trade.entryPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-zinc-300">{trade.exitPrice.toFixed(2)}</td>
                          <td className={cn("px-3 py-2 text-right font-medium", trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                              {formatCurrency(trade.pnl)}
                          </td>
                      </tr>
                  ))}
                  {trades.length === 0 && (
                      <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-600 italic">No trades recorded</td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>
    </div>
  )
}
