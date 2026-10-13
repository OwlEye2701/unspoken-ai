import { GET } from "../src/app/auth/callback/route";
import { NextRequest } from "next/server";

// Mock @supabase/ssr
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: jest.fn(async (code: string) => {
        if (code === "valid-oauth-code") {
          return {
            data: {
              user: {
                id: "oauth-user-1",
                email: "oauth@example.com",
                app_metadata: { age_eligible: true },
              },
            },
            error: null,
          };
        }
        if (code === "unverified-age-code") {
          return {
            data: {
              user: {
                id: "oauth-user-2",
                email: "unverified@example.com",
                app_metadata: {},
              },
            },
            error: null,
          };
        }
        return {
          data: { user: null },
          error: new Error("Invalid OAuth code"),
        };
      }),
    },
  })),
}));

describe("OAuth Callback Route Handling", () => {
  it("redirects to login with error when error parameter is present from provider", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback?error=access_denied&error_description=User+cancelled");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/login?error=oauth_cancelled");
    expect(location).toContain("details=User+cancelled");
  });

  it("redirects to login with oauth_failed on general provider errors", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback?error=server_error");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/login?error=oauth_failed");
  });

  it("redirects to login with missing_code when code is absent", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/login?error=missing_code");
  });

  it("redirects to /auth/verify-age when authenticated OAuth user has not completed age gate", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback?code=unverified-age-code");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/verify-age");
  });

  it("redirects to /app when OAuth code exchanges successfully and user is age eligible", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback?code=valid-oauth-code");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/app");
  });
});
