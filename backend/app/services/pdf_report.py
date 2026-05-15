from __future__ import annotations

import json
import textwrap
import math
import re
from datetime import datetime, timezone
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.pdfgen import canvas

from app.core.shared_paths import FRONTEND_PDF_EXPORT_ASSETS_DIR, QUESTION_FLOW_PATH

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 46
RIGHT_MARGIN = 46
HEADER_TOP_Y = PAGE_HEIGHT - 42
HEADER_CONTENT_Y = PAGE_HEIGHT - 72
CONTENT_START_Y = PAGE_HEIGHT - 104
FOOTER_Y = 28
FOOTER_BOUNDARY_Y = 54
SECTION_GAP = 14
LINE_HEIGHT = 13
CHART_DRAWING_HEIGHT = 188
CHART_BODY_BOTTOM_PADDING = 26
CHART_BODY_TOP_PADDING = 46
CHART_LEFT_PADDING = 40
CHART_RIGHT_PADDING = 14
CHART_LABEL_MAX_LENGTH = 28
MODERN_CARD_DRAWING_HEIGHT = 132
MODERN_APP_NAME_X_OFFSET = 12
PERSON_FIELD_PATTERN = re.compile(r"^person_(\d+)_[a-z0-9_]+$")
YES_VALUES = {"yes", "ja", "true", "1"}
NO_VALUES = {"no", "nein", "false", "0"}
WEB_COLOR_PRIMARY_DARK = "#0f4c5c"
WEB_COLOR_PRIMARY_MEDIUM = "#155e75"
WEB_COLOR_PRIMARY_SOFT = "#8db8cf"
WEB_COLOR_BORDER_MUTED = "#d4e2ec"
WEB_COLOR_SURFACE_LIGHT = "#f6fbff"
WEB_COLOR_SURFACE_SOFT = "#ebf5fb"
WEB_COLOR_SURFACE_NEUTRAL = "#f0f5f9"
WEB_COLOR_ICON_SURFACE = "#d7eaf5"
WEB_COLOR_LABEL = "#2a4658"
WEB_COLOR_TEXT_DARK = "#0a2537"
WEB_COLOR_BUTTON_ACTIVE_BG = "#edf6fb"
WEB_COLOR_BUTTON_ACTIVE_BORDER = "#74aac3"
MODERN_PAGE_ROLE_HEADER = "header"
MODERN_PAGE_ROLE_PERSON = "person"
MODERN_PAGE_ROLE_GENERIC = "generic"
MODERN_COVER_IMAGE_BY_LOCALE: dict[str, Path] = {
    "de": FRONTEND_PDF_EXPORT_ASSETS_DIR / "DE_imgpdfexprot.png",
    "en": FRONTEND_PDF_EXPORT_ASSETS_DIR / "EN_imgpdfexprot.png",
}
MODERN_HEADER_IMAGE_PATH = FRONTEND_PDF_EXPORT_ASSETS_DIR / "imgpdfexprotheader.png"
MODERN_BACKGROUND_IMAGE_PATH = FRONTEND_PDF_EXPORT_ASSETS_DIR / "imgpdfexprotbackgrund.png"
MODERN_PERSON_BACKGROUND_IMAGE_PATH = FRONTEND_PDF_EXPORT_ASSETS_DIR / "imgpdfexprotbackperson.png"

