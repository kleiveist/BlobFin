from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SHARED_DIR = REPO_ROOT / "shared"
SCHEMA_PATH = SHARED_DIR / "schema" / "input.schema.json"
REPORT_SCHEMA_PATH = SHARED_DIR / "schema" / "report.schema.json"
QUESTION_FLOW_PATH = SHARED_DIR / "question-flow.json"
PRIVACY_POLICY_PATH = SHARED_DIR / "legal" / "privacy-policy.json"
FRONTEND_PDF_EXPORT_ASSETS_DIR = REPO_ROOT / "frontend" / "src" / "assets" / "pdf-export"
