from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_calculate_returns_deterministic_structure() -> None:
    payload = {"propertyPrice": 450000, "equity": 90000, "interestRate": 3.2}

    response_one = client.post("/calculate", json=payload)
    response_two = client.post("/calculate", json=payload)

    assert response_one.status_code == 200
    assert response_two.status_code == 200
    assert response_one.json() == response_two.json()

    body = response_one.json()
    assert set(body.keys()) == {"costs", "rate", "risk", "scenario"}
    assert set(body["costs"].keys()) >= {"loanAmount", "totalInterest", "totalCost"}
    assert set(body["rate"].keys()) >= {"annualPercent", "monthlyPayment"}
    assert set(body["risk"].keys()) >= {"score", "level"}
    assert set(body["scenario"].keys()) >= {"baseline", "stress"}


def test_calculate_monthly_payment_changes_when_repayment_rate_changes() -> None:
    baseline_payload = {"propertyPrice": 450000, "equity": 150000, "interestRate": 1.0}
    with_repayment_payload = {
        "propertyPrice": 450000,
        "equity": 150000,
        "interestRate": 1.0,
        "repaymentRate": 3.0,
    }

    baseline_response = client.post("/calculate", json=baseline_payload)
    with_repayment_response = client.post("/calculate", json=with_repayment_payload)

    assert baseline_response.status_code == 200
    assert with_repayment_response.status_code == 200

    baseline_monthly_payment = baseline_response.json()["rate"]["monthlyPayment"]
    with_repayment_monthly_payment = with_repayment_response.json()["rate"]["monthlyPayment"]

    assert baseline_monthly_payment != with_repayment_monthly_payment


def test_calculate_without_repayment_rate_remains_compatible() -> None:
    payload = {"propertyPrice": 450000, "equity": 90000, "interestRate": 3.2}
    response = client.post("/calculate", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"costs", "rate", "risk", "scenario"}


def test_calculate_rejects_zero_repayment_rate() -> None:
    payload = {"propertyPrice": 450000, "equity": 90000, "interestRate": 3.2, "repaymentRate": 0}
    response = client.post("/calculate", json=payload)

    assert response.status_code == 422
    body = response.json()
    assert body["valid"] is False
    assert any(item["field"] == "repaymentRate" and item["code"] == "below_minimum" for item in body["errors"])


def test_calculate_returns_422_for_invalid_payload() -> None:
    payload = {"propertyPrice": 450000, "equity": 90000}
    response = client.post("/calculate", json=payload)
    assert response.status_code == 422

    body = response.json()
    assert body["valid"] is False
    assert any(item["code"] == "required_for_financing" for item in body["errors"])
