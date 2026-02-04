"use client";

import { cn } from "@/core/format";
import { useTerminal } from "@/core/context";

export function LogsPanel() {
  const { logs } = useTerminal();
  // Logs are now populated by Context via addLog().
  // SimulationEngine and other components should push logs.

  return (
    <div className="flex flex-col h-full bg-black font-mono text-[10px] p-2 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-1">
            {logs.map((log, i) => (
                <div key={i} className={cn("opacity-80 border-l px-2", i === 0 ? "text-white border-white animate-pulse" : "text-zinc-500 border-zinc-800")}>
                    {log}
                </div>
            ))}
        </div>
    </div>
  );
}
