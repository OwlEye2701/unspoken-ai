# Unspoken AI — Conversation Reply Assistant

A modern, full-stack AI-powered conversation reply assistant built with Next.js (App Router), TypeScript, Google Gemini API, and Supabase Auth.

---

## What It Does

Unspoken AI helps users aged 16+ craft natural, appropriate replies to chat screenshots or pasted conversations.

When a screenshot or text conversation is submitted, Unspoken AI analyzes the conversation context, identifies the latest incoming message, and returns three distinct replies:

1. **Normal** — Natural, relaxed, and conversational.
2. **Rizz** — Confident, playful, and charming with personality.
3. **Flirty** — Lightly flirtatious, respectful, and boundary-conscious.

---

## Core Security & Architecture Features

- **Strict 16+ Age Gate:** Date of birth is validated server-side during registration using a calendar comparison. Registrations under age 16 are denied before creating an account.
- **Server-Side API Boundary:** The Gemini API key is accessed only in server-side routes (`/api/generate-replies`). Never bundled or exposed in client bundles or HTML.
- **Magic-Byte Image Validation:** Uploads are inspected by their magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`), not trusting filename extensions or client MIME types alone.
- **Privacy by Architecture:** Screenshots are processed in memory and immediately discarded. No permanent storage or conversation logging on server discs.
- **Rate Limiting & Abuse Prevention:** Per-user in-memory rate limiting (10 requests/minute) protects against automation and API quota exhaustion.
- **Security Headers & CSP:** Configured Content Security Policy, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Referrer-Policy, and restricted Permissions-Policy.

---

## Prerequisites

- **Node.js:** v18.17+ or v20+ (tested with Node.js v24)
- **npm:** v9+
- **Google Gemini API Key:** From [Google AI Studio](https://aistudio.google.com/apikey)
- **Supabase Project:** Free project from [Supabase](https://supabase.com)

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# App URL (used for password reset redirects & metadata)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Automated Tests

```bash
npm test
```

Verifies the 16+ age gate, Zod validation schemas, and 3-mode Gemini reply generation structures.

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## External Integrations & Setup Guide

### 1. Google Gemini API Setup
1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Click **Create API key**.
3. Copy the key and assign it to `GEMINI_API_KEY` in `.env.local`.

### 2. Supabase Auth Setup
1. Create a project at [supabase.com](https://supabase.com).
2. In Project Settings > API, copy **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`) and **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Under **Authentication > URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (or your production domain).
   - Add `http://localhost:3000/auth/update-password` to **Redirect URLs**.

---

## Troubleshooting

- **"GEMINI_API_KEY environment variable is not set"**: Ensure `.env.local` has `GEMINI_API_KEY` set.
- **"Invalid login credentials"**: Ensure email verification is completed or disable email confirmation requirement in your Supabase Auth dashboard for local testing.
- **"Image must be 10 MB or smaller"**: Compressed screenshots or JPEG/PNG/WebP formats under 10MB are required.
