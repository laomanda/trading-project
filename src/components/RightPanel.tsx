"use client";

import { useState } from "react";
import { Tabs, TabsTrigger, TabsContent } from "@/components/Tabs";
import { TradeHistory } from "@/components/TradeHistory";
import { ChatBox } from "@/components/ChatBox";
import { LogsPanel } from "@/components/LogsPanel";
import { History, MessageSquare, ScrollText } from "lucide-react";
import { cn } from "@/core/format";

export function RightPanel() {
  const [activeTab, setActiveTab] = useState("logs");

  return (
    <div className="flex flex-col h-full bg-black border-l border-white/10">
        <div className="flex border-b border-white/10 bg-zinc-950">
            {[
                { id: "logs", label: "LOGS", icon: ScrollText },
                { id: "trades", label: "TRADES", icon: History },
                { id: "chat", label: "ASK AI", icon: MessageSquare },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-mono font-bold tracking-widest transition-colors",
                        activeTab === tab.id ? "bg-black text-white border-b-2 border-white" : "bg-black text-zinc-600 hover:text-zinc-400 border-b-2 border-transparent"
                    )}
                >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                </button>
            ))}
        </div>
        
        <div className="flex-1 overflow-hidden relative">
            {activeTab === "logs" && <LogsPanel />}
            {activeTab === "trades" && (
                <div className="h-full flex flex-col">
                     <div className="flex-1 overflow-auto">
                        <TradeHistory />
                     </div>
                </div>
            )}
            {activeTab === "chat" && <ChatBox />}
        </div>
    </div>
  );
}
