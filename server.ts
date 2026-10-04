import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import express from "express";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "15mb" }));

  // Gemini API proxy
  // The Gemini API key stays on the server and is never sent to the browser.
  app.post("/api/gemini", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured on the server."
        });
      }

      if (!contents) {
        return res.status(400).json({
          error: "contents is required."
        });
      }

      const ai = new GoogleGenAI({
        apiKey
      });

      const requestedModel = model || "gemini-flash-latest";
      const fallbackList = [
        requestedModel,
        "gemini-flash-latest",
        "gemini-3-flash-preview",
        "gemini-3.8-flash"
      ];
      const modelsToTry = Array.from(new Set(fallbackList));

      let lastError: any = null;
      for (const m of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents,
            config
          });

          return res.json({
            text: response.text ?? "",
            modelUsed: m
          });
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${m} encountered an issue:`, err?.message || err);
          const status = err?.status || err?.code;
          // Continue to next model if unavailable, not found, or temporary server spike
          if (status === 404 || status === 503 || status === 429 || String(err?.message).includes('not found') || String(err?.message).includes('demand')) {
            continue;
          }
          // If syntax/prompt validation failed on Google's side, trying another model might not help
          break;
        }
      }

      console.error("Gemini generation failed on all candidate models:", lastError);
      return res.status(500).json({
        error: lastError?.message || "Gemini request failed."
      });

    } catch (error: any) {
      console.error("Gemini request error:", error);

      return res.status(500).json({
        error: error?.message || "Gemini request failed."
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "SkillX Backend is running"
    });
  });

  // Interview save
  app.post("/api/interview/save", (req, res) => {
    const {
      userId,
      config,
      stats,
      transcript,
      tabSwitches
    } = req.body;

    console.log("Saving interview result:", {
      userId,
      config,
      stats,
      tabSwitches
    });

    res.json({
      success: true,
      message: "Interview result saved successfully"
    });
  });

  // Interview analysis
  app.post("/api/interview/analyze", async (req, res) => {
    const {
      transcript,
      role,
      experience
    } = req.body;

    console.log("Analyzing interview for role:", role);

    res.json({
      success: true,
      message: "Analysis started",
      timestamp: new Date().toISOString()
    });
  });

  // Mentors
  app.get("/api/mentors", (req, res) => {
    res.json({
      success: true,
      mentors: [
        {
          id: "1",
          name: "Sarah Chen",
          role: "Frontend"
        },
        {
          id: "2",
          name: "Marcus Rodriguez",
          role: "Backend"
        }
      ]
    });
  });

  // Development / Production frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true
      },
      appType: "spa"
    });

    app.use(vite.middlewares);

  } else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(
        path.join(distPath, "index.html")
      );
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  });
}

startServer();