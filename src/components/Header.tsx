"use client";

import { Activity, Power, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTerminal } from "@/core/context"
import { cn } from "@/core/format"

export function Header() {
  const { asset, timeframe, connectionStatus } = useTerminal();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 shadow-md z-50">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <Activity className="w-5 h-5 text-black" />
        </div>
        <div className="flex flex-col">
            <span className="text-lg font-heading font-bold text-white tracking-widest leading-none">QUANTUM AI</span>

        </div>
      </div>

      {/* Center Status - Optional/Hidden on small screens */}
      <div className="hidden md:flex items-center gap-4">
         <div className="flex items-center gap-2 px-3 py-1 rounded bg-zinc-900 border border-white/5">
            <span className="text-[10px] text-zinc-500 font-mono uppercase">{asset}</span>
            <span className="text-[10px] text-white font-mono font-bold">{timeframe}</span>
         </div>
      </div>
      
      {/* Right Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6 gap-1 border-white/10 text-zinc-400 font-mono">
                <Wifi className={cn("w-3 h-3", connectionStatus === "LIVE" ? "text-emerald-500" : connectionStatus === "SIMULATED" ? "text-amber-500" : "text-zinc-500")} /> 
                <span className="text-white">{connectionStatus}</span>
            </Badge>
        </div>
        

      </div>
    </header>
  );
}
