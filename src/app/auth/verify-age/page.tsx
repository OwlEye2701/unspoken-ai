"use client";

import { useActionState } from "react";
import Link from "next/link";
import { completeOAuthAgeGate } from "./actions";

const initialState = { error: undefined, success: undefined };

export default function VerifyAgePage() {
  const [state, formAction, isPending] = useActionState(completeOAuthAgeGate, initialState);

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
          Age verification required (16+)
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          You just signed in with Google. Before you can generate replies, please confirm your date of birth. Unspoken AI is strictly 16+.
        </p>
      </div>

      {state?.error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span aria-hidden>⚠</span>
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} noValidate>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              aria-describedby="dob-oauth-hint"
              style={{ colorScheme: "dark" }}
            />
            <span className="field-hint" id="dob-oauth-hint">
              Strictly checked on our servers. You must be at least 16 years old.
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
                Verifying…
              </>
            ) : (
              "Confirm and continue"
            )}
          </button>
        </div>
      </form>

      <div className="divider" style={{ margin: "1.5rem 0" }}>
        or
      </div>

      <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        Want to use a different account?{" "}
        <Link
          href="/auth/login"
          style={{
            color: "var(--accent)",
            fontWeight: 500,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
