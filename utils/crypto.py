"""
AES-GCM helpers for session-scoped encrypted blobs in Redis.

Stage 1 ships the primitive. Stage 4 wires per-session key derivation
via HKDF from SESSION_MASTER_KEY.
"""

import base64
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


@dataclass
class Sealed:
    nonce_b64: str
    ciphertext_b64: str

    def to_bytes(self) -> bytes:
        # Compact wire format: nonce(12) || ciphertext
        return base64.b64decode(self.nonce_b64) + base64.b64decode(self.ciphertext_b64)

    @classmethod
    def from_bytes(cls, blob: bytes) -> "Sealed":
        nonce, ct = blob[:12], blob[12:]
        return cls(
            nonce_b64=base64.b64encode(nonce).decode(),
            ciphertext_b64=base64.b64encode(ct).decode(),
        )


def new_key() -> bytes:
    """32 random bytes — caller owns lifecycle."""
    return AESGCM.generate_key(bit_length=256)


def seal(key: bytes, plaintext: bytes, aad: bytes | None = None) -> Sealed:
    nonce = os.urandom(12)
    ct = AESGCM(key).encrypt(nonce, plaintext, aad)
    return Sealed(
        nonce_b64=base64.b64encode(nonce).decode(),
        ciphertext_b64=base64.b64encode(ct).decode(),
    )


def open_(key: bytes, sealed: Sealed, aad: bytes | None = None) -> bytes:
    nonce = base64.b64decode(sealed.nonce_b64)
    ct = base64.b64decode(sealed.ciphertext_b64)
    return AESGCM(key).decrypt(nonce, ct, aad)
