# Hausa Live Speech-to-Text Backend (MVP)

Production-grade TypeScript/Express backend focused on core Hausa speech-to-text:

- Live real-time transcription over WebSockets (Google Cloud Streaming STT)
- File upload transcription endpoint (Google STT recognize)
- In-memory transcripts repository with basic CRUD
- Security middleware, logging, OpenAPI docs, and a simple browser test page

## Prerequisites

- Node.js 18+
- npm 9+
- Google Cloud Service Account JSON in backend root: `hausa-text-f0bae78a7264.json`

## Setup

```bash
cd backend
npm install
npm run dev
```

Env (optional) via `.env` (see `.env.example`). By default, the service account JSON in backend root is used.

## Browser test page

Open http://localhost:4000/

- Upload for STT: pick an audio file, transcribes via `/api/stt/transcribe`
- Record from microphone: records WebM/Opus and uploads
- Live socket transcription: streams 16 kHz PCM to `/transcription` and renders partials like subtitles

Note: For “online” mode, enable Premium in the UI (it sets a header/query used by a stub guard).

## REST API (MVP)

- GET `/health` → { status: 'ok', version }
- POST `/api/stt/transcribe` (multipart/form-data)
  - form fields: `audio` (file), optional `encoding` (e.g., WEBM_OPUS|OGG_OPUS|LINEAR16|MP3), optional `languageCode` (default ha-NG)
  - response: `{ transcript, confidence, id }`
- GET `/api/transcripts` → list user transcripts (stub user)
- GET `/api/transcripts/:id` → transcript by id
- DELETE `/api/transcripts/:id` → delete transcript

OpenAPI docs: http://localhost:4000/docs

## WebSocket (Live)

Namespace: `/transcription`

Client → Server events:
- `join_session` { mode: 'online' | 'offline' }
- `audio_chunk` { sessionId, chunk } where `chunk` is base64 of 16-bit little-endian PCM at 16 kHz
- `end_session` { sessionId }

Server → Client events:
- `session_status` { sessionId, status: 'active' | 'completed' }
- `transcript_update` { sessionId, text, isFinal? }
- `error` { code, message }

Premium gating (stub):
- Send `x-user-premium: true` header or `?premium=true` query when connecting to `/transcription` to allow `online` mode.

## Storage

Currently uses an in-memory repository (`InMemoryTranscriptsRepository`). Swap-in external storage by implementing the `TranscriptsRepository` interface.

## Scripts

- `dev` run development server
- `build` compile to `dist/`
- `start` start compiled server
- `test` run tests
- `lint` lint sources
- `format` format with Prettier
- `typecheck` TS no-emit

## Security notes

- The test page relaxes CSP in development for convenience. Lock CSP down for production and avoid inline scripts/CDNs.
- Do not commit your real Google service account key to source control.

