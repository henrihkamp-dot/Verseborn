# Shadow Trials III — game integration

Seven solo bosses (stages 15–21), the third regional map, portraits, arenas and 16-frame character idles are integrated into the native game. Six action rows cover melee, casting, healing, guarding, ultimate and death. Existing combat mitigation, turn order, statuses and targeting remain authoritative.

The Court opens after The Custodian. First clears award 2,500–5,500 G and unlock the next boss; replays award 650 G. Party composition, HP/MP, inventory, stash, field ward and party Resonance restore after the trial. No summoned adds and no invulnerability phase.

Desktop QA: 1440 × 900. Local-only test route: `/game/?qa=shadowcourt&court=vesper` (also accepts the other encounter keys). This route seeds a disposable local test party, bypasses progression for selection, disables queued saves and raises only the test party's battle vitals. Normal entry uses the player's real progression and stats.

## Validation

- `node tools/test_shadow_court_rules.cjs`: 10 checks passed, including unique mechanics, telegraphs, interrupts and native staggered hit integration.
- `node tools/test_shadow_court_native.cjs`: 7 checks passed, covering unlock gates, one-boss native setup, restoration, rewards, replay idempotence, instant items and save/load.
- All seven encounters opened in the actual desktop combat UI, accepted commands, resolved enemy turns and returned to map III.
- Vesper: marked Mira's Defend cleared Forecast and opened +25% incoming damage.
- Rattlewick: 3 Ripostes produced four separate hits (233, 232, 229, 232 Physical in the recorded run), then cleared the stock.
- Morrow: announced Mercy; Conductor: wrong beat advanced to Magic and added enemy Resonance; Cinder: tracked 199 actual absorbed HP on the named Martyr; Vellum: displayed the active seal rule; King: disobedience reduced Authority.
- The previous sprite audit covered 280 frames, alpha contours, foot registration and atlas parity.
- The old standalone `tools/test_combat.cjs` stops at 68/70 built-in checks (`poison-turn-damage`, `buff-multipliers`). The unmodified downloaded live game produces the same 68/70 result; this harness predates the live runtime's newer status modules. This is not reported as a passing full regression suite.

## Source provenance and publication

The GitHub base was older than the live game. The 104 JS/CSS resources referenced by the existing live game were downloaded before integration, so the Court extends that runtime and retains its current Shadow II and Grumm modules. The core resolver has three targeted additions for native staggered Riposte hits; the Court adapter and rules are separate files.

This branch is an implementation checkpoint, not a verified complete mirror of the latest hosted Site. 66 missing current runtime assets observed during QA were recovered into the checkout, including the current Grumm whirlwind atlas. The local server also supplied missing assets from the public live site during QA; this fallback is QA infrastructure, not a production feature. Completeness of unvisited encounter assets is not established. Before deployment, apply the Court changes/assets to the authoritative current Sites source and verify its complete runtime assets. Preserve the existing project ID and URL.

Publication is currently blocked because the Sites connector calls return “not available to the model.” No deployment or new Site was created. Full live-to-GitHub asset parity is therefore not claimed.
