import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isAgeEligibleUser } from "@/lib/auth-security";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/app";

  // Handle provider cancellation or OAuth callback error
  if (errorParam) {
    const errorMsg = errorParam === "access_denied" ? "oauth_cancelled" : "oauth_failed";
    const redirectUrl = new URL(`/auth/login?error=${errorMsg}`, request.url);
    if (errorDesc) {
      redirectUrl.searchParams.set("details", errorDesc);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", request.url));
  }

  let response = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof response.cookies.set>[2];
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.redirect(new URL(next, request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/auth/login?error=oauth_failed", request.url));
  }

  // Security: Check trusted server-controlled app_metadata age gate
  if (!isAgeEligibleUser(data.user)) {
    // Redirect authenticated OAuth user to the server-controlled age gate
    return NextResponse.redirect(new URL("/auth/verify-age", request.url));
  }

  return response;
}
