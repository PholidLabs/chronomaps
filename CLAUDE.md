# ChronoMap Engine — notes for Claude Code

## Ground rules

- `docs/DATA-CONTRACT.md` is normative. Where the PRD and the contract disagree about
  data, time or engine interaction, the contract wins (see its §11–12).
- `packages/engine/src` is the executable spec. `crates/chronomap-core` is a port of it,
  not a second opinion. If you change semantics, change the TypeScript first, regenerate
  the vectors (`npm run vectors`), then make Rust match.
- Time is `i64` seconds since 1970-01-01 in proleptic Gregorian, and is negative for every
  campaign in the repo. Never `u64`. Never pass a raw `When` string to `Date`.
- Chapter bodies are untrusted Markdown. Render with the allow-list renderer in
  `apps/demo/src/dom.ts`; never assign a raw string to `innerHTML`.

## Before you commit

```
npm run build && npm test          # 7 engine tests must pass
npm run check                      # every campaign: 0 errors
cd crates/chronomap-core && cargo test   # 12 tests, golden vectors included
```

The only expected warning is `W115` on `data/campaigns/fixtures/null-island.json` — that
fixture deliberately overlaps two chapters to exercise the check.

## Layout

```
packages/engine      time.ts · campaign.ts (loader + diagnostics) · resolve.ts · engine.ts (façade)
                     worker.ts + worker-client.ts — the seam the Rust/WASM core slots into
packages/maplibre    style.ts (basemap) · camera.ts · renderer.ts · theme.ts · chronomap.css
apps/demo            index.html (landing) + app/index.html (the map app, served at /app/)
                     icons/ — favicon.svg, apple-touch, PWA icons, og.png, manifest
                     main.ts (app wiring) · landing.ts + landing-copy.ts (bilingual prose)
                     prefs.ts (theme + language, shared by both pages) · icons.ts
                     dom.ts (safe Markdown, popups, svgEl) · i18n.ts
crates/chronomap-core  time.rs · campaign.rs · resolve.rs · model.rs · wasm.rs · spatial.rs
```

Vite aliases `@chronomap/engine` and `@chronomap/maplibre` to the packages' **source**, so
the demo picks up edits without a package rebuild. `npm run check` uses the built
`packages/engine/dist`, so run `npm run build` after touching the engine.

## Things that will bite you

- **MapLibre worker.** v6 spawns its worker via `new URL('./maplibre-gl-worker.mjs',
  import.meta.url)`, which the bundler cannot see. `apps/demo/vite.config.ts` emits that
  file and `maplibre-gl-shared.mjs` into `dist/assets/` by hand, with
  `optimizeDeps.exclude: ['maplibre-gl']`. Remove either and the map renders blank with a
  404 in the network tab and no error in the console.
- **Zoom in paint expressions.** `['zoom']` is only legal as the direct input of a
  top-level `step`/`interpolate`. The Minard strength band therefore uses one clamped stop
  per integer zoom instead of wrapping the interpolation in `min`/`max`.
- **The graticule is static.** It is generated once per campaign over padded campaign
  bounds and banded by layer `minzoom`. Regenerating it on `moveend` left a rectangle of
  stale grid on screen during camera flights.
- **Labels are DOM, not glyphs**, so MapLibre's collision engine never sees them.
  `renderer.declutter()` does it: priority by kind (unit → event → fort → place), focus is
  only a tie-break *within* a kind, symbols displace place names only, and elements marked
  `data-cm-avoid` (legend, cartouche, timeline) are hard obstacles.
- **Site icons are not in publicDir.** publicDir is the repo's `data/` folder, so the
  favicon, apple-touch icon, manifest and social card live in `apps/demo/icons/` and are
  put at the site root by the `siteIcons()` plugin — a dev middleware plus `emitFile` on
  build, the same trick as the MapLibre worker assets. Drop a file in that folder and it
  is served at `/<name>`; no other wiring needed.
- **The favicon is hand-drawn, not the logo.** `logo.jpeg` scaled to 16px is a smudge —
  its 5x5 graticule and terminal dot vanish. `icons/favicon.svg` redraws the same idea at
  tab-legible weights (2x2 grid, heavier route). The raster icons *are* the real logo,
  cropped to drop its dead margin. Change one and change the other to match.
- **Two pages, two Vite inputs.** `apps/demo` is a multi-page build: the landing at `/`
  and the map app at `/app/`. Both are declared in `build.rollupOptions.input` in
  `apps/demo/vite.config.ts`. Add a page without adding it there and it will work in
  `dev` but silently vanish from `dist`.
- **Per-frame updates only.** Static geometry is installed once in `setCampaign`;
  `setFrame` touches only the small dynamic sources. Never stream GeoJSON every frame.

## Data work

Validate before committing any campaign edit:

```
node packages/engine/dist/cli.js data/campaigns/java-war-1825.json
```

IDs are one flat namespace — an entity may not share an ID with a place or an event.
Conjectural positions must say so (`"certainty": "conjectural"`) rather than being quietly
precise; the renderer draws the uncertainty as a real circle on the ground.
