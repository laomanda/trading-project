import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const AdviceRequestSchema = z.object({
  symbol: z.string(),
  side: z.enum(["LONG", "SHORT"]),
  entry: z.number(),
  pnl: z.number(),
  lastCloses: z.array(z.number()).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = AdviceRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid Request", details: validation.error.format() }, { status: 400 });
    }

    const { symbol, side, entry, pnl, lastCloses } = validation.data;
    const currentPrice = lastCloses[lastCloses.length - 1];
    const apiKey = process.env.GEMINI_API_KEY;

    // Enhanced Fallback Mock Logic
    const generateMockAdvice = () => {
         const last = lastCloses[lastCloses.length - 1];
         const prev = lastCloses[lastCloses.length - 5] || last;
         const diff = last - prev;
         const isProfit = pnl > 0;
         const trend = diff > 0 ? "UP" : "DOWN";
         
         // Randomizer for variety
         const r = Math.random();

         if (isProfit) {
             if (side === "LONG" && trend === "UP") {
                 return r > 0.5 
                    ? "HOLD: Momentum bullish masih kuat. Biarkan profit maksimal, tapi naikkan SL ke Break Even." 
                    : "TAHAN: Struktur pasar masih mendukung kenaikan. Target TP belum tercapai.";
             } else if (side === "SHORT" && trend === "DOWN") {
                 return r > 0.5
                    ? "HOLD: Tekanan jual masih dominan. Potensi profit lebih besar masih terbuka."
                    : "TAHAN: Jangan buru-buru close, bearish divergence masih valid.";
             } else {
                 return "TAKE PROFIT: Tren mulai berlawanan arah. Amankan profit sekarang sebelum berbalik.";
             }
         } else {
             // Losing Position
             if ((side === "LONG" && trend === "DOWN") || (side === "SHORT" && trend === "UP")) {
                 return r > 0.5
                    ? "CUT LOSS: Setup invalid. Jangan menahan posisi melawan tren utama."
                    : "WARNING: Harga bergerak melawan posisi Anda. Pertimbangkan tutup manual jika tembus support/resisten.";
             } else {
                 return "WAIT: Ini hanya koreksi wajar. Setup masih valid selama tidak kena SL.";
             }
         }
    };

    if (!apiKey) {
         return NextResponse.json({ advice: generateMockAdvice() });
    }

    // Real Gemini API Call
    try {
        const generationConfig = {
            temperature: 1.0, // Higher creativity for advice
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 150,
        };

        const prompt = `
        Role: Quantum AI Trading Assistant.
        Task: Analyze active trade and give 1 sentence advice.
        Language: Bahasa Indonesia.
        
        Trade Context:
        - Asset: ${symbol}
        - Side: ${side}
        - Entry: ${entry}
        - Current Price: ${currentPrice}
        - PnL: ${pnl.toFixed(2)} (Unrealized)
        - Trend (Last 10 candles): ${JSON.stringify(lastCloses.slice(-10))}
        
        Instructions:
        - Be decisive: HOLD, CLOSE, or ADJUST SL.
        - If PnL is negative but trend looks like it might reverse back, say WAIT.
        - If PnL is positive but trend weakens, say TAKE PROFIT.
        - Use professional tone but varied vocabulary.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
        });

        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ advice: text });
    } catch (e: any) {
        if (e.message?.includes("429") || e.message?.includes("Too Many Requests")) {
             console.warn("Gemini API Rate Limit (429) hit. using simulation fallback.");
        } else {
             console.error("Gemini Advice Error:", e.message);
        }
        return NextResponse.json({ advice: generateMockAdvice() });
    }

  } catch (error) {
    console.error("AI Advice Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
