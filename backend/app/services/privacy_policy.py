from __future__ import annotations

import json
from functools import lru_cache
from io import BytesIO
from textwrap import wrap
from typing import Any, Literal

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.core.shared_paths import PRIVACY_POLICY_PATH

PrivacyLocale = Literal["de", "en"]

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 56
RIGHT_MARGIN = 56
TOP_MARGIN = 58
BOTTOM_MARGIN = 54
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
LINE_HEIGHT = 13
PARAGRAPH_GAP = 8
SECTION_GAP = 14


def normalize_privacy_locale(locale: str | None) -> PrivacyLocale:
    return "de" if locale == "de" else "en"


@lru_cache(maxsize=1)
def load_privacy_policy_copy() -> dict[str, Any]:
    with PRIVACY_POLICY_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("Privacy policy copy must be a JSON object.")
    return payload


def get_privacy_policy_copy(locale: str | None) -> dict[str, Any]:
    payload = load_privacy_policy_copy()
    normalized_locale = normalize_privacy_locale(locale)
    copy = payload.get(normalized_locale)
    if not isinstance(copy, dict):
        raise ValueError(f"Missing privacy policy copy for locale {normalized_locale}.")
    return copy


def build_privacy_policy_filename(locale: str | None) -> str:
    return "imocalc-datenschutz.pdf" if normalize_privacy_locale(locale) == "de" else "imocalc-privacy-policy.pdf"


def _as_text(value: Any) -> str:
    return str(value) if value is not None else ""


def _wrap_text(text: str, font_size: int, max_width: float = CONTENT_WIDTH) -> list[str]:
    average_char_width = font_size * 0.5
    max_chars = max(24, int(max_width / average_char_width))
    return wrap(text, width=max_chars, break_long_words=False, replace_whitespace=False) or [""]


class PrivacyPdfRenderer:
    def __init__(self, pdf: canvas.Canvas, locale: PrivacyLocale) -> None:
        self.pdf = pdf
        self.locale = locale
        self.page_number = 1
        self.y = PAGE_HEIGHT - TOP_MARGIN

    def _footer(self) -> None:
        self.pdf.setFont("Helvetica", 8)
        footer = f"ImoCalc privacy policy - {self.page_number}"
        self.pdf.drawCentredString(PAGE_WIDTH / 2, 30, footer)

    def _new_page(self) -> None:
        self._footer()
        self.pdf.showPage()
        self.page_number += 1
        self.y = PAGE_HEIGHT - TOP_MARGIN

    def _ensure_space(self, needed: float) -> None:
        if self.y - needed < BOTTOM_MARGIN:
            self._new_page()

    def text(self, value: str, font: str = "Helvetica", font_size: int = 10, leading: int = LINE_HEIGHT) -> None:
        lines = _wrap_text(value, font_size)
        self._ensure_space(len(lines) * leading + 2)
        self.pdf.setFont(font, font_size)
        for line in lines:
            self.pdf.drawString(LEFT_MARGIN, self.y, line)
            self.y -= leading

    def heading(self, value: str) -> None:
        self._ensure_space(34)
        self.pdf.setFont("Helvetica-Bold", 19)
        self.pdf.drawString(LEFT_MARGIN, self.y, value)
        self.y -= 26

    def description(self, value: str) -> None:
        self.text(value, font="Helvetica-Oblique", font_size=10)
        self.y -= SECTION_GAP

    def section_title(self, value: str) -> None:
        self._ensure_space(28)
        self.y -= 4
        self.pdf.setFont("Helvetica-Bold", 12)
        self.pdf.drawString(LEFT_MARGIN, self.y, value)
        self.y -= 18

    def paragraph(self, value: str) -> None:
        self.text(value, font="Helvetica", font_size=9)
        self.y -= PARAGRAPH_GAP

    def bullet(self, value: str) -> None:
        bullet_width = 16
        lines = _wrap_text(value, 9, max_width=CONTENT_WIDTH - bullet_width)
        self._ensure_space(len(lines) * LINE_HEIGHT + 2)
        self.pdf.setFont("Helvetica", 9)
        for index, line in enumerate(lines):
            prefix = "- " if index == 0 else "  "
            self.pdf.drawString(LEFT_MARGIN, self.y, prefix)
            self.pdf.drawString(LEFT_MARGIN + bullet_width, self.y, line)
            self.y -= LINE_HEIGHT
        self.y -= 2

    def finish(self) -> None:
        self._footer()
        self.pdf.save()


def build_privacy_policy_pdf(locale: str | None) -> bytes:
    normalized_locale = normalize_privacy_locale(locale)
    copy = get_privacy_policy_copy(normalized_locale)
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4, pageCompression=0)
    renderer = PrivacyPdfRenderer(pdf, normalized_locale)

    renderer.heading(_as_text(copy.get("title")))
    renderer.description(_as_text(copy.get("description")))

    sections = copy.get("sections")
    if isinstance(sections, list):
        for raw_section in sections:
            if not isinstance(raw_section, dict):
                continue
            renderer.section_title(_as_text(raw_section.get("title")))
            paragraphs = raw_section.get("paragraphs")
            if isinstance(paragraphs, list):
                for paragraph in paragraphs:
                    renderer.paragraph(_as_text(paragraph))
            items = raw_section.get("items")
            if isinstance(items, list):
                for item in items:
                    renderer.bullet(_as_text(item))
            renderer.y -= SECTION_GAP

    renderer.finish()
    return buffer.getvalue()
