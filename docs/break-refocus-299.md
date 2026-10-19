# Break: offensive setup, not generic control

Removed generic Break interruption from Hall, stage combinations, Sanctuary/reception support control, Rift, Whirlpool and shared finisher bookkeeping. Broken no longer cancels pending finishers, substitutes a recovery action, grants interruption vulnerability, strips Rift defence buffs or disables generic escort protection. Corresponding warnings/hints now describe Stun, valid Silence and mark cleansing instead. The recently added finisher lifecycle remains intact.

Unchanged: Break threshold/scaling, buildup, STR-based bonus damage, Foundation Break damage and AoE talent conversion, Rockslide's +20% physical payoff, skill/gear/status-on-Break procs, boss ability to receive Broken, enemy HP, the 1.45 direct-damage multiplier, Guard/recovery, costs, Resonance, Echo, targeting, Taunt, intercept and UI layout. No immunity streaks or new resistance rules were added.

## Explicit exceptions preserved

- Torren's Ring of the Moving Mountain explicitly upgrades Foundation Break with one extra base Break and 15% Physical Vulnerability. This remains an equipment effect, not a Broken default.
- Memory Core and Broken Oath are distinct, named boss damage-window/shield mechanics in `endgameBossBroken`. They remain and do not cancel their pending finishers.
- The Rift Warden's specific escort shielding still responds to Broken. This is a local shield/damage interaction, not action denial or a generic recovery state.
- A separately applied Stun/Silence from an explicit skill or gear proc can still interrupt where that status is valid. Broken itself cannot do so.

The former shared Rift Break hook affected every Rift enemy (interrupt, two recovery actions and defence-buff removal). It was removed rather than retained as a hidden generic rule behind the old encounter hint.

## Broken duration

The declared duration remains one affected-unit action. Enemy Broken's countdown now waits until at least one subsequent living, non-Stunned/non-Sleeping Flameguard action has completed. The applying action itself does not count. This prevents an immediately following enemy action from erasing the offensive setup before the party has a follow-up opportunity. The enemy still acts normally, and normal expiry resumes after that opportunity. Player-side Broken timing is unchanged.

## Verification

- `check_break_refocus_299.cjs`: retains the previous lifecycle tests, replacing the superseded generic Break-cancellation expectation with pending/execute-after-Broken checks. Also verifies valid Stun/Silence, cleanse, fixed targets, dead actor/target cleanup, Echo isolation, AoE impact and Guard mitigation. Deterministic target rolls remain 1,000 Rear / 2,000 Middle / 7,000 Front out of 10,000.
- `check_break_modes_299.cjs`: Break buildup/bonus, absence of free vulnerability/action loss, Rockslide payoff, Foundation Quake AoE, explicit ring bonus, active Broken boss, Rift/Whirlpool pending survival and execution, unchanged Rift mark/defence buff, follow-up window and normal expiry.
- `check_foundation_break_299.cjs`: drives the actual asynchronous Foundation Break engine against a preparing Cracked Pillar. Recorded 74 damage in the controlled fixture, including 6 Break bonus damage; Broken applied, recovery/vulnerability stayed zero, and the prepared finisher remained executable. These fixture values are regression observations, not a new damage formula.
- `check_break_balance_frozen_299.cjs`: exact prior-release comparison of Break/damage/skill functions, explicit boss hooks, Guard, costs/healing, 70/20/10 targeting, intercept, Echo, status proc module and UI placement.

Older version-298 tests that assert generic Break cancellation document the superseded design. The version-299 suites are the current Break specification. These are controlled regression tests, not exhaustive manual playthroughs of every loadout.
