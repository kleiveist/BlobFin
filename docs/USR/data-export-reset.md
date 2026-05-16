# Data, Export, And Reset

## Local Storage

The frontend stores state under this browser storage key:

```text
blobfin.reserveCalculator.v1
```

Older imported browser state may be read from:

```text
jahreskalkulatorState
```

This means data is local to the browser profile. Another browser, another user profile, or clearing site data will not automatically keep the same plan.

## CSV Export And Import

The app supports CSV import and export for planning data from the frontend controls. Use CSV export before large changes if you want a file-based backup outside local storage.

When importing CSV data, check these fields carefully afterwards:

- position type,
- payout cadence,
- one-time payout year and month,
- `Aktiv`,
- `View`,
- `Zinsen`,
- `Cashback`,
- investment selection.

## Reset

`Grunddaten zuruecksetzen` restores the default application state. It resets the stored positions, planning settings, and investment settings for the current browser profile.

## Privacy

The primary planning workflow runs in the browser. The current frontend does not require a login for reserve and investment planning. Backend endpoints exist in the repository for validation, calculation, and PDF generation, but the browser planning data is saved locally unless a future feature sends it to the backend.
