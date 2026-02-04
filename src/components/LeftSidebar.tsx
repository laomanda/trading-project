"use client";

import { TradeControlPanel } from "@/components/TradeControlPanel";
import { cn } from "@/core/format";

export function LeftSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("hidden md:flex h-full flex-col bg-black overflow-hidden relative", className)}>
       <TradeControlPanel />
    </aside>
  );
}