LOCALE_TEXTS: dict[str, dict[str, str]] = {
    "en": {
        "app_name": "ImoCalc",
        "report_title": "Financing Report",
        "generated_at": "Generated",
        "cover_page": "Cover Page",
        "cover_subtitle": "Financing snapshot for quick review",
        "summary": "Summary",
        "charts": "Charts",
        "dashboard_snapshot": "Graphical Dashboard Snapshot",
        "assumptions": "Assumptions",
        "personal_data": "Personal Data",
        "person": "Person",
        "notes": "Notes",
        "household_name": "Household",
        "no_personal_fields": "No personal data fields configured for this person.",
        "no_personal_values": "No personal values available for this person.",
        "risk_scenario": "Risk and Scenario",
        "loan_timeline": "Loan Balance Timeline",
        "chart_financing_structure": "Financing Structure",
        "chart_payment_comparison": "Baseline vs Stress Monthly Payment",
        "chart_loan_balance_timeline": "Loan Balance Timeline",
        "chart_total_equity": "Total Equity",
        "chart_financing_needed": "Financing Needed",
        "chart_baseline_monthly_payment": "Baseline Monthly Payment",
        "chart_stress_monthly_payment": "Stress Monthly Payment",
        "year_5": "5 years",
        "year_10": "10 years",
        "year_15": "15 years",
        "year_20": "20 years",
        "year_30": "30 years",
        "page": "Page",
        "disclaimer": "Technical summary only. Not financial or legal advice.",
        "na": "n/a",
        "yes": "yes",
        "no": "no",
        "risk_light_green": "Green",
        "risk_light_yellow": "Yellow",
        "risk_light_red": "Red",
        "risk_light": "Traffic Light",
        "risk_level": "Backend Level",
        "risk_score": "Backend Score",
        "hints": "Guidance",
        "no_hints": "No additional warnings for the current input set.",
        "baseline_rate": "Baseline annual rate",
        "baseline_monthly": "Baseline monthly payment",
        "baseline_total": "Baseline total cost",
        "stress_rate": "Stress annual rate",
        "stress_monthly": "Stress monthly payment",
        "stress_total": "Stress total cost",
        "sale_year": "Sale year",
        "expected_sale_price": "Expected sale price",
        "remaining_loan": "Remaining loan",
        "gross_proceeds": "Gross proceeds",
        "target_profit": "Target profit",
        "profit_match": "Profit target match",
        "sale_disabled": "No sale scenario planned.",
        "total_project_cost": "Total project cost",
        "total_equity": "Total equity",
        "financing_needed": "Financing needed",
        "monthly_loan_payment": "Monthly loan payment",
        "total_interest_paid": "Total interest paid",
        "affordability_ratio": "Affordability ratio",
        "free_income_after_payment": "Free income after payment",
        "recommended_max_budget": "Recommended max budget",
        "debt_to_income_view": "Debt-to-income view",
        "build_or_buy": "Build or buy",
        "land_exists": "Existing land",
        "persons_count": "Persons count",
        "monthly_reserve_target": "Monthly reserve target",
        "desired_monthly_payment": "Desired monthly payment",
        "absolute_max_payment": "Absolute max payment",
        "interest_rate": "Interest rate",
        "repayment_rate": "Repayment rate",
        "fixed_interest_years": "Fixed-rate years",
        "sale_planned": "Sale planned",
        "expected_profit_target": "Expected profit target",
    },
    "de": {
        "app_name": "ImoCalc",
        "report_title": "Finanzierungsreport",
        "generated_at": "Erstellt",
        "cover_page": "Deckblatt",
        "cover_subtitle": "Finanzierungsueberblick fuer die schnelle Einschaetzung",
        "summary": "Uebersicht",
        "charts": "Grafiken",
        "dashboard_snapshot": "Grafisches Dashboard",
        "assumptions": "Annahmen",
        "personal_data": "Personendaten",
        "person": "Person",
        "notes": "Hinweise",
        "household_name": "Haushalt",
        "no_personal_fields": "Fuer diese Person sind keine Stammdatenfelder konfiguriert.",
        "no_personal_values": "Fuer diese Person liegen keine Stammdatenwerte vor.",
        "risk_scenario": "Risiko und Szenario",
        "loan_timeline": "Restschuld-Zeitverlauf",
        "chart_financing_structure": "Finanzierungsstruktur",
        "chart_payment_comparison": "Vergleich Basisrate vs. Stressrate",
        "chart_loan_balance_timeline": "Restschuld-Zeitverlauf",
        "chart_total_equity": "Gesamtes Eigenkapital",
        "chart_financing_needed": "Benoetigte Finanzierung",
        "chart_baseline_monthly_payment": "Basis monatliche Rate",
        "chart_stress_monthly_payment": "Stress monatliche Rate",
        "year_5": "5 Jahre",
        "year_10": "10 Jahre",
        "year_15": "15 Jahre",
        "year_20": "20 Jahre",
        "year_30": "30 Jahre",
        "page": "Seite",
        "disclaimer": "Technische Zusammenfassung. Keine Finanz- oder Rechtsberatung.",
        "na": "k. A.",
        "yes": "ja",
        "no": "nein",
        "risk_light_green": "Gruen",
        "risk_light_yellow": "Gelb",
        "risk_light_red": "Rot",
        "risk_light": "Ampel",
        "risk_level": "Backend-Level",
        "risk_score": "Backend-Score",
        "hints": "Hinweise",
        "no_hints": "Keine zusaetzlichen Warnungen fuer die aktuellen Eingaben.",
        "baseline_rate": "Basiszins p.a.",
        "baseline_monthly": "Basisrate monatlich",
        "baseline_total": "Basiskosten gesamt",
        "stress_rate": "Stresszins p.a.",
        "stress_monthly": "Stressrate monatlich",
        "stress_total": "Stresskosten gesamt",
        "sale_year": "Verkaufsjahr",
        "expected_sale_price": "Erwarteter Verkaufspreis",
        "remaining_loan": "Restkredit",
        "gross_proceeds": "Bruttoerloes",
        "target_profit": "Gewinnziel",
        "profit_match": "Gewinnziel erreicht",
        "sale_disabled": "Kein Verkaufsszenario geplant.",
        "total_project_cost": "Gesamte Projektkosten",
        "total_equity": "Gesamtes Eigenkapital",
        "financing_needed": "Benoetigte Finanzierung",
        "monthly_loan_payment": "Monatliche Kreditrate",
        "total_interest_paid": "Gesamt gezahlte Zinsen",
        "affordability_ratio": "Tragfaehigkeitsquote",
        "free_income_after_payment": "Freies Einkommen nach Rate",
        "recommended_max_budget": "Empfohlenes Maximalbudget",
        "debt_to_income_view": "Schulden-zu-Einkommen",
        "build_or_buy": "Bauen oder kaufen",
        "land_exists": "Grundstueck vorhanden",
        "persons_count": "Personenanzahl",
        "monthly_reserve_target": "Monatliches Reservenziel",
        "desired_monthly_payment": "Gewuenschte Monatsrate",
        "absolute_max_payment": "Absolute Maximalrate",
        "interest_rate": "Zinssatz",
        "repayment_rate": "Tilgungsrate",
        "fixed_interest_years": "Zinsbindung Jahre",
        "sale_planned": "Verkauf geplant",
        "expected_profit_target": "Erwartetes Gewinnziel",
    },
}

ASSUMPTION_FIELDS = [
    "build_or_buy",
    "land_exists",
    "persons_count",
    "monthly_reserve_target",
    "desired_monthly_payment",
    "absolute_max_payment",
    "interest_rate",
    "repayment_rate",
    "fixed_interest_years",
    "sale_planned",
    "sale_year",
    "expected_profit_target",
]

HINT_TRANSLATIONS: dict[str, dict[str, str]] = {
    "Project is only affordable with high risk.": {
        "en": "Project is only affordable with high risk.",
        "de": "Das Projekt ist nur mit hohem Risiko tragfaehig.",
    },
    "Equity is low relative to total project cost.": {
        "en": "Equity is low relative to total project cost.",
        "de": "Das Eigenkapital ist im Verhaeltnis zu den Projektkosten niedrig.",
    },
    "Additional costs may be underestimated.": {
        "en": "Additional costs may be underestimated.",
        "de": "Die Zusatzkosten koennten unterschaetzt sein.",
    },
    "Land cost data appears incomplete.": {
        "en": "Land cost data appears incomplete.",
        "de": "Die Grundstueckskosten wirken unvollstaendig.",
    },
    "Renovation costs are likely underestimated.": {
        "en": "Renovation costs are likely underestimated.",
        "de": "Die Renovierungskosten sind voraussichtlich zu niedrig angesetzt.",
    },
}

CHART_LABEL_KEYS: dict[str, str] = {
    "results.chart.financing.total_equity": "chart_total_equity",
    "results.chart.financing.financing_needed": "chart_financing_needed",
    "results.chart.payment.baseline_monthly_payment": "chart_baseline_monthly_payment",
    "results.chart.payment.stress_monthly_payment": "chart_stress_monthly_payment",
    "results.years_5": "year_5",
    "results.years_10": "year_10",
    "results.years_15": "year_15",
    "results.years_20": "year_20",
    "results.years_30": "year_30",
}


