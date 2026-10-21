# Ember Hall Resonance map assets

All thirteen supplied images were inventoried before implementation. Their hashes, dimensions and implementation roles are in supplied-inventory.json. No incoming files are duplicates. The prior Hall hub, animation and combat art remains in place; no suitable six-region map set existed in it.

## Region sources

| Stage range | Region | Supplied source | Runtime background |
|---|---|---|---|
| 1–10 | The Ashen March | 90c66609-ab0e-4ebd-9204-6afeecd8dd2d | ashen-march.webp |
| 11–20 | The Crownspire | 49038ee9-d220-460d-a640-d916fcd598fe | crownspire.webp |
| 21–30 | The False Dawn Circuit | f93e256d-394f-4bd8-814c-e68eb4f5e5f8 | false-dawn-circuit.webp |
| 31–40 | The Hall of Echoes | 0b8af08f-1ddd-4916-a363-eeace8c0fcfe | hall-of-echoes.webp |
| 41–50 | The Broken Ascension | 6c28ee4f-cb5c-4286-89ea-d038efa6f815 | broken-ascension.webp |
| 51–60 | The Resonance Depths | f400b7ea-a3e7-4d49-ab41-15822d4d5fd9 | resonance-depths.webp |

Crownspire and Hall of Echoes received minimal built-in image_gen cleanup to remove baked stage numerals. All stage labels, names, state and rewards are dynamic. Original inputs and full-resolution clean outputs are retained in outputs/ember-hall-supplied-assets outside the deployment archive.

## Extracted supplied artwork

- f67ac7b3: all six dormant/awakened architectural boss landmarks, twelve cutouts. Caption plaques excluded.
- daad41a8: physical locked, available, selected, cleared and elite plinths. Only the cream atlas gutter was removed. The overview board itself is never displayed as a screenshot.
- 0f124072: arrival Resonance Gate; also extracted brazier, banner and straight/curved route pieces for reuse.
- 301486d9: ornate information-frame edges and a decorative divider used on the region title/info panel.
- b22a0841: circular indicators were inspected but not used as world fixtures: the brief explicitly requires physical places rather than circular UI nodes.
- 800fa939 and b745adc2: composition/state/legend references only. Their flattened pitch-board UI is not embedded.

Not all environment cutouts are displayed: the six landscapes already contain their bridges, stairs, banners and braziers. Adding another complete set would double the architecture and obscure the supplied composition. The extracted spare pieces remain available in the source asset folder. Existing roads remain physical artwork; SVG only adds state-dependent route light. The complete Resonance Machine remains the existing hub device; each map has a smaller arrival gate.

## Cleanup prompts — built-in image_gen

### Crownspire
Edit target: supplied Crownspire game map. Precise minimal cleanup, preserve the entire landscape, composition, exact stairs/platform positions, dragon rooftop, painterly comic art and all lighting. Remove ONLY all baked-in golden stage numbers/text (11,12,13,14,16,17,18,19,20) from above the beacons/platforms, replacing the numerals with the matching background stone/sky. Keep the glowing beacons, route, dragon and all architecture unchanged. Output the same wide landscape without ANY text, numbers, labels or UI. This is a production map background used with dynamic HTML stage labels; do not redesign.

### Hall of Echoes
Edit target: supplied Hall of Echoes game map. Precise minimal cleanup preserving the whole composition, exact bridges, concentric galleries, platform positions, floating mirror shards, central violet cathedral and painterly comic style. Remove ONLY every baked-in golden stage number/text 31 32 33 34 35 36 37 38 39 40 from above the platforms, replacing each numeral with matching stone/architecture/sky. Keep all glowing beacons, golden route circles, stairs, platform locations and all environment unchanged. Output same wide landscape as a clean background with absolutely no text, numbers, labels or UI. Do not redesign.

## Packaging

Runtime art is WebP, with 1360px region backgrounds. Source PNGs are preserved outside the compact runtime. Three byte-identical unused Ash Wyrm aliases plus five unreferenced/superseded runtime assets were excluded from dist/client; originals remain in public/game/assets. The canonical stable Wyrm atlas and every currently referenced character, effect and gear atlas remain available.
