"""
PDF quality heuristics. Stage 1 ships signatures + thresholds;
Stage 4 wires the pdfplumber / pymupdf / OCR calls.
"""

from dataclasses import dataclass

MAX_PAGES = 100
MIN_PAGES = 1
MIN_TEXT_CHARS_PER_PAGE = 300        # below → likely scanned
MIN_BLUR_LAPLACIAN_VARIANCE = 80.0   # below → blurry scan, warn user
MIN_OCR_CONFIDENCE = 0.55            # below → flag transactions low-conf


@dataclass
class QualityReport:
    pages: int
    text_chars: int
    is_scanned: bool
    blur_score: float | None
    ocr_confidence: float | None
    warnings: list[str]

    @property
    def is_blurry(self) -> bool:
        return (
            self.blur_score is not None
            and self.blur_score < MIN_BLUR_LAPLACIAN_VARIANCE
        )

    @property
    def low_ocr_confidence(self) -> bool:
        return (
            self.ocr_confidence is not None
            and self.ocr_confidence < MIN_OCR_CONFIDENCE
        )