class PdfReportRenderer:
    def __init__(
        self,
        pdf: canvas.Canvas,
        locale: str,
        generated_at: datetime,
        variant: str = "classic",
        initial_page_role: str | None = None,
    ):
        self.pdf = pdf
        self.locale = locale
        self.texts = LOCALE_TEXTS[locale]
        self.generated_at = generated_at
        self.variant = variant
        self.page_role = initial_page_role if initial_page_role else MODERN_PAGE_ROLE_GENERIC
        self.page_number = 1
        self.y = CONTENT_START_Y
        self._draw_page_background()
        self._draw_page_header()

    def _draw_page_background(self) -> None:
        if self.variant != "modern":
            return
        background_path = _modern_background_image_for_role(self.page_role, self.locale)
        _draw_full_page_image(self.pdf, background_path)

    def _draw_page_header(self) -> None:
        if self.variant == "modern":
            self.pdf.setStrokeColor(colors.HexColor(WEB_COLOR_PRIMARY_SOFT))
        else:
            self.pdf.setStrokeColorRGB(0.82, 0.86, 0.92)
        self.pdf.setLineWidth(1)
        self.pdf.line(LEFT_MARGIN, HEADER_CONTENT_Y - 8, PAGE_WIDTH - RIGHT_MARGIN, HEADER_CONTENT_Y - 8)

        if self.variant == "modern":
            self.pdf.setFillColor(colors.HexColor(WEB_COLOR_PRIMARY_DARK))
        else:
            self.pdf.setFillColorRGB(0.1, 0.15, 0.25)
        self.pdf.setFont("Helvetica-Bold", 14)
        app_name_x = LEFT_MARGIN + (MODERN_APP_NAME_X_OFFSET if self.variant == "modern" else 0)
        self.pdf.drawString(app_name_x, HEADER_TOP_Y, self.texts["app_name"])

        self.pdf.setFont("Helvetica", 10)
        title = self.texts["report_title"] if self.variant == "classic" else f"{self.texts['report_title']} Modern"
        self.pdf.drawRightString(PAGE_WIDTH - RIGHT_MARGIN, HEADER_TOP_Y, title)

        generated_label = f"{self.texts['generated_at']}: {_format_datetime(self.generated_at, self.locale)}"
        if self.variant == "modern":
            self.pdf.setFillColor(colors.HexColor(WEB_COLOR_PRIMARY_MEDIUM))
        else:
            self.pdf.setFillColorRGB(0.28, 0.35, 0.46)
        self.pdf.drawString(LEFT_MARGIN, HEADER_CONTENT_Y, generated_label)
        self.y = CONTENT_START_Y

    def _draw_page_footer(self) -> None:
        if self.variant == "modern":
            self.pdf.setStrokeColor(colors.HexColor(WEB_COLOR_BORDER_MUTED))
        else:
            self.pdf.setStrokeColorRGB(0.85, 0.88, 0.94)
        self.pdf.setLineWidth(1)
        self.pdf.line(LEFT_MARGIN, FOOTER_BOUNDARY_Y, PAGE_WIDTH - RIGHT_MARGIN, FOOTER_BOUNDARY_Y)

        if self.variant == "modern":
            self.pdf.setFillColor(colors.HexColor(WEB_COLOR_PRIMARY_MEDIUM))
        else:
            self.pdf.setFillColorRGB(0.35, 0.4, 0.48)
        self.pdf.setFont("Helvetica", 8)
        self.pdf.drawString(LEFT_MARGIN, FOOTER_Y, self.texts["disclaimer"])
        self.pdf.drawRightString(
            PAGE_WIDTH - RIGHT_MARGIN,
            FOOTER_Y,
            f"{self.texts['page']} {self.page_number}",
        )

    def _new_page(self, role: str | None = None) -> None:
        self._draw_page_footer()
        self.pdf.showPage()
        self.page_number += 1
        if role is not None:
            self.page_role = role
        self._draw_page_background()
        self._draw_page_header()

    def next_page(self, role: str | None = None) -> None:
        self._new_page(role=role)

    def ensure_space(self, lines: int = 1) -> None:
        required_height = (lines * LINE_HEIGHT) + 6
        if self.y - required_height < FOOTER_BOUNDARY_Y + 8:
            self._new_page()

    def section_title(self, title: str) -> None:
        self.ensure_space(2)
        self.pdf.setFillColorRGB(0.08, 0.14, 0.24)
        self.pdf.setFont("Helvetica-Bold", 12)
        self.pdf.drawString(LEFT_MARGIN, self.y, title)
        self.y -= 17

    def key_value(self, label: str, value: str) -> None:
        label_lines = _wrap_text(label, 30)
        value_lines = _wrap_text(value, 58)
        row_lines = max(len(label_lines), len(value_lines))
        self.ensure_space(row_lines)

        self.pdf.setFillColorRGB(0.15, 0.2, 0.28)
        for index in range(row_lines):
            line_y = self.y - (index * LINE_HEIGHT)
            if index < len(label_lines):
                self.pdf.setFont("Helvetica-Bold", 9)
                self.pdf.drawString(LEFT_MARGIN, line_y, label_lines[index])
            if index < len(value_lines):
                self.pdf.setFont("Helvetica", 9)
                self.pdf.drawString(LEFT_MARGIN + 170, line_y, value_lines[index])

        self.y -= (row_lines * LINE_HEIGHT) + 3

    def bullet(self, text: str) -> None:
        lines = _wrap_text(text, 84)
        self.ensure_space(len(lines))
        self.pdf.setFillColorRGB(0.16, 0.2, 0.28)
        self.pdf.setFont("Helvetica", 9)
        self.pdf.drawString(LEFT_MARGIN + 10, self.y, "-")
        for index, line in enumerate(lines):
            line_y = self.y - (index * LINE_HEIGHT)
            self.pdf.drawString(LEFT_MARGIN + 20, line_y, line)
        self.y -= (len(lines) * LINE_HEIGHT) + 2

    def spacer(self, lines: int = 1) -> None:
        self.ensure_space(lines)
        self.y -= lines * LINE_HEIGHT

    def drawing(self, drawing: Drawing, height: float) -> None:
        required_lines = max(1, int(math.ceil((height + 8) / LINE_HEIGHT)))
        self.ensure_space(required_lines)
        drawing_bottom_y = self.y - height
        renderPDF.draw(drawing, self.pdf, LEFT_MARGIN, drawing_bottom_y)
        self.y = drawing_bottom_y - 8

    def finish(self) -> None:
        self._draw_page_footer()
        self.pdf.save()


def _safe_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _file_fingerprint(path: Path) -> tuple[int, int]:
    stat = path.stat()
    return stat.st_mtime_ns, stat.st_size


@lru_cache(maxsize=16)
def _cached_image_reader(path: str, mtime_ns: int, size: int) -> ImageReader:
    return ImageReader(path)


def _image_reader(path: Path) -> ImageReader | None:
    try:
        mtime_ns, size = _file_fingerprint(path)
        return _cached_image_reader(str(path), mtime_ns, size)
    except Exception:
        return None


