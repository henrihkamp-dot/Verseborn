# Verseborn — Shadow Trials III asset pack

Seven original bosses for battles **15–21**, in the Flameguard / Stonewake anime drawing style. Created with the built-in image generator, with the existing game sprites used as style references. Dark costumes and shadow elements remain part of the design.

## Included

- **112 distinct idle / taunt frames:** 16 per boss, with weapon gestures and facial expressions.
- **168 action keyframes:** four frames each for melee, magic casting, healing, guarding, ultimate and death, per boss.
- Seven separate battle arenas and seven portraits.
- The third Shadow Trials region illustration, with seven mapped destinations.
- A working animated preview: open `index.html` while keeping this folder intact.
- Lossless WebP atlases, individual transparent PNG frames, original generated source sheets, animation timing and registration metadata.

| Battle | Boss | Idle taunt |
| --- | --- | --- |
| 15 | Lady Vesper | Fan raised to her lips, teasing wink |
| 16 | Sir Rattlewick | Cocky rapier salute and cheeky eye-squint |
| 17 | Mother Morrow | Knowing smile and a beckoning staff |
| 18 | The Velvet Conductor | Impatient baton flourish |
| 19 | Saint Cinder | Challenging censer swing |
| 20 | Madame Vellum | Glasses, quill and a dismissive flick |
| 21 | The Hollow King | Proud chin and a dismissive scepter gesture |

The pitched encounters are solo boss designs; no mandatory enemy adds are needed. Decorative chairs, books, plants and clocks are part of arena art or effects, not mandatory targets.

## Animation format

`manifest.json` defines every atlas and animation track. Every frame has a 768 × 768 transparent canvas, with a common ground anchor of **(384, 600)**. Native body reference height is 300 pixels. The large transparent margins protect long weapons, capes and ultimate effects; scale by `referenceHeight`, not by canvas height.

Idle atlases have 16 columns and one row. Action atlases have four columns and six rows, in order: melee, magic, heal, guard, ultimate, death. Action frames are keyframes with explicit duration holds, not 16-frame action animations. Death ends in a held fallen pose and does not loop. Idle loops include a longer neutral rest between taunts.

All characters face the left-side party in a three-quarter battle view. Preserve the drawing perspective; do not crop by occupied bounding box on each animation frame at runtime, because doing so would make weapon movement shift the actor.

## Cutting and quality checks

Characters were separated by connected silhouette ownership, rather than blindly cutting a fixed source grid. Detached books, crowns, weapon parts and effect particles were assigned to their owning actor. All source foreground pixels were conserved before normalization and resizing. Full silhouettes are retained inside padded frame canvases.

`qa-report.json` records checks for 280 nonempty frames, sixteen distinct idle images per boss, no source silhouette contact with outer image edges, no packed frame contact with an eight-pixel outer border, and 49 exact visible-RGBA comparisons between PNG frames and lossless WebP atlas cells. `preview/pose-review.png` presents the key poses for visual inspection. All 49 animation selectors and their final frame counters were also checked in the browser.

## Third map

The new map follows the existing floating-island Shadow Trials presentation. Destinations, in order, are the clock observatory, tournament court, herbal infirmary, velvet opera, candle chapel, quill archive and empty-crown palace. `region-config.json` supplies percentage coordinates and progression metadata for integration with the existing game.

The preview supports clicking the seven landmarks, arrow-key navigation, selecting all seven animation types, stepping frames, playback speed and a transparency checkerboard. It does **not** implement combat or alter game saves.

## Publication status

This is an asset and map-preview delivery. It is **not yet integrated or deployed to the live game**. The current chat could not call the existing Sites source/deployment tools. Preserve project ID `appgprj_6a8ddb7dff3081919d58d144189cd2d8`; do not create a new Site.

The available GitHub main snapshot predates the live game's newer Shadow Trials scripts. Integrate this folder into the latest Sites checkout before deployment; do not redeploy the older GitHub game snapshot over the live version. A GitHub asset branch does not imply complete synchronization of the current live game's source.

Generated prompts and source provenance are in `prompts.json`. No source sprite, weapon or effect was replaced with a placeholder.
