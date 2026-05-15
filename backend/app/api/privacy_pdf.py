from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

from app.services.privacy_policy import build_privacy_policy_filename, build_privacy_policy_pdf

router = APIRouter()


@router.get("/privacy/pdf")
def export_privacy_policy_pdf(locale: str = "en"):
    pdf_bytes = build_privacy_policy_pdf(locale)
    filename = build_privacy_policy_filename(locale)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
