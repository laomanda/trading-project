"use client";

import { useEffect, useRef } from "react";
import { useTerminal } from "@/core/context";
import { useMarketData } from "@/core/market";
import { detectSignal } from "@/core/strategy";

export function SimulationEngine() {
  const { 
      position, cooldownCounter,
      openPosition, closePosition, updatePositionPnL, setLastSignal, decrementCooldown,
      setCurrentCandle, setHistory, addLog
  } = useTerminal();
  
  const { data, currentCandle } = useMarketData();
  const lastProcessedTime = useRef<number>(0);

  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);

  // Sync Market Data to Context (so UI component accesses it easily)
  useEffect(() => {
      setCurrentCandle(currentCandle);
      setHistory(data);
  }, [currentCandle, data, setCurrentCandle, setHistory]);

  // Strategy & Simulation Loop
  useEffect(() => {
    if (!currentCandle) return;
    
    // Use Ref to avoid re-triggering this effect when PnL changes (which updates 'position')
    const pos = positionRef.current;

    // 1. Realtime PnL Update & TP/SL Check
    if (pos) {
        // We pass current price, updatePositionPnL will handle state update internally using functional setter
        updatePositionPnL(currentCandle.close);

        // Check TP/SL (Hit logic)
        let closeReason = "";
        let closePrice = 0;

        if (pos.side === "LONG") {
            if (currentCandle.low <= pos.sl) {
                closeReason = "SL HIT";
                closePrice = pos.sl; 
            } else if (currentCandle.high >= pos.tp) {
                closeReason = "TP HIT";
                closePrice = pos.tp;
            }
        } else {
             if (currentCandle.high >= pos.sl) {
                closeReason = "SL HIT";
                closePrice = pos.sl;
            } else if (currentCandle.low <= pos.tp) {
                 closeReason = "TP HIT";
                 closePrice = pos.tp;
            }
        }

        if (closeReason) {
            closePosition(closePrice, closeReason);
            addLog(`Position CLOSED by ${closeReason} at ${closePrice}`);
            return; 
        }
    }

    // 2. New Candle Event (Strategy Signal + Cooldown)
    if (currentCandle.time > lastProcessedTime.current) {
        // Logic handled in separate effect below generally to ensure 'data' is updated
    }

  }, [currentCandle, updatePositionPnL, closePosition, addLog]); // REMOVED 'position' from dependency

  // Watch for Data Array update (Closed Candle Logic)
  useEffect(() => {
      if (data.length === 0) return;
      
      const lastCandle = data[data.length - 1];
      if (lastCandle.time > lastProcessedTime.current) {
          lastProcessedTime.current = lastCandle.time;
          
          // Cooldown Handling
          if (cooldownCounter > 0) {
              decrementCooldown();
              return; // No signal processing during cooldown
          }
          
          // Signal Detection
          const signal = detectSignal(data);
          setLastSignal(signal);

          if (position === null && signal.type !== "NEUTRAL") {
               openPosition(signal.type as "LONG" | "SHORT", signal.price);
               addLog(`SIGNAL: ${signal.type} detected. Opening Position @ ${signal.price}`);
          } else if (signal.type !== "NEUTRAL") {
                // Just log if interesting but ignored?
                // addLog(`SIGNAL: ${signal.type} detected (Ignored: locked/active)`);
          }
      }
  }, [data, position, cooldownCounter, decrementCooldown, setLastSignal, openPosition]);

  return null;
}
