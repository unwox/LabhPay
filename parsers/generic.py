"""
Generic regex fallback parser.

Used when no bank-specific parser fingerprints above threshold. Still tries
to extract transactions + headline figures from the text so the user sees
*something* useful, but flags low detection confidence and the UI can prompt
them to confirm the bank.
"""

from __future__ import annotations

from typing import Any

from parsers._common import build_meta, iter_transaction_lines
from shared.schemas import Statement


class GenericParser:
    bank_id = "generic"
    display_name = "Other / Unknown bank"

    def fingerprint(self, text: str) -> float:  # noqa: ARG002
        return 0.0  # never wins on its own

    def parse(self, text: str, tables: list[Any]) -> Statement:  # noqa: ARG002
        pages = text.count("\f") + 1 if text else 0
        meta = build_meta(
            bank_id=self.bank_id,
            bank_display=self.display_name,
            text=text,
            pages=pages,
            detection_confidence=0.0,
        )
        return Statement(meta=meta, transactions=list(iter_transaction_lines(text)))
