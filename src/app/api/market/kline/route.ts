import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const interval = searchParams.get("interval");
  const limit = searchParams.get("limit") || "500";

  if (!symbol || !interval) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const endpoints = [
        "https://api.binance.com",       // Standard
        "https://api-gcp.binance.com",   // Google Cloud Mirror
        "https://api1.binance.com",      // Cluster 1
        "https://api2.binance.com",      // Cluster 2
        "https://api3.binance.com",      // Cluster 3
        "https://api4.binance.com",      // Cluster 4
        "https://data-api.binance.vision" // Public Data
    ];

    // Race all endpoints to find the fastest working one
    const fetchWithTimeout = async (base: string) => {
        const url = `${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        // @ts-ignore
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    // Use Promise.any to get the first successful response
    const data = await Promise.any(endpoints.map(base => fetchWithTimeout(base)));
    
    return NextResponse.json(data);

  } catch (error: any) {
    // If we get here, ALL endpoints failed (AggregateError)
    console.error("All Market Data Endpoints Failed");
    return NextResponse.json({ error: "Connection Failed - All Mirrors Blocked" }, { status: 502 });
  }
}
