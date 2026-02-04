import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Schema Validation
const ChatRequestSchema = z.object({
  symbol: z.string(),
  interval: z.string(),
  lastCloses: z.array(z.number()).max(500), 
  question: z.string().max(500),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ChatRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid Request", details: validation.error.format() }, { status: 400 });
    }

    const { symbol, interval, lastCloses, question } = validation.data;
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback Mock Logic
    const generateMockResponse = () => {
         const last = lastCloses[lastCloses.length - 1];
         const prev = lastCloses[0];
         const trend = last > prev ? "BULLISH" : "BEARISH";
         const diff = ((last - prev) / prev * 100).toFixed(2);
         
         const responses = [
             `Pasar ${symbol} saat ini sedang ${trend} (perubahan ${diff}%). Disarankan untuk mengikuti momentum pasar.`,
             `Indikator teknikal pada timeframe ${interval} menunjukkan sinyal ${trend}. Perhatikan potensi breakout.`,
             `Analisis volume menunjukkan adanya ${trend === 'BULLISH' ? 'akumulasi' : 'distribusi'}. Harap berhati-hati dengan penggunaan leverage.`
         ];
         return responses[Math.floor(Math.random() * responses.length)] + " (AI Mode: Simulated)";
    };

    if (!apiKey) {
        console.warn("No GEMINI_API_KEY found. Returning mock response.");
        return NextResponse.json({ answer: generateMockResponse() });
    }

    // Real Gemini API Call
    try {
        const prompt = `
        Context: Trading Environment
        Asset: ${symbol}
        Timeframe: ${interval}
        Recent Close Prices (Last ${lastCloses.length}): ${JSON.stringify(lastCloses.slice(-20))}
        
        User Question: "${question}"
        
        Instruction: Answer briefly (1-2 sentences) in Bahasa Indonesia. Focus on data-driven or technical insight based on the provided prices if relevant. Act as a professional quant assistant.
            `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return NextResponse.json({ answer: text });

    } catch (apiError: any) {
        if (apiError.message?.includes("429") || apiError.message?.includes("Too Many Requests")) {
             console.warn("Gemini API Rate Limit (429) hit. using simulation fallback.");
        } else {
             console.error("Gemini API access failed:", apiError.message);
        }
        return NextResponse.json({ answer: generateMockResponse() });
    }

  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
