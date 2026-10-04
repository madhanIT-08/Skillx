import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { model, contents, config } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    if (!contents) return res.status(400).json({ error: "contents is required." });

    const ai = new GoogleGenAI({ apiKey });
    const requestedModel = model || "gemini-flash-latest";
    const fallbackList = [requestedModel, "gemini-flash-latest", "gemini-2.0-flash"];
    const modelsToTry = Array.from(new Set(fallbackList));

    let lastError: unknown = null;
    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({ model: m, contents, config });
        return res.json({ text: response.text ?? "", modelUsed: m });
      } catch (err: unknown) {
        lastError = err;
        const e = err as { status?: number; code?: number; message?: string };
        const status = e?.status || e?.code;
        if (status === 404 || status === 503 || status === 429 ||
            String(e?.message).includes("not found") || String(e?.message).includes("demand")) continue;
        break;
      }
    }
    const errMsg = lastError instanceof Error ? lastError.message : "Gemini request failed.";
    return res.status(500).json({ error: errMsg });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gemini request failed.";
    return res.status(500).json({ error: errMsg });
  }
}
