"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { copyToClipboard } from "@/lib/utils";
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "@/lib/validation";
import type { GeminiReplyResponse } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/client";

type Tab = "screenshot" | "text";
type ReplyMode = "normal" | "rizz" | "flirty";

const MODE_LABELS: Record<ReplyMode, string> = {
  normal: "Normal",
  rizz: "Rizz",
  flirty: "Flirty",
};

const MODE_BADGE_CLASS: Record<ReplyMode, string> = {
  normal: "reply-badge-normal",
  rizz: "reply-badge-rizz",
  flirty: "reply-badge-flirty",
};

type FlirtyStyle = "playful_teasing" | "sweet_romantic" | "bold_spicy";

const FLIRTY_STYLE_OPTIONS: {
  id: FlirtyStyle;
  label: string;
  desc: string;
  badge: string;
}[] = [
  {
    id: "playful_teasing",
    label: "Playful & Teasing",
    desc: "Light banter, cute sarcasm, and cheeky curiosity",
    badge: "Playful",
  },
  {
    id: "sweet_romantic",
    label: "Sweet & Romantic",
    desc: "Warm, genuinely affectionate, and heart-melting",
    badge: "Sweet",
  },
  {
    id: "bold_spicy",
    label: "Bold & Spicy",
    desc: "Direct attraction, sensual banter, and high tension",
    badge: "Spicy 🔥",
  },
];

const MODE_DESCRIPTIONS: Record<ReplyMode, string> = {
  normal: "Natural and relaxed",
  rizz: "Confident with personality",
  flirty: "Playful and light",
};

