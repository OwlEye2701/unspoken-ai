"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { register } from "../actions";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const initialState = { error: undefined, success: undefined };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, initialState);
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
          Create an account
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          You must be 16 or older to use Unspoken AI.
        </p>
      </div>

      {state?.error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span aria-hidden>⚠</span>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="alert alert-success" role="status" style={{ marginBottom: "1.25rem" }}>
          <span aria-hidden>✓</span>
          <span>{state.success}</span>
        </div>
      )}

      {!state?.success && (
        <>
          <div style={{ marginBottom: "1.25rem" }}>
            <GoogleSignInButton mode="signup" />
          </div>

          <div className="divider" style={{ margin: "1.25rem 0" }}>
            or register with email
          </div>

          <form action={formAction} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="field">
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
                disabled={isPending}
              />
            </div>

            <div className="field">
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                placeholder="At least 8 chars, 1 uppercase, 1 number"
                disabled={isPending}
              />
              <span className="field-hint">
                At least 8 characters, one uppercase letter, one number.
              </span>
            </div>

            <div className="field">
              <label htmlFor="dateOfBirth" className="label">
                Date of birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                className="input"
                disabled={isPending}
                aria-describedby="dob-hint"
                style={{ colorScheme: "dark" }}
              />
              <span className="field-hint" id="dob-hint">
                Required to verify you are 16 or older. Verified on our servers.
              </span>
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
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>

            <p
              style={{
                fontSize: "0.775rem",
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              By creating an account you agree to our{" "}
              <Link href="/terms" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </form>
        </>
      )}

      {!state?.success && (
        <>
          <div className="divider" style={{ margin: "1.5rem 0" }}>
            or
          </div>
          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              style={{
                color: "var(--accent)",
                fontWeight: 500,
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Log in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
