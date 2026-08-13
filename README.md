# Script2Vision

A local-first AI pre-production assistant that turns a screenplay into a
structured cinematic planning package: scenes, characters, emotion/tension/
pacing analysis, cinematic metadata (lighting, camera, lens, palette), an
auto-derived shot list, director notes, a character relationship graph, and
exports to JSON/Markdown/PDF/ZIP.

Built as **Python (FastAPI) backend + React (Vite) frontend** so it runs
anywhere — no Xcode required. See "Native macOS notes" below for the one
piece of the original spec (Apple Foundation Models) that genuinely needs a
Swift shell.

## Architecture

```
backend/
  app/
    main.py                  FastAPI app, CORS, router registration
    config.py                All paths and defaults in one place
    db.py                    SQLAlchemy models: Project, Script, Scene,
                              Character, AICacheEntry
    models/schemas.py        Pydantic request/response schemas
    services/
      parser.py               Deterministic screenplay parser (sluglines,
                               scenes, dialogue, action, transitions)
      character_extraction.py Character + alias extraction
      cinematic_analysis.py   Builds per-scene AI prompts, normalizes output
      cache.py                Deterministic AI response cache (SQLite)
      export.py                JSON / Markdown / PDF / ZIP export
      ai/
        base.py                Common backend interface
        ollama_client.py       Local inference via Ollama
        openai_client.py       Cloud: OpenAI (free-text model field)
        gemini_client.py       Cloud: Gemini (free-text model field)
        orchestrator.py        Local/Cloud/Hybrid routing + caching, the
                                single choke point every AI call goes through
    storage/keystore.py       Encrypted local API key storage (Fernet)
    api/                      REST routes (projects, scripts, characters,
                               settings, export)

frontend/
  src/
    api/client.js             Typed fetch wrapper for every backend endpoint
    pages/                    Dashboard, ScriptViewer, SceneExplorer,
                               CharacterExplorer, RelationshipGraph,
                               ShotList, DirectorNotes, Exports, Settings,
                               ImageStub (storyboard/mood board placeholder)
    components/                Sidebar, TopBar, shared UI primitives
    index.css                  Design tokens (light/dark, accent colors,
                                type scale)
```

## Running it

**Backend:**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8420
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend expects the API at
`http://127.0.0.1:8420` (see `frontend/src/api/client.js` — change `BASE` if
you run the backend elsewhere).

**Local inference (optional, for the "Local Only" / "Hybrid" AI modes):**
Install [Ollama](https://ollama.com), pull a model (e.g. `ollama pull
llama3.2`), and it'll be auto-detected on Settings → Local Inference. No
Ollama running just means Local mode fails and Hybrid mode falls back to
whatever cloud key you've configured — nothing crashes.

**Cloud inference (optional):** add an OpenAI and/or Gemini API key in
Settings. Keys are encrypted at rest in `backend/data/keystore.enc` (Fernet,
key derived via PBKDF2) and never leave your machine except to the
respective provider's API when you actually trigger a cloud analysis.

## What's fully built vs. what's a stub

**Fully built, real, working end to end:**
- Screenplay parsing (sluglines, scenes, characters, dialogue, action,
  transitions) — deterministic, offline, instant
- Character extraction with alias consolidation
- AI orchestration with Local/Cloud/Hybrid modes, deterministic per-scene
  caching (never re-bills for an unchanged scene), and a hard truncation
  safety valve on cloud prompt size
- Per-scene emotion/tension/pacing/theme/genre + full cinematic metadata
  (lighting, camera, lens, movement, composition, palette, film stock,
  visual motifs) + director notes
- Character relationship graph — computed from real scene co-occurrence
  data, no AI needed
- Shot list — auto-derived from the cinematic analysis + a duration
  estimate from dialogue/action word count, no AI needed
- JSON / Markdown / PDF / ZIP export
- Settings: encrypted API keys, free-text model fields (never a dropdown,
  per the spec — so new model names work with zero code changes), AI mode,
  image backend selector
- Dark/light mode, macOS-native design language throughout

**Deliberately stubbed, with a clean extension point:**
- Storyboard, Mood Board, Character Sheets, Location Boards — these need an
  actual image generation backend (SDXL/ComfyUI/Automatic1111) running
  locally, which isn't something buildable/runnable inside a chat sandbox.
  The `ImageStub` page explains the extension point directly: implement one
  class with a `generate(prompt, style, count)` method in
  `backend/app/services/image/`, register it against
  `config.DEFAULT_IMAGE_BACKEND`, and write output to
  `data/generated/<project_id>/<kind>/` — everything downstream (the ZIP
  export, the stub pages) already knows to look there.
- Animatics (MP4 export of pan/zoom/dissolve over generated frames) —
  depends on the image backend above existing first.

## Native macOS notes (Apple Foundation Models, Keychain)

The original spec calls for Apple Foundation Models as the primary local
backend and macOS Keychain for key storage. Both are Swift-only APIs with
no Python bridge — they cannot be called from this FastAPI backend, and
can't be compiled/run in a non-macOS sandbox regardless of language. If you
want the true native experience:

1. **Foundation Models**: implement a class matching `services/ai/base.py`'s
   `AIBackend` interface as a small Swift XPC service or embedded server
   that the Python backend calls over localhost — same pattern as the
   Ollama client, just swapping the HTTP target. Register it in
   `orchestrator.py` ahead of Ollama in the local fallback chain.
2. **Keychain**: swap `storage/keystore.py`'s Fernet-based implementation
   for calls into the `keyring` package's macOS backend (`keyring.set_password`
   / `get_password`), which talks to Keychain directly. The rest of the
   codebase only calls `get_secret`/`save_secret`, so this is a one-file change.
3. **Packaging**: wrap the FastAPI backend as a bundled binary (PyInstaller)
   launched by a thin SwiftUI shell, or rebuild the frontend views natively
   in SwiftUI against the same REST API — the API layer doesn't care which
   one you pick.

## Credit optimization (how the spec's cost rules are actually enforced)

- Every AI call goes through `AIOrchestrator.run()` — no code path calls a
  backend client directly.
- Prompts are built deterministically per scene (`cinematic_analysis.py`),
  so identical scenes always hash to the same cache key
  (`services/cache.py`) and never re-bill, across app restarts.
- Cloud prompts are hard-truncated at `MAX_CLOUD_INPUT_CHARS` regardless of
  mode, as a last-resort safety valve — but in practice a prompt is already
  a single scene's structured text, never the full screenplay.
- Hybrid mode always tries local first; cloud is fallback-only, and only
  activates if a key is actually configured.
