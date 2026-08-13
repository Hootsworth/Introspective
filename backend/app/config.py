"""
Central configuration for Script2Vision.

Everything that varies between machines/environments lives here so the
rest of the codebase never touches os.environ or hardcoded paths directly.
"""
from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Filesystem layout
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"
UPLOADS_DIR = DATA_DIR / "uploads"
EXPORTS_DIR = DATA_DIR / "exports"
GENERATED_DIR = DATA_DIR / "generated"          # images / storyboards / etc.
DB_PATH = DATA_DIR / "script2vision.db"
KEYSTORE_PATH = DATA_DIR / "keystore.enc"
KEYSTORE_SALT_PATH = DATA_DIR / "keystore.salt"

for d in (DATA_DIR, CACHE_DIR, UPLOADS_DIR, EXPORTS_DIR, GENERATED_DIR):
    d.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"

# ---------------------------------------------------------------------------
# AI inference
# ---------------------------------------------------------------------------
# Global default mode: "local" | "cloud" | "hybrid"
DEFAULT_AI_MODE = os.environ.get("S2V_AI_MODE", "hybrid")

# Local backends we know how to talk to, in preference order.
# Apple Foundation Models are NOT reachable from Python/FastAPI - they are a
# Swift-only on-device framework. When packaged as a native app, the Swift
# shell would implement services/ai/foundation_models_client and register it
# here with the same interface as the other clients (see ai/base.py).
OLLAMA_BASE_URL = os.environ.get("S2V_OLLAMA_URL", "http://localhost:11434")
DEFAULT_LOCAL_MODEL = os.environ.get("S2V_LOCAL_MODEL", "llama3.2")

DEFAULT_OPENAI_MODEL = os.environ.get("S2V_OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_GEMINI_MODEL = os.environ.get("S2V_GEMINI_MODEL", "gemini-3.1-flash-lite")

# Hard ceiling on characters sent to a cloud model in a single call.
# Hybrid mode compresses to structured summaries well below this anyway;
# this is a last-resort safety valve.
MAX_CLOUD_INPUT_CHARS = 6000

# Image generation backend: "flux_klein_4b" | "comfyui" | "automatic1111" | "sdxl_local" | "none"
DEFAULT_IMAGE_BACKEND = os.environ.get("S2V_IMAGE_BACKEND", "flux_klein_4b")
COMFYUI_URL = os.environ.get("S2V_COMFYUI_URL", "http://127.0.0.1:8188")
A1111_URL = os.environ.get("S2V_A1111_URL", "http://127.0.0.1:7860")

APP_ENV = os.environ.get("S2V_ENV", "development")
