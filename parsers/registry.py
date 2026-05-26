"""
Parser registry + dispatcher.

Stage 1: empty registry + auto-detect skeleton.
Stage 4 registers HDFC / SBI / ICICI; later stages add the rest.
Falls back to GenericParser when no parser fingerprints above threshold.
"""

from typing import Any

from parsers.base import BaseParser
from parsers.generic import GenericParser
from shared.schemas import Statement

FINGERPRINT_THRESHOLD = 0.55

_REGISTRY: list[BaseParser] = []


def register(parser: BaseParser) -> None:
    _REGISTRY.append(parser)


def detect_bank(text: str) -> tuple[BaseParser, float]:
    """Return (best parser, confidence). Falls back to generic."""
    if not _REGISTRY:
        return GenericParser(), 0.0
    scored = sorted(
        ((p, p.fingerprint(text)) for p in _REGISTRY),
        key=lambda x: x[1],
        reverse=True,
    )
    best, conf = scored[0]
    if conf < FINGERPRINT_THRESHOLD:
        return GenericParser(), conf
    return best, conf


def parse(text: str, tables: list[Any]) -> Statement:
    parser, _conf = detect_bank(text)
    return parser.parse(text, tables)
