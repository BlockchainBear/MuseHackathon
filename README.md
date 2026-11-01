# WorldForge Lite

Turn a game-world idea into an editable **world bible**, an interactive **location map**,
AI **concept art**, and a downloadable **world kit**. A world-planning tool — it does
not export playable Unreal or Fortnite levels.

## Features

- Idea input with optional genre/tone + example chips
- AI world generation: name, logline, overview, visual direction, 5 locations,
  3 NPCs with dialogue, 1 main + 3 side quests, asset checklist, Blender/Unreal prompts
- Interactive SVG map (1000×700): click, drag, reset layout, add/remove connections
- Full editing: every generated field stays synchronized across map, detail, and tabs
- AI location remix (“make it abandoned…”) — keeps ID/position, marks art outdated
- Concept art per location or “Generate All 5” (explicit clicks only, sequential queue)
- IndexedDB saves: worlds + image blobs, autosave, rename/duplicate/delete
- Exports: JSON, standalone SVG, ZIP world kit (`world.json`, `map.svg`,
  `world-bible.md`, `images/`, `README.md`), print / Save-as-PDF layout, JSON import
- Offline sample world: **Neon Night Market** (always labeled SAMPLE)

## Limitations

- Local-first single-user tool. Saves live in one browser (IndexedDB); use ZIP/JSON backups.
- No login, collaboration, payments, game-engine integration, or deployment.
- Concept art is 2D reference illustration, not 3D assets.
- Browser print produces the PDF (no server-side PDF rendering).
- JSON export excludes binary image data; the ZIP kit includes images.

## Setup

Requires Node ≥ 18.17 (tested with Node 20).

```bash
npm install
cp .env.example .env.local   # then add your key (see below)
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build
npm start                    # http://localhost:3000
```

Checks:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm test            # vitest (mocked provider, no network, no cost)
```

## Private environment configuration

Live generation needs a Meta Model API key. Create one in the
[Model API dashboard](https://dev.meta.ai) (**API keys** tab), then set it server-side only:

```bash
# .env.local — never commit this file
MODEL_API_KEY=LLM_<numeric-id>_<secret>
```

- Never use a `NEXT_PUBLIC_` variable for the key; the browser bundle must not contain it.
- The app exposes only a boolean `configured` flag via `/api/status`.
- Optional server-side overrides: `WORLDFORGE_TEXT_MODEL`, `WORLDFORGE_IMAGE_MODEL`,
  `WORLDFORGE_API_BASE` (defaults are the verified values below).

## Verified provider configuration

Verified against official docs on 2026-11-01 (all returned HTTP 200):

| Setting | Value |
|---|---|
| Base URL | `https://api.meta.ai/v1` |
| Auth | `Authorization: Bearer $MODEL_API_KEY` |
| Text model | `muse-spark-1.3` |
| Text endpoint | `POST /v1/chat/completions` with `response_format: { type: "json_schema", … }` |
| Image model | `muse-image-1.0` |
| Image endpoint | `POST /v1/responses` with `{ model, input }`; base64 in `output[].result` where `type: "image_generation_call"` |

Documentation URLs used:

- https://dev.meta.ai/docs/models
- https://dev.meta.ai/docs/quickstart
- https://dev.meta.ai/docs/authentication
- https://dev.meta.ai/docs/structured-output
- https://dev.meta.ai/docs/image-generation

## Sample vs live mode

- **Sample demo** (“Neon Night Market”) works fully offline and is badged `SAMPLE DEMO`.
- **Live-generated** worlds are badged `LIVE-GENERATED`; imports are badged `IMPORTED`.
- Nothing auto-generates: no model calls on page load, no automatic retries.
- If the key is missing/invalid, generation endpoints return a clear error (HTTP 503/401)
  and the UI keeps existing work intact.

## API usage and billing warning

Every **Generate World**, **Remix**, and **Generate image** click makes a live,
potentially billable API call. Buttons disable while a request is in flight, images
generate strictly on explicit request, and failures never destroy the current world.
No prices are shown in-app — see the Model API dashboard for billing.

## Local storage and backups

- Worlds + image blobs persist in browser IndexedDB (device-specific, quota-limited).
- Quota failures surface as explicit save errors with recovery guidance.
- Back up via **World Kit ZIP** (includes images) or **JSON** (content only).
- Re-import JSON any time; ID collisions import as a copy, never overwriting.

## Export formats

| Export | Contents |
|---|---|
| JSON | world content, positions, metadata, schema version (no image binaries) |
| SVG | standalone map, embedded styles, readable labels |
| ZIP | `world.json`, `map.svg`, `world-bible.md`, `images/`, `README.md` |
| Print | browser print layout → Save as PDF (title, overview, art, bible) |

## Demo walkthrough

1. `npm run dev`, open http://localhost:3000
2. Click **Load Sample Demo** → workspace opens with the Neon Night Market
3. Drag map nodes, click one to edit text, remix prompt, and connections
4. Open the **NPCs / Quests / Assets / Production Prompts** tabs and edit inline
5. **Save**, then **Saved Worlds** → rename / duplicate / delete
6. Export **JSON**, **SVG**, **World Kit ZIP**; try **Print / Save as PDF**
7. Add `MODEL_API_KEY` to `.env.local`, restart, then **Generate World** for live mode

## Public deployment security requirements

Do **not** publicly deploy this app as-is with a key configured: its API routes would
become an unprotected proxy to your billed key. Before any public deployment, add
authentication, per-user rate limiting, server-side usage quotas/caps, and abuse
monitoring — or keep it local-only.
