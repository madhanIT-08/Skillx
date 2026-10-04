"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const express_1 = __importDefault(require("express"));
const genai_1 = require("@google/genai");
// Declare the Gemini API key as a Secret Manager secret
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "15mb" }));
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
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const requestedModel = model || "gemini-flash-latest";
        const fallbackList = [
            requestedModel,
            "gemini-flash-latest",
            "gemini-2.0-flash",
        ];
        const modelsToTry = Array.from(new Set(fallbackList));
        let lastError = null;
        for (const m of modelsToTry) {
            try {
                const response = await ai.models.generateContent({ model: m, contents, config });
                res.json({ text: response.text ?? "", modelUsed: m });
                return;
            }
            catch (err) {
                lastError = err;
                const e = err;
                const status = e?.status || e?.code;
                if (status === 404 || status === 503 || status === 429 ||
                    String(e?.message).includes("not found") ||
                    String(e?.message).includes("demand"))
                    continue;
                break;
            }
        }
        const errMsg = lastError instanceof Error ? lastError.message : "Gemini request failed.";
        res.status(500).json({ error: errMsg });
    }
    catch (error) {
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
    v2_1.logger.info("Saving interview result", { userId, interviewConfig, stats, tabSwitches });
    res.json({ success: true, message: "Interview result saved successfully" });
});
// ─── Interview Analyze ───────────────────────────────────────────────────────
app.post("/interview/analyze", (req, res) => {
    const { role } = req.body;
    v2_1.logger.info("Analyzing interview for role", { role });
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
exports.api = v2_1.https.onRequest({ secrets: [geminiApiKey] }, app);
//# sourceMappingURL=index.js.map