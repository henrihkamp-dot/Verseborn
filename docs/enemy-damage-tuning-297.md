# Enemy direct-damage tuning

Local tuning candidate: `ENEMY_DIRECT_DAMAGE_MULTIPLIER = 1.45` in the shared `enemyDamageRoll` calculation.

Applies once to basic attacks, physical skills, spells, enemy Echo actions, Ultimates and rolled boss pressure damage. Existing coefficients, criticals, vulnerabilities, formation effects, Guard and action hierarchy are retained. Rift/Whirlpool wrappers still enforce their existing burst ceilings after the roll, so already capped hits need not increase by 45%.

Excluded: Burn/Poison/Bleed ticks, fixed scripted retaliation, percentage/fixed environmental mechanics, Break's separately added bonus, healing, MP effects, status probabilities and resource recovery. Enemy HP, player offense/healing, initiative, Resonance, costs, UI and warning systems are unchanged. No boss-specific additional multiplier was added.

## Verification

`tools/check_enemy_pressure_297.cjs` compares two isolated browser sessions against the same source, with only the multiplier changed to 1 in the baseline session. It uses deterministic random rolls and three party compositions: Mira/Glimmer/Sparky, Torren/Seerin/Tinus, and Verseborn/Kael/Torren. All have level-40 progression with the QA scenario's existing equipment/talents. This is a controlled damage/action-selection simulation, not complete manual playtesting or a guarantee for every progression loadout.

Samples Hall 1 (normal), Hall 13 (elite), Hall 25 (boss), Hall 51, Rift 1 and Whirlpool 1. Across 54 target/encounter cases, tests compare 216 direct rolls (physical, magic, Echo and Ultimate), defensive reductions, DoT ticks, enemy/player HP/MP, player basic output, healing, skill costs, Resonance and AGI. Actual move selection is additionally sampled for eight action counts per encounter/composition, including AoE actions. Baseline/new invariants must match exactly; uncapped opening Hall probes must rise approximately 45%, allowing integer rounding. Capped rolls must not be scaled a second time.

Results: 154 direct probes increased; 62 were already limited by existing caps/rounding. All invariant and Guard checks passed. Detailed reproducible output is stored outside source at `outputs/enemy-pressure-297.json`.

## Outliers retained for review

- Late Hall 51 coefficient-1/1.9 stress probes exceed full HP for several lightly equipped QA heroes (Mira: 160%/260%; Verseborn: 132%/214%). These are synthetic raw-damage stress probes, not a claim that those exact coefficients are the boss's normal selected action. The old baseline was already above full HP for some of these probes. Do not treat a successful regression test as approval of every late-game loadout.
- Hall 25 stress probes reach about 61–66% on Mira/Glimmer, above the rough ordinary-attack target. Actual selected moves in the same sampled setup reached at most about 61%. This deserves a progression-appropriate gear check before further per-enemy tuning.
- Whirlpool's existing 65% ultimate ceiling can reach about 75% in the Rear slot because the existing incoming-damage slot modifier is 1.15. This interaction predates this pass and remains unchanged; Middle stays at 65%, Front at roughly 55%. Its current 45% regular ceiling behaves similarly (about 52%/45%/38%).
- Rift remains limited by its original ceilings; saturated damage does not gain the full 45%. This intentionally preserves its existing burst protection.
- No new global damage cap, automatic execute protection or encounter redesign was introduced. Defend's reduction and 15% HP/MP/Resonance recovery remain intact.
