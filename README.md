# ChronoMap Engine

An open-source, local-first engine for scrollytelling historical maps. You write one JSON
file describing a campaign — places, forces, events, chapters — and the engine plays it:
units move along their routes, forts change hands, the camera follows the story as you
scroll, and every claim can carry its source and its uncertainty.

The format is the product. The Java War (Perang Diponegoro, 1825–1830) is the flagship
dataset; Napoleon's Russian campaign of 1812 is in the same repository, in the same
format, loaded by the same code with nothing changed but the file.

No API keys. No tile server. No account. The basemap is Natural Earth GeoJSON served
from `data/basemap/`, so the whole thing runs offline.

```
npm install
npm run build        # build the two packages
npm test             # engine tests (golden vectors + diagnostics)
npm run check        # validate every campaign in data/campaigns
npm run dev          # open the demo at the URL Vite prints
```

## What is in here

| Path | What it is |
|---|---|
| `docs/DATA-CONTRACT.md` | **The normative spec.** Time model, diagnostics, frame semantics. Read this first. |
| `schema/campaign.schema.json` | JSON Schema for structural validation (shape only; the contract carries the rest). |
| `packages/engine` | The engine in TypeScript: time parsing, loader + diagnostics, frame resolution. No DOM, no map. |
| `packages/maplibre` | The MapLibre GL renderer: basemap style, camera, layers, DOM markers and label declutter. |
| `apps/demo` | The scrollytelling app — story column, explore mode, timeline, EN/ID, drag-and-drop loading. |
| `crates/chronomap-core` | The same engine in Rust, for the WASM core. Tested against the same golden vectors. |
| `data/campaigns` | The campaigns. `java-war-1825.json`, `napoleon-russia-1812.json`, and a synthetic fixture. |
| `data/basemap` | Natural Earth land, lakes and rivers, simplified. |
| `test-vectors` | Golden output. Both engines must reproduce it exactly (floats to 1e-6). |

## The shape of a campaign file

```jsonc
{
  "chronomap": "1.0",
  "meta":     { "id": "…", "timeline": { "extent": "1825-07/1830-03" }, "map": { … } },
  "factions": [ { "id": "diponegoro", "name": { "en": "…", "id": "…" }, "color": "#8B1E1E" } ],
  "places":   [ { "id": "tegalrejo", "coordinates": [110.35, -7.78], "certainty": "exact" } ],
  "entities": [ { "id": "diponegoro-hq", "kind": "unit", "track": [ … ] } ],
  "events":   [ { "id": "battle-of-gawok", "when": "1826-10-15", "at": "gawok" } ],
  "chapters": [ { "id": "ch-06", "when": "1825-07-20", "body": { … }, "camera": { … } } ],
  "sources":  [ … ],
  "media":    [ … ]
}
```

Everything shares one ID namespace. `x-` prefixed keys and `x-` entity kinds are yours to
use; the engine carries them through untouched.

Time is an EDTF (ISO 8601-2) subset: `1825`, `1825-07`, `1825-07-20`, `1826-10-12~`
(approximate), `1830-02?` (uncertain), `1825-07/1830-03` (interval), `1825-07/..` (open
end), and negative years for BCE. Internally a tick is **signed** seconds since
1970-01-01 in the proleptic Gregorian calendar — every campaign here is negative.

## Dropping in your own history

Write a file, then:

```
node packages/engine/dist/cli.js my-campaign.json
```

Zero errors means it will play. Warnings are worth reading: they catch the mistakes that
produce a map that renders but lies — a unit whose track jumps 400 km in a day, a chapter
whose window runs backwards, an event outside the timeline extent.

Then drag the file onto the running demo. No code changes, no rebuild.

## The Rust core

`crates/chronomap-core` is a faithful port of `packages/engine`, verified against the same
golden vectors — diagnostics compared code-by-code and path-by-path, every frame field to
1e-6.

```
cd crates/chronomap-core
cargo test                      # native, no wasm toolchain needed
cargo build --features wasm     # the wasm-bindgen surface
wasm-pack build --features wasm --target web
```

A word of honesty about the WASM plan: on the datasets here, `resolveFrame` costs about
0.02 ms per frame against roughly 8 ms of draw time. The bottleneck is the renderer, not
the engine. Compile the core to WASM because you want one implementation of the semantics
in a memory-safe language, or because a much larger dataset changes the arithmetic — not
because it will make the current demo faster. Measure first.

## Licence

Code MIT. The Java War dataset is CC-BY-4.0; its sources are listed in the file itself.
Basemap from [Natural Earth](https://www.naturalearthdata.com/) (public domain).
