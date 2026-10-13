"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { resetPassword } from "../actions";

const initialState = { error: undefined, success: undefined };

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);
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
          Reset your password
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
      </div>

      {state?.error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span aria-hidden>⚠</span>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success ? (
        <div className="alert alert-success" role="status">
          <span aria-hidden>✓</span>
          <div>
            <p style={{ fontWeight: 500 }}>{state.success}</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.375rem", opacity: 0.85 }}>
              Check your spam folder if you don&apos;t see it within a few minutes.
            </p>
          </div>
        </div>
      ) : (
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
              style={{ width: "100%" }}
            >
              {isPending ? (
                <>
                  <span className="spinner" aria-hidden />
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <Link
          href="/auth/login"
          style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: "2px" }}
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
