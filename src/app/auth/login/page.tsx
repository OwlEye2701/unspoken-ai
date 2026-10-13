"use client";

import { useActionState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "../actions";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const initialState = { error: undefined, success: undefined };

function QueryAlert() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (error === "age_unverified") {
    return (
      <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
        <span aria-hidden>⚠</span>
        <span>
          Age verification required (16+). This account has not completed server-side age verification. Please register via the official registration form.
        </span>
      </div>
    );
  }
  if (error === "setup_required") {
    return (
      <div className="alert alert-info" role="alert" style={{ marginBottom: "1.25rem" }}>
        <span aria-hidden>ℹ</span>
        <span>
          Authentication setup required: To log in or access protected features, configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your local environment (.env.local).
        </span>
      </div>
    );
  }
  if (error === "oauth_failed") {
    return (
      <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
        <span aria-hidden>⚠</span>
        <span>Google authentication failed. Please try again or log in with your email and password.</span>
      </div>
    );
  }
  if (error === "oauth_cancelled") {
    return (
      <div className="alert alert-info" role="alert" style={{ marginBottom: "1.25rem" }}>
        <span aria-hidden>ℹ</span>
        <span>Google sign-in was cancelled.</span>
      </div>
    );
  }
  if (error === "missing_code") {
    return (
      <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
        <span aria-hidden>⚠</span>
        <span>Invalid authentication response received from Google. Please try again.</span>
      </div>
    );
  }
  return null;
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <div className="card animate-fadeUp">
      <div style={{ marginBottom: "1.75rem" }}>
        <h1
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            marginBottom: "0.375rem",
          }}
        >
          Welcome back
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Log in to your account to continue.
        </p>
      </div>

      <Suspense fallback={null}>
        <QueryAlert />
      </Suspense>

      {state?.error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span aria-hidden>⚠</span>
          <span>{state.error}</span>
        </div>
      )}

      <div style={{ marginBottom: "1.25rem" }}>
        <GoogleSignInButton mode="signin" />
      </div>

      <div className="divider" style={{ margin: "1.25rem 0" }}>
        or sign in with email
      </div>

      <form action={formAction} noValidate>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="email" className="label">
              Email or username
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              required
              className="input"
              placeholder="Email or username"
              disabled={isPending}
            />
          </div>

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="password" className="label">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontSize: "0.8rem",
                  color: "var(--accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
                tabIndex={isPending ? -1 : 0}
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
            style={{ width: "100%", marginTop: "0.25rem" }}
          >
            {isPending ? (
              <>
                <span className="spinner" aria-hidden />
                Logging in…
              </>
            ) : (
              "Log in"
            )}
          </button>
        </div>
      </form>

      <div className="divider" style={{ margin: "1.5rem 0" }}>
        or
      </div>

      <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/register"
          style={{
            color: "var(--accent)",
            fontWeight: 500,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
