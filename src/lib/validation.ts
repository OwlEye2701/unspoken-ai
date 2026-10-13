import { z } from "zod";

// ---- Auth schemas ----

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Please enter a valid date of birth"),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email or username"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ---- Age gate ----

export const MIN_AGE = 16;

export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth || typeof dateOfBirth !== "string") return -1;

  // Support both YYYY-MM-DD string format and standard date parsing
  const parts = dateOfBirth.split("-");
  let dob: Date;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return -1;

    dob = new Date(year, month, day);
    // Strict calendar check: e.g. Feb 31 should not roll over to March
    if (
      dob.getFullYear() !== year ||
      dob.getMonth() !== month ||
      dob.getDate() !== day
    ) {
      return -1;
    }
  } else {
    dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return -1;
  }

  const today = new Date();
  if (dob > today) return -1; // Future birth date is invalid

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 0 || age > 125) return -1;
  return age;
}

export function isEligibleAge(dateOfBirth: string): boolean {
  const age = calculateAge(dateOfBirth);
  return age >= MIN_AGE && age <= 125;
}

// ---- Reply generation schemas ----

export const generateRepliesSchema = z.object({
  textConversation: z.string().max(5000).optional(),
  context: z.string().max(500).optional(),
});

export const geminiReplyResponseSchema = z.object({
  analysis: z.string(),
  canAnalyze: z.boolean(),
  replies: z
    .object({
      normal: z.string().min(1),
      rizz: z.string().min(1),
      flirty: z.string().min(1),
    })
    .nullable(),
});

// ---- File upload limits ----

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Detect MIME type by inspecting magic bytes.
 * Never trust the file extension or Content-Type header alone.
 */
export function detectMimeType(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
