from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_validate_returns_valid_true_for_valid_payload() -> None:
    payload = {"propertyPrice": 450000, "equity": 90000, "interestRate": 3.2}
    response = client.post("/validate", json=payload)
    assert response.status_code == 200
    assert response.json() == {"valid": True, "errors": []}


def test_validate_accepts_optional_repayment_rate() -> None:
    payload = {"propertyPrice": 450000, "equity": 90000, "interestRate": 3.2, "repaymentRate": 2.0}
    response = client.post("/validate", json=payload)

    assert response.status_code == 200
    assert response.json() == {"valid": True, "errors": []}


def test_validate_rejects_zero_repayment_rate() -> None:
    payload = {"propertyPrice": 450000, "equity": 90000, "interestRate": 3.2, "repaymentRate": 0}
    response = client.post("/validate", json=payload)

    assert response.status_code == 422
    errors = response.json()["errors"]
    assert any(item["field"] == "repaymentRate" and item["code"] == "below_minimum" for item in errors)


def test_validate_returns_422_for_schema_errors() -> None:
    payload = {"propertyPrice": -5, "equity": "invalid"}
    response = client.post("/validate", json=payload)
    assert response.status_code == 422

    body = response.json()
    assert body["valid"] is False
    assert isinstance(body["errors"], list)
    assert len(body["errors"]) >= 1
    assert all("field" in err and "code" in err and "message" in err for err in body["errors"])


def test_validate_returns_422_for_domain_rules() -> None:
    payload = {"propertyPrice": 300000, "equity": 400000}
    response = client.post("/validate", json=payload)
    assert response.status_code == 422

    errors = response.json()["errors"]
    codes = {item["code"] for item in errors}
    assert "equity_exceeds_property_price" in codes
