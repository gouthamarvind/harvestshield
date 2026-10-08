# HarvestShield

**Anticipate the risk. Plan the response. Protect the harvest.**

HarvestShield transforms El Niño climate signals into localized agricultural and food-security risk, then simulates the interventions that can reduce the impact before it happens. Built for VELSATHON'26 — *El Niño and its impacts* (SDG 2 Zero Hunger · SDG 13 Climate Action).

## What is real and what is not

| Input | Status |
|---|---|
| El Niño strength (Oceanic Niño Index) | **Real** — NOAA CPC, bundled snapshot to Jul–Sep 2026 |
| District rainfall & temperature, 1 Jun → latest | **Real** after you run `npm run fetch:climate` (NASA POWER vs 2001–2020 normals) |
| Analog years (1997, 2009, 2015, 2023) | **Real** ONI trajectories, similarity computed from data |
| Crop mix, reservoir storage, population, vulnerability | Illustrative (labelled in the app) |
| Risk weights | Hand-set, transparent (Settings → Model card). The rainfall-only backtest found no predictive skill; see Settings → Historical backtest |
| 1991–2026 district rainfall history | **Real** after you run `npm run fetch:history` and `npm run build:seasonal` |
| Tamil Nadu district rice yields | **Real** only after you add the ICRISAT CSV and run `npm run normalize:yields` (see below) |

The default scenario, **Observed now**, is built from the real inputs. The other five scenarios are what-if presets.

### Refresh the real climate data

```bash
npm run fetch:climate   # needs Node 18+ and internet; takes ~2 minutes
git add src/data/observed/climate.json && git commit -m "Update observed climate" && git push
```

Vercel redeploys automatically after the push.

### Historical data and backtest

The build sandbox cannot reach NASA POWER or the ICRISAT data host, so these steps run on your computer. Each script fails loudly on missing or invalid input and never fills gaps.

```bash
npm run fetch:history     # NASA POWER daily rainfall & temperature, 1991–2026, 37 districts → data/raw/power/
npm run build:seasonal    # 1 Jun – 5 Oct anomalies by district and year → src/data/observed/seasonal.json
```

Yield history is not bundled. Download the ICRISAT District Level Database CSV from Mendeley Data (DOI 10.17632/ywp3y5j9vv.1; check its licence on the dataset page) and place it in `data/raw/icrisat/`. Then:

```bash
npm run normalize:yields  # Tamil Nadu rice → data/processed/tn_rice_yields.json
npm run backtest          # rainfall-anomaly backtest → src/data/observed/validation.json
npm test                  # unit and synthetic end-to-end tests; no network; writes nothing into data/
```

The backtest uses leave-one-year-out testing: for each held-out year, the district trends and the regression are refit without that year. It reports Pearson and Spearman correlation, MAE against a trend-only baseline, and loss-year recall and precision. If the sample is too small, it reports `insufficient` with no metrics.

Known limits: the predictor is seasonal rainfall only, and the 1 Jun – 5 Oct window misses the north-east monsoon. Yield data stops at the source year (2015), so 2023–24 is not validated. The app shows "not run" until each step has been executed. Two rainfall baselines are in use: the Overview and Climate pages compare against 2001–2020 normals (climate.json), while the backtest and model card use 1991–2020 seasonal anomalies, so the same district can show two different anomalies. The 37 districts map to 29 distinct daily rainfall series, because six groups share a NASA POWER grid cell. The processed yield file is derived from ICRISAT data; confirm the dataset licence before redistributing it.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # pipeline and model tests (node:test, synthetic inputs only)
npm run build        # type-check + production build → dist/
npm run build:single # one self-contained HTML file → dist-single/index.html
```

Requires Node 18+. No backend, no API keys, no database.

## Demo script (≈3 minutes)

The point of the demo is the honest finding. Do not quote risk scores as forecasts.

1. **Overview**: the *Strong El Niño* scenario is a what-if preset (ENSO 1.7, −18% rain, +1.4 °C). Walk the impact chain from ocean to plate and say it is illustrative.
2. **Settings → Historical backtest**: rainfall alone did not predict district rice yield anomalies in the 1990–2015 record. Read out the result: 670 held-out district-years across 30 districts and 25 years, Pearson r -0.05, skill against a trend-only baseline -0.01, and 0 years flagged. Run 2026-10-08.
3. **Settings → Model card**: show the hand-set weights, what each term measures, where its input comes from, and the limitations.
4. Click a district in *Top risk regions* and open the drawer. Point to the factor breakdown and the source label on each input.
5. **Simulate this district** opens the Scenario Lab. Toggle a diversification option and show which factors move. Describe the result as a what-if.
6. **Alerts**: show the early-warning levels and the ENSO outlook with its issue date and source.
7. **Action Plan**: export the CSV and show the advisory. The Tamil text has not been reviewed by a native speaker.

Keyboard shortcuts are listed below.

## Keyboard

| Keys | Action |
|---|---|
| `Ctrl/⌘ K` | Command palette (pages, districts, scenarios, reports) |
| `G` then `O/E/M/C/S/F/W/P/A/I/R` | Jump to Overview, Climate, Map, Crops, Scenario Lab, Food, Water, Planner, Alerts, Insights, Reports |
| `1`–`6` | Scenarios: Observed now, Normal, Moderate, Strong, Extreme water stress, Recovery |
| `[` | Collapse sidebar |
| `Esc` | Close drawer / modal / palette |

## Architecture

```
src/
  data/        seed data: crops, 37 districts, scenario presets, tnGeo (pre-projected SVG boundaries)
  model/       risk.ts  — transparent additive heuristic with named factors
               plan.ts  — plan evaluation + exhaustive optimiser (~160 counterfactual plans)
  services/    climate · cropRisk · foodSecurity · water · intervention · intelligence (alerts/insights)
  state/       AppState (scenario, simulator, response plan, alerts) · toast
  components/  ui kit, layout (sidebar, topbar, command palette), SVG map, Sankey, charts
  pages/       13 routes (hash router — works as a static file)
```

**Swapping in real data:** each `services/*` module documents its production source (NOAA CPC ONI, IMD gridded rainfall, ERA5, TN WRD reservoir bulletins, DES crop statistics). Keep the return types and replace the function bodies; no UI changes needed.

### Risk model (prototype)

```
Risk = rainfall stress + water stress + temperature stress + ENSO forcing
     + coastal exposure + intrinsic crop sensitivity (− diversification buffer)
```

Each term is crop- and district-weighted, deterministic, bounded to 2–98 and exposed as a named factor for explainability. Weights are exported as `W` in `src/model/risk.ts`. Yield loss = risk × 45% ceiling. It is **not** a validated scientific model, and the backtest tests only the rainfall term.

Map boundaries: public Tamil Nadu district GeoJSON (2019 boundaries), simplified and projected by `scripts/build_geo.py`.
