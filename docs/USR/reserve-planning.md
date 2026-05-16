<!-- AUTO-GENERATED:backlink START -->
[← Back](USR.md)
<!-- AUTO-GENERATED:backlink END -->
# Reserve Planning

The `Kosten- und Ruecklagenpositionen` table is the base for the yearly planning view and for investable contributions.

## Position Fields

- `Aktiv`: includes the position in calculations.
- `View`: shows the position as a column in the yearly table when the position is active and not one-time.
- `Name`: user-facing label.
- `Art`: position type.
- `Betrag`: amount for the position.
- `Start` / `Ende`: active month range for recurring positions.
- `Abgangsjahr`: replaces `Start` and `Ende` for one-time payouts.
- `Abgang`: payout cadence.
- `Abgangsmonat`: month for yearly or one-time payouts.
- `Tag`: day used for simplified interest timing.
- `Zinsen`: enables account interest for this position.
- `Cashback`: enables cashback where allowed.

The handle at the left side of a row can be used to reorder positions. The order is reflected in the input table and yearly table.

## Position Types

- `Fixbestand`: a fixed balance or baseline amount. It is not treated as a planned outflow.
- `Ruecklage`: money built up for future costs.
- `Temporar`: active expense or temporary cost position.
- `Sparrate`: savings position. Only this type can be selected for the investment projection.

## Payout Cadence

- `Kein Abgang`: position is accumulated or shown without a scheduled payout.
- `Monatlich`: amount is considered every active month.
- `Jaehrlich`: amount is considered in the configured payout month.
- `Einmalig`: amount is considered only once in the configured payout year and payout month.

For one-time payouts, `Start` and `Ende` are replaced by `Abgangsjahr`. One-time rows do not appear as yearly table columns. They can still be used for cashback when the row is a temporary position with cashback enabled.

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
- planned monthly outflow,
- remaining amount after planned outflow,
- monthly interest,
- monthly cashback,
- yearly totals.

Inactive rows are ignored in calculations. Rows with `View` disabled still calculate, but they do not appear as yearly table columns.
