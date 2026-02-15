# Mnemosyne Prototype

Hackathon-ready MVP for **Mnemosyne: The Architecture of Memory**.

## What this does

- Upload image/text/audio files
- Analyze files with OpenAI (or deterministic fallback if no API key)
- Predict a category (science/history/arts/etc.) from image + title + description
- Cluster memories by semantic/emotion similarity
- Procedurally generate room/exhibit layout
- Render a first-person explorable 3D museum in browser
- Show contextual plaque overlays + narration via browser speech synthesis

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Optional environment

Create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini

# Firebase Admin (required for persistent DB storage)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=service-account@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# or provide the full JSON in one variable:
# FIREBASE_SERVICE_ACCOUNT_KEY='{"project_id":"...","client_email":"...","private_key":"..."}'
```

If Firebase env vars are missing, entries fall back to in-memory storage for local development.

## Main routes

- `/` landing
- `/upload` upload + AI category save
- `/museum/[sessionId]` generated museum
- `/museum/category/[category]` database-backed category museum

## API routes

- `POST /api/upload`
- `POST /api/analyze`
- `POST /api/cluster`
- `POST /api/generate-layout`
- `POST /api/build-scene`
- `GET /api/build-scene?sessionId=...`
- `POST /api/pipeline` (end-to-end)
- `POST /api/entries` (save + AI classify + persist one entry)
- `GET /api/entries?category=...`
- `GET /api/category-scene?category=...`

## Controls

- `W/A/S/D` move
- `Shift` sprint
- Hold mouse button + drag to look

## Testing

```bash
npm run test
npm run test:e2e
```
