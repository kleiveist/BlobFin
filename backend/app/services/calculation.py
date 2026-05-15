from __future__ import annotations

from typing import Any

TERM_MONTHS = 360
STRESS_RATE_OFFSET = 1.0


def _round_money(value: float) -> float:
    return round(value + 1e-9, 2)


def _round_value(value: float, digits: int = 2) -> float:
    return round(value + 1e-9, digits)


def _monthly_payment(principal: float, annual_percent: float, term_months: int) -> float:
    if principal <= 0:
        return 0.0
    monthly_rate = (annual_percent / 100.0) / 12.0
    if monthly_rate == 0:
        return principal / term_months

    factor = (1 + monthly_rate) ** term_months
    return principal * monthly_rate * factor / (factor - 1)


def _monthly_payment_with_repayment_rate(principal: float, annual_percent: float, repayment_percent: float) -> float:
    if principal <= 0:
        return 0.0
    return principal * ((annual_percent + repayment_percent) / 100.0) / 12.0


def _risk_level(score: float) -> str:
    if score < 33:
        return "low"
    if score < 66:
        return "medium"
    return "high"


def calculate_result(payload: dict[str, Any]) -> dict[str, Any]:
    property_price = float(payload["propertyPrice"])
    equity = float(payload["equity"])
    interest_rate = float(payload.get("interestRate", 0.0))
    repayment_rate = payload.get("repaymentRate")
    repayment_rate_value = float(repayment_rate) if repayment_rate is not None else None

    loan_amount = max(property_price - equity, 0.0)

    if repayment_rate_value is None:
        baseline_payment = _monthly_payment(loan_amount, interest_rate, TERM_MONTHS)
    else:
        baseline_payment = _monthly_payment_with_repayment_rate(loan_amount, interest_rate, repayment_rate_value)
    baseline_total_cost = baseline_payment * TERM_MONTHS
    baseline_total_interest = max(baseline_total_cost - loan_amount, 0.0)

    stress_interest_rate = interest_rate + STRESS_RATE_OFFSET
    if repayment_rate_value is None:
        stress_payment = _monthly_payment(loan_amount, stress_interest_rate, TERM_MONTHS)
    else:
        stress_payment = _monthly_payment_with_repayment_rate(
            loan_amount,
            stress_interest_rate,
            repayment_rate_value,
        )
    stress_total_cost = stress_payment * TERM_MONTHS

    loan_to_value = 0.0 if property_price == 0 else loan_amount / property_price
    risk_score = _round_value(min(100.0, max(0.0, (loan_to_value * 70.0) + (interest_rate * 3.0))))

    return {
        "costs": {
            "loanAmount": _round_money(loan_amount),
            "totalInterest": _round_money(baseline_total_interest),
            "totalCost": _round_money(baseline_total_cost),
        },
        "rate": {
            "annualPercent": _round_value(interest_rate),
            "monthlyPayment": _round_money(baseline_payment),
        },
        "risk": {
            "score": risk_score,
            "level": _risk_level(risk_score),
        },
        "scenario": {
            "baseline": {
                "annualPercent": _round_value(interest_rate),
                "monthlyPayment": _round_money(baseline_payment),
                "totalCost": _round_money(baseline_total_cost),
            },
            "stress": {
                "annualPercent": _round_value(stress_interest_rate),
                "monthlyPayment": _round_money(stress_payment),
                "totalCost": _round_money(stress_total_cost),
            },
        },
    }
