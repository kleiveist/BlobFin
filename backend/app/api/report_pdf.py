from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse, Response

from app.services.pdf_report import build_report_filename, build_report_pdf
from app.services.validation import validate_report_payload

router = APIRouter()


@router.post("/report/pdf")
def export_pdf_report(
    payload: Any = Body(...),
    variant: Literal["classic", "modern"] = "classic",
):
    errors = validate_report_payload(payload)
    if errors:
        return JSONResponse(status_code=422, content={"valid": False, "errors": errors})

    assert isinstance(payload, dict)
    pdf_bytes = build_report_pdf(payload, variant=variant)
    filename = build_report_filename(variant=variant)

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
    }

    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
