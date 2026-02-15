# Mnemosyne Prototype v1 Product Specification (Current Implementation)

Version: 1.0 (implementation-aligned)

Date: 2026-02-15

Project root: `/Users/amankhan/Desktop/NewCalgHacks/calgaryHacks2026/calgaryHacks2026`

## 1. Product Definition
Mnemosyne Prototype is a browser-based application that converts uploaded personal media into an explorable 3D museum scene.

The current v1 system is optimized for hackathon MVP execution: fast upload, lightweight AI interpretation, procedural layout, and first-person viewing in-browser.

## 2. Goals and Non-Goals
### Goals
- Accept user media uploads (image/text/audio file types accepted by UI/API).
- Generate semantic artifact records from uploaded media.
- Cluster artifacts by semantic/emotional similarity.
- Build a 3D scene procedurally from generated data.
- Provide first-person exploration with contextual exhibit overlays and optional narration.
- Run even when no OpenAI API key is configured.

### Non-Goals (v1)
- Persistent long-term storage of sessions.
- Auth/accounts/user profiles.
- Multi-user collaboration/multiplayer.
- True VR mode.
- Fully physical collision-based movement.
- Production durability/SLA guarantees.

## 3. User Personas and Primary Use Case
### Persona
- Hackathon demo user who wants to upload a small set of personal media and explore an AI-assisted 3D memory space quickly.

### Primary Use Case
1. User uploads files.
2. User optionally adds title/description metadata per file.
3. System analyzes files and builds a scene.
4. User explores resulting museum in first-person.

## 4. Product Scope (Implemented)
### In Scope
- Landing, category, upload, and museum routes.
- End-to-end API pipeline (`upload -> analyze -> cluster -> scene build`).
- In-memory session storage for uploaded files and generated artifacts/scene.
- 3D rendering with React Three Fiber + Drei.
- HUD overlay with room/exhibit context.
- Browser speech synthesis narration on exhibit interaction.

### Out of Scope
- Saved museum persistence across restarts.
- Public share links.
- Real-time collaboration.
- Full audio transcription pipeline with dedicated speech-to-text stage.

## 5. Functional Requirements
### FR-1 Upload
- System shall accept multiple files from the browser upload control.
- Accepted input filter in UI: `image/*`, `text/*`, `audio/*`, `.txt`, `.md`.
- System shall assign each file an internal `fileId`.
- User shall be able to add optional title/description metadata for each selected file prior to pipeline execution.

### FR-2 Session State
- System shall create or reuse a `sessionId`.
- Session state shall store files, analysis artifacts, clusters, selected category, and built scene.
- Session storage shall be process-memory only.

### FR-3 Analysis
- System shall analyze uploaded files using OpenAI Responses API when `OPENAI_API_KEY` is present.
- If unavailable or request fails, system shall generate deterministic fallback artifacts.
- Analysis output per artifact shall include:
  - `title`
  - `description`
  - `emotion`
  - `sentimentScore`
  - `objects`
  - `semanticTags`
  - `palette`
  - `embedding` (pseudo-embedding)

### FR-4 Clustering
- System shall group artifacts using weighted similarity:
  - cosine similarity of pseudo-embeddings
  - emotion match factor
  - semantic tag overlap (Jaccard)
- System shall produce cluster metadata:
  - theme
  - dominant emotion profile
  - centroid
  - member IDs
  - top tags

### FR-5 Layout and Scene Build
- System shall build a scene definition containing rooms, exhibits, and connection edges.
- Current layout implementation shall generate one adaptive tunnel room and place exhibits along left/right lanes.
- Image exhibits shall map to retrievable texture assets via API endpoint.
- Non-image exhibits shall render fallback framed panels.

### FR-6 Museum Interaction
- System shall render first-person navigable scene in browser.
- User shall move with keyboard (W/A/S/D + arrows, Shift sprint) and mouse look via pointer lock.
- System shall show contextual HUD with current room and focused exhibit plaque.
- User click on exhibit shall trigger narration using browser `speechSynthesis`.

## 6. Route and API Specification
### Frontend Routes
- `/` Landing page.
- `/categories` Category selector.
- `/upload` Upload flow.
- `/museum/[sessionId]` Museum viewer.

### API Endpoints
- `POST /api/upload`
  - Input: multipart form data (`files[]`, optional `metadata`, optional `category`, optional `sessionId`)
  - Output: `sessionId`, uploaded file refs.
- `GET /api/upload?id=...&sessionId=...`
  - Returns binary file content for stored image asset retrieval.
- `POST /api/analyze`
  - Input: `sessionId`
  - Output: artifact list.
- `POST /api/cluster`
  - Input: `sessionId`
  - Output: cluster list.
- `POST /api/generate-layout`
  - Input: `sessionId`
  - Output: generated rooms + exhibits.
- `POST /api/build-scene`
  - Input: `sessionId`
  - Output: scene definition.
