import re

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


FILENAME_PATTERN = re.compile(r'imocalc-report-\d{8}-\d{4}\.pdf')
MODERN_FILENAME_PATTERN = re.compile(r'imocalc-report-modern-\d{8}-\d{4}\.pdf')


def _pdf_image_object_count(pdf_bytes: bytes) -> int:
    return pdf_bytes.count(b"/Subtype /Image")


def _assert_privacy_pdf_response(response, expected_filename: str, expected_markers: list[bytes]) -> None:
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")

    content_disposition = response.headers.get("content-disposition", "")
    assert "attachment" in content_disposition
    assert expected_filename in content_disposition

    body = response.content
    assert body.startswith(b"%PDF")
    assert _pdf_image_object_count(body) == 0
    for marker in expected_markers:
        assert marker in body


def _valid_payload(locale: str = "en") -> dict:
    return {
        "locale": locale,
        "formValues": {
            "build_or_buy": "buy",
            "land_exists": "no",
            "persons_count": "2",
            "person_1_first_name": "Max",
            "person_1_last_name": "Mustermann",
            "person_1_birthdate": "1988-04-17",
            "person_1_marital_status": "married",
            "person_1_nationality": "DE",
            "person_1_address_street": "Musterstrasse 1",
            "person_1_address_zip": "10115",
            "person_1_address_city": "Berlin",
            "person_1_phone": "+49170111222",
            "person_1_email": "max@example.com",
            "person_1_employment_status": "employed",
            "person_2_first_name": "Erika",
            "person_2_last_name": "Musterfrau",
            "person_2_birthdate": "1990-08-03",
            "person_2_marital_status": "married",
            "person_2_nationality": "DE",
            "person_2_address_street": "Musterstrasse 1",
            "person_2_address_zip": "10115",
            "person_2_address_city": "Berlin",
            "person_2_phone": "+49170111333",
            "person_2_email": "erika@example.com",
            "person_2_employment_status": "self_employed",
            "monthly_reserve_target": 700,
            "desired_monthly_payment": 1600,
            "absolute_max_payment": 2200,
            "interest_rate": 3.2,
            "repayment_rate": 2.0,
            "fixed_interest_years": 15,
            "sale_planned": "yes",
            "sale_year": 15,
            "expected_profit_target": 45000,
        },
        "calculationResult": {
            "costs": {
                "loanAmount": 320000,
                "totalInterest": 182000,
                "totalCost": 502000,
            },
            "rate": {
                "annualPercent": 3.2,
                "monthlyPayment": 1690,
            },
            "risk": {
                "score": 62,
                "level": "medium",
            },
            "scenario": {
                "baseline": {
                    "annualPercent": 3.2,
                    "monthlyPayment": 1690,
                    "totalCost": 502000,
                },
                "stress": {
                    "annualPercent": 4.2,
                    "monthlyPayment": 1925,
                    "totalCost": 577500,
                },
            },
        },
        "derivedResult": {
            "totalProjectCost": 410000,
            "totalEquity": 90000,
            "financingNeeded": 320000,
            "monthlyLoanPayment": 1690,
            "affordabilityRatio": 31.2,
            "freeIncomeAfterPayment": 980,
            "recommendedMaxBudget": 450000,
            "debtToIncomeView": 4.8,
            "loanBalanceAfterYears": {
                "5": 287000,
                "10": 246000,
                "15": 197000,
                "20": 139000,
                "30": 0,
            },
            "totalInterestPaid": 182000,
            "saleScenario": {
                "enabled": True,
                "year": 15,
                "expectedSalePrice": 516000,
                "remainingLoanAtSale": 197000,
                "grossProceeds": 319000,
                "targetProfit": 45000,
                "meetsTarget": True,
            },
            "riskAssessment": {
                "light": "yellow",
                "level": "medium",
                "score": 62,
            },
            "hints": [
                "Project is only affordable with high risk.",
                "Equity is low relative to total project cost.",
            ],
        },
    }


