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

  const handleSend = async () => { // Renamed from sendMessage
    if (!input.trim()) return;
    
    // Optimistic Update
    const userMsg: Message = { role: 'user', content: input };
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
        <div className="flex gap-2 relative">
          <input
            className="flex-1 bg-zinc-900 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 font-mono"
            placeholder="Input command or query..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            variant="default" // White button
            className="absolute right-1 top-1 h-9 w-9 rounded-md transition-all hover:scale-105"
            onClick={handleSend}
            disabled={isLoading}
          >
            <Send className="w-4 h-4 text-black" />
          </Button>
        </div>
      </div>
    </div>
  );
}
