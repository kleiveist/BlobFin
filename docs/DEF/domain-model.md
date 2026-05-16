<!-- AUTO-GENERATED:backlink START -->
[← Back](DEF.md)
<!-- AUTO-GENERATED:backlink END -->
# Domain Model

This page documents the calculation rules implemented in the frontend domain modules.

## Core Types

`ReservePosition` represents one row in the income, expense, or savings table.

Important fields:

- `flow`: `income` or `expense`.
- `type`: expense rows use `reserve` or `temporary`; savings rows use `fixed` or `savings`; income rows use `incomeMonthly`, `incomeYearly`, or `incomeTemporary`.
- `payoutType`: `none`, `monthly`, `yearly`, or `once`.
- `active`: whether the row participates in calculations.
- `visible`: whether the row appears in the yearly table.
- `interestBearing`: whether account interest is calculated.
- `cashback`: whether cashback is calculated.
- `payoutYear`, `payoutMonth`, `payoutDay`: payout timing.

`PlanningSettings` contains the planning year, account interest rate, cashback rate, and emergency fund value. The legacy `monthlyNetIncome` setting is migrated into an income position and no longer drives calculations directly.

`InvestmentSettings` contains selected investment IDs, special interest/cashback investment toggles, age settings, return, tax, inflation, and percentage withdrawal settings.

## Reserve Calculation

Implemented in `frontend/src/domain/reserveCalculator.ts`.

Rules:

- Inactive positions return zero.
- Income positions create monthly planned income.
- Fixed positions are not treated as planned outflows.
- Reserve positions can accumulate and optionally reset on monthly or yearly payout.
- Temporary and savings positions are outflows while active.
- One-time payout positions are only counted in their matching `payoutYear` and `payoutMonth`.
- One-time payout positions are excluded from visible yearly table position columns.
- Monthly remaining amount is `plannedIncome - plannedOutflow`.

## Interest Calculation

Interest is calculated only when `interestBearing` is true.

- One-time positions do not earn interest.
- Fixed positions use a simplified monthly interest calculation.
- Temporary and savings positions use payout-day timing.
- Reserve positions use accumulated balance and payout timing.

The yearly interest total can be represented as a virtual investment position when the user enables `Zinsen in Altersvorsorge`.

## Cashback Calculation

Cashback is calculated only when all of these are true:

- the row is active,
- `cashback` is true,
- `type` is `temporary`.

Monthly, yearly, and one-time payout cadence decides when cashback is created. The yearly cashback total can be represented as a virtual investment position when the user enables `Cashback in Altersvorsorge`.

## Investment Contributions

Implemented in `frontend/src/domain/investmentContributions.ts`.

Only active selected expense positions with `type = savings` are investable.

Recurring contributions:

- monthly payout contributes every active month,
- yearly payout contributes in the payout month,
- `none` contributes like a monthly position while active.

One-time savings contributions:

- contribute only once in the matching absolute year and month,
- are included in the projection,
- are not included in the recurring annual savings rate display.

## Asset Projection

Implemented in `frontend/src/domain/assetProjection.ts`.

The projection uses monthly compounding derived from the annual return:

```text
monthlyReturn = (1 + annualReturn) ^ (1 / 12) - 1
```

During the saving phase:

- selected contributions are added monthly,
- gross balance compounds monthly,
- optional percentage withdrawals can start before retirement,
- realized taxes are accumulated only when withdrawals realize gains.

During the payout phase:

- the retirement snapshot is used as the starting depot,
- future one-time selected savings can still be added at their configured projection month,
- percentage withdrawals can continue,
- a net monthly pension is solved by binary search so the depot is consumed by the end age,
- realized taxes are included in the withdrawal simulation.

## Tax Model

Capital gains tax applies only to realized gains. The cost basis is not taxed.

For a gross withdrawal:

```text
growth = max(0, grossBalance - costBasis)
gainShare = growth / grossBalance
taxableGain = grossWithdrawal * gainShare
tax = taxableGain * capitalGainsTaxPercent
```

For a requested net withdrawal, the code estimates the gross withdrawal needed after tax drag and then applies the same gain-share tax model.

The projection also exposes an unrealized retirement tax estimate for the case where the full depot were sold at retirement:

```text
unrealizedTaxAtRetirement = growthAtRetirement * capitalGainsTaxPercent
```

## Chart Points

Each `AssetProjectionPoint` represents one age in the chart. It includes:

- gross and net balance,
- total contributions,
- remaining cost basis,
- remaining growth,
- cumulative realized tax,
- period tax for the chart bar,
- real balance after inflation.