def test_report_pdf_returns_downloadable_pdf() -> None:
    response = client.post("/report/pdf", json=_valid_payload())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")

    content_disposition = response.headers.get("content-disposition", "")
    assert "attachment" in content_disposition

    filename_match = FILENAME_PATTERN.search(content_disposition)
    assert filename_match is not None

    body = response.content
    assert body.startswith(b"%PDF")
    assert b"ImoCalc" in body
    assert b"Cover Page" in body
    assert b"Personal Data - Person 1" in body
    assert b"Personal Data - Person 2" in body
    assert b"Summary" in body
    assert b"Charts" in body
    assert b"Financing Structure" in body
    assert b"Baseline vs Stress Monthly Payment" in body
    assert b"Loan Balance Timeline" in body
    assert b"Assumptions" in body
    assert b"Risk and Scenario" in body


def test_privacy_pdf_returns_downloadable_english_pdf() -> None:
    response = client.get("/privacy/pdf?locale=en")

    _assert_privacy_pdf_response(
        response,
        "imocalc-privacy-policy.pdf",
        [b"Privacy Policy", b"Hetzner Online GmbH", b"ImoCalc does not set cookies"],
    )


def test_privacy_pdf_returns_downloadable_german_pdf() -> None:
    response = client.get("/privacy/pdf?locale=de")

    _assert_privacy_pdf_response(
        response,
        "imocalc-datenschutz.pdf",
        [b"Datenschutzerklaerung", b"Hetzner Online GmbH", b"ImoCalc setzt keine Cookies"],
    )


def test_privacy_pdf_invalid_locale_falls_back_to_english() -> None:
    response = client.get("/privacy/pdf?locale=fr")

    _assert_privacy_pdf_response(
        response,
        "imocalc-privacy-policy.pdf",
        [b"Privacy Policy", b"User rights"],
    )


def test_report_pdf_supports_german_locale() -> None:
    response = client.post("/report/pdf", json=_valid_payload(locale="de"))

    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")
    assert b"Finanzierungsreport" in response.content
    assert b"Deckblatt" in response.content
    assert b"Personendaten - Person 1" in response.content
    assert b"Uebersicht" in response.content
    assert b"Grafiken" in response.content
    assert b"Finanzierungsstruktur" in response.content
    assert b"tragfaehig" in response.content


def test_report_pdf_supports_modern_variant() -> None:
    response = client.post("/report/pdf?variant=modern", json=_valid_payload())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")

    content_disposition = response.headers.get("content-disposition", "")
    assert "attachment" in content_disposition
    assert MODERN_FILENAME_PATTERN.search(content_disposition) is not None

    body = response.content
    assert body.startswith(b"%PDF")
    assert b"Cover Page" not in body
    assert b"Deckblatt" not in body
    assert b"Graphical Dashboard Snapshot" in body
    assert b"Personal Data - Person 1" in body
    assert b"Personal Data - Person 2" in body
    assert body.index(b"Personal Data - Person 1") < body.index(b"Graphical Dashboard Snapshot")
    assert b"Personal Data - Person 3" not in body
    assert b"Personal Data - Person 4" not in body
    assert _pdf_image_object_count(body) >= 4


def test_report_pdf_supports_modern_variant_for_german_locale() -> None:
    response = client.post("/report/pdf?variant=modern", json=_valid_payload(locale="de"))

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")

    content_disposition = response.headers.get("content-disposition", "")
    assert "attachment" in content_disposition
    assert MODERN_FILENAME_PATTERN.search(content_disposition) is not None

    body = response.content
    assert body.startswith(b"%PDF")
    assert b"Deckblatt" not in body
    assert b"Cover Page" not in body
    assert b"Grafisches Dashboard" in body
    assert b"Personendaten - Person 1" in body
    assert b"Personendaten - Person 2" in body
    assert body.index(b"Personendaten - Person 1") < body.index(b"Grafisches Dashboard")
    assert b"Personendaten - Person 3" not in body
    assert b"Personendaten - Person 4" not in body
    assert _pdf_image_object_count(body) >= 4


def test_report_pdf_returns_422_for_invalid_payload() -> None:
    invalid_payload = {
        "locale": "en",
        "formValues": {},
        "calculationResult": {},
    }

    response = client.post("/report/pdf", json=invalid_payload)

    assert response.status_code == 422
    body = response.json()
    assert body["valid"] is False
    assert any(item["code"] == "required" for item in body["errors"])
