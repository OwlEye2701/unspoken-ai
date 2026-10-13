"use client";

import { useActionState, useEffect, useRef } from "react";
import { updatePassword } from "../actions";

const initialState = { error: undefined, success: undefined };

export default function UpdatePasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordRef.current?.focus();
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
          Choose a new password
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Pick something strong. At least 8 characters, one uppercase letter, one number.
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
            <label htmlFor="password" className="label">
              New password
            </label>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
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
            style={{ width: "100%" }}
          >
            {isPending ? (
              <>
                <span className="spinner" aria-hidden />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
