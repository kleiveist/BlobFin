<!-- AUTO-GENERATED:backlink START -->
[← Back](def.md)
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

`PlanningSettings` contains the planning year, account interest rate, cashback rate, global planning end date, and emergency fund value. The legacy `monthlyNetIncome` setting is migrated into an income position and no longer drives calculations directly.

`InvestmentSettings` contains separate normal-depot, retirement-depot, and child-depot selections, special interest/cashback investment toggles, retirement depot settings, age settings, return, tax, inflation, reserve/bequest, and percentage withdrawal settings.

`RealEstateFinancingSettings` contains project cost, financing assumptions, annual property value growth, selected payment sources, sale year, and the explicit purchase activation flag. Combined wealth calculations only include property value, debt, repayment effects, and sale proceeds when that activation flag is enabled. The combined net wealth uses property equity (`property value - remaining debt`), not the full gross property value. When the purchase flag is disabled, repayment sources are not redirected into real estate and remain liquid through the cash/depot path.

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

The yearly interest total can be represented as a virtual investment position when the user enables `Zinsen` in one depot.

## Cashback Calculation

Cashback is calculated only when all of these are true:

- the row is active,
- `cashback` is true,
- `type` is `temporary`.

Monthly, yearly, and one-time payout cadence decides when cashback is created. The yearly cashback total can be represented as a virtual investment position when the user enables `Cashback` in one depot.

## Investment Contributions

Implemented in `frontend/src/domain/investmentContributions.ts`.

Only active selected expense positions with `type = savings` are investable. A selected savings position, account interest, or cashback transfer can belong to only one investment depot at a time.

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
- retirement depot allowances are added as separate allowance contributions when enabled,
- gross balance compounds monthly,
- optional percentage withdrawals can start before retirement,
- realized taxes are accumulated only when withdrawals realize gains.

When the retirement depot is enabled, the effective retirement age is at least 65 and percentage withdrawals are disabled in the projection.

## Retirement Depot Allowance

Implemented in `frontend/src/domain/retirementDepot.ts`.

The allowance model is calculated from the selected annual own contribution:

```text
if annualOwnContribution < 120:
  allowance = 0
else:
  baseAllowance = 50% of min(annualOwnContribution, 360)
                + 25% of min(max(annualOwnContribution - 360, 0), 1440)
  childAllowance = min(annualOwnContribution, 300) * eligibleChildren
```

The yearly base allowance is capped by the tier formula at 540 EUR. The projection distributes each year's allowance proportionally across months that receive selected own contributions. `AssetProjectionPoint.allowance` contains the remaining allowance basis for the chart's orange segment.

During the payout phase:

- the retirement snapshot is used as the starting depot,
- future one-time selected savings can still be added at their configured projection month,
- percentage withdrawals can continue,
- a net monthly pension is solved by binary search so the configured reserve/bequest percentage remains at the end age,
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
- remaining allowance basis,
- remaining growth,
- cumulative realized tax,
- period tax for the chart bar,
- real balance after inflation.
