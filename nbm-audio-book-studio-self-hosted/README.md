# NBM Audio & Book Studio

Self-hosted creative workstation for literature, translation, OCR, narration, audio/video production, and publishing.

## Run locally

Prerequisites: Node.js 20.19 or newer and npm.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` only if you want cloud OCR, translation, review generation, TTS, or transcription. The key stays on the server.
3. Start the full app with `npm run dev` and open the local URL printed by the server (usually `http://localhost:3000`).

Local library, project, subtitle, image, and audio tools work without an AI key. The app stores its catalog in that browser's local storage; export regular backups in Settings. Browser storage is per device and is not shared between visitors.

## Build and self-host

Run `npm run build`, then `npm start`. The Express server serves the built web app and its `/api/*` endpoints from the same origin. Deploy it to a Node.js host that supports long-running Express processes. Static-only hosting can preview the UI but cannot provide the server-side AI endpoints. Set `PORT` and `GEMINI_API_KEY` in the host's environment settings; never put API keys in frontend environment variables or commit a real `.env` file.

For a private server, put HTTPS and access control in front of the app before making paid AI endpoints reachable on the public internet. Persistent library/database accounts and multi-user authentication are not included in this version.

Cloud AI routes also have a per-IP in-memory limit, configurable with `AI_API_RATE_LIMIT_PER_MINUTE` (default 30). This helps with accidental loops but is not a replacement for authentication or host-level rate limiting.

## Available scripts

- `npm run dev` — local app and API server with Vite development middleware.
- `npm run build` — production frontend build.
- `npm start` — production Express server serving `dist/` and API routes.
- `npm run lint` — TypeScript type check.
