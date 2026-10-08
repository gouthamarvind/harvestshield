# HarvestShield

**Predict the impact. Simulate the intervention. Protect the harvest.**

HarvestShield transforms El Niño climate signals into localized agricultural and food-security risk, then simulates the interventions that can reduce the impact before it happens. Built for VELSATHON'26 — *El Niño and its impacts* (SDG 2 Zero Hunger · SDG 13 Climate Action).

## What is real and what is not

| Input | Status |
|---|---|
| El Niño strength (Oceanic Niño Index) | **Real** — NOAA CPC, bundled snapshot to Jul–Sep 2026 |
| District rainfall & temperature, 1 Jun → latest | **Real** after you run `npm run fetch:climate` (NASA POWER vs 2001–2020 normals) |
| Analog years (1997, 2009, 2015, 2023) | **Real** ONI trajectories, similarity computed from data |
| Crop mix, reservoir storage, population, vulnerability | Illustrative (labelled in the app) |
| Risk weights | Hand-set, transparent; **not validated** against harvest records |

The default scenario, **Observed now**, is built from the real inputs. The other five scenarios are what-if presets.

### Refresh the real climate data

```bash
npm run fetch:climate   # needs Node 18+ and internet; takes ~2 minutes
git add src/data/observed/climate.json && git commit -m "Update observed climate" && git push
```

Vercel redeploys automatically after the push.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build → dist/
npm run build:single # one self-contained HTML file → dist-single/index.html
```

Requires Node 18+. No backend, no API keys, no database.

## Demo script (≈3 minutes)

1. **Overview** — scenario is *Strong El Niño* (ENSO 1.7, −18% rain, +1.4°C). Walk the 7-step impact chain from ocean to plate.
2. Click **Thanjavur** in *Top risk regions* → drawer shows 79% risk, rice 84% of area, top drivers, recommended intervention.
3. **Simulate this district** → Scenario Lab opens on Thanjavur rice (80%, SEVERE).
4. Toggle **Diversify 30%** → risk drops ~25 pts, water −21%, food-security exposure falls. Show the factor bars and the sensitivity curve.
5. Change **Optimize for** (food / water / income / resilience) → the recommendation changes; **Apply**.
6. **Add to response plan** → Intervention Planner → add *Increase food reserves* → **Generate response plan**.
7. Press `1` for observed data, `2`–`6` for what-if scenarios; every view recomputes.

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

Each term is crop- and district-weighted, deterministic, normalised to 0–100 and exposed as a named factor for explainability. Yield loss = risk × 45% ceiling. It is **not** a validated scientific model.

Map boundaries: public Tamil Nadu district GeoJSON (2019 boundaries), simplified and projected by `scripts/build_geo.py`.
