# Backend

The backend is a FastAPI application under `backend/app`.

## Stack

Dependencies are listed in `backend/requirements.txt`:

- FastAPI,
- Uvicorn,
- Pytest,
- HTTPX,
- jsonschema,
- ReportLab.

## App Entry

`backend/app/main.py` creates the FastAPI app, configures CORS for the local Vite frontend, and includes the API router.

Current app metadata still uses inherited naming:

- title: `ImoCalc Backend`,
- version: `0.1.0`.

## Routes

Routes are composed in `backend/app/api/router.py`.

Available endpoints:

- `GET /health`: health response.
- `POST /validate`: validate a payload against the shared input schema and domain validation rules.
- `POST /calculate`: validate and calculate a financing result.
- `POST /report/pdf?variant=classic|modern`: generate a PDF report from a report payload.
- `GET /privacy/pdf?locale=en|de`: generate a privacy policy PDF.

## Services

- `backend/app/services/validation.py`: JSON Schema and domain validation.
- `backend/app/services/calculation.py`: financing calculation service.
- `backend/app/services/pdf_report.py`: ReportLab report PDF generation.
- `backend/app/services/privacy_policy.py`: privacy policy PDF generation.
- `backend/app/core/shared_paths.py`: path helpers for shared schemas, examples, legal data, and assets.

## Shared Schemas

The active backend validation schema is:

```text
shared/schema/input.schema.json
```

It currently describes a legacy financing payload with fields such as `propertyPrice`, `equity`, `interestRate`, and `repaymentRate`.

Report PDF validation uses:

```text
shared/schema/report.schema.json
```

## Development Notes

The current frontend reserve/investment state is not yet represented by these backend schemas. If a future task adds backend persistence or server-side BlobFin calculations, add new explicit schemas rather than silently reusing the legacy financing schema.