- `GET /api/build-scene?sessionId=...`
  - Output: previously built scene for session.
- `POST /api/pipeline`
  - Input: `sessionId`
  - Behavior: orchestrates analyze -> cluster -> scene build.
- `POST /api/narrate`
  - Input: `text`
  - Output: stub success payload.

## 7. Data Contracts (Summary)
### Uploaded File
- `id`, `name`, `type`, `sourceType`, `size`, `uploadedAt`
- Optional: `userTitle`, `userDescription`, `dataUrl`, `textContent`

### Memory Artifact
- `id`, `fileId`, `sourceType`, `title`, `description`
- `emotion`, `sentimentScore`, `objects[]`, `semanticTags[]`, `palette[]`
- `embedding[]`, optional `timestamp`

### Room Node
- `id`, `clusterId`, `center[x,y,z]`, `size[w,h,d]`, `style`, `label`, optional `keywords[]`

### Exhibit Node
- `id`, `roomId`, `artifactId`, optional `assetUrl`, optional `textFallback`
- `position[x,y,z]`, `rotation[x,y,z]`, `plaque`, `title`

### Scene Definition
- `sessionId`, `rooms[]`, `exhibits[]`, `connections[]`

## 8. UX Specification (Current)
### Upload Experience
- Single-page upload interface with styled drag/drop area.
- Per-file metadata modal sequence.
- Build starts after last file is saved in modal flow.

### Museum Experience
- Immersive dark museum theme.
- On-screen controls hint on load.
- Current room indicator and plaque card overlay.
- Crosshair and quick control reminder.

## 9. Architecture and Technology
### Frontend
- Next.js (App Router), React, TypeScript.
- Tailwind CSS for styling.
- Framer Motion for HUD transitions.

### 3D Rendering
- `@react-three/fiber`
- `@react-three/drei`
- Three.js via R3F abstractions.

### Backend
- Next.js route handlers in `app/api/*`.
- In-memory session map (no external DB/object store).

### AI Integration
- OpenAI Responses API when key configured.
- Deterministic fallback analysis when key missing/error.

## 10. Operational Constraints
- Session data is volatile (lost on server restart/redeploy).
- No persistence guarantees.
- No authorization boundary between sessions beyond knowledge of `sessionId` route.
- Expected workload profile: MVP-scale, small media sets.

## 11. Security and Privacy Notes (v1)
- Uploaded files are stored in server memory for session lifetime only.
- No explicit encryption-at-rest layer exists because no durable storage is implemented.
- No authentication/authorization layer is implemented.
- This build is demo-grade and not suitable for sensitive production data without further controls.

## 12. Quality and Testing Status
### Existing Tests
- Unit: clustering logic.
- Unit: layout engine behavior.
- Integration: pipeline-to-scene creation.
- E2E scaffold present.

### Minimum v1 Acceptance Criteria
- User can upload multiple files in one session.
- Pipeline returns non-empty artifacts/clusters/scene for valid upload session.
- Museum route loads scene and renders exhibits.
- User can move in first person and view contextual exhibit information.

## 13. Known Limitations / Product Debt
- Cluster-to-multi-room mapping is not yet implemented; current layout is single-room tunnel.
- Audio does not have a dedicated transcription stage.
- Navigation does not include full collision/gravity physics.
- `/api/narrate` is a stub; narration is client-side speech synthesis.
- Session persistence and shareability are not implemented.

## 14. Future v2 Direction (Recommended)
- Persistent storage for files/sessions/scenes.
- Dedicated audio transcription and richer multimodal analysis.
- Multi-room, cluster-driven procedural architecture.
- Improved physics/collision and interaction triggers.
- Saved museums, shared links, and collaborative exploration.

## 15. Source of Truth Files
- Product shell and routes:
  - `app/page.tsx`
  - `app/categories/page.tsx`
  - `app/upload/page.tsx`
  - `app/museum/[sessionId]/page.tsx`
- Upload + pipeline UI:
  - `components/upload/DropzoneUploader.tsx`
- Scene rendering + interaction:
  - `components/scene/MuseumCanvas.tsx`
  - `components/scene/MuseumScene.tsx`
  - `components/scene/FPSController.tsx`
  - `components/scene/GalleryRoom.tsx`
  - `components/scene/ExhibitFrame.tsx`
  - `components/hud/HUDOverlay.tsx`
- API and pipeline:
  - `app/api/upload/route.ts`
  - `app/api/analyze/route.ts`
  - `app/api/cluster/route.ts`
  - `app/api/generate-layout/route.ts`
  - `app/api/build-scene/route.ts`
  - `app/api/pipeline/route.ts`
  - `app/api/narrate/route.ts`
- Core domain logic:
  - `lib/ai/analyzeMedia.ts`
  - `lib/clustering/clusterMemories.ts`
  - `lib/generation/layoutEngine.ts`
  - `lib/generation/sceneBuilder.ts`
  - `lib/storage/uploadStore.ts`
