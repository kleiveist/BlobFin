from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from app.core.shared_paths import REPORT_SCHEMA_PATH, SCHEMA_PATH


@dataclass(slots=True)
class ValidationIssue:
    field: str
    code: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return {"field": self.field, "code": self.code, "message": self.message}


@lru_cache(maxsize=16)
def _validator_for_schema(schema_path: str, schema_mtime_ns: int, schema_size: int) -> Draft202012Validator:
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    return Draft202012Validator(schema)


def _schema_cache_fingerprint(schema_path: Path) -> tuple[int, int]:
    stat = schema_path.stat()
    return stat.st_mtime_ns, stat.st_size


def _extract_missing_property(message: str) -> str | None:
    if "'" not in message:
        return None
    parts = message.split("'")
    if len(parts) < 2:
        return None
    return parts[1]


def _field_from_schema_error(error: Any) -> str:
    if error.path:
        return ".".join(str(part) for part in error.path)
    if error.validator == "required":
        missing = _extract_missing_property(error.message)
        if missing:
            return missing
    return "$"


def _map_error_code(error: Any) -> str:
    mapping = {
        "required": "required",
        "type": "type_mismatch",
        "minimum": "below_minimum",
        "exclusiveMinimum": "below_minimum",
        "maximum": "above_maximum",
        "additionalProperties": "additional_property",
    }
    return mapping.get(error.validator, "invalid")


def _schema_issues(payload: dict[str, Any], schema_path: Path) -> list[ValidationIssue]:
    schema_mtime_ns, schema_size = _schema_cache_fingerprint(schema_path)
    errors = sorted(
        _validator_for_schema(str(schema_path), schema_mtime_ns, schema_size).iter_errors(payload),
        key=lambda item: (_field_from_schema_error(item), item.message),
    )
    issues: list[ValidationIssue] = []
    for error in errors:
        field = _field_from_schema_error(error)
        message = error.message
        if error.validator == "exclusiveMinimum" and field == "repaymentRate":
            message = "repaymentRate must be greater than 0."
        issues.append(
            ValidationIssue(
                field=field,
                code=_map_error_code(error),
                message=message,
            )
        )
    return issues


def _domain_issues(payload: dict[str, Any]) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    property_price = payload.get("propertyPrice")
    equity = payload.get("equity")
    interest_rate_exists = "interestRate" in payload

    if isinstance(property_price, (int, float)) and isinstance(equity, (int, float)):
        property_price_num = float(property_price)
        equity_num = float(equity)
        if equity_num > property_price_num:
            issues.append(
                ValidationIssue(
                    field="equity",
                    code="equity_exceeds_property_price",
                    message="equity must be less than or equal to propertyPrice.",
                )
            )
        if equity_num < property_price_num and not interest_rate_exists:
            issues.append(
                ValidationIssue(
                    field="interestRate",
                    code="required_for_financing",
                    message="interestRate is required when equity is less than propertyPrice.",
                )
            )
    return issues


def _validate_payload_against_schema(
    payload: Any,
    schema_path: Path,
    with_domain_rules: bool,
) -> list[dict[str, str]]:
    if not isinstance(payload, dict):
        return [
            ValidationIssue(
                field="$",
                code="type_mismatch",
                message="Payload must be a JSON object.",
            ).to_dict()
        ]

    try:
        schema_issues = _schema_issues(payload, schema_path)
    except FileNotFoundError:
        return [
            ValidationIssue(
                field="$",
                code="schema_not_found",
                message=f"Schema file not found: {schema_path}",
            ).to_dict()
        ]
    except json.JSONDecodeError as exc:
        return [
            ValidationIssue(
                field="$",
                code="schema_parse_error",
                message=f"Schema parsing failed: {exc}",
            ).to_dict()
        ]

    domain_issues = _domain_issues(payload) if with_domain_rules else []
    all_issues = schema_issues + domain_issues
    all_issues.sort(key=lambda issue: (issue.field, issue.code, issue.message))
    return [issue.to_dict() for issue in all_issues]


def validate_payload(payload: Any) -> list[dict[str, str]]:
    return _validate_payload_against_schema(payload, SCHEMA_PATH, with_domain_rules=True)


def validate_report_payload(payload: Any) -> list[dict[str, str]]:
    return _validate_payload_against_schema(payload, REPORT_SCHEMA_PATH, with_domain_rules=False)
