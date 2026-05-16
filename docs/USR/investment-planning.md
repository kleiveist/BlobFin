<!-- AUTO-GENERATED:backlink START -->
[← Back](USR.md)
<!-- AUTO-GENERATED:backlink END -->
# Investment Planning

The `Investment- und Auszahlungsplanung` section projects selected savings into an asset development chart and payout statistics.

## Investable Positions

Only positions with `Art = Sparrate` appear under `Investierbare Positionen`.

Recurring savings positions contribute to the regular annual savings rate. One-time savings positions are handled differently:

- they can be selected as investable positions,
- they are added once in their configured payout year and month,
- they do not increase the displayed recurring `Jaehrliche Sparrate`.

Two additional investment toggles can be enabled:

- `Zinsen in Altersvorsorge`: invests yearly account interest from the yearly table.
- `Cashback in Altersvorsorge`: invests yearly cashback from the yearly table.

## Age And Timeline Fields

- `Geburtsjahr`: used with the planning year to calculate today's age.
- `Startalter Grafik`: first age shown in the chart.
- `Rentenalter`: derived from payout end age and payout duration.
- `Endalter`: last age in the projection.
- `Entnahme ab Alter`: age when percentage withdrawals begin.
- `Prozent-Entnahme p. a.`: annual percentage withdrawal rate.

`Entnahme ab Alter` cannot be lower than `Startalter Grafik` and cannot be higher than `Rentenalter`.

## Market Assumptions

- `Jaehrliche Rendite`: annual investment return assumption.
- `Kapitalertragsteuer auf Wertzuwachs`: tax rate applied only to realized gains.
- `Inflation pro Jahr`: inflation rate used for real-value metrics.

Capital gains tax is not applied during pure holding periods. It is applied when withdrawals realize gains. The taxable part of a withdrawal is based on the gain share of the current depot balance. The contributed cost basis is not taxed.

## Chart

The `Anlageentwicklung` chart shows yearly bars with these components:

- grey: contributed cost basis / remaining own contribution,
- green: remaining value growth,
- purple: remaining payout balance during the payout phase,
- red: capital gains tax realized in that year,
- dashed line: real-value normal depot comparison.

Click a bar to open a popup for that year. The popup shows:

- `Eigenbeitrag`,
- `Zulagen`,
- `Wertzuwachs`,
- `Restguthaben (Auszahlung)`,
- `Kapitalertragsteuer`.

## Important Statistics

- `Monatliche Investmentrate`: average recurring monthly investment.
- `Vermoegen zur Rente`: projected depot value at retirement.
- `Monatlicher Zugewinn durch Entnahme`: monthly net percentage withdrawal at the selected withdrawal start age.
- `Monatliche Rente netto`: simulated net monthly payout over the payout period.
- `Reales Vermoegen zur Rente`: retirement wealth adjusted for inflation.
- `Realisierte Steuern bis Rente`: taxes realized before retirement through percentage withdrawals.
- `Offene Steuer bei Verkauf zur Rente`: estimated tax on unrealized gains if the whole depot were sold at retirement.
