import { GoogleGenAI } from "@google/genai";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  const lines = fs.readFileSync(".env.local", "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testStructured() {
  const res = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: "Hey are you free tonight?",
    config: {
      systemInstruction: "You are Rizz AI. Return JSON: {\"analysis\":\"...\",\"canAnalyze\":true,\"replies\":{\"normal\":\"...\",\"rizz\":\"...\",\"flirty\":\"...\"}}",
      responseMimeType: "application/json",
      maxOutputTokens: 1024,
    },
  });

  console.log("Structured Output from gemini-3.1-flash-lite:\n", res.text);
}

testStructured();