def _draw_full_page_image(pdf: canvas.Canvas, image_path: Path) -> None:
    reader = _image_reader(image_path)
    if reader is None:
        return
    pdf.drawImage(
        reader,
        0,
        0,
        width=PAGE_WIDTH,
        height=PAGE_HEIGHT,
        preserveAspectRatio=False,
        mask="auto",
    )


def _modern_background_image_for_role(role: str, locale: str) -> Path:
    if role == MODERN_PAGE_ROLE_HEADER:
        return MODERN_HEADER_IMAGE_PATH
    if role == MODERN_PAGE_ROLE_PERSON:
        return MODERN_PERSON_BACKGROUND_IMAGE_PATH
    if role == "cover":
        return MODERN_COVER_IMAGE_BY_LOCALE.get(locale, MODERN_COVER_IMAGE_BY_LOCALE["en"])
    return MODERN_BACKGROUND_IMAGE_PATH


@lru_cache(maxsize=8)
def _question_flow_catalog(path: str, mtime_ns: int, size: int) -> tuple[dict[str, dict[str, Any]], dict[int, list[str]]]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    steps = payload.get("steps")

    field_catalog: dict[str, dict[str, Any]] = {}
    personal_fields_by_person: dict[int, list[str]] = {}

    if not isinstance(steps, list):
        return field_catalog, personal_fields_by_person

    for step in steps:
        if not isinstance(step, dict):
            continue
        fields = step.get("fields")
        if not isinstance(fields, list):
            continue
        for field in fields:
            if not isinstance(field, dict):
                continue
            field_id = field.get("id")
            if not isinstance(field_id, str) or not field_id:
                continue

            options_map: dict[str, str] = {}
            options = field.get("options")
            if isinstance(options, list):
                for option in options:
                    if not isinstance(option, dict):
                        continue
                    option_value = option.get("value")
                    option_label = option.get("label")
                    if option_value is None or option_label is None:
                        continue
                    options_map[str(option_value)] = str(option_label)

            field_catalog[field_id] = {
                "label": str(field.get("label", field_id)),
                "options": options_map,
            }

            match = PERSON_FIELD_PATTERN.match(field_id)
            if match:
                person_index = int(match.group(1))
                personal_fields_by_person.setdefault(person_index, []).append(field_id)

    return field_catalog, personal_fields_by_person


def _shared_catalog() -> tuple[dict[str, dict[str, Any]], dict[int, list[str]]]:
    mtime_ns, size = _file_fingerprint(QUESTION_FLOW_PATH)
    try:
        return _question_flow_catalog(str(QUESTION_FLOW_PATH), mtime_ns, size)
    except FileNotFoundError:
        return {}, {}
    except json.JSONDecodeError:
        return {}, {}


def _field_label(field_id: str, texts: dict[str, str], field_catalog: dict[str, dict[str, Any]]) -> str:
    localized = texts.get(field_id)
    if localized:
        return localized
    meta = field_catalog.get(field_id)
    if isinstance(meta, dict):
        raw_label = meta.get("label")
        if isinstance(raw_label, str) and raw_label.strip():
            return raw_label.strip()
    return field_id


def _resolve_option_label(field_id: str, raw_value: Any, field_catalog: dict[str, dict[str, Any]]) -> str | None:
    meta = field_catalog.get(field_id)
    if not isinstance(meta, dict):
        return None
    options = meta.get("options")
    if not isinstance(options, dict):
        return None

    if isinstance(raw_value, list):
        labels = [str(options.get(str(item), item)) for item in raw_value if item not in (None, "")]
        if labels:
            return ", ".join(labels)
        return None
    if raw_value in (None, ""):
        return None
    label = options.get(str(raw_value))
    return str(label) if label is not None else None


def _person_count(form_values: dict[str, Any]) -> int:
    raw_value = form_values.get("persons_count")
    if isinstance(raw_value, (int, float)):
        count = int(raw_value)
    elif isinstance(raw_value, str):
        stripped = raw_value.strip()
        count = int(stripped) if stripped.isdigit() else 1
    else:
        count = 1
    return min(max(count, 1), 4)


def _format_field_value(
    field_id: str,
    raw_value: Any,
    locale: str,
    texts: dict[str, str],
    field_catalog: dict[str, dict[str, Any]],
) -> str:
    if raw_value in (None, ""):
        return texts["na"]

    option_label = _resolve_option_label(field_id, raw_value, field_catalog)
    if option_label:
        option_normalized = option_label.strip().lower()
        if option_normalized in YES_VALUES:
            return texts["yes"]
        if option_normalized in NO_VALUES:
            return texts["no"]
        return option_label

    if isinstance(raw_value, bool):
        return texts["yes"] if raw_value else texts["no"]

    if isinstance(raw_value, (int, float)):
        return _format_number(raw_value, locale, texts["na"])

    if isinstance(raw_value, list):
        normalized_values = [str(item).strip() for item in raw_value if str(item).strip()]
        return ", ".join(normalized_values) if normalized_values else texts["na"]

    if isinstance(raw_value, str):
        normalized = raw_value.strip()
        if not normalized:
            return texts["na"]
        lower = normalized.lower()
        if lower in YES_VALUES:
            return texts["yes"]
        if lower in NO_VALUES:
            return texts["no"]
        return normalized

    return str(raw_value)


def _household_name(form_values: dict[str, Any], texts: dict[str, str]) -> str:
    names: list[str] = []
    for person_index in (1, 2):
        first_name = str(form_values.get(f"person_{person_index}_first_name", "")).strip()
        last_name = str(form_values.get(f"person_{person_index}_last_name", "")).strip()
        full_name = " ".join(part for part in [first_name, last_name] if part)
        if full_name:
            names.append(full_name)
    if not names:
        return texts["na"]
    return ", ".join(names)


def _format_datetime(value: datetime, locale: str) -> str:
    if locale == "de":
        return value.strftime("%d.%m.%Y %H:%M UTC")
    return value.strftime("%Y-%m-%d %H:%M UTC")


def _format_decimal(value: float, locale: str, digits: int = 2) -> str:
    rendered = f"{value:,.{digits}f}"
    if locale == "de":
        return rendered.replace(",", "_").replace(".", ",").replace("_", ".")
    return rendered


def _format_currency(value: Any, locale: str, na: str) -> str:
    if not isinstance(value, (int, float)):
        return na
    amount = _format_decimal(float(value), locale, 2)
    if locale == "de":
        return f"{amount} EUR"
    return f"EUR {amount}"


