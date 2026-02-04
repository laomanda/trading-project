import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const interval = searchParams.get("interval");
  const limit = searchParams.get("limit") || "200";

  if (!symbol || !interval) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const endpoints = [
        "https://data-api.binance.vision", // Priority 1: Public Data (Fastest, least blocked)
        "https://api.binance.com",       // Standard
        "https://api-gcp.binance.com",   // Google Cloud Mirror
        "https://api1.binance.com",      // Cluster 1
        "https://api2.binance.com",      // Cluster 2
        "https://api3.binance.com",      // Cluster 3
        "https://api4.binance.com",      // Cluster 4
    ];

    let lastError;

    for (const base of endpoints) {
        try {
            const url = `${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
            // @ts-ignore - AbortSignal.timeout might be new for some TS targets, but works in Node 18+
            const res = await fetch(url, { signal: AbortSignal.timeout(1500) }); 
            
            if (res.ok) {
                const data = await res.json();
                return NextResponse.json(data);
            }
        } catch (e) {
            lastError = e;
            // Continue to next endpoint
        }
    }

    throw lastError || new Error("All Binance endpoints failed");

  } catch (error: any) {
    console.error("Market Data Proxy Failed:", error?.message || String(error));
    return NextResponse.json({ error: "Connection Failed - ISP Block Likely" }, { status: 502 });
  }
}
