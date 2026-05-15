from fastapi import APIRouter

from .calculate import router as calculate_router
from .health import router as health_router
from .privacy_pdf import router as privacy_pdf_router
from .report_pdf import router as report_pdf_router
from .validate import router as validate_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(validate_router)
api_router.include_router(calculate_router)
api_router.include_router(report_pdf_router)
api_router.include_router(privacy_pdf_router)
