from __future__ import annotations

from typing import Any, Dict, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.config import (COMFYUI_URL, DEFAULT_AI_MODE, DEFAULT_GEMINI_MODEL,
                         DEFAULT_IMAGE_BACKEND, DEFAULT_LOCAL_MODEL,
                         DEFAULT_OPENAI_MODEL)
from app.models.schemas import SettingsIn, SettingsOut
from app.services.ai.comfyui_client import ComfyUIClient, get_comfyui_url
from app.services.ai.ollama_client import OllamaBackend
from app.storage.keystore import get_secret, save_secret

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ComfyUITestRequest(BaseModel):
    url: Optional[str] = None


@router.get("", response_model=SettingsOut)
async def get_settings():
    ollama_reachable = await OllamaBackend().is_available()
    c_url = get_secret("comfyui_url") or COMFYUI_URL or "http://127.0.0.1:8188"
    comfy_client = ComfyUIClient(base_url=c_url)
    comfy_status = await comfy_client.get_status()

    return SettingsOut(
        has_openai_key=bool(get_secret("openai_api_key")),
        has_gemini_key=bool(get_secret("gemini_api_key")),
        default_ai_mode=get_secret("default_ai_mode") or DEFAULT_AI_MODE,
        local_model=get_secret("local_model") or DEFAULT_LOCAL_MODEL,
        openai_model=get_secret("openai_model") or DEFAULT_OPENAI_MODEL,
        gemini_model=get_secret("gemini_model") or DEFAULT_GEMINI_MODEL,
        image_backend=get_secret("image_backend") or DEFAULT_IMAGE_BACKEND,
        comfyui_url=c_url,
        ollama_reachable=ollama_reachable,
        comfyui_reachable=comfy_status.get("reachable", False),
    )


@router.post("", response_model=SettingsOut)
async def update_settings(payload: SettingsIn):
    if payload.openai_api_key is not None:
        key = payload.openai_api_key.strip()
        if key.startswith("curl") or key.startswith("http"):
            raise HTTPException(400, "Invalid API Key: You pasted a terminal command (e.g. curl) instead of an OpenAI API key.")
        save_secret("openai_api_key", key)

    if payload.gemini_api_key is not None:
        key = payload.gemini_api_key.strip()
        if key.startswith("curl") or key.startswith("http"):
            raise HTTPException(400, "Invalid API Key: You pasted a terminal command (e.g. curl) instead of a Gemini API key (e.g. AIzaSy...).")
        save_secret("gemini_api_key", key)

    if payload.default_ai_mode is not None:
        save_secret("default_ai_mode", payload.default_ai_mode)
    if payload.local_model is not None:
        save_secret("local_model", payload.local_model.strip())
    if payload.openai_model is not None:
        save_secret("openai_model", payload.openai_model.strip())
    if payload.gemini_model is not None:
        save_secret("gemini_model", payload.gemini_model.strip())
    if payload.image_backend is not None:
        save_secret("image_backend", payload.image_backend.strip())
    if payload.comfyui_url is not None:
        save_secret("comfyui_url", payload.comfyui_url.strip())

    return await get_settings()


@router.post("/comfyui/test")
async def test_comfyui_integration(req: ComfyUITestRequest = None) -> Dict[str, Any]:
    """
    Run diagnostic integration test suite against ComfyUI instance.
    """
    target_url = req.url.strip() if (req and req.url) else get_comfyui_url()
    client = ComfyUIClient(base_url=target_url)
    return await client.run_test_suite()