def _format_percent(value: Any, locale: str, na: str) -> str:
    if not isinstance(value, (int, float)):
        return na
    return f"{_format_decimal(float(value), locale, 2)}%"


def _format_number(value: Any, locale: str, na: str) -> str:
    if not isinstance(value, (int, float)):
        return na
    return _format_decimal(float(value), locale, 2)


def _format_bool(value: Any, yes: str, no: str, na: str) -> str:
    if value is True:
        return yes
    if value is False:
        return no
    return na


def _wrap_text(text: str, width: int) -> list[str]:
    normalized = " ".join(str(text).split())
    if not normalized:
        return ["-"]
    wrapped = textwrap.wrap(normalized, width=width)
    return wrapped if wrapped else [normalized]


def _localized_text(locale: str) -> dict[str, str]:
    return LOCALE_TEXTS.get(locale, LOCALE_TEXTS["en"])


def _risk_light_label(light: Any, texts: dict[str, str]) -> str:
    if light == "green":
        return texts["risk_light_green"]
    if light == "yellow":
        return texts["risk_light_yellow"]
    if light == "red":
        return texts["risk_light_red"]
    return str(light)


def _localize_hint(hint: str, locale: str) -> str:
    entry = HINT_TRANSLATIONS.get(hint)
    if not entry:
        return hint
    return entry.get(locale, entry["en"])


def _shorten_chart_label(label: str) -> str:
    normalized = " ".join(str(label).split())
    if not normalized:
        return "-"
    if len(normalized) <= CHART_LABEL_MAX_LENGTH:
        return normalized
    return f"{normalized[: CHART_LABEL_MAX_LENGTH - 3].rstrip()}..."


def _chart_label_from_key(label_key: str, texts: dict[str, str]) -> str:
    text_key = CHART_LABEL_KEYS.get(label_key)
    if text_key:
        return texts.get(text_key, label_key)
    return label_key


def _extract_chart_entries(raw_series: Any, fallback: list[tuple[str, Any]], texts: dict[str, str]) -> list[tuple[str, float]]:
    extracted: list[tuple[str, float]] = []

    if isinstance(raw_series, list):
        for entry in raw_series:
            if not isinstance(entry, dict):
                continue

            raw_value = entry.get("value")
            if not isinstance(raw_value, (int, float)):
                continue

            label = entry.get("label")
            if isinstance(label, str) and label.strip():
                resolved_label = label
            else:
                label_key = entry.get("labelKey")
                if isinstance(label_key, str) and label_key.strip():
                    resolved_label = _chart_label_from_key(label_key, texts)
                else:
                    key = entry.get("key")
                    resolved_label = str(key) if key not in (None, "") else "-"

            extracted.append((_shorten_chart_label(resolved_label), max(float(raw_value), 0.0)))

    if extracted:
        return extracted

    fallback_entries: list[tuple[str, float]] = []
    for label, raw_value in fallback:
        if not isinstance(raw_value, (int, float)):
            continue
        fallback_entries.append((_shorten_chart_label(str(label)), max(float(raw_value), 0.0)))

    return fallback_entries


def _nice_axis_max(values: list[float]) -> float:
    if not values:
        return 1.0
    max_value = max(values)
    if max_value <= 0:
        return 1.0
    if max_value <= 10:
        return float(math.ceil(max_value))

    magnitude = 10 ** math.floor(math.log10(max_value))
    normalized = max_value / magnitude
    if normalized <= 1:
        return 1 * magnitude
    if normalized <= 2:
        return 2 * magnitude
    if normalized <= 5:
        return 5 * magnitude
    return 10 * magnitude


def _axis_step(value_max: float) -> float:
    return max(value_max / 5, 1.0)


def _build_bar_chart_drawing(title: str, entries: list[tuple[str, float]], fill_color: str, na: str) -> Drawing:
    chart_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    drawing = Drawing(chart_width, CHART_DRAWING_HEIGHT)
    drawing.add(String(0, CHART_DRAWING_HEIGHT - 12, title, fontName="Helvetica-Bold", fontSize=10, fillColor=colors.HexColor("#0f172a")))

    labels = [label for label, _ in entries] if entries else [na]
    values = [value for _, value in entries] if entries else [0.0]

    chart = VerticalBarChart()
    chart.x = CHART_LEFT_PADDING
    chart.y = CHART_BODY_BOTTOM_PADDING
    chart.width = chart_width - CHART_LEFT_PADDING - CHART_RIGHT_PADDING
    chart.height = CHART_DRAWING_HEIGHT - CHART_BODY_TOP_PADDING - CHART_BODY_BOTTOM_PADDING
    chart.data = [values]
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.categoryAxis.labels.angle = 20
    chart.categoryAxis.labels.dy = -2
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0

    max_value = _nice_axis_max(values)
    chart.valueAxis.valueMax = max_value
    chart.valueAxis.valueStep = _axis_step(max_value)
    chart.groupSpacing = 12
    chart.barSpacing = 8

    bar_color = colors.HexColor(fill_color)
    chart.bars[0].fillColor = bar_color
    chart.bars[0].strokeColor = bar_color
    drawing.add(chart)
    return drawing


def _build_line_chart_drawing(title: str, entries: list[tuple[str, float]], stroke_color: str, na: str) -> Drawing:
    chart_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    drawing = Drawing(chart_width, CHART_DRAWING_HEIGHT)
    drawing.add(String(0, CHART_DRAWING_HEIGHT - 12, title, fontName="Helvetica-Bold", fontSize=10, fillColor=colors.HexColor("#0f172a")))

    labels = [label for label, _ in entries] if entries else [na]
    values = [value for _, value in entries] if entries else [0.0]

    chart = HorizontalLineChart()
    chart.x = CHART_LEFT_PADDING
    chart.y = CHART_BODY_BOTTOM_PADDING
    chart.width = chart_width - CHART_LEFT_PADDING - CHART_RIGHT_PADDING
    chart.height = CHART_DRAWING_HEIGHT - CHART_BODY_TOP_PADDING - CHART_BODY_BOTTOM_PADDING
    chart.data = [values]
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.categoryAxis.labels.angle = 20
    chart.categoryAxis.labels.dy = -2
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0

    max_value = _nice_axis_max(values)
    chart.valueAxis.valueMax = max_value
    chart.valueAxis.valueStep = _axis_step(max_value)

    chart.lines[0].strokeColor = colors.HexColor(stroke_color)
    chart.lines[0].strokeWidth = 2
    drawing.add(chart)
    return drawing


