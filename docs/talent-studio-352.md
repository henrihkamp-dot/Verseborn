# Skills and Talents presentation

The Skills menu now has Talents and Skills views in a three-column workspace. The native talent trees, point schedule, tier requirements, free first Rank 0 choice, additional Rank 0 costs, reset access and capstone replacement rules remain authoritative. Inspecting any icon does not spend a point; the separate Learn button invokes the native progression functions and queues the native save.

Each recruited character uses their existing portrait and a distinct palette/motif. Unrecruited characters do not appear. The Skills view uses native battleSkills, costs, target descriptions and output estimates, including unlocked transformation kits. Purchased Ember Rift abilities are labeled permanently learned and are included only when their native learnedSkills flag is present.

Tinus additionally receives a third Rank 0 choice, Protective Clause: one living ally receives 25% Barrier for three actions, with a base cost of 7 MP before native cost adjustments. Existing choices and saves are preserved. His first tier already had three talents.

## Assets

- `public/game/assets/talent-studio-352/icons.webp`: 16 illustrated emblems in a 4x4 atlas, 768x768, approximately 112 KB; generated with the built-in imagegen tool and resized/compressed with Sharp. Existing game portraits are reused without altering their source files or sprite registration.
- Generation prompt: a uniform four-by-four dark fantasy RPG icon atlas, without labels or frames, containing violet daggers, hood, poison, lute, flame sword, shield, healing hand, sigil, gear, barrier, dragon, flame, stone hammer, hourglass, reticle and magical ledger. Individual icons are displayed inside code-native circular rings.
- `talent-studio.js` and `talent-studio.css` are scoped to the native Skills menu. The dormant GitHub title-modern experiment stays unloaded.

## Validation and deployment

`tools/check_talent_studio_352.cjs` exercises all eight characters, all 144 talent details, free starting choices, spending, locks, capstone replacement, purchased Rift skills, transformation kits, Tinus's extra choice, save/reload and a 1280x720 layout. Tests run in an isolated browser using fictional progress.

For the retained compact deployment bundle, run the existing runtime sync, copy this new icon atlas into `dist/client/game/assets/talent-studio-352/`, remove deployment comments, and run `tools/compact_runtime_whitespace_352.cjs`. The latter removes formatting from game.js and hall-hub.js with compression and identifier mangling disabled and verifies equivalent parsed operations before writing. Source files remain readable. This preserves headroom under the deployment archive limit without changing artwork quality or executable logic.

Publication and GitHub synchronization are separate steps; complete both after verified changes.
