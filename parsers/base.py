"""
Bank parser contract.

Each bank ships a class implementing BaseParser. The registry runs every
parser's `fingerprint()` and picks the highest-confidence match.
"""

from typing import Any, Protocol

from shared.schemas import Statement


class BaseParser(Protocol):
    bank_id: str
    display_name: str

    def fingerprint(self, text: str) -> float:
        """Return 0.0–1.0 confidence that this text is this bank's statement."""
        ...

    def parse(self, text: str, tables: list[Any]) -> Statement:
        """Parse normalized text + tables into a Statement."""
        ...
