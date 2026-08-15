from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (routes_characters, routes_export, routes_projects,
                      routes_scripts, routes_settings, routes_storyboard, routes_workspace)
from app.config import GENERATED_DIR
from app.db import init_db

app = FastAPI(
    title="Introspective API",
    description="Local-first AI pre-production assistant for screenwriters and filmmakers.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5180",
        "http://127.0.0.1:5180",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8420",
        "http://127.0.0.1:8420",
        "http://localhost:8430",
        "http://127.0.0.1:8430",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(routes_projects.router)
app.include_router(routes_scripts.router)
app.include_router(routes_characters.router)
app.include_router(routes_settings.router)
app.include_router(routes_export.router)
app.include_router(routes_storyboard.router)
app.include_router(routes_workspace.router)

# Serves generated images (mood boards, storyboards, character sheets) once
# Phase 2 image backends write into data/generated/<project_id>/...
app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
