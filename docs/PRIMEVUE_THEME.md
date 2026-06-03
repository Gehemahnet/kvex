# PrimeVue Theme Customization

KVEX uses PrimeVue with a custom Sakai-inspired preset and an app-level CSS token layer.

There are two places to customize the theme:

- PrimeVue component tokens: `src/theme/atlantis.theme.ts`
- KVEX layout/component overrides: `src/style.css`

Use the PrimeVue layer for component semantics shared by PrimeVue internals. Use the KVEX CSS layer for page shell, cards, Funding table, and app-specific states.

## PrimeVue Preset

File: `src/theme/atlantis.theme.ts`

The preset is created with `definePreset(Aura, { semantic: ... })`.

### Primary Scale

Set the brand color ramp in `semantic.primary`.

```ts
primary: {
  50: "#eaf4fc",
  100: "#d6e9f9",
  200: "#acd3f3",
  300: "#83bdeb",
  400: "#5aa7e5",
  500: "#3192e1",
  600: "#2d83ca",
  700: "#2875b4",
  800: "#23669d",
  900: "#1f5887",
  950: "#173f61",
}
```

Use `500` as the main brand/accent color. Keep lighter steps for focus backgrounds and darker steps for hover/active states.

### Light Scheme

Set component-level light colors in `semantic.colorScheme.light`.

- `primary.color`: main button/link/accent color
- `primary.hoverColor`: hover state
- `primary.activeColor`: pressed/active state
- `primary.inverseColor`: text/icon color on primary backgrounds
- `surface.0`: main component/card surface
- `surface.50`: subtle table/header/toolbar surface
- `surface.100-300`: borders, muted fills, disabled backgrounds
- `surface.500-900`: text and dark shell colors
- `text.color`: default component text
- `text.mutedColor`: labels, secondary copy, table meta
- `text.hoverColor`: stronger hover text
- `border.color`: component border color
- `highlight.background`: selected option background
- `highlight.focusBackground`: focus/soft selected background
- `highlight.color`: selected option text

### Dark Scheme

Set component-level dark colors in `semantic.colorScheme.dark`.

Keep this aligned with `.kvex-dark` in `src/style.css`.

- `surface.0`: app background base
- `surface.100`: card/table surface
- `surface.200`: table header/toolbar surface
- `surface.300`: input/select surface
- `surface.400`: borders
- `surface.700-900`: muted/default/strong text
- `primary.color`: dark mode accent
- `border.color`: component borders in dark mode

If the DataTable or overlays look light in dark mode, check both `semantic.colorScheme.dark.surface` and the `.kvex-dark` CSS variables.

## App CSS Tokens

File: `src/style.css`

The app CSS layer controls shell layout, Funding table surfaces, status colors, and PrimeVue component overrides.

### Light Tokens

Defined in `:root`.

- `--kvex-app-background`: page background
- `--kvex-panel-background`: card/table body background
- `--kvex-panel-muted-background`: toolbar and table header background
- `--kvex-panel-row-alt-background`: even row background
- `--kvex-control-background`: input/select/multiselect background
- `--kvex-control-text`: text inside controls
- `--kvex-control-border`: control border
- `--kvex-text-color`: table/body text
- `--kvex-text-muted-color`: labels, small meta text, table headers
- `--kvex-symbol-color`: symbol column text
- `--kvex-logo-background`: left logo block in topbar
- `--kvex-topbar-background`: topbar background
- `--kvex-accent-color`: active indicator/focus/accent
- `--kvex-success-color`: positive funding text
- `--kvex-success-background`: positive APR pill
- `--kvex-danger-color`: negative funding text
- `--kvex-danger-background`: negative APR pill
- `--kvex-focus-shadow`: focus ring shadow
- `--kvex-shell-border`: topbar/shell separator
- `--kvex-panel-border`: card/table/control border
- `--kvex-panel-hover-background`: row/option hover background
- `--kvex-panel-shadow`: card shadow

### Dark Tokens

Defined in `.kvex-dark`.

Use the same variable names as `:root`. The theme switch applies `.kvex-dark` to `document.documentElement`.

Dark mode should not depend on `prefers-color-scheme`; it is user-selected and persisted.

## Theme Switch

Files:

- `src/theme/theme.constants.ts`
- `src/theme/theme.utils.ts`
- `src/theme/theme.composable.ts`
- `src/App.vue`

The current theme is stored in localStorage under `kvex-theme-mode`.

PrimeVue dark mode is enabled through:

```ts
darkModeSelector: ".kvex-dark"
```

Do not change this back to `"system"` unless the CSS tokens also support system-driven switching.

## Component Overrides

Current app-level overrides live in `src/style.css`.

Important selectors:

- `.kvex-topbar-menu`: PrimeVue Menubar in the shell
- `.kvex-theme-switch`: PrimeVue ToggleSwitch in the shell
- `.kvex-data-surface`: Atlantis-style card surface
- `.kvex-card-toolbar`: table toolbar/filter panel
- `.kvex-table-scroll`: scroll container for lazy row rendering
- `.kvex-data-surface .p-datatable-*`: DataTable header/body/dark overrides
- `.p-select-overlay`, `.p-multiselect-overlay`: dropdown overlays rendered outside the table
- `.kvex-rate-*`: positive/negative funding colors and pills

When customizing components, prefer changing variables first. Add selector overrides only when PrimeVue tokens do not cover the specific visual state.

## Safe Change Order

1. Update `semantic.primary` and `semantic.colorScheme` in `src/theme/atlantis.theme.ts`.
2. Mirror page-level colors in `:root` and `.kvex-dark` in `src/style.css`.
3. Check topbar, card surface, filters, DataTable header/body, overlays, hover states, and funding pills.
4. Run:

```bash
vue-tsc -b
oxlint src server/src
```

5. Manually verify both light and dark modes in the browser.

## Sakai Reference

Use Sakai Vue as the primary visual reference for the app shell and PrimeVue component styling:

- `https://github.com/primefaces/sakai-vue`

Match the structure first:

- page background
- fixed topbar
- left menu surface
- card surface
- toolbar/filter surface inside cards
- muted table header
- calm row borders
- readable hover/selected states
- compact typography

Then tune exact colors from Sakai source files or the live demo.
