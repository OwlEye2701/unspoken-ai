import {
  RIZZ_SYSTEM_INSTRUCTION,
  GEMINI_MODEL,
  GeminiReplyResponse,
  getGeminiClient,
} from "../src/lib/gemini";
import {
  geminiReplyResponseSchema,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "../src/lib/validation";

describe("Reply Generation Logic & Fixtures", () => {
  it("verifies system prompt enforces constraints", () => {
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("CORE RULES");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Normal");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Rizz");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Flirty");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Never generate explicit sexual content");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("untrusted user data");
    expect(GEMINI_MODEL).toBe("gemini-3.1-flash-lite");
  });

  it("verifies distinct tone generation output from mock", () => {
    // Test fixture simulating genuine distinct output from Gemini
    const mockOutput: GeminiReplyResponse = {
      analysis: "User asked: 'Are you coming tonight?'",
      canAnalyze: true,
      replies: {
        normal: "Yeah I'll be there around 8! See you soon.",
        rizz: "Only if you promise not to steal all the good snacks before I get there.",
        flirty: "Depends — will you be looking for me?",
      },
    };

    const parsed = geminiReplyResponseSchema.parse(mockOutput);
    expect(parsed.replies).not.toBeNull();

    // Verify distinct tones
    const { normal, rizz, flirty } = parsed.replies!;
    expect(normal).not.toEqual(rizz);
    expect(rizz).not.toEqual(flirty);
    expect(normal).not.toEqual(flirty);

    // Verify lengths are conversational
    expect(normal.split(" ").length).toBeLessThan(30);
    expect(rizz.split(" ").length).toBeLessThan(30);
    expect(flirty.split(" ").length).toBeLessThan(30);
  });

  it("handles edge case when Gemini cannot detect readable text", () => {
    const unreadableMock: GeminiReplyResponse = {
      analysis: "Image resolution is too low and text pixels are distorted.",
      canAnalyze: false,
      replies: null,
    };

    const parsed = geminiReplyResponseSchema.parse(unreadableMock);
    expect(parsed.canAnalyze).toBe(false);
    expect(parsed.replies).toBeNull();
    expect(parsed.analysis).toContain("too low");
  });

  it("enforces upload file limits", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(ALLOWED_MIME_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });

  it("throws clear error when GEMINI_API_KEY is missing", () => {
    const oldKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      expect(() => getGeminiClient()).toThrow("GEMINI_API_KEY environment variable is not set");
    } finally {
      if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    }
  });

  it("verifies flirty style options and dynamic rizz in system instructions", () => {
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Smooth & Witty");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Playful & Cheesy");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Sweet & Low-Pressure");
    expect(RIZZ_SYSTEM_INSTRUCTION).toContain("Playful & Teasing");
  });
});
