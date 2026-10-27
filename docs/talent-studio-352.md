# Skills and Talents presentation

The Skills menu now has Talents and Skills views in a three-column workspace. The native talent trees, point schedule, tier requirements, free first Rank 0 choice, additional Rank 0 costs, reset access and capstone replacement rules remain authoritative. Inspecting any icon does not spend a point; the separate Learn button invokes the native progression functions and queues the native save.

Each recruited character uses their existing portrait and a distinct palette/motif. Unrecruited characters do not appear. The Skills view uses native battleSkills, costs, target descriptions and output estimates, including unlocked transformation kits. Purchased Ember Rift abilities are labeled permanently learned and are included only when their native learnedSkills flag is present.

Tinus additionally receives a third Rank 0 choice, Protective Clause: one living ally receives 25% Barrier for three actions, with a base cost of 7 MP before native cost adjustments. Existing choices and saves are preserved. His first tier already had three talents.

## Cohesive character scenes (354)

Each of the eight characters has a new panoramic painting with the character integrated into their own environment. A single image spans the profile, talent workspace and detail panel; lighting, foreground objects and architecture flow continuously across it. The native portrait is a fallback only. All native portrait files and sprite registrations remain unchanged. Starting skills align with the five talent tiers, and named paths, full names and established titles are retained.

The new paintings are in `public/game/assets/talent-scenes-354/` (eight 1600px WebP files, 2.12 MB total). The compact hosted deployment loads these versioned files from the same public GitHub repository, keeping the retained Sites bundle below its 256 MiB limit without reducing existing game-art quality. Normal source builds serve the local public files. Loading is asynchronous and never gates game startup. If a scene cannot load, the prior local portrait/environment remains available.

Generated with the built-in image generation tool, using each original native portrait as the identity reference and that character's environment vignette as the scenery reference. Prompt set: one cohesive panoramic 16:9 painted fantasy RPG talent-menu background, no text or UI; exact character identity, large on the left quarter, main visual focus; preserve and logically extend the environment across the whole scene; coherent perspective, contact shadows, reflected light and atmospheric overlap; no separate portrait panel or pasted cutout; painterly anime fantasy illustration; quieter dark space behind the central skills and right-side text. Mira uses moonlit gothic balcony/roses/violet daggers; Verseborn a warm musical alcove/lute/gold ribbons; Seerin white-gold sanctuary/red banners; Kael cyan rune sanctuary/deep violet shadow; Torren dwarven basalt/copper runes; Glimmer brass workshop/blue coils/pink sparks; Sparky violet crystal dragon roost/gold fireflies; Tinus midnight astral study/gold astrolabes/blue coffee energy.

## Assets

- `public/game/assets/talent-studio-352/icons.webp`: 16 illustrated emblems in a 4x4 atlas, 448x448, approximately 39 KB; generated with the built-in imagegen tool and resized/compressed with Sharp. Existing game portraits are reused without altering their source files or sprite registration.
- Generation prompt: a uniform four-by-four dark fantasy RPG icon atlas, without labels or frames, containing violet daggers, hood, poison, lute, flame sword, shield, healing hand, sigil, gear, barrier, dragon, flame, stone hammer, hourglass, reticle and magical ledger. Individual icons are displayed inside code-native circular rings.
- `environments.webp`: eight unique illustrated background vignettes, generated as a 4x2 atlas using the built-in imagegen tool: music alcove, moonlit rogue balcony, paladin sanctuary, sigil sanctuary/shadow, dwarven stonework, gnome workshop, dragon roost, and blue-gold astral study. `sanctum.webp`: an illustrated architectural backdrop behind the central tree. Neither contains replacement character art. All game portraits and animations retain their original sources.
- `talent-studio.js` and `talent-studio.css` are scoped to the native Skills menu. The dormant GitHub title-modern experiment stays unloaded.

## Validation and deployment

`tools/check_talent_studio_352.cjs` exercises all eight characters, all 144 talent details, free starting choices, spending, locks, capstone replacement, purchased Rift skills, transformation kits, Tinus's extra choice, save/reload and a 1280x720 layout. Tests run in an isolated browser using fictional progress.

For the retained compact deployment bundle, run the existing runtime sync, copy this new icon atlas into `dist/client/game/assets/talent-studio-352/`, remove deployment comments, and run `tools/compact_runtime_whitespace_352.cjs`. The latter removes formatting from the runtime scripts with compression and identifier mangling disabled and verifies equivalent parsed operations before writing. Run `tools/compact_css_353.cjs` as well to remove deployment-only CSS formatting with syntax minification disabled. Source files remain readable. This preserves headroom under the deployment archive limit without changing artwork quality or executable logic.

Publication and GitHub synchronization are separate steps; complete both after verified changes.

## Fit-to-screen refinement (355)

All six talent rows fit at once at 1280x720 and larger desktop layouts. Long skill lists use page controls rather than scrolling. Ability details and build bonuses have separate views; chosen talent details are paginated four at a time with equipped proc chances and prolonging effects directly underneath. Selected-character artwork receives a brief soft light bloom and its roster portrait stays illuminated in that character's color. Reset talents is available in the top bar using the native Kael recruitment requirement and native reset action.

The earlier shared sanctum draft is retained in source for provenance but no longer referenced or included in the compact deployment; the final full character paintings supply the central scenery.