export function ReplyGenerator() {
  const [tab, setTab] = useState<Tab>("screenshot");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [textConversation, setTextConversation] = useState("");
  const [context, setContext] = useState("");
  const [flirtyStyle, setFlirtyStyle] = useState<FlirtyStyle>("playful_teasing");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeminiReplyResponse | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [isUnlimitedCredits, setIsUnlimitedCredits] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedMode, setCopiedMode] = useState<ReplyMode | null>(null);
  const [editingMode, setEditingMode] = useState<ReplyMode | null>(null);
  const [editedReplies, setEditedReplies] = useState<Partial<Record<ReplyMode, string>>>({});
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setImageError(null);

    if (rejectedFiles.length > 0) {
      const code = rejectedFiles[0]?.errors[0]?.code;
      if (code === "file-too-large") {
        setImageError("Image must be 10 MB or smaller.");
      } else if (code === "file-invalid-type") {
        setImageError("Only JPEG, PNG, and WebP images are supported.");
      } else {
        setImageError("File rejected. Please try a different image.");
      }
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setImageFile(file);
    setResult(null);
    setApiError(null);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled: isLoading,
  });

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setResult(null);
    setApiError(null);
  }

  async function handleGenerate() {
    setApiError(null);
    setResult(null);
    setEditedReplies({});
    setEditingMode(null);

    if (tab === "screenshot" && !imageFile) {
      setApiError("Please upload a screenshot first.");
      return;
    }
    if (tab === "text" && !textConversation.trim()) {
      setApiError("Please paste the conversation text.");
      return;
    }

    const formData = new FormData();
    if (tab === "screenshot" && imageFile) {
      formData.append("image", imageFile);
    }
    if (tab === "text" && textConversation.trim()) {
      formData.append("textConversation", textConversation.trim());
    }
    if (context.trim()) {
      formData.append("context", context.trim());
    }
    formData.append("flirtyStyle", flirtyStyle);

    abortRef.current = new AbortController();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/generate-replies", {
        method: "POST",
        body: formData,
        headers,
        credentials: "same-origin",
        signal: abortRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
      if (typeof data.remainingCredits === "number") {
        setRemainingCredits(data.remainingCredits);
      }
      if (typeof data.unlimited === "boolean") {
        setIsUnlimitedCredits(data.unlimited);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(mode: ReplyMode) {
    const text = editedReplies[mode] ?? result?.replies?.[mode];
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(null), 1800);
    } else {
      // Browser blocked automatic clipboard write (e.g. mobile Safari permissions)
      setManualCopyText(text);
    }
  }

  function handleEdit(mode: ReplyMode) {
    if (editingMode === mode) {
      setEditingMode(null);
      return;
    }
    if (!editedReplies[mode] && result?.replies?.[mode]) {
      setEditedReplies((prev) => ({ ...prev, [mode]: result!.replies![mode] }));
    }
    setEditingMode(mode);
  }

  const canSubmit =
    !isLoading &&
    ((tab === "screenshot" && !!imageFile) ||
      (tab === "text" && textConversation.trim().length > 0));

  return (
    <div>
      {/* Tab selector */}
      <div className="tabs" style={{ marginBottom: "1.5rem" }}>
        <button
          className={`tab ${tab === "screenshot" ? "tab-active" : ""}`}
          onClick={() => setTab("screenshot")}
          type="button"
          disabled={isLoading}
        >
          Upload screenshot
        </button>
        <button
          className={`tab ${tab === "text" ? "tab-active" : ""}`}
          onClick={() => setTab("text")}
          type="button"
          disabled={isLoading}
        >
          Paste text
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Screenshot tab */}
        {tab === "screenshot" && (
          <>
            {!imagePreview ? (
              <div>
                <div
                  {...getRootProps()}
                  className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
                  style={{ outline: "none" }}
                  aria-label="Upload a screenshot"
                >
                  <input {...getInputProps()} aria-label="Screenshot upload" />
                  <div style={{ color: "var(--text-muted)", marginBottom: "0.5rem", fontSize: "2rem" }}>
                    ↑
                  </div>
                  <p style={{ fontWeight: 500, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                    {isDragActive ? "Drop it here" : "Drag screenshot or tap to upload"}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Tap to select photo or screenshot · JPEG, PNG, WebP · max 10 MB
                  </p>
                </div>
                {imageError && (
                  <p className="field-error" style={{ marginTop: "0.5rem" }}>
                    <span aria-hidden>⚠</span> {imageError}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Screenshot preview"
                  style={{
                    width: "100%",
                    maxHeight: "360px",
                    objectFit: "contain",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    display: "flex",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      padding: "0.4rem 0.75rem",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                    title="Replace screenshot"
                  >
                    Replace
                    <input
                      type="file"
                      accept={ALLOWED_MIME_TYPES.join(",")}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onDrop([f], []);
                        e.target.value = "";
                      }}
                      disabled={isLoading}
                    />
                  </label>
                  <button
                    onClick={removeImage}
                    className="btn btn-danger btn-sm"
                    disabled={isLoading}
                    aria-label="Remove screenshot"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Text tab */}
        {tab === "text" && (
          <div className="field">
            <label htmlFor="textConversation" className="label">
              Conversation text
            </label>
            <textarea
              id="textConversation"
              className="input"
              value={textConversation}
              onChange={(e) => {
                setTextConversation(e.target.value);
                setResult(null);
                setApiError(null);
              }}
              placeholder={"Paste the conversation here. Use a format like:\nThem: hey what are you up to later?\nMe: not sure yet\nThem: wanna grab food?"}
              rows={7}
              maxLength={5000}
              disabled={isLoading}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
            />
            <span className="field-hint">
              {textConversation.length}/5000 characters
            </span>
          </div>
        )}

        {/* Context (optional) */}
        <div className="field">
          <label htmlFor="context" className="label">
            Context{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              (optional)
            </span>
          </label>
          <input
            id="context"
            className="input"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. This is someone I've been talking to for a few weeks, I want to sound interested but not too eager"
            maxLength={500}
            disabled={isLoading}
          />
          <span className="field-hint">{context.length}/500 · Who sent the message, what you want to say, tone preference</span>
        </div>

        {/* Flirty Style Selection */}
        <div className="field">
          <label className="label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Flirty Style Preference</span>
            <span style={{ fontSize: "0.75rem", color: "var(--accent)" }}>Customizes the Flirty reply</span>
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.625rem",
              marginTop: "0.35rem",
            }}
          >
            {FLIRTY_STYLE_OPTIONS.map((opt) => {
              const isSelected = flirtyStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFlirtyStyle(opt.id)}
                  disabled={isLoading}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: isSelected
                      ? opt.id === "bold_spicy"
                        ? "1.5px solid #ef4444"
                        : "1.5px solid var(--accent)"
                      : "1px solid var(--border)",
                    background: isSelected
                      ? opt.id === "bold_spicy"
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(192, 132, 252, 0.08)"
                      : "var(--bg-surface)",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: isSelected
                          ? opt.id === "bold_spicy"
                            ? "#ef4444"
                            : "var(--accent)"
                          : "var(--text-primary)",
                      }}
                    >
                      {opt.label}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: opt.id === "bold_spicy" ? "#ef4444" : "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bold & Spicy Risk Warning */}
          {flirtyStyle === "bold_spicy" && (
            <div
              className="alert alert-warning animate-fadeUp"
              style={{
                marginTop: "0.75rem",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.625rem",
                padding: "0.75rem 0.875rem",
                borderRadius: "8px",
                fontSize: "0.825rem",
                lineHeight: 1.45,
              }}
            >
              <span aria-hidden style={{ fontSize: "1rem" }}>🔥</span>
              <div>
                <strong style={{ color: "#ef4444", display: "block", marginBottom: "0.2rem" }}>
                  Risk Warning: High Heat Ahead
                </strong>
                Bold & Spicy replies carry higher social risk. Make sure you already have mutual chemistry and comfort before sending these direct texts!
              </div>
            </div>
          )}
        </div>

        {/* API error */}
        {apiError && (
          <div
            className="alert alert-error"
            role="alert"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
              <span aria-hidden>⚠</span>
              <p>{apiError}</p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              className="btn btn-secondary btn-sm"
              disabled={isLoading || !canSubmit}
            >
              Retry
            </button>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          className="btn btn-primary"
          disabled={!canSubmit}
          style={{ width: "100%" }}
        >
          {isLoading ? (
            <>
              <span className="spinner" aria-hidden />
              Analysing…
            </>
          ) : apiError ? (
            "Try again"
          ) : result ? (
            "Generate again"
          ) : (
            "Generate replies"
          )}
        </button>

        {/* Loading skeleton */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {["Normal", "Rizz", "Flirty"].map((label) => (
              <div key={label} className="reply-card">
                <div className="reply-card-header">
                  <div className="skeleton" style={{ width: "60px", height: "20px" }} />
                </div>
                <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div className="skeleton" style={{ height: "14px", width: "90%" }} />
                  <div className="skeleton" style={{ height: "14px", width: "70%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {remainingCredits !== null && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg-elevated)",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                }}
              >
                <span>
                  Credits remaining:{" "}
                  <strong style={{ color: "var(--accent)" }}>
                    {isUnlimitedCredits ? "∞ Unlimited" : remainingCredits}
                  </strong>
                </span>
                <a
                  href="/app/billing"
                  style={{
                    color: "var(--accent)",
                    textDecoration: "underline",
                    fontSize: "0.775rem",
                  }}
                >
                  Manage Plan
                </a>
              </div>
            )}

            {/* Analysis */}
            {result.analysis && (
              <div className="alert alert-info">
                <span aria-hidden style={{ fontSize: "0.9rem" }}>ℹ</span>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                  <strong>Unspoken AI read: </strong>{result.analysis}
                </p>
              </div>
            )}

            {!result.canAnalyze || !result.replies ? (
              <div className="alert alert-error" role="alert">
                <span aria-hidden>⚠</span>
                <div>
                  <p style={{ fontWeight: 500 }}>Could not identify the message</p>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem", opacity: 0.85 }}>
                    {result.analysis || "The screenshot may be too blurry or the conversation unreadable. Try uploading a clearer image or pasting the text instead."}
                  </p>
                </div>
              </div>
            ) : (
              (["normal", "rizz", "flirty"] as ReplyMode[]).map((mode) => {
                const reply = editedReplies[mode] ?? result.replies![mode];
                const isEditing = editingMode === mode;
                const isCopied = copiedMode === mode;

                return (
                  <div key={mode} className="reply-card">
                    <div className="reply-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <span className={`reply-badge ${MODE_BADGE_CLASS[mode]}`}>
                          {MODE_LABELS[mode]}
                        </span>
                        <span style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                          {mode === "flirty"
                            ? FLIRTY_STYLE_OPTIONS.find((s) => s.id === flirtyStyle)?.label ?? MODE_DESCRIPTIONS[mode]
                            : mode === "rizz"
                            ? "Dynamic Contextual Rizz"
                            : MODE_DESCRIPTIONS[mode]}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button
                          onClick={() => handleEdit(mode)}
                          className="btn btn-ghost btn-sm"
                          aria-label={isEditing ? `Done editing ${mode} reply` : `Edit ${mode} reply`}
                          style={{ minHeight: "38px", minWidth: "52px", fontSize: "0.825rem", padding: "0.4rem 0.75rem" }}
                        >
                          {isEditing ? "Done" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleCopy(mode)}
                          className="btn btn-secondary btn-sm"
                          aria-label={`Copy ${mode} reply`}
                          style={{ minHeight: "38px", minWidth: "64px", fontSize: "0.825rem", padding: "0.4rem 0.75rem" }}
                        >
                          {isCopied ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: "0.875rem 1rem" }}>
                      {isEditing ? (
                        <textarea
                          className="input"
                          value={editedReplies[mode] ?? reply}
                          onChange={(e) =>
                            setEditedReplies((prev) => ({
                              ...prev,
                              [mode]: e.target.value,
                            }))
                          }
                          rows={3}
                          autoFocus
                          style={{ fontSize: "0.9rem" }}
                        />
                      ) : (
                        <p
                          style={{
                            fontSize: "0.925rem",
                            lineHeight: 1.55,
                            color: "var(--text-primary)",
                          }}
                        >
                          {reply}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Manual copy fallback modal for iOS/mobile permission restrictions */}
      {manualCopyText && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-copy-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setManualCopyText(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "var(--bg-elevated)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              animation: "fadeUp 0.2s ease-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 id="manual-copy-title" style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                Copy Reply
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setManualCopyText(null)}
                aria-label="Close dialog"
                style={{ minHeight: "36px", padding: "0.25rem 0.5rem" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              Your browser restricted direct clipboard access. Select the text below and tap Copy:
            </p>
            <textarea
              readOnly
              className="input"
              rows={4}
              value={manualCopyText}
              onFocus={(e) => e.target.select()}
              style={{
                width: "100%",
                fontSize: "0.95rem",
                userSelect: "all",
                marginBottom: "1rem",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setManualCopyText(null)}
                style={{ minHeight: "44px" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