def _build_modern_kpi_cards_drawing(
    texts: dict[str, str],
    locale: str,
    derived: dict[str, Any],
) -> Drawing:
    drawing_width = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
    drawing = Drawing(drawing_width, MODERN_CARD_DRAWING_HEIGHT)
    drawing.add(
        String(
            0,
            MODERN_CARD_DRAWING_HEIGHT - 12,
            texts["dashboard_snapshot"],
            fontName="Helvetica-Bold",
            fontSize=11,
            fillColor=colors.HexColor("#0f172a"),
        )
    )

    cards = [
        (
            texts["total_project_cost"],
            _format_currency(derived.get("totalProjectCost"), locale, texts["na"]),
            WEB_COLOR_SURFACE_LIGHT,
            WEB_COLOR_PRIMARY_SOFT,
            WEB_COLOR_PRIMARY_DARK,
        ),
        (
            texts["financing_needed"],
            _format_currency(derived.get("financingNeeded"), locale, texts["na"]),
            WEB_COLOR_SURFACE_SOFT,
            WEB_COLOR_PRIMARY_SOFT,
            WEB_COLOR_PRIMARY_DARK,
        ),
        (
            texts["monthly_loan_payment"],
            _format_currency(derived.get("monthlyLoanPayment"), locale, texts["na"]),
            WEB_COLOR_SURFACE_NEUTRAL,
            WEB_COLOR_BORDER_MUTED,
            WEB_COLOR_PRIMARY_MEDIUM,
        ),
        (
            texts["free_income_after_payment"],
            _format_currency(derived.get("freeIncomeAfterPayment"), locale, texts["na"]),
            WEB_COLOR_BUTTON_ACTIVE_BG,
            WEB_COLOR_BUTTON_ACTIVE_BORDER,
            WEB_COLOR_TEXT_DARK,
        ),
    ]
    card_gap = 10
    columns = 2
    rows = 2
    card_width = (drawing_width - card_gap) / columns
    card_height = (MODERN_CARD_DRAWING_HEIGHT - 42 - card_gap) / rows
    start_y = 8

    for index, (label, value, background, border, accent) in enumerate(cards):
        row = index // columns
        column = index % columns
        x = column * (card_width + card_gap)
        y = start_y + ((rows - 1 - row) * (card_height + card_gap))
        drawing.add(
            Rect(
                x,
                y,
                card_width,
                card_height,
                rx=8,
                ry=8,
                strokeColor=colors.HexColor(border),
                strokeWidth=0.8,
                fillColor=colors.HexColor(background),
            )
        )
        drawing.add(
            String(
                x + 10,
                y + card_height - 16,
                label,
                fontName="Helvetica-Bold",
                fontSize=8,
                fillColor=colors.HexColor(WEB_COLOR_LABEL),
            )
        )
        drawing.add(
            String(
                x + 10,
                y + card_height - 36,
                value,
                fontName="Helvetica-Bold",
                fontSize=10,
                fillColor=colors.HexColor(accent),
            )
        )
    return drawing


def _render_modern_cover_image_page(pdf: canvas.Canvas, locale: str) -> None:
    cover_path = _modern_background_image_for_role("cover", locale)
    _draw_full_page_image(pdf, cover_path)


def _render_cover_page(
    renderer: PdfReportRenderer,
    form_values: dict[str, Any],
    derived: dict[str, Any],
    texts: dict[str, str],
) -> None:
    renderer.section_title(texts["cover_page"])
    renderer.pdf.setFillColorRGB(0.12, 0.2, 0.34)
    renderer.pdf.setFont("Helvetica", 10)
    renderer.pdf.drawString(LEFT_MARGIN, renderer.y + 4, texts["cover_subtitle"])
    renderer.y -= 16

    risk_assessment = _safe_dict(derived.get("riskAssessment"))
    renderer.key_value(texts["report_title"], texts["report_title"])
    renderer.key_value(texts["household_name"], _household_name(form_values, texts))
    renderer.key_value(texts["persons_count"], str(_person_count(form_values)))
    renderer.key_value(texts["total_project_cost"], _format_currency(derived.get("totalProjectCost"), renderer.locale, texts["na"]))
    renderer.key_value(texts["financing_needed"], _format_currency(derived.get("financingNeeded"), renderer.locale, texts["na"]))
    renderer.key_value(texts["monthly_loan_payment"], _format_currency(derived.get("monthlyLoanPayment"), renderer.locale, texts["na"]))
    renderer.key_value(texts["risk_light"], _risk_light_label(risk_assessment.get("light"), texts))
    renderer.key_value(texts["risk_level"], str(risk_assessment.get("level", texts["na"])))
    renderer.key_value(texts["risk_score"], _format_number(risk_assessment.get("score"), renderer.locale, texts["na"]))


def _render_personal_data_pages(
    renderer: PdfReportRenderer,
    form_values: dict[str, Any],
    texts: dict[str, str],
    field_catalog: dict[str, dict[str, Any]],
    personal_fields_by_person: dict[int, list[str]],
) -> None:
    def render_person_section(person_index: int) -> None:
        renderer.section_title(f"{texts['personal_data']} - {texts['person']} {person_index}")

        field_ids = personal_fields_by_person.get(person_index, [])
        if not field_ids:
            renderer.key_value(texts["notes"], texts["no_personal_fields"])
            return

        has_value = False
        for field_id in field_ids:
            value_text = _format_field_value(field_id, form_values.get(field_id), renderer.locale, texts, field_catalog)
            if value_text != texts["na"]:
                has_value = True
            renderer.key_value(_field_label(field_id, texts, field_catalog), value_text)

        if not has_value:
            renderer.key_value(texts["notes"], texts["no_personal_values"])

    person_count = _person_count(form_values)
    if renderer.variant == "modern":
        render_person_section(1)
        if person_count >= 2:
            render_person_section(2)
        return

    for person_index in range(1, person_count + 1):
        renderer.next_page()
        render_person_section(person_index)


