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

const candidateModels = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-pro-latest",
  "gemini-3.8-flash",
];

async function testAll() {
  for (const m of candidateModels) {
    process.stdout.write(`Testing ${m}... `);
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: "Say hi in one word",
        config: {
          abortSignal: AbortSignal.timeout(8000),
        },
      });
      console.log(`SUCCESS! Response: "${res.text?.trim()}"`);
      return m;
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
        console.log("503 High Demand");
      } else if (msg.includes("404") || msg.includes("NOT_FOUND")) {
        console.log("404 Not Found");
      } else if (msg.includes("aborted") || msg.includes("timeout")) {
        console.log("Timeout (8s)");
      } else {
        console.log("Error:", msg.slice(0, 80));
      }
    }
  }
}

testAll();
