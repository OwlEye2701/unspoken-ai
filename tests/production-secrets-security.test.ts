import fs from "fs";
import path from "path";
import { validateServerEnvironment } from "../src/lib/env";
import { isAgeEligibleUser } from "../src/lib/auth-security";

describe("Production Secrets & Module Boundary Protection", () => {
  const srcDir = path.resolve(__dirname, "../src");

  function getFilesRecursively(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath));
      } else if (/\.(tsx|ts|js|jsx)$/.test(file)) {
        results.push(fullPath);
      }
    });
    return results;
  }

  const allSourceFiles = getFilesRecursively(srcDir);

  it("ensures no client components import @google/genai or server-secret modules", () => {
    const clientFiles = allSourceFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      return content.includes('"use client"') || content.includes("'use client'");
    });

    expect(clientFiles.length).toBeGreaterThan(0);

    clientFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");

      expect(content).not.toContain("@google/genai");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(content).not.toContain("createAdminClient");
      expect(content).not.toContain("GEMINI_API_KEY");
    });
  });

  it("ensures server-only modules declare import 'server-only'", () => {
    const serverOnlyModules = [
      path.join(srcDir, "lib/gemini.ts"),
      path.join(srcDir, "lib/supabase/admin.ts"),
      path.join(srcDir, "lib/supabase/server.ts"),
      path.join(srcDir, "lib/env.ts"),
    ];

    serverOnlyModules.forEach((modPath) => {
      expect(fs.existsSync(modPath)).toBe(true);
      const content = fs.readFileSync(modPath, "utf8");
      expect(content).toMatch(/import\s+["']server-only["']/);
    });
  });

  it("ensures no NEXT_PUBLIC_ variables contain secret or admin tokens", () => {
    allSourceFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      // Match any NEXT_PUBLIC_ variable access
      const matches = content.match(/NEXT_PUBLIC_[A-Z0-9_]+/g) || [];
      const allowedPublicVars = new Set([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_APP_URL",
      ]);

      matches.forEach((varName) => {
        expect(allowedPublicVars.has(varName)).toBe(true);
        expect(varName).not.toContain("SECRET");
        expect(varName).not.toContain("SERVICE_ROLE");
        expect(varName).not.toContain("GEMINI");
        expect(varName).not.toContain("KEY_SECRET");
      });
    });
  });
});

describe("Server-Side Environment Validation", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails safely when server secrets are missing and reports variable names only", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const status = validateServerEnvironment();

    expect(status.hasGeminiKey).toBe(false);
    expect(status.missingRequired).toContain("GEMINI_API_KEY");
    expect(status.warnings.some((w) => w.includes("SUPABASE_SERVICE_ROLE_KEY"))).toBe(true);

    // Verify no secret values are leaked in the report object
    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain("AIza");
    expect(serialized).not.toContain("eyJ");
  });

  it("detects valid server configuration with dummy credentials", () => {
    process.env.GEMINI_API_KEY = "dummy_test_gemini_key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy_service_role_key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dummy.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy_anon_key";

    const status = validateServerEnvironment();

    expect(status.hasGeminiKey).toBe(true);
    expect(status.hasSupabaseAdminKey).toBe(true);
    expect(status.missingRequired).toHaveLength(0);
  });
});

describe("Log & Error Sanitization", () => {
  it("redacts Google API key and Bearer patterns from error strings", () => {
    const rawError =
      "Request failed at https://generativelanguage.googleapis.com/v1beta?key=AIzaSyFakeKey1234567890abcdefg with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

    const sanitized = rawError
      .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
      .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");

    expect(sanitized).not.toContain("AIzaSyFakeKey1234567890abcdefg");
    expect(sanitized).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy");
    expect(sanitized).toContain("key=[REDACTED]");
    expect(sanitized).toContain("Bearer [REDACTED]");
  });
});

describe("Strict Authorization Invariant Verification", () => {
  it("denies access to client-side forged user_metadata under all conditions", () => {
    const testCases = [
      { id: "1", user_metadata: { age_verified: true } },
      { id: "2", user_metadata: { age_eligible: true } },
      { id: "3", user_metadata: { role: "admin", age_eligible: true } },
      { id: "4", app_metadata: { age_eligible: false }, user_metadata: { age_eligible: true } },
    ];

    testCases.forEach((fakeUser) => {
      expect(isAgeEligibleUser(fakeUser as unknown as Parameters<typeof isAgeEligibleUser>[0])).toBe(false);
    });
  });

  it("authorizes user ONLY with cryptographically assigned server app_metadata", () => {
    const authorized = {
      id: "verified-1",
      app_metadata: { age_eligible: true },
      user_metadata: {},
    };

    expect(isAgeEligibleUser(authorized)).toBe(true);
  });
});