def _render_modern_visual_snapshot(
    renderer: PdfReportRenderer,
    calculation: dict[str, Any],
    derived: dict[str, Any],
    texts: dict[str, str],
    start_on_current_page: bool = False,
) -> None:
    chart_series = _safe_dict(derived.get("chartSeries"))
    timeline = _safe_dict(derived.get("loanBalanceAfterYears"))
    scenario = _safe_dict(calculation.get("scenario"))
    baseline = _safe_dict(scenario.get("baseline"))
    stress = _safe_dict(scenario.get("stress"))

    financing_entries = _extract_chart_entries(
        chart_series.get("financingStructure"),
        [
            (texts["chart_total_equity"], derived.get("totalEquity")),
            (texts["chart_financing_needed"], derived.get("financingNeeded")),
        ],
        texts,
    )
    payment_entries = _extract_chart_entries(
        chart_series.get("paymentComparison"),
        [
            (texts["chart_baseline_monthly_payment"], baseline.get("monthlyPayment")),
            (texts["chart_stress_monthly_payment"], stress.get("monthlyPayment")),
        ],
        texts,
    )
    timeline_entries = _extract_chart_entries(
        chart_series.get("loanBalanceTimeline"),
        [
            (texts["year_5"], timeline.get("5")),
            (texts["year_10"], timeline.get("10")),
            (texts["year_15"], timeline.get("15")),
            (texts["year_20"], timeline.get("20")),
            (texts["year_30"], timeline.get("30")),
        ],
        texts,
    )

    if not start_on_current_page:
        renderer.next_page(role=MODERN_PAGE_ROLE_HEADER)
    renderer.drawing(_build_modern_kpi_cards_drawing(texts, renderer.locale, derived), MODERN_CARD_DRAWING_HEIGHT)
    renderer.drawing(
        _build_bar_chart_drawing(
            texts["chart_financing_structure"],
            financing_entries,
            fill_color=WEB_COLOR_PRIMARY_DARK,
            na=texts["na"],
        ),
        CHART_DRAWING_HEIGHT,
    )
    renderer.drawing(
        _build_bar_chart_drawing(
            texts["chart_payment_comparison"],
            payment_entries,
            fill_color=WEB_COLOR_PRIMARY_MEDIUM,
            na=texts["na"],
        ),
        CHART_DRAWING_HEIGHT,
    )
    renderer.drawing(
        _build_line_chart_drawing(
            texts["chart_loan_balance_timeline"],
            timeline_entries,
            stroke_color=WEB_COLOR_BUTTON_ACTIVE_BORDER,
            na=texts["na"],
        ),
        CHART_DRAWING_HEIGHT,
    )
    renderer.spacer()


def _render_summary(renderer: PdfReportRenderer, derived: dict[str, Any], texts: dict[str, str]) -> None:
    renderer.section_title(texts["summary"])
    renderer.key_value(texts["total_project_cost"], _format_currency(derived.get("totalProjectCost"), renderer.locale, texts["na"]))
    renderer.key_value(texts["total_equity"], _format_currency(derived.get("totalEquity"), renderer.locale, texts["na"]))
    renderer.key_value(texts["financing_needed"], _format_currency(derived.get("financingNeeded"), renderer.locale, texts["na"]))
    renderer.key_value(texts["monthly_loan_payment"], _format_currency(derived.get("monthlyLoanPayment"), renderer.locale, texts["na"]))
    renderer.key_value(texts["total_interest_paid"], _format_currency(derived.get("totalInterestPaid"), renderer.locale, texts["na"]))
    renderer.key_value(texts["affordability_ratio"], _format_percent(derived.get("affordabilityRatio"), renderer.locale, texts["na"]))
    renderer.key_value(
        texts["free_income_after_payment"],
        _format_currency(derived.get("freeIncomeAfterPayment"), renderer.locale, texts["na"]),
    )
    renderer.key_value(
        texts["recommended_max_budget"],
        _format_currency(derived.get("recommendedMaxBudget"), renderer.locale, texts["na"]),
    )
    renderer.key_value(texts["debt_to_income_view"], _format_number(derived.get("debtToIncomeView"), renderer.locale, texts["na"]))
    renderer.spacer()


def _render_charts(
    renderer: PdfReportRenderer,
    calculation: dict[str, Any],
    derived: dict[str, Any],
    texts: dict[str, str],
) -> None:
    chart_series = _safe_dict(derived.get("chartSeries"))
    timeline = _safe_dict(derived.get("loanBalanceAfterYears"))
    scenario = _safe_dict(calculation.get("scenario"))
    baseline = _safe_dict(scenario.get("baseline"))
    stress = _safe_dict(scenario.get("stress"))

    financing_entries = _extract_chart_entries(
        chart_series.get("financingStructure"),
        [
            (texts["chart_total_equity"], derived.get("totalEquity")),
            (texts["chart_financing_needed"], derived.get("financingNeeded")),
        ],
        texts,
    )

    payment_entries = _extract_chart_entries(
        chart_series.get("paymentComparison"),
        [
            (texts["chart_baseline_monthly_payment"], baseline.get("monthlyPayment")),
            (texts["chart_stress_monthly_payment"], stress.get("monthlyPayment")),
        ],
        texts,
    )

    timeline_entries = _extract_chart_entries(
        chart_series.get("loanBalanceTimeline"),
        [
            (texts["year_5"], timeline.get("5")),
            (texts["year_10"], timeline.get("10")),
            (texts["year_15"], timeline.get("15")),
            (texts["year_20"], timeline.get("20")),
            (texts["year_30"], timeline.get("30")),
        ],
        texts,
    )

    renderer.section_title(texts["charts"])
    renderer.drawing(
        _build_bar_chart_drawing(
            texts["chart_financing_structure"],
            financing_entries,
            fill_color="#2563eb",
            na=texts["na"],
        ),
        CHART_DRAWING_HEIGHT,
    )
    renderer.drawing(
        _build_bar_chart_drawing(
            texts["chart_payment_comparison"],
            payment_entries,
            fill_color="#0f766e",
            na=texts["na"],
        ),
        CHART_DRAWING_HEIGHT,
    )
    renderer.drawing(
        _build_line_chart_drawing(
            texts["chart_loan_balance_timeline"],
            timeline_entries,
            stroke_color="#7c3aed",
            na=texts["na"],
        ),
        CHART_DRAWING_HEIGHT,
    )
    renderer.spacer()


def _render_assumptions(
    renderer: PdfReportRenderer,
    form_values: dict[str, Any],
    texts: dict[str, str],
    field_catalog: dict[str, dict[str, Any]],
) -> None:
    renderer.section_title(texts["assumptions"])
    for field_id in ASSUMPTION_FIELDS:
        raw_value = form_values.get(field_id)
        if field_id in {"land_exists", "sale_planned"}:
            if isinstance(raw_value, str):
                normalized = raw_value.strip().lower()
                if normalized in YES_VALUES:
                    value = texts["yes"]
                elif normalized in NO_VALUES:
                    value = texts["no"]
                else:
                    value = str(raw_value)
            else:
                value = _format_bool(raw_value, texts["yes"], texts["no"], texts["na"])
        elif field_id in {
            "monthly_reserve_target",
            "desired_monthly_payment",
            "absolute_max_payment",
            "expected_profit_target",
        }:
            value = _format_currency(raw_value, renderer.locale, texts["na"])
        elif field_id in {"interest_rate", "repayment_rate"}:
            value = _format_percent(raw_value, renderer.locale, texts["na"])
        elif field_id == "fixed_interest_years":
            if isinstance(raw_value, (int, float)):
                value = _format_number(raw_value, renderer.locale, texts["na"])
            else:
                value = str(raw_value) if raw_value not in (None, "") else texts["na"]
        else:
            value = str(raw_value) if raw_value not in (None, "") else texts["na"]

        renderer.key_value(_field_label(field_id, texts, field_catalog), value)

    renderer.spacer()


