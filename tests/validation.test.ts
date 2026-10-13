import {
  calculateAge,
  isEligibleAge,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  geminiReplyResponseSchema,
  MIN_AGE,
  detectMimeType,
} from "../src/lib/validation";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("Age verification & gate", () => {
  it("allows someone exactly 16 years old today", () => {
    const today = new Date();
    const dob = new Date(
      today.getFullYear() - 16,
      today.getMonth(),
      today.getDate()
    );
    const dobString = formatLocalDate(dob);
    expect(calculateAge(dobString)).toBe(16);
    expect(isEligibleAge(dobString)).toBe(true);
  });

  it("allows someone older than 16", () => {
    const dob = "2000-01-01";
    expect(calculateAge(dob)).toBeGreaterThanOrEqual(16);
    expect(isEligibleAge(dob)).toBe(true);
  });

  it("strictly rejects someone under 16", () => {
    const today = new Date();
    const dob = new Date(
      today.getFullYear() - 15,
      today.getMonth(),
      today.getDate()
    );
    const dobString = formatLocalDate(dob);
    expect(calculateAge(dobString)).toBe(15);
    expect(isEligibleAge(dobString)).toBe(false);
  });

  it("strictly rejects someone who turns 16 tomorrow", () => {
    const today = new Date();
    const dob = new Date(
      today.getFullYear() - 16,
      today.getMonth(),
      today.getDate() + 1
    );
    const dobString = formatLocalDate(dob);
    expect(calculateAge(dobString)).toBe(15);
    expect(isEligibleAge(dobString)).toBe(false);
  });

  it("strictly rejects invalid calendar dates like Feb 31", () => {
    expect(calculateAge("2008-02-31")).toBe(-1);
    expect(isEligibleAge("2008-02-31")).toBe(false);
  });

  it("strictly rejects future dates of birth", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = formatLocalDate(tomorrow);
    expect(calculateAge(tomorrowString)).toBe(-1);
    expect(isEligibleAge(tomorrowString)).toBe(false);
  });

  it("strictly rejects malformed or non-date strings", () => {
    expect(calculateAge("abc")).toBe(-1);
    expect(calculateAge("")).toBe(-1);
    expect(isEligibleAge("invalid-date")).toBe(false);
  });
});

describe("Auth Validation Schemas", () => {
  it("validates valid registration details", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password123",
      dateOfBirth: "2002-05-14",
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const res = registerSchema.safeParse({
      email: "not-an-email",
      password: "Password123",
      dateOfBirth: "2002-05-14",
    });
    expect(res.success).toBe(false);
  });

  it("rejects weak password without number or uppercase", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      password: "password",
      dateOfBirth: "2002-05-14",
    });
    expect(res.success).toBe(false);
  });

  it("validates login schema properly", () => {
    expect(
      loginSchema.safeParse({ email: "valid@email.com", password: "pwd" })
        .success
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "invalid", password: "" }).success
    ).toBe(false);
  });

  it("validates reset and update password schemas", () => {
    expect(resetPasswordSchema.safeParse({ email: "user@test.com" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);

    expect(updatePasswordSchema.safeParse({ password: "StrongPass1" }).success).toBe(true);
    expect(updatePasswordSchema.safeParse({ password: "weak" }).success).toBe(false);
  });

  it("exports MIN_AGE as 16", () => {
    expect(MIN_AGE).toBe(16);
  });
});

describe("Gemini Reply Output Schema Validation", () => {
  it("validates structured 3-mode replies", () => {
    const data = {
      analysis: "User asked what are you doing tonight.",
      canAnalyze: true,
      replies: {
        normal: "Not much, just unwinding. How about you?",
        rizz: "Plotting world domination, or maybe just grabbing some tacos. What are you up to?",
        flirty: "Waiting for someone interesting to invite me out.",
      },
    };
    const res = geminiReplyResponseSchema.safeParse(data);
    expect(res.success).toBe(true);
  });

  it("validates unreadable screenshot response", () => {
    const data = {
      analysis: "Image is too blurry to extract chat bubbles reliably.",
      canAnalyze: false,
      replies: null,
    };
    const res = geminiReplyResponseSchema.safeParse(data);
    expect(res.success).toBe(true);
  });

  it("rejects missing reply modes when canAnalyze is true", () => {
    const data = {
      analysis: "Extracted chat.",
      canAnalyze: true,
      replies: {
        normal: "Hello",
        // missing rizz & flirty
      },
    };
    const res = geminiReplyResponseSchema.safeParse(data);
    expect(res.success).toBe(false);
  });
});

describe("Magic-byte File Signature Detection", () => {
  it("detects valid JPEG files", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(detectMimeType(jpeg)).toBe("image/jpeg");
  });

  it("detects valid PNG files", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(detectMimeType(png)).toBe("image/png");
  });

  it("detects valid WebP files", () => {
    // 52 49 46 46 [4 bytes size] 57 45 42 50
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    expect(detectMimeType(webp)).toBe("image/webp");
  });

  it("rejects non-image files with misleading extensions", () => {
    // Windows executable MZ header disguised as an image
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    expect(detectMimeType(exe)).toBeNull();

    // Plain text / script
    const text = new TextEncoder().encode("<script>alert(1)</script>");
    expect(detectMimeType(text)).toBeNull();
  });

  it("rejects truncated or malformed buffers under 12 bytes", () => {
    const short = new Uint8Array([0xff, 0xd8]);
    expect(detectMimeType(short)).toBeNull();
  });
});
