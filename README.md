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
```

If no key is set, the app still works using fallback analysis.

## Main routes

- `/` landing
- `/upload` upload + pipeline trigger
- `/museum/[sessionId]` generated museum

## API routes

- `POST /api/upload`
- `POST /api/analyze`
- `POST /api/cluster`
- `POST /api/generate-layout`
- `POST /api/build-scene`
- `GET /api/build-scene?sessionId=...`
- `POST /api/pipeline` (end-to-end)

## Controls

- `W/A/S/D` move
- `Shift` sprint
- Hold mouse button + drag to look

## Testing

```bash
npm run test
npm run test:e2e
```
