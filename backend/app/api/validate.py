from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse

from app.services.validation import validate_payload

router = APIRouter()


@router.post("/validate")
def validate_request(payload: Any = Body(...)):
    errors = validate_payload(payload)
    if errors:
        return JSONResponse(status_code=422, content={"valid": False, "errors": errors})
    return {"valid": True, "errors": []}
