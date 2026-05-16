# Testing

BlobFin has frontend unit tests and Python-driven project test suites.

## Frontend Tests

Run from `frontend`:

```sh
npm run test
```

Current frontend tests live under:

```text
frontend/src/tests
```

They cover focused calculation behavior such as reserve and investment calculations.

## Full Project Test Command

Run from the repository root:

```sh
python tools/control.py --test --suite all
```

Individual suites:

```sh
python tools/control.py --test --suite schema
python tools/control.py --test --suite api
python tools/control.py --test --suite frontend
python tools/control.py --test --suite e2e
```

## Reports

Generate a Markdown report under `.report`:

```sh
python tools/control.py --test --suite all --report md
```

Remove generated reports:

```sh
python tools/control.py --test --report done
```

## What To Test When Changing Code

- Reserve calculation changes: run frontend tests and add tests in `reserveCalculator.test.ts`.
- Investment projection changes: run frontend tests and add tests around the changed asset or contribution logic.
- Storage changes: test migration/default behavior for missing fields and legacy values.
- Backend endpoint changes: run the `api` suite.
- Schema changes: run the `schema` suite and update examples.
- UI-only template/style changes: run frontend build; use browser verification for layout and interactions.
