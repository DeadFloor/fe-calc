# eCO2RR Faradaic Efficiency Calculator Suite

Self-contained, **offline** single-page web app for electrochemical CO₂ reduction (eCO2RR) metrics.

**Absolute path:** `/workspace/fe-calculator-suite/`

| File | Role |
|------|------|
| `index.html` | App shell + four calculator sections |
| `design-tokens.css` | Avant Garde visual tokens + local IBM Plex `@font-face` |
| `fonts/` | IBM Plex Sans (variable) + IBM Plex Mono (offline TTFs) |
| `styles.css` | Component styles (consumes design tokens) |
| `app.js` | Live calculations, units, validation, tabs (also copied as `script.js`) |
| `README.md` | This document |
| `DESIGN.md` | Designer notes (token rationale, hooks) |

Open `index.html` in any modern browser. No build step, no CDN, no network required.

```bash
xdg-open /workspace/fe-calculator-suite/index.html
# or: python3 -m http.server -d /workspace/fe-calculator-suite 8080
```

---

## Features

1. **Faradaic Efficiency (FE)**
   - Product as molar amount (nmol / µmol / mmol / mol) **or** ideal-gas volume (mL/L + T + P)
   - Charge Q in C, mC, mA·h, or A·h
   - n-electron presets: CO (2), HCOOH (2), CH₄ (8), C₂H₄ (12), EtOH (12), H₂ (2), or custom
   - Outputs: FE %, moles, theoretical charge Q_th, electrons from charge (Q/F)
   - Warns when FE > 100%; OK banner when within range
   - Live recalc on input

2. **Partial current density**
   - From FE% + total j, **or** FE% + total I + geometric area
   - j_i = (FE/100) · j_total (mA·cm⁻²)
   - Optional partial current I_i when area is known

3. **Production rate**
   - ṅ = (I · FE/100) / (n · F) in mol·s⁻¹
   - Also µmol·h⁻¹ and areal µmol·cm⁻²·h⁻¹ (if area given)
   - Optional mass rate if molar mass set
   - Same n presets as FE

4. **Charge / time / current converter**
   - Q = I · t; solve for Q, I, or t
   - Unit convert C ↔ mA·h ↔ A·h

**UX:** tabbed panels (desktop tabs + mobile select), formulas in footnotes, field validation, desktop-first / mobile-usable. CSS variables live in `design-tokens.css` so a designer can swap palette/typography without touching logic.

---

## Formulas

### Constants

| Symbol | Value | Notes |
|--------|-------|--------|
| F | **96485 C·mol⁻¹** | Faraday constant used throughout |
| R | 8.314462618 J·mol⁻¹·K⁻¹ | Ideal gas (Pa·m³·mol⁻¹·K⁻¹) |

### Faradaic efficiency

```
FE (%) = (n · F · n_product / Q) · 100
```

- Theoretical charge: `Q_th = n · F · n_product`
- Ideal-gas moles: `n_product = P V / (R T)` (P in Pa, V in m³, T in K)

### Partial current density

```
j_i = j_total · (FE_i / 100)
```

If total current I and geometric area A are given: `j_total = I / A`.

### Production rate

```
ṅ = (I · FE / 100) / (n · F)     [mol·s⁻¹]
```

- µmol·h⁻¹ = ṅ × 10⁶ × 3600  
- µmol·cm⁻²·h⁻¹ = (µmol·h⁻¹) / A(cm²)

### Charge / time / current

```
Q = I · t
```

Conversions: `1 A·h = 3600 C`, `1 mA·h = 3.6 C`.

---

## Assumptions

- **F = 96485 C/mol** (common electrochemistry rounding).
- **Ideal gas** for volume → moles; no compressibility or humidity corrections.
- **Geometric area** for areal rates / j (not ECSA).
- **n presets** are stoichiometric e⁻ per product for common eCO2RR / HER pathways; use **Custom** when stoichiometry differs.
- FE > 100% is flagged (quantification, charge integration, crossover, or wrong n), not blocked.
- Offline-only; all logic is client-side in `app.js`.

---

## FE sanity check (defaults → ~100%)

FE panel defaults:

| Input | Value |
|-------|--------|
| Product | **50 µmol** (= 5×10⁻⁵ mol) |
| n | **2** (CO) |
| Q | **9.6485 C** |

Check:

```
Q_th = 2 × 96485 × 5×10⁻⁵ = 9.6485 C
FE   = (9.6485 / 9.6485) × 100 = 100%
```

**Gas-volume equivalent** at 25 °C, 1 atm: V ≈ **1.223 mL** for 50 µmol (gas-mode default) with the same Q and n also yields ≈100%.

---

## Design tokens

Edit `design-tokens.css` to rebrand (palette, type, spacing, radii, shadows, fonts). Component rules in `styles.css` use those variables. See `DESIGN.md` for the full token inventory and UI hooks.

Built for Steve Pan (PhD eCO2RR). Visual system by Avant Garde; calculation logic in `app.js`.

## GC online FE (default tab)
Inputs: |j| (mA cm⁻²) × geometric area (cm²) → I, or total I directly; CO₂ flow (sccm = mL min⁻¹, default 20);
flow reference standard (273.15 K, 101325 Pa) or custom gas T/P (default 298.15 K, 101325 Pa); injection time (min);
products with ppm and n (presets H₂ 2, CO 2, CH₄ 8, C₂H₄ 12; custom allowed).

    t_k = t_1 + (k − 1)·(t_analysis + t_post-run),  k = 1…N (N = 1–6, default 4; per-row manual override)
    I_k = |j_k| · A   (per-injection j_k from the CA/CP trace; blank → global j). Total-I mode: I_k entered, j_k = I_k / A
    ṅ_gas (mol/s) = P · (Q_mL/min · 1e-6 / 60) / (R · T),  R = 8.314462618 J mol⁻¹ K⁻¹
    ṅ_i = (ppm_i · 1e-6) · ṅ_gas
    FE_i,k (%) = n_i · F · ṅ_i,k / I_k · 100,  F = 96485.33212 C mol⁻¹
    j_i,k = FE_i,k/100 · |j_k|
    mean ± SD: arithmetic mean and sample SD (n − 1) over the injections with data

Assumes outlet flow ≈ inlet CO₂ flow. Total FE > 100% → warning; < 90% → note (liquid products unaccounted).
Inputs persist in localStorage (`gcfe.v1`). CSV export: one header row with units (`t_inj (min)`, `j (mA cm^-2)`, `I (mA)`, `ppm_CO (ppm)`, `FE_CO (%)`, `j_CO (mA cm^-2)`, `FE_total (%)`), followed by `mean (n=N)` and `SD (n=N)` rows.
Open `index.html#demo` to load sample data.

### Export (CSV + XLSX)
Both exports use one column template: `EXPORT_TEMPLATE` in `app.js` (= `script.js`), section "EXPORT TEMPLATE".
Edit `columns` (header with `{p}` placeholder for per-product columns, `field`), `summaryRows`, `sheetName`, `fileStem`, `sigFigs` to remap.
XLSX is written offline with a bundled SheetJS Community Edition 0.20.3 (`vendor/xlsx.full.min.js`, Apache-2.0, `vendor/xlsx-LICENSE`).

## Installable app (PWA)
Files: `manifest.webmanifest`, `sw.js`, `pwa.js`, `version.js`, `icons/`.
- **Versioning:** bump `self.APP_VERSION` in `version.js` on every release (single source). The SW cache is `fecalc-<APP_VERSION>`;
  old `fecalc-*` caches are deleted on activate. The footer shows the version.
- **Updates:** `index.html` is network-first; other assets are cache-first (precached on install with `cache: "reload"`).
  The SW is registered with `updateViaCache: "none"` and re-checked whenever the app returns to the foreground. A new version
  waits, the page shows "Update available — tap to reload", and tapping activates it and reloads.
- **New files:** add any new static file to `ASSETS` in `sw.js`.
- **Hosting:** needs HTTPS (or `localhost`); serve the folder as static files from any HTTPS host. No server code is needed.
- **Downloads:** on touch devices or in the installed app, exports use the Web Share API with files (Save to Files / Drive / email);
  otherwise a normal download is used.
