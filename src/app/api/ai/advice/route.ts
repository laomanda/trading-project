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

    // Fallback Mock Logic
    const generateMockAdvice = () => {
         const isProfit = pnl > 0;
         const trend = lastCloses[lastCloses.length - 1] > lastCloses[lastCloses.length - 5] ? "up" : "down";
         
         if (isProfit) {
             return side === "LONG" && trend === "up" 
                 ? "HOLD: Tren masih kuat naik, biarkan profit berjalan. (AI: Simulated)"
                 : "AMBIL PROFIT: Tren mulai melemah, amankan keuntungan sekarang. (AI: Simulated)";
         } else {
             return "TAHAN: Indikator menunjukkan potensi rebound jangka pendek. (AI: Simulated)";
         }
    };

    if (!apiKey) {
         return NextResponse.json({ advice: generateMockAdvice() });
    }

    // Real Gemini API Call
    try {
        const prompt = `
        Context: Active Trade Advice
        Asset: ${symbol}
        Position: ${side}
        Entry Price: ${entry}
        Current Price: ${currentPrice}
        Floating PnL: ${pnl} (Unrealized)
        Recent Trend (Last 10): ${JSON.stringify(lastCloses.slice(-10))}
        
        Instruction: Provide a recommendation in Bahasa Indonesia (1-2 sentences). Should the user HOLD, CLOSE, or adjust SL? Be decisive based on the trend.
            `;

        const result = await model.generateContent(prompt);
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
