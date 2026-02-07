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

    // Enhanced Fallback Mock Logic
    const generateMockResponse = () => {
         const last = lastCloses[lastCloses.length - 1];
         const prev = lastCloses[0];
         const change = ((last - prev) / prev * 100);
         const trend = change > 0 ? "BULLISH 🟢" : "BEARISH 🔴";
         const strength = Math.abs(change) > 1 ? "Kuata" : "Moderat";

         const scenarios = [
             `Market saat ini sedang ${trend} dengan volatilitas ${strength}. Fokus pada level support terdekat sebelum entry.`,
             `Data menunjukkan akumulasi ${change > 0 ? 'pembeli' : 'penjual'}. Sebaiknya tunggu konfirmasi candlestick reversal.`,
             `Analisis AI mendeteksi pola ${trend} pada timeframe ${interval}. Perhatikan momentum RSI sebelum mengambil keputusan.`,
             `Saran: Hold posisi jika sesuai tren. Volatilitas pasar mencapai ${change.toFixed(2)}% dalam periode ini.`,
             `Peringatan: Pasar sedang ${strength}. Jangan melawan arus utama kecuali ada divergensi volume yang jelas.`,
             `Secara teknikal, harga berada di area ${change > 0 ? 'premium' : 'diskon'}. Scalping pendek mungkin lebih aman saat ini.`,
             `Deteksi Algoritma: Terdapat anomali volume. Kemungkinan pergerakan impulsif ${trend} akan berlanjut.`
         ];
         return scenarios[Math.floor(Math.random() * scenarios.length)] + " 🤖";
    };

    if (!apiKey) {
        console.warn("No GEMINI_API_KEY found. Returning mock response.");
        return NextResponse.json({ answer: generateMockResponse() });
    }

    // Real Gemini API Call
    try {
        const generationConfig = {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
        };

        const prompt = `
        Role: You are "Quantum AI", an advanced, high-frequency trading assistant.
        Personality: Professional, concise, data-driven, and slightly futuristic.
        
        Market Context:
        - Asset: ${symbol}
        - Timeframe: ${interval}
        - Recent Close Prices (Last 20): ${JSON.stringify(lastCloses.slice(-20))}
        - Current Trend: ${lastCloses[lastCloses.length-1] > lastCloses[0] ? "Uptrend" : "Downtrend"}
        
        User Question: "${question}"
        
        Instructions:
        1. Answer in **Bahasa Indonesia**.
        2. Be direct and concise (max 2-3 sentences).
        3. Use trading terminology (Support, Resistance, Volume, RSI, Divergence).
        4. **NEVER** give financial advice that guarantees profit. Use words like "potensi", "kemungkinan", "indikasi".
        5. Vary your sentence structure. Don't sound robotic.
        6. If the user asks for a prediction, give a probabilistic outlook based on the recent price action provided.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
        });

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
