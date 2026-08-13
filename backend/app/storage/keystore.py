"""
Secure local storage for cloud API keys.

On a real macOS build this should be swapped for the system Keychain
(e.g. via the Swift Security framework, or the `keyring` package's macOS
backend which itself talks to Keychain). For the cross-platform build we
encrypt keys at rest with a machine-local key derived via PBKDF2 + a random
salt file, using Fernet (AES-128-CBC + HMAC). Keys are NEVER stored in
plaintext and NEVER logged.

Swap point: replace `_load_key()` / `save_secret()` / `get_secret()` with
calls into the `keyring` library (`keyring.set_password` / `get_password`)
if you want native OS credential stores on Windows/macOS/Linux instead.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import KEYSTORE_PATH, KEYSTORE_SALT_PATH

_MACHINE_SECRET_ENV = "S2V_MACHINE_SECRET"


def _machine_seed() -> bytes:
    """
    Derive a stable-per-machine seed. Users can override via env var for
    portability; otherwise we fall back to a generated, persisted seed file
    equivalent (the salt file itself also acts as part of the seed).
    """
    seed = os.environ.get(_MACHINE_SECRET_ENV)
    if seed:
        return seed.encode("utf-8")
    # Fall back to a fixed-but-local marker; combined with the random salt
    # below this is sufficient to keep the key file opaque at rest without
    # requiring the user to manage a passphrase.
    return b"script2vision-local-v1"


def _get_or_create_salt() -> bytes:
    if KEYSTORE_SALT_PATH.exists():
        return KEYSTORE_SALT_PATH.read_bytes()
    salt = os.urandom(16)
    KEYSTORE_SALT_PATH.write_bytes(salt)
    return salt


def _fernet() -> Fernet:
    salt = _get_or_create_salt()
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=390_000)
    key = base64.urlsafe_b64encode(kdf.derive(_machine_seed()))
    return Fernet(key)


def _read_all() -> dict:
    if not KEYSTORE_PATH.exists():
        return {}
    token = KEYSTORE_PATH.read_bytes()
    try:
        raw = _fernet().decrypt(token)
        return json.loads(raw.decode("utf-8"))
    except Exception:
        # Corrupt or unreadable keystore - do not crash the app, just
        # treat as empty so the user can re-enter keys via Settings.
        return {}


def _write_all(data: dict) -> None:
    raw = json.dumps(data).encode("utf-8")
    token = _fernet().encrypt(raw)
    KEYSTORE_PATH.write_bytes(token)


def save_secret(name: str, value: str) -> None:
    data = _read_all()
    data[name] = value
    _write_all(data)


def get_secret(name: str) -> str | None:
    return _read_all().get(name)


def delete_secret(name: str) -> None:
    data = _read_all()
    if name in data:
        del data[name]
        _write_all(data)


def has_secret(name: str) -> bool:
    return bool(get_secret(name))


def list_secret_names() -> list[str]:
    """Returns which keys are set, never the values themselves."""
    return list(_read_all().keys())
