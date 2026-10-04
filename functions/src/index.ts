import { https, logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import express from "express";
import { GoogleGenAI } from "@google/genai";

// Declare the Gemini API key as a Secret Manager secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

const app = express();
app.use(express.json({ limit: "15mb" }));

// CORS for Firebase Hosting cross-origin calls
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  next();
});

// ─── Gemini API Proxy ────────────────────────────────────────────────────────
app.post("/gemini", async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    // In v2, secrets are available via process.env at runtime
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      return;
    }
    if (!contents) {
      res.status(400).json({ error: "contents is required." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const requestedModel = model || "gemini-flash-latest";
    const fallbackList = [
      requestedModel,
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ];
    const modelsToTry = Array.from(new Set(fallbackList));

    let lastError: unknown = null;
    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({ model: m, contents, config });
        res.json({ text: response.text ?? "", modelUsed: m });
        return;
      } catch (err: unknown) {
        lastError = err;
        const e = err as { status?: number; code?: number; message?: string };
        const status = e?.status || e?.code;
        if (
          status === 404 || status === 503 || status === 429 ||
          String(e?.message).includes("not found") ||
          String(e?.message).includes("demand")
        ) continue;
        break;
      }
    }
    const errMsg = lastError instanceof Error ? lastError.message : "Gemini request failed.";
    res.status(500).json({ error: errMsg });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gemini request failed.";
    res.status(500).json({ error: errMsg });
  }
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "SkillX API is running on Cloud Functions" });
});

// ─── Interview Save ──────────────────────────────────────────────────────────
app.post("/interview/save", (req, res) => {
  const { userId, config: interviewConfig, stats, tabSwitches } = req.body;
  logger.info("Saving interview result", { userId, interviewConfig, stats, tabSwitches });
  res.json({ success: true, message: "Interview result saved successfully" });
});

// ─── Interview Analyze ───────────────────────────────────────────────────────
app.post("/interview/analyze", (req, res) => {
  const { role } = req.body;
  logger.info("Analyzing interview for role", { role });
  res.json({ success: true, message: "Analysis started", timestamp: new Date().toISOString() });
});

// ─── Mentors ─────────────────────────────────────────────────────────────────
app.get("/mentors", (_req, res) => {
  res.json({
    success: true,
    mentors: [
      { id: "1", name: "Sarah Chen", role: "Frontend" },
      { id: "2", name: "Marcus Rodriguez", role: "Backend" },
    ],
  });
});

// Export as Cloud Function v2 HTTPS function with the secret bound
export const api = https.onRequest(
  { secrets: [geminiApiKey] },
  app
);