def _render_risk_and_scenario(
    renderer: PdfReportRenderer,
    calculation: dict[str, Any],
    derived: dict[str, Any],
    texts: dict[str, str],
) -> None:
    renderer.section_title(texts["risk_scenario"])

    risk_assessment = _safe_dict(derived.get("riskAssessment"))
    renderer.key_value(texts["risk_light"], _risk_light_label(risk_assessment.get("light"), texts))
    renderer.key_value(texts["risk_level"], str(risk_assessment.get("level", texts["na"])))
    renderer.key_value(texts["risk_score"], _format_number(risk_assessment.get("score"), renderer.locale, texts["na"]))

    scenario = _safe_dict(calculation.get("scenario"))
    baseline = _safe_dict(scenario.get("baseline"))
    stress = _safe_dict(scenario.get("stress"))

    renderer.key_value(texts["baseline_rate"], _format_percent(baseline.get("annualPercent"), renderer.locale, texts["na"]))
    renderer.key_value(
        texts["baseline_monthly"],
        _format_currency(baseline.get("monthlyPayment"), renderer.locale, texts["na"]),
    )
    renderer.key_value(texts["baseline_total"], _format_currency(baseline.get("totalCost"), renderer.locale, texts["na"]))

    renderer.key_value(texts["stress_rate"], _format_percent(stress.get("annualPercent"), renderer.locale, texts["na"]))
    renderer.key_value(
        texts["stress_monthly"],
        _format_currency(stress.get("monthlyPayment"), renderer.locale, texts["na"]),
    )
    renderer.key_value(texts["stress_total"], _format_currency(stress.get("totalCost"), renderer.locale, texts["na"]))

    sale_scenario = _safe_dict(derived.get("saleScenario"))
    if sale_scenario.get("enabled") and sale_scenario.get("year") is not None:
        renderer.key_value(texts["sale_year"], str(sale_scenario.get("year")))
        renderer.key_value(
            texts["expected_sale_price"],
            _format_currency(sale_scenario.get("expectedSalePrice"), renderer.locale, texts["na"]),
        )
        renderer.key_value(
            texts["remaining_loan"],
            _format_currency(sale_scenario.get("remainingLoanAtSale"), renderer.locale, texts["na"]),
        )
        renderer.key_value(
            texts["gross_proceeds"],
            _format_currency(sale_scenario.get("grossProceeds"), renderer.locale, texts["na"]),
        )
        renderer.key_value(
            texts["target_profit"],
            _format_currency(sale_scenario.get("targetProfit"), renderer.locale, texts["na"]),
        )
        renderer.key_value(
            texts["profit_match"],
            _format_bool(sale_scenario.get("meetsTarget"), texts["yes"], texts["no"], texts["na"]),
        )
    else:
        renderer.key_value(texts["sale_planned"], texts["sale_disabled"])

    hints = derived.get("hints")
    renderer.key_value(texts["hints"], "")
    if isinstance(hints, list) and hints:
        for hint in hints:
            renderer.bullet(_localize_hint(str(hint), renderer.locale))
    else:
        renderer.bullet(texts["no_hints"])

    renderer.spacer()


def _render_timeline(renderer: PdfReportRenderer, derived: dict[str, Any], texts: dict[str, str]) -> None:
    timeline = _safe_dict(derived.get("loanBalanceAfterYears"))
    renderer.section_title(texts["loan_timeline"])
    for year in (5, 10, 15, 20, 30):
        key = str(year)
        renderer.key_value(
            f"{year}",
            _format_currency(timeline.get(key), renderer.locale, texts["na"]),
        )
    renderer.spacer()


def build_report_filename(now: datetime | None = None, variant: str = "classic") -> str:
    moment = now or datetime.now(timezone.utc)
    prefix = "imocalc-report-modern" if variant == "modern" else "imocalc-report"
    return f"{prefix}-{moment.strftime('%Y%m%d-%H%M')}.pdf"


def build_report_pdf(payload: dict[str, Any], variant: str = "classic") -> bytes:
    effective_variant = "modern" if variant == "modern" else "classic"
    locale_raw = payload.get("locale")
    locale = str(locale_raw) if locale_raw in {"de", "en"} else "en"
    texts = _localized_text(locale)

    form_values = _safe_dict(payload.get("formValues"))
    calculation = _safe_dict(payload.get("calculationResult"))
    derived = _safe_dict(payload.get("derivedResult"))
    field_catalog, personal_fields_by_person = _shared_catalog()

    generated_at = datetime.now(timezone.utc)
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4, pageCompression=0)

    if effective_variant == "modern":
        _render_modern_cover_image_page(pdf, locale)
        pdf.showPage()
        renderer = PdfReportRenderer(
            pdf,
            locale=locale,
            generated_at=generated_at,
            variant=effective_variant,
            initial_page_role=MODERN_PAGE_ROLE_PERSON,
        )
        _render_personal_data_pages(renderer, form_values, texts, field_catalog, personal_fields_by_person)
        renderer.next_page(role=MODERN_PAGE_ROLE_HEADER)
        _render_modern_visual_snapshot(renderer, calculation, derived, texts, start_on_current_page=True)
        renderer.next_page(role=MODERN_PAGE_ROLE_GENERIC)
    else:
        renderer = PdfReportRenderer(pdf, locale=locale, generated_at=generated_at, variant=effective_variant)
        _render_cover_page(renderer, form_values, derived, texts)
        _render_personal_data_pages(renderer, form_values, texts, field_catalog, personal_fields_by_person)
        renderer.next_page()

    _render_summary(renderer, derived, texts)
    if effective_variant == "classic":
        _render_charts(renderer, calculation, derived, texts)
    _render_assumptions(renderer, form_values, texts, field_catalog)
    _render_risk_and_scenario(renderer, calculation, derived, texts)
    _render_timeline(renderer, derived, texts)
    renderer.finish()

    return buffer.getvalue()
