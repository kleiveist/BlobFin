<!-- AUTO-GENERATED:backlink START -->
[← Back](usr.md)
<!-- AUTO-GENERATED:backlink END -->
# Getting Started

BlobFin runs locally in the browser. The app stores planning data in the browser's `localStorage`; no account is required for the current frontend workflow.

## Start The App

From the repository root:

```sh
python tools/control.py --run
```

Open:

```text
http://127.0.0.1:5173
```

If only the frontend is needed, run this from `frontend`:

```sh
npm run dev
```

## Screen Areas

- `Grunddaten`: base assumptions for the planning year.
- Result cards: yearly reserve and cashflow totals.
- `Kosten- und Ruecklagenpositionen`: editable input table for all planning positions.
- `Jahrestabelle`: month-by-month output table.
- `Investment- und Auszahlungsplanung`: investment selection, assumptions, chart, and statistics.

## Basic Inputs

- `Jahr`: calendar year used for month lengths and one-time payout matching.
- Income, expenses, reserves, and savings rates are maintained in the `Einnahmen`, `Ausgaben`, `Ruecklagen`, and `Sparen` tables inside `Kosten- und Ruecklagenpositionen`.
- `Jahreszins Konto in %`: account interest rate for positions with the `Zinsen` checkbox enabled.
- `Cashback in %`: cashback rate for temporary positions with the `Cashback` checkbox enabled.
- `Enddatum`: global planning end point used by investment, withdrawal, and combined wealth projections.

## Automatic Saving

Changes are saved automatically in the browser. Reloading the page keeps the last saved state on the same browser profile.

Use `Grunddaten zuruecksetzen` to restore defaults. This writes the default state back to local storage.
