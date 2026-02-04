"use client";

import { createChart, ColorType, ISeriesApi, IChartApi, CandlestickSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { useMarketData } from '@/core/market';
import { useTerminal } from '@/core/context';
import { cn } from '@/core/format';

export const ChartView = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const { data, currentCandle } = useMarketData();
  const { asset, connectionStatus } = useTerminal();

  // 1. Initialize Chart (Once)
  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#000000' }, // True Black
          textColor: '#737373', // Neutral Gray (Zinc 500)
          fontFamily: 'Manrope, sans-serif',
        },
        grid: {
          vertLines: { color: '#1a1a1a' },
          horzLines: { color: '#1a1a1a' },
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: {
            timeVisible: true,
            borderColor: '#262626',
        },
        rightPriceScale: {
            borderColor: '#262626',
        },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a', 
        downColor: '#ef5350', 
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      chartRef.current = chart;
      seriesRef.current = series;

      const handleResize = () => {
        if (chartContainerRef.current) {
            chart.applyOptions({ 
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight
            });
        }
      };

      const resizeObserver = new ResizeObserver(() => {
          handleResize();
      });
      resizeObserver.observe(chartContainerRef.current);

      // Explicit Fullscreen Exit Handler
      const onFullscreenChange = () => {
          // Give the browser a moment to restore layout, then force resize
          setTimeout(() => {
              handleResize();
          }, 100);
      };
      document.addEventListener("fullscreenchange", onFullscreenChange);

      // Cleanup
      return () => {
        resizeObserver.disconnect();
        document.removeEventListener("fullscreenchange", onFullscreenChange);
        chart.remove();
        chartRef.current = null;
      };
    }
  }, []); // Empty dependency mainly, or if we want to recreate on drastic layout changes

  // 2. Load Historical Data
  useEffect(() => {
      if (seriesRef.current && data.length > 0) {
          seriesRef.current.setData(data as any);
      }
  }, [data]);

  // 3. Realtime Updates
  useEffect(() => {
    if (seriesRef.current && currentCandle) {
        seriesRef.current.update(currentCandle as any);
    }
  }, [currentCandle]);

  const { position } = useTerminal();
  const positionLinesRef = useRef<any[]>([]);

  // 4. Visualization of Active Position
  useEffect(() => {
      // Clear old lines
      if (seriesRef.current) {
          positionLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
          positionLinesRef.current = [];
      }

      if (seriesRef.current && position) {
          const entryLine = seriesRef.current.createPriceLine({
              price: position.entryPrice,
              color: '#3b82f6',
              lineWidth: 2,
              lineStyle: 0, // Solid
              axisLabelVisible: true,
              title: `ENTRY ${position.side}`,
          });

          const tpLine = seriesRef.current.createPriceLine({
              price: position.tp,
              color: '#10b981', // Emerald
              lineWidth: 1,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: 'TP',
          });

          const slLine = seriesRef.current.createPriceLine({
              price: position.sl,
              color: '#ef4444', // Red
              lineWidth: 1,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: 'SL',
          });

          positionLinesRef.current = [entryLine, tpLine, slLine];
      }
  }, [position]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        chartContainerRef.current?.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
  };

  return (
    <div className="w-full h-full relative group bg-black">
       <div ref={chartContainerRef} className="w-full h-full" />
       
       {/* Chart Overlay Info */}
       <div className="absolute top-4 left-4 z-10 flex gap-6 pointer-events-none mix-blend-difference">
           <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Asset</span>
                <span className="text-xl font-heading font-medium text-white tracking-tight">{asset}</span>
           </div>
           <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Price</span>
                <span className={cn("text-xl font-mono tracking-tight font-bold", currentCandle?.close && currentCandle?.open && currentCandle.close > currentCandle.open ? "text-white" : "text-zinc-400")}>
                    {currentCandle ? currentCandle.close.toFixed(2) : "Loading..."}
                </span>
           </div>
           <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Status</span>
                <span className={cn("text-xs font-mono font-bold uppercase mt-1", connectionStatus === "LIVE" ? "text-emerald-500" : connectionStatus === "SIMULATED" ? "text-amber-500" : "text-zinc-500")}>
                    {connectionStatus}
                </span>
           </div>
       </div>

       {/* Chart Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button onClick={toggleFullscreen} className="p-2 bg-zinc-900/50 hover:bg-white hover:text-black rounded border border-white/10 text-zinc-400 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </button>
        </div>
    </div>
  );
};
