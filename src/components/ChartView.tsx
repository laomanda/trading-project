"use client";

import { createChart, ColorType, ISeriesApi, IChartApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { useMarketData } from '@/core/market';
import { useTerminal } from '@/core/context';
import { cn } from '@/core/format';
import { calcEMA, calcRSI, isHammer, isShootingStar, isBullishEngulfing, isBearishEngulfing } from '@/core/indicators';
import { playSignalAlert } from '@/core/sound';

export const ChartView = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema21Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema65Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const lastAlertTime = useRef<number>(0);
  
  const { data, currentCandle } = useMarketData();

  const { asset, connectionStatus } = useTerminal();

  // 1. Initialize Chart (Once)
  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#131722' }, // TradingView Dark Bkg
          textColor: '#d1d4dc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        },
        grid: {
          vertLines: { color: '#1e222d' },
          horzLines: { color: '#1e222d' },
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: {
            timeVisible: true,
            borderColor: '#2B2B43',
        },
        rightPriceScale: {
            borderColor: '#2B2B43',
        },
        crosshair: {
            mode: 1, // CrosshairMode.Normal
            vertLine: {
                width: 1,
                color: '#758696',
                style: 3, // LineStyle.Dashed
                labelBackgroundColor: '#758696',
            },
            horzLine: {
                width: 1,
                color: '#758696',
                style: 3, // LineStyle.Dashed
                labelBackgroundColor: '#758696',
            },
        },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#089981', // TV Green
        downColor: '#F23645', // TV Red
        borderUpColor: '#089981',
        borderDownColor: '#F23645',
        wickUpColor: '#089981',
        wickDownColor: '#F23645',
      });
      
      console.log("Series created:", series);
      console.log("setMarkers type:", typeof (series as any).setMarkers);

      // Add EMA Indicators

      // Add EMA Indicators
      const ema21Series = chart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'EMA 21' });
      const ema65Series = chart.addSeries(LineSeries, { color: '#E91E63', lineWidth: 2, title: 'EMA 65' }); // Thicker slow EMA

      chartRef.current = chart;
      seriesRef.current = series;
      ema21Ref.current = ema21Series;
      ema65Ref.current = ema65Series;

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
  }, []); // Empty dependency mainly

  // 2. Load Historical Data & Calc Indicators
  useEffect(() => {
      if (seriesRef.current && data.length > 0) {
          // Sort data to prevent lightweight-charts assertion error
          const sortedData = [...data].sort((a, b) => a.time - b.time);
          seriesRef.current.setData(sortedData as any);

          // Calculate EMAs
          const closes = sortedData.map(c => c.close);
          const ema21Values = calcEMA(closes, 21);
          const ema65Values = calcEMA(closes, 65);
          const rsiValues = calcRSI(closes, 14); 

          // Calc Markers (High Precision Reversal)
          const markers: any[] = [];
          
          for (let i = 2; i < sortedData.length; i++) {
              const curr = sortedData[i];
              const prev = sortedData[i-1];
              const rsi = rsiValues[i];

              if (!curr || !prev || isNaN(rsi)) continue;

              // BULLISH REVERSAL (Oversold + Pattern)
              if (rsi < 32) {
                  const hammer = isHammer(curr.open, curr.close, curr.high, curr.low);
                  const engulf = isBullishEngulfing({open: curr.open, close: curr.close}, {open: prev.open, close: prev.close});
                  
                  if (hammer || engulf) {
                      markers.push({
                          time: curr.time,
                          position: 'belowBar',
                          color: '#089981', // Green
                          shape: 'arrowUp',
                          text: 'BUY',
                          size: 2
                      });
                  }
              }

              // BEARISH REVERSAL (Overbought + Pattern)
              if (rsi > 68) {
                  const star = isShootingStar(curr.open, curr.close, curr.high, curr.low);
                  const engulf = isBearishEngulfing({open: curr.open, close: curr.close}, {open: prev.open, close: prev.close});

                  if (star || engulf) {
                      markers.push({
                          time: curr.time,
                          position: 'aboveBar',
                          color: '#F23645', // Red
                          shape: 'arrowDown',
                          text: 'SELL',
                          size: 2
                      });
                  }
              }
          }
          
          if (typeof (seriesRef.current as any).setMarkers === 'function') {
             (seriesRef.current as any).setMarkers(markers);
          } else {
             console.warn("setMarkers is missing on series object!", seriesRef.current);
          }
          
          // Audio Alert Logic
          const lastMarker = markers[markers.length - 1];
          if (lastMarker) {
              // Only alert if the marker is on the latest candle (or the one just closed)
              // and we haven't alerted for this time yet.
              const isRecent = lastMarker.time >= sortedData[sortedData.length - 2].time; // Allow last 2 candles
              if (isRecent && lastMarker.time > lastAlertTime.current) {
                  playSignalAlert();
                  lastAlertTime.current = Number(lastMarker.time);
                  console.log("Signal Alert Triggered for", lastMarker.text);
              }
          }

          // Map back to time/value
          const ema21Data = sortedData.map((d, i) => ({ time: d.time, value: ema21Values[i] })).filter(d => !isNaN(d.value));
          const ema65Data = sortedData.map((d, i) => ({ time: d.time, value: ema65Values[i] })).filter(d => !isNaN(d.value));

          ema21Ref.current?.setData(ema21Data as any);
          ema65Ref.current?.setData(ema65Data as any);
      }
  }, [data]);

  // 3. Realtime Updates
  useEffect(() => {
    if (seriesRef.current && currentCandle && data.length > 0) {
        seriesRef.current.update(currentCandle as any);

        // Update Indicators
        // Needs the full array to be accurate, but for 1 tick update we can approximate or recalc last
        // Optimization: Recalc only last few points? 
        // For accurate EMA, we need history.
        // Let's grab history + current
        
        const allCloses = [...data.map(c => c.close), currentCandle.close];
        const lastIndex = allCloses.length - 1;
        
        // Quick EMA calc for last point only (Optimization possible but let's re-use calcEMA for safety first)
        // Note: calcEMA is full array. Calling it every tick on 500 items is fine (JS is fast).
        const ema21 = calcEMA(allCloses, 21);
        const ema65 = calcEMA(allCloses, 65);

        const val21 = ema21[lastIndex];
        const val65 = ema65[lastIndex];

        if (!isNaN(val21)) ema21Ref.current?.update({ time: currentCandle.time, value: val21 } as any);
        if (!isNaN(val65)) ema65Ref.current?.update({ time: currentCandle.time, value: val65 } as any);
    }
  }, [currentCandle, data]);

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
              color: '#2962FF', // TV Blue
              lineWidth: 1,
              lineStyle: 0, // Solid
              axisLabelVisible: true,
              title: `ENTRY ${position.side}`,
          });

          const tpLine = seriesRef.current.createPriceLine({
              price: position.tp,
              color: '#089981', // TV Green
              lineWidth: 1,
              lineStyle: 1, // Dotted
              axisLabelVisible: true,
              title: 'TP',
          });

          const slLine = seriesRef.current.createPriceLine({
              price: position.sl,
              color: '#F23645', // TV Red
              lineWidth: 1,
              lineStyle: 1, // Dotted
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
