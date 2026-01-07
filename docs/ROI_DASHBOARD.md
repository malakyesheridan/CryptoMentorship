# ROI Dashboard Admin Guide

## How admins enter data
- Go to `/admin/roi` and use the tabs for Settings, Model Series, Benchmarks, Allocation, and Change Log.
- Model Series and Benchmarks: add daily points manually or paste CSV into the import box (`date,value`). Use "Replace existing series" if you want to overwrite all prior points.
- Allocation: enter asset weights plus cash weight. The weights must sum to 1.0 (tolerance 0.5%).
- Change Log: add short updates that explain portfolio changes. These are visible to members and are not trading signals.
- Preview panel: click "Refresh Preview" to see derived metrics and validation warnings before publishing changes.

## How the simulator works
- The simulator scales the model series from your chosen start date to compute a hypothetical balance.
- If monthly contributions are enabled, each contribution is added at the first day of each month and grows with the model series from that date forward.
- The output includes the current balance, profit, ROI percentage, and worst drawdown for the selected window.
- This is a modeled simulation for educational purposes only and not financial advice.
