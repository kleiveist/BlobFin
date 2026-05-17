<!-- AUTO-GENERATED:backlink START -->
[← Back](USR.md)
<!-- AUTO-GENERATED:backlink END -->
# Investment Planning

The `Investment- und Auszahlungsplanung` section separates a normal `Depot` and an `Altersvorsorgedepot`. Each tab has its own selected savings, assumptions, asset development chart, and payout statistics. A combined chart below the tab content sums both depot projections.

## Investable Positions

Only positions with `Art = Sparrate` appear under `Investierbare Positionen`.

Recurring savings positions contribute to the regular annual savings rate. One-time savings positions are handled differently:

- they can be selected as investable positions,
- they are added once in their configured payout year and month,
- they do not increase the displayed recurring `Jaehrliche Sparrate`.

Two additional investment toggles can be enabled per depot:

- `Zinsen`: invests yearly account interest from the yearly table.
- `Cashback`: invests yearly cashback from the yearly table.
- `Altersvorsorgedepot aktivieren`: appears only on the `Altersvorsorgedepot` tab and adds the communicated allowance model to that projection.

Each savings position, `Zinsen`, and `Cashback` can be assigned to only one depot at a time. Savings positions already used by the other depot are hidden in the current tab.

## Age And Timeline Fields

- `Geburtsjahr`: used with the planning year to calculate today's age.
- `Startalter Grafik`: first age shown in the chart.
- `Rentenalter`: derived from payout end age and payout duration.
- `Endalter`: last age in the projection.
- `Entnahme ab Alter`: age when percentage withdrawals begin. This appears only in the normal `Depot` tab.
- `Prozent-Entnahme p. a.`: annual percentage withdrawal rate. This appears only in the normal `Depot` tab.
- `Kindergeldberechtigte Kinder`: children counted for the retirement depot child allowance. This appears only in the `Altersvorsorgedepot` tab.

`Entnahme ab Alter` cannot be lower than `Startalter Grafik` and cannot be higher than `Rentenalter`.

When `Altersvorsorgedepot aktivieren` is checked, the retirement age for the retirement depot is floored at 65. It can still be set higher. Percentage withdrawals are not part of the retirement depot page.

## Retirement Depot Allowances

The implemented allowance model follows the communicated 2027 reform logic used in the app:

- no allowance below 120 EUR own contribution per year,
- 50% base allowance on the first 360 EUR own contribution per year,
- 25% base allowance on own contributions above 360 EUR up to 1,800 EUR per year,
- maximum base allowance of 540 EUR per year,
- child allowance of 1 EUR per 1 EUR own contribution, capped at 300 EUR per child and year.

The retirement depot chart adds eligible allowances as depot contributions and shows them as `Zulagen`. The `Foerderung` block is shown only on the `Altersvorsorgedepot` tab and shows annual own contribution, base allowance, child allowance, allowance rate, total yearly allowances, total yearly depot inflow, and allowances accumulated by retirement.

## Market Assumptions

- `Jaehrliche Rendite`: annual investment return assumption.
- `Kapitalertragsteuer auf Wertzuwachs`: tax rate applied only to realized gains.
- `Inflation pro Jahr`: inflation rate used for real-value metrics.
- `Reserve/Erbe vom Maximalvermoegen`: share of retirement wealth held back until the end age as inheritance or longevity reserve. The default is 10%.

Capital gains tax is not applied during pure holding periods. It is applied when withdrawals realize gains. The taxable part of a withdrawal is based on the gain share of the current depot balance. The contributed cost basis is not taxed.

## Chart

The `Anlageentwicklung` chart shows yearly bars with these components:

- grey: contributed cost basis / remaining own contribution,
- orange: retirement depot allowances,
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
- `Monatlicher Zugewinn durch Entnahme`: monthly percentage withdrawal split into the remaining recurring monthly investment rate after offset and the remaining net withdrawal, floored at zero.
- `Monatliche Rente netto`: simulated net monthly payout over the payout period.
- `Reales Vermoegen zur Rente`: retirement wealth adjusted for inflation.
- `Reserve/Erbe zum Endalter`: projected remaining depot value at the end age based on the configured reserve/bequest percentage.
- `Realisierte Steuern bis Rente`: taxes realized before retirement through percentage withdrawals.
- `Offene Steuer bei Verkauf zur Rente`: estimated tax on unrealized gains if the whole depot were sold at retirement.
