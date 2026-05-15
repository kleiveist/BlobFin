from __future__ import annotations

import subprocess

from tools import control
from tools.inst import report


def _payload() -> dict[str, object]:
    return {
        "command": "python tools/control.py --test --suite schema --report",
        "suite_selection": "schema",
        "expanded_suites": ["schema"],
        "no_start": False,
        "overall": "OK",
        "bootstrap": {
            "name": "service-bootstrap",
            "status": "SKIP",
            "message": "not required",
            "duration_seconds": 0.0,
        },
        "results": [
            {
                "name": "schema",
                "status": "OK",
                "message": "schema examples validated",
                "duration_seconds": 0.1,
                "command": None,
                "cwd": None,
                "exit_code": None,
                "stdout": "full stdout content",
                "stderr": "full stderr content",
                "stdout_tail": "",
                "stderr_tail": "",
                "detail": "Schema examples",
            }
        ],
    }


def test_bare_test_alias_opens_suite_help() -> None:
    assert control._normalize_argv(["--test"]) == ["test", "--suite-help"]


def test_test_alias_with_suite_runs_requested_suite() -> None:
    assert control._normalize_argv(["--test", "--suite", "schema"]) == [
        "test",
        "--suite",
        "schema",
    ]


def test_all_suite_includes_frontend_npm_test() -> None:
    from tools.inst import run_test

    assert run_test._expand_suites("all") == ["schema", "api", "frontend", "e2e"]


def test_e2e_bootstrap_runs_cleanup_before_service_start(monkeypatch) -> None:
    from tools.inst import run_test

    calls: list[tuple[str, object]] = []

    def fake_cleanup(args) -> int:
        calls.append(("cleanup", (args.frontend_port, args.backend_port, args.tracked_only)))
        return 0

    def fake_run(cmd: list[str], cwd=None) -> subprocess.CompletedProcess[str]:
        calls.append(("run", cmd))
        return subprocess.CompletedProcess(cmd, 0, stdout="Services started", stderr="")

    monkeypatch.setattr(run_test.service_cleanup, "main", fake_cleanup)
    monkeypatch.setattr(run_test, "_run", fake_run)

    started_by_runner, bootstrap = run_test._start_services_if_needed(["e2e"], no_start=False)

    assert started_by_runner is True
    assert bootstrap.status == "OK"
    assert bootstrap.message == "services started by test runner"
    assert calls == [
        ("cleanup", (5173, 8000, False)),
        ("run", [run_test.sys.executable, str(run_test.ROOT / "tools" / "control.py"), "run", "--detach"]),
    ]


def test_e2e_bootstrap_cleanup_failure_skips_service_start(monkeypatch) -> None:
    from tools.inst import run_test

    def fake_run(cmd: list[str], cwd=None) -> subprocess.CompletedProcess[str]:
        raise AssertionError(f"service start should not run after cleanup failure: {cmd}")

    monkeypatch.setattr(run_test.service_cleanup, "main", lambda args: 1)
    monkeypatch.setattr(run_test, "_run", fake_run)

    started_by_runner, bootstrap = run_test._start_services_if_needed(["e2e"], no_start=False)

    assert started_by_runner is False
    assert bootstrap.status == "FAIL"
    assert bootstrap.message == "cleanup failed before e2e service bootstrap"
    assert bootstrap.exit_code == 1


def test_e2e_bootstrap_no_start_skips_cleanup(monkeypatch) -> None:
    from tools.inst import run_test

    monkeypatch.setattr(
        run_test.service_cleanup,
        "main",
        lambda args: (_ for _ in ()).throw(AssertionError("cleanup should not run with --no-start")),
    )
    monkeypatch.setattr(
        run_test,
        "_run",
        lambda cmd, cwd=None: (_ for _ in ()).throw(AssertionError("service start should not run")),
    )

    started_by_runner, bootstrap = run_test._start_services_if_needed(["e2e"], no_start=True)

    assert started_by_runner is False
    assert bootstrap.status == "SKIP"
    assert bootstrap.message == "disabled by --no-start"


def test_all_suite_e2e_bootstrap_runs_cleanup(monkeypatch) -> None:
    from tools.inst import run_test

    cleanup_calls = 0

    def fake_cleanup(args) -> int:
        nonlocal cleanup_calls
        cleanup_calls += 1
        return 0

    def fake_run(cmd: list[str], cwd=None) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(cmd, 0, stdout="Services started", stderr="")

    monkeypatch.setattr(run_test.service_cleanup, "main", fake_cleanup)
    monkeypatch.setattr(run_test, "_run", fake_run)

    started_by_runner, bootstrap = run_test._start_services_if_needed(
        ["schema", "api", "frontend", "e2e"],
        no_start=False,
    )

    assert started_by_runner is True
    assert bootstrap.status == "OK"
    assert cleanup_calls == 1


def test_report_writer_creates_markdown_and_json(tmp_path) -> None:
    paths = report.write_test_report(tmp_path, _payload(), "all")

    assert len(paths) == 2
    assert {path.suffix for path in paths} == {".md", ".json"}
    assert all(path.parent == tmp_path / ".report" for path in paths)
    markdown = next(path for path in paths if path.suffix == ".md").read_text(encoding="utf-8")
    json_report = next(path for path in paths if path.suffix == ".json").read_text(encoding="utf-8")

    assert "ImoCalc Test Report" in markdown
    assert "full stdout content" in markdown
    assert "full stderr content" in markdown
    assert '"stdout": "full stdout content"' in json_report
    assert '"stderr": "full stderr content"' in json_report


def test_report_cleanup_removes_report_directory(tmp_path) -> None:
    report.write_test_report(tmp_path, _payload(), "md")

    assert report.clean_reports(tmp_path) is True
    assert not (tmp_path / ".report").exists()
    assert report.clean_reports(tmp_path) is False
