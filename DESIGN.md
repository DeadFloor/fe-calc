# eCO₂RR FE Calculator Suite — Design notes

For **FE Calculator Coder**: visual system, component inventory, state hooks, and how to extend. Drop `script.js` in; do not restyle unless changing tokens.

> Note: A parallel dark-theme coder draft was backed up under `_coder-draft/` if you need to merge calculation features (gas-volume FE, product presets, etc.) into this shell.

## Files

| Path | Role |
|------|------|
| `design-tokens.css` | Palette, type, spacing, radii, layout tokens + `@font-face` |
| `styles.css` | Component rules |
| `index.html` | Semantic shell, four tabbed sections, placeholder results |
| `fonts/` | Local IBM Plex Sans (variable) + IBM Plex Mono — offline |
| `script.js` | *(coder)* calculation + validation logic only |

Serve the folder statically. No CDN.

---

## Palette rationale

Cool **paper / slate** neutrals read as lab notebook, not product marketing. One **deep teal** accent (`#0F6E6A`) marks primary actions and active tabs without neon distraction. Semantic colors are restrained and text-pairable at WCAG AA on their tinted backgrounds.

| Token | Hex | Use |
|-------|-----|-----|
| `--color-bg-page` | `#F4F6F8` | Page background |
| `--color-bg-surface` | `#FFFFFF` | Cards, inputs |
| `--color-bg-muted` | `#EEF1F4` | Results column, footnotes |
| `--color-bg-subtle` | `#E6EBF0` | Unit chips, disabled |
| `--color-border` | `#D8DEE6` | Default borders |
| `--color-border-strong` | `#B8C2CF` | Hover borders |
| `--color-ink` | `#1A2332` | Body text |
| `--color-ink-secondary` | `#3D4A5C` | Labels |
| `--color-ink-muted` | `#5C6B7A` | Helpers, footnotes |
| `--color-ink-faint` | `#8492A3` | Placeholders, empty |
| `--color-accent` | `#0F6E6A` | Primary / active |
| `--color-accent-hover` | `#0B5754` | Primary hover |
| `--color-accent-subtle` | `#E6F4F3` | Active tab, primary result |
| `--color-success` | `#1B7A45` | Valid / OK (optional) |
| `--color-warning` / `--color-warning-bg` | `#9A5700` / `#FFF4E5` | FE > 100% |
| `--color-error` / `--color-error-bg` | `#B42318` / `#FEF3F2` | Invalid fields |

---

## Typography

- **UI:** `"IBM Plex Sans"` → Segoe UI → system-ui (self-hosted variable TTF).
- **Numbers / formulas:** `"IBM Plex Mono"` → ui-monospace.
- **Scale (px @ 16 root):** 12, 13, 14, 16, 18, 20, 24, 28 → `--text-xs` … `--text-3xl`.
- Formulas are Unicode / HTML subscripts in footnotes (no MathML, no KaTeX).

---

## Spacing & layout

- Scale: **4 / 8 / 12 / 16 / 24 / 32 / 48** → `--space-1` … `--space-7`.
- Content max-width: **1040 px** centered.
- Card body: **two columns** (inputs | results) above 720 px; stacks below.
- Sticky tab bar; on viewports ≤520 px, tabs become `#tab-select`.

---

## Component inventory

Page header (`.app-header`), tab list (`.tab` / `#tab-select`), section card (`.calc-card`), field group (`.field`), number input (`.input`), unit chip/select (`.field__unit` / `.unit-select`), buttons (`.btn--primary` / `.btn--secondary`), results (`.result-row`), warning banner (`.banner--warning`), formula footnote (`.formula-footnote`), footer (`.app-footer`).

---

## States (coder wiring)

### Warning — FE > 100%

1. `#fe-warning` → add `.is-visible`.
2. `#fe-result-row` → add `.is-warning`.
3. Write value into `#fe-result-value`.

### Error — invalid input

1. On `.field`: add `.is-error` (reveals `.field__error`).
2. Clear by removing `.is-error`.

### Empty results

- `.result-row.is-empty` with value `—`. Remove `.is-empty` when populated.

### Disabled

- `.field.is-disabled` or native `:disabled` (converter charge when solving for Q).

---

## Accessibility

- Landmarks + `role="tablist"` / `tab` / `tabpanel`.
- Arrow-key tab navigation in the inline UI script.
- `aria-live="polite"` on `[data-results]`.
- Teal `:focus-visible` ring; do not remove it.
- Color is not the only signal (banner copy + field errors).

---

## ID / data-* hooks

```
Tabs:     [data-tab], #tab-select, [data-section], .is-active
Forms:    #form-fe | #form-pcd | #form-rate | #form-converter
          [data-calc="fe|pcd|rate|converter"]
Inputs:   [data-input], [data-unit-for], [data-field]
Actions:  [data-action="calculate|reset"]
Results:  #fe-result-value, #fe-result-unit, #fe-result-row
          #pcd-result-value, #rate-result-value, #rate-mass-row
          #conv-result-value, #conv-result-label, #conv-result-unit
Banners:  #fe-warning, #pcd-warning  + .is-visible
Errors:   .field.is-error, [data-error-for]
FE warn:  .result-row.is-warning
Mode:     #conv-solve-for [data-mode]  values Q | t | I
```

Constant: `F = 96485.3321` C·mol⁻¹.

---

## How to extend

1. Copy a `data-section` card; add a tab + `#tab-select` option.
2. Theme: edit only `design-tokens.css`.
3. Keep fonts local — no CDN.


## Coder merge notes (current `index.html` / `app.js`)

The shell was extended in-place with calculation UI hooks. Extra IDs beyond the original sketch:

- FE: `#fe-presets`, `#fe-product-mode`, `#fe-moles-block`, `#fe-gas-block`, `#fe-gas-volume`, `#fe-gas-temp`, `#fe-gas-pressure` (+ unit selects), `#fe-ok` / `#fe-ok-text`, `#fe-moles-value`, `#fe-qth-value`
- PCD: `#pcd-mode`, `#pcd-j-block`, `#pcd-I-block`, `#pcd-I-total`, `#pcd-area` (+ units)
- Rate / converter: areal and multi-unit result rows (`#rate-areal-row`, `#conv-mAh-row`, `#conv-Ah-row`, …)

Wire via `app.js` (or `script.js`). Demo FE section ships with sample values and `#fe-warning.is-visible` + `.is-warning` on `#fe-result-row` (130.4%). Live calc will overwrite these on load if `app.js` is linked.
