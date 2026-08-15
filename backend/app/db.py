"""
SQLAlchemy engine, session factory, and ORM models.

SQLite is deliberately chosen: zero-setup, file-based, plenty fast for a
single-user desktop-style app, and trivial to back up (it's one file in
data/script2vision.db).
"""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (JSON, Column, DateTime, Float, ForeignKey, Integer,
                         String, Text, create_engine)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from app.config import DATABASE_URL


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String, nullable=False)
    style_prompt = Column(String, default="")          # e.g. "Neo Noir"
    ai_mode = Column(String, default="hybrid")          # local | cloud | hybrid
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    scripts = relationship("Script", back_populates="project", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="project", cascade="all, delete-orphan")


class Script(Base):
    __tablename__ = "scripts"

    id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    filename = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    parsed_title = Column(String, default="")
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    project = relationship("Project", back_populates="scripts")
    scenes = relationship("Scene", back_populates="script", cascade="all, delete-orphan",
                           order_by="Scene.scene_number")


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(String, primary_key=True, default=_uuid)
    script_id = Column(String, ForeignKey("scripts.id"), nullable=False)
    scene_number = Column(Integer, nullable=False)

    slugline = Column(String, default="")
    location = Column(String, default="")
    time_of_day = Column(String, default="")
    int_ext = Column(String, default="")               # INT | EXT | INT/EXT

    action_text = Column(Text, default="")
    dialogue_json = Column(JSON, default=list)          # [{character, line, parenthetical}]
    characters_present = Column(JSON, default=list)      # [character names]

    # Analysis - populated lazily by the AI orchestrator, cached thereafter.
    dominant_emotion = Column(String, default=None)
    emotional_intensity = Column(Float, default=None)
    tension_score = Column(Float, default=None)
    pacing_score = Column(Float, default=None)
    themes = Column(JSON, default=list)
    genre_tags = Column(JSON, default=list)

    cinematic_json = Column(JSON, default=dict)          # intermediate representation
    director_notes = Column(Text, default="")

    # Storyboard / Image generation outputs
    generated_image_url = Column(String, default=None)
    generated_prompt = Column(Text, default="")

    analyzed = Column(Integer, default=0)                 # 0/1 bool flag

    script = relationship("Script", back_populates="scenes")


class Character(Base):
    __tablename__ = "characters"

    id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    aliases = Column(JSON, default=list)
    dialogue_count = Column(Integer, default=0)
    scene_count = Column(Integer, default=0)
    scene_numbers = Column(JSON, default=list)

    description = Column(Text, default="")
    clothing = Column(Text, default="")
    palette = Column(JSON, default=list)

    project = relationship("Project", back_populates="characters")


class ProjectNote(Base):
    __tablename__ = "project_notes"

    id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    script_id = Column(String, nullable=True)
    scene_id = Column(String, nullable=True)
    title = Column(String, default="")
    body = Column(Text, default="")
    color = Column(String, default="yellow")
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)


class AICacheEntry(Base):
    """
    Deterministic prompt-hash -> response cache. This is what lets Hybrid
    mode avoid re-billing for the same scene analysis twice, and lets Local
    Only mode skip recomputation across app restarts.
    """
    __tablename__ = "ai_cache"

    key = Column(String, primary_key=True)               # sha256(provider+model+prompt)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    prompt_hash = Column(String, nullable=False)
    response_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # Auto-migrate existing SQLite tables if missing newly added columns
    with engine.connect() as conn:
        from sqlalchemy import text
        res = conn.execute(text("PRAGMA table_info(scenes)"))
        columns = [row[1] for row in res.fetchall()]
        if "generated_image_url" not in columns:
            conn.execute(text("ALTER TABLE scenes ADD COLUMN generated_image_url VARCHAR"))
        if "generated_prompt" not in columns:
            conn.execute(text("ALTER TABLE scenes ADD COLUMN generated_prompt TEXT"))
        conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
