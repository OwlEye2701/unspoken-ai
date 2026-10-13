import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isAgeEligibleUser } from "@/lib/auth-security";
import { checkUserEntitlement } from "@/lib/subscriptions";
import { deductCredits, refundCredits } from "@/lib/credits";
import {
  getGeminiClient,
  GEMINI_MODEL,
  buildSystemInstruction,
  type FlirtyStyle,
  type GeminiReplyResponse,
} from "@/lib/gemini";
import {
  geminiReplyResponseSchema,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  detectMimeType,
} from "@/lib/validation";
// Rate limiting — simple in-memory store (replace with Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();

  // Prune expired entries periodically to prevent memory leaks
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  let deductionKey: string | null = null;
  let authenticatedUserId: string | null = null;

  try {
    // 1. Authenticate via cookies or Authorization header
    const supabase = await createClient();
    let {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Fallback: If cookies not sent or session expired, check Authorization: Bearer <token>
    if (!user) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        if (token) {
          const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
            authError = null;
          } else if (tokenError) {
            authError = tokenError;
          }
        }
      }
    }

    if (authError || !user) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[generate-replies] Local Dev Sandbox: No active session found, using sandbox dev user.");
        user = {
          id: "00000000-0000-0000-0000-000000000000",
          app_metadata: { age_eligible: true },
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as unknown as typeof user;
      } else {
        console.warn("[generate-replies] Auth failed. authError:", authError?.message, "user:", user ? "present" : "null");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authenticatedUserId = user.id;

    // Security check: Must have trusted server-controlled app_metadata claim (or dev sandbox)
    if (!isAgeEligibleUser(user) && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "Access denied: This account has not passed the 16+ server age verification.",
        },
        { status: 403 }
      );
    }

    // 2. Subscription entitlement check
    const entitlement = await checkUserEntitlement(user.id);
    if (!entitlement.canGenerate) {
      return NextResponse.json(
        { error: entitlement.reason ?? "Active subscription or credits required." },
        { status: 402 }
      );
    }

    // 3. Rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    // 3. Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const textConversation = (formData.get("textConversation") as string) || "";
    const context = (formData.get("context") as string) || "";

    // 4. Validate inputs
    if (!imageFile && !textConversation.trim()) {
      return NextResponse.json(
        { error: "Please provide a screenshot or paste the conversation text." },
        { status: 400 }
      );
    }

    const rawFlirtyStyle = (formData.get("flirtyStyle") as string) || "playful_teasing";
    const validStyles: FlirtyStyle[] = ["playful_teasing", "sweet_romantic", "bold_spicy"];
    const flirtyStyle: FlirtyStyle = validStyles.includes(rawFlirtyStyle as FlirtyStyle)
      ? (rawFlirtyStyle as FlirtyStyle)
      : "playful_teasing";

    if (context.length > 500) {
      return NextResponse.json(
        { error: "Context must be 500 characters or fewer." },
        { status: 400 }
      );
    }

    if (textConversation.length > 5000) {
      return NextResponse.json(
        { error: "Conversation text must be 5000 characters or fewer." },
        { status: 400 }
      );
    }

    // 5. Validate image if provided
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;

    if (imageFile) {
      // Validate size
      if (imageFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Image must be 10 MB or smaller." },
          { status: 400 }
        );
      }

      // Validate MIME type by reading magic bytes (don't trust extension alone)
      const buffer = await imageFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const detectedMime = detectMimeType(bytes);
      if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
        return NextResponse.json(
          { error: "Only JPEG, PNG, and WebP images are supported." },
          { status: 400 }
        );
      }

      imageMimeType = detectedMime;
      imageBase64 = Buffer.from(buffer).toString("base64");
    }

    // 6. Atomic credit deduction
    deductionKey = `gen-${user.id}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const deduction = await deductCredits({
      userId: user.id,
      cost: 1,
      idempotencyKey: deductionKey,
      description: `Reply generation (${imageFile ? "screenshot" : "text"})`,
    });

    if (!deduction.success) {
      return NextResponse.json(
        {
          error:
            deduction.error ?? "Insufficient credits. Please upgrade or replenish your account.",
          remainingCredits: deduction.balance,
        },
        { status: 402 }
      );
    }

    // 7. Build Gemini input
    const inputParts: Array<Record<string, unknown>> = [];

    // System-level framing text
    let promptText = `You are helping compose a reply to a conversation.\n\n`;

    if (imageFile && imageBase64) {
      promptText += `The user has uploaded a screenshot of a conversation. Analyse it carefully.\n`;
    }

    if (textConversation.trim()) {
      promptText += `\nConversation text provided by the user:\n---\n${textConversation.trim()}\n---\n`;
    }

    if (context.trim()) {
      promptText += `\nAdditional context from the user: ${context.trim()}\n`;
    }

    promptText += `\nNow generate three distinct reply options following your system instructions. Return only the JSON object.`;

    inputParts.push({ type: "text", text: promptText });

    if (imageBase64 && imageMimeType) {
      inputParts.push({
        type: "image",
        data: imageBase64,
        mime_type: imageMimeType,
      });
    }

    const ai = getGeminiClient();
    let rawText: string | undefined;

    try {
      // Primary: Official Google Gen AI models.generateContent with JSON mime type
      const contents: Array<
        | { inlineData: { data: string; mimeType: string } }
        | { text: string }
      > = [];
      if (imageBase64 && imageMimeType) {
        contents.push({
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType,
          },
        });
      }
      contents.push({ text: promptText });

      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
              systemInstruction: buildSystemInstruction(flirtyStyle),
              responseMimeType: "application/json",
              maxOutputTokens: 1024,
              abortSignal: AbortSignal.timeout(25_000),
            },
          });
          rawText = response.text;
          if (rawText) break;
        } catch (attemptErr: unknown) {
          lastError = attemptErr;
          const errMsg = attemptErr instanceof Error ? attemptErr.message : "";
          if (attempt === 1 && (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand"))) {
            // Wait 1.5 seconds before retrying demand spike
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw attemptErr;
        }
      }

      if (!rawText && lastError) {
        throw lastError;
      }
    } catch (genError: unknown) {
      if (deductionKey && authenticatedUserId) {
        await refundCredits({
          userId: authenticatedUserId,
          amount: 1,
          reason: "Gemini generation failure",
          originalIdempotencyKey: deductionKey,
        });
      }
      throw genError;
    }

    if (!rawText || rawText.trim() === "") {
      if (deductionKey && authenticatedUserId) {
        await refundCredits({
          userId: authenticatedUserId,
          amount: 1,
          reason: "Empty model response",
          originalIdempotencyKey: deductionKey,
        });
      }
      return NextResponse.json(
        { error: "The AI did not return a response. Please try again." },
        { status: 502 }
      );
    }

    // 8. Parse and validate JSON response
    let parsed: GeminiReplyResponse;
    try {
      // Strip markdown code fences if model wrapped in them
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const raw = JSON.parse(cleaned);
      parsed = geminiReplyResponseSchema.parse(raw) as GeminiReplyResponse;
    } catch {
      if (deductionKey && authenticatedUserId) {
        await refundCredits({
          userId: authenticatedUserId,
          amount: 1,
          reason: "Malformed JSON from model",
          originalIdempotencyKey: deductionKey,
        });
      }
      return NextResponse.json(
        {
          error:
            "The AI returned an unexpected format. Please try again.",
        },
        { status: 502 }
      );
    }

    // 9. Return validated result (never expose raw API response or keys)
    return NextResponse.json({
      ...parsed,
      remainingCredits: deduction.balance,
      unlimited: deduction.unlimited,
    });
  } catch (error: unknown) {
    // Sanitize any internal error strings before logging (strip API keys, auth headers, tokens)
    const rawMessage = error instanceof Error ? error.message : "Unknown error";
    const sanitizedLog = rawMessage
      .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
      .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");

    console.error("[generate-replies] Request failed:", sanitizedLog.slice(0, 150));

    if (
      rawMessage.includes("503") ||
      rawMessage.toLowerCase().includes("high demand") ||
      rawMessage.toLowerCase().includes("unavailable")
    ) {
      return NextResponse.json(
        {
          error:
            "Unspoken AI is currently experiencing high demand. Please try again in a few moments.",
        },
        { status: 503 }
      );
    }

    if (rawMessage.includes("429") || rawMessage.toLowerCase().includes("quota")) {
      return NextResponse.json(
        {
          error:
            "The AI service is currently at capacity. Please try again in a moment.",
        },
        { status: 429 }
      );
    }

    if (
      rawMessage.includes("timeout") ||
      rawMessage.includes("DEADLINE_EXCEEDED") ||
      rawMessage.toLowerCase().includes("aborted")
    ) {
      return NextResponse.json(
        { error: "The request timed out. Please try again in a moment." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong with the AI service. Please try again." },
      { status: 500 }
    );
  }
}
