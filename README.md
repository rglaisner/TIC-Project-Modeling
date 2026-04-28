# Strategic Pitch Architect (Vercel-ready)

This app is now structured as a standalone Next.js + TypeScript project that can also be integrated into a larger portfolio console.

## Environment Variables

Set these in Vercel Project Settings or `.env.local`:

- `GEMINI_API_KEY`: server-side Gemini key used by `/api/gemini`.
- `GEMINI_MODEL`: Gemini model ID used by `/api/gemini` (default: `gemini-2.5-flash`).
- `APP_ACCESS_PASSCODE`: shared passcode for simple free access control.
- `SESSION_SECRET`: reserved for future session signing upgrades.

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Security Model

- Access is protected by middleware and a passcode gate (`/access`).
- Successful login sets an HTTP-only cookie.
- Gemini key stays server-side only.

Tradeoff: shared passcode is simple and free, but does not provide per-user identity.

## Persistence and Portability

- Session autosaves in local storage.
- Export options:
  - JSON (full state)
  - Markdown (human-readable report)
- Import JSON to restore a prior session.

## Umbrella Integration

The app is standalone by default and exposes a metadata endpoint:

- `GET /api/app-meta`

A master console can use this endpoint to discover name/version/routes/capabilities, then link or embed the app.
