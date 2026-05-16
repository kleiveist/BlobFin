<!-- AUTO-GENERATED:backlink START -->
[← Back](USR.md)
<!-- AUTO-GENERATED:backlink END -->
# Reserve Planning

The `Kosten- und Ruecklagenpositionen` table is the base for the yearly planning view and for investable contributions. It can be switched between `Einnahmen` and `Ausgaben`.

## Position Fields

- `Aktiv`: includes the position in calculations.
- `View`: shows the position as a column in the yearly table when the position is active and not one-time.
- `Name`: user-facing label.
- `Art`: position type.
- `Betrag`: amount for the position.
- `Start` / `Ende`: active month range for recurring positions.
- `Jahr`: start or matching year for income rows.
- `Abgang` / `Eingang`: payout or income cadence.
- `Abgangsmonat` / `Eingangsmonat`: month for yearly or one-time rows.
- `Tag`: day used for simplified interest timing.
- `Zinsen`: enables account interest for expense positions.
- `Cashback`: enables cashback where allowed for expense positions.

The handle at the left side of a row can be used to reorder positions. The order is reflected in the input table and yearly table.

## Position Types

Income rows:

- `Monatliches Einkommen`: recurring monthly income from the configured year onward.
- `Jaehrliche Einnahme`: recurring yearly income such as a tax refund.
- `Temporaere Einnahme`: income source limited to the configured year and active month range.

Expense rows:

- `Fixbestand`: a fixed balance or baseline amount. It is not treated as a planned outflow.
- `Ruecklage`: money built up for future costs.
- `Temporar`: active expense or temporary cost position.
- `Sparrate`: savings position. Only this type can be selected for the investment projection.

## Payout Cadence

- `Kein Abgang`: expense position is accumulated or shown without a scheduled payout.
- `Monatlich`: amount is considered every active month.
- `Jaehrlich`: amount is considered in the configured payout month.
- `Einmalig`: amount is considered only once in the configured year and month.

For one-time expense payouts, `Start` and `Ende` are replaced by `Abgangsjahr`. For one-time income rows, `Start` and `Ende` are disabled and the `Jahr` field decides the matching year. One-time rows do not appear as yearly table columns. They can still be used for cashback when the row is a temporary expense position with cashback enabled.

## Interest

Interest is only calculated for positions with `Zinsen` enabled. One-time positions do not earn account interest.

The yearly interest result can be transferred into the investment plan with the `Zinsen in Altersvorsorge` toggle in the investment section.

## Cashback

Cashback is only valid for `Temporar` positions with `Cashback` enabled.

- Monthly payout creates monthly cashback.
- Yearly payout creates cashback in the payout month.
- One-time payout creates cashback once in the configured payout year and month.

The yearly cashback result can be transferred into the investment plan with the `Cashback in Altersvorsorge` toggle.

## Yearly Table

The yearly table shows:

- visible active positions as monthly columns,
- planned monthly income,
- planned monthly outflow,
- remaining amount after income and outflow,
- monthly interest,
- monthly cashback,
- yearly totals.

Inactive rows are ignored in calculations. Rows with `View` disabled still calculate, but they do not appear as yearly table columns.
