"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/format";
import { useTerminal } from "@/core/context";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isHtml?: boolean;
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'System Initialized. Quantum AI ready. Awaiting Query.' }
  ]);
  const { history, asset, timeframe } = useTerminal(); // Added useTerminal
  const messagesEndRef = useRef<HTMLDivElement>(null); // Added useRef

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Renamed from loading

  // Added scrollToBottom and useEffect
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (msgText?: string) => { // Renamed from sendMessage
    const textToSend = msgText || input;
    if (!textToSend.trim()) return;
    
    // Optimistic Update
    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true); // Updated loading state

    try {
        // Collect minimal context
        const lastCloses = history.slice(-50).map(c => c.close);
        
        const res = await fetch("/api/ai/chat", { // Updated endpoint
            method: "POST",
            headers: { "Content-Type": "application/json" }, // Added headers
            body: JSON.stringify({
                symbol: asset,
                interval: timeframe,
                lastCloses,
                question: userMsg.content // Updated body
            })
        });

        const data = await res.json();
        
        if (data.answer) {
             const aiMsg: Message = { role: 'assistant', content: data.answer };
             setMessages(prev => [...prev, aiMsg]);
        } else {
             throw new Error("No answer");
        }
    } catch (e) {
        const errorMsg: Message = { role: 'assistant', content: "Error: Connection lost." };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "self-end items-end" : "self-start items-start")}>
            <span className="text-[10px] text-zinc-600 font-mono uppercase mb-1 tracking-widest">
                {m.role === 'user' ? 'YOU' : 'QUANTUM AI'}
            </span>
            <div className={cn(
                "p-3 text-sm font-body leading-relaxed md:text-base border transition-all",
                m.role === 'user' 
                  ? "bg-white text-black border-white rounded-tl-xl rounded-tr-xl rounded-bl-xl" 
                  : "bg-zinc-900 text-zinc-300 border-zinc-800 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-lg"
            )}>
              {m.isHtml ? <div dangerouslySetInnerHTML={{ __html: m.content }} /> : m.content}
            </div>
          </div>
        ))}
        {isLoading && (
             <div className="self-start flex flex-col items-start max-w-[85%] animate-pulse">
                <span className="text-[10px] text-zinc-600 font-mono uppercase mb-1 tracking-widest">QUANTUM AI</span>
                <div className="bg-zinc-900 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-zinc-800">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="p-4 bg-black border-t border-zinc-900">
        <div className="grid grid-cols-1 gap-2">
            <h3 className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">RECOMMENDED QUERIES</h3>
            <div className="grid grid-cols-2 gap-2">
                {[
                    "📊 Analyze Trend",
                    "🎯 Key Levels",
                    "🔮 Next 15m Prediction",
                    "⚠️ Risk Assessment"
                ].map(q => (
                    <button
                        key={q}
                        onClick={() => { setInput(q); handleSend(q); }}
                        disabled={isLoading}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[10px] py-3 rounded-lg transition-all text-left px-3 font-medium flex items-center gap-2 group disabled:opacity-50"
                    >
                        {isLoading ? <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" /> : <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors" />}
                        {q.replace(/^[^\s]+\s/, '')}
                    </button>
                ))}
            </div>
             <button
                onClick={() => { setInput("🐋 Whale Activity Alert"); handleSend("🐋 Whale Activity Alert"); }}
                disabled={isLoading}
                className="w-full bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-500/20 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 text-[10px] py-2 rounded-lg transition-all font-bold uppercase tracking-wide disabled:opacity-50"
            >
                🐋 Detect Whale Activity
            </button>
        </div>
      </div>
    </div>
  );
}
