# Finisher lifecycle and Flameguard targeting

The current 1.45 direct enemy damage multiplier, HP/stat formulas, player damage/healing, MP costs, Guard reduction and its 15% HP/MP/Resonance recovery are unchanged.

## Lifecycle

`finisher-flow.js` tracks the existing multi-step abilities as preparing, executing, executed or cancelled. Native ability damage and interruption/recovery values remain in their original modules. A pending Hall finisher remains registered during its execution animation; clearing it and scheduling recovery now happen after its effects resolve, rather than during AI selection. Stage/Rift/Whirlpool finishers use the same completion bookkeeping. Explicit late-boss mark movement is preserved as an ability-specific retarget.

- AoE finishers reference the party scope and create no fake single-character Hall threat status.
- Genuine single-target finishers retain their announced target. Generic taunt/random low-HP interception does not silently replace that target; explicit protection abilities remain available.
- Break, Stun, Sleep, Silence, lost marks and dead targets cancel only when allowed by the native ability rules. Oath's Break/Silence exceptions and the Root boss's Break exception remain.
- Cancellation includes the actual move name and reason, clears associated marks/flags and records feedback in the existing combat history. No new warning overlays, battlefield markers or icon systems were added.
- Dead casters clear pending marks and related recovery metadata. Delayed attack callbacks are guarded against a replaced battle.
- Battle Echo neither consumes a pending finisher nor duplicates its execution/recovery.
- Hall recovery still consumes its existing next action and applies its existing +15% physical/magic vulnerability for the existing duration. Its combat text now explains which completed/interrupted attack caused it. Rift/Whirlpool retain their native +25%/+20% interruption vulnerability and two recovery actions.
- Root's post-eruption exposed core is applied after the eruption resolves.
- Single-target Hall threat tooltips name the actual move; the developer phrase “Targeted Finisher” has been removed from player-facing text.

## Slot targeting requested during this pass

Flameguard slot weights are Rear 1, Middle 2, Front 7: 10%/20%/70% when all three are living candidates. Weights belong to positions, not character identities. Missing/dead candidates are excluded and remaining weights renormalize. Ordinary direct attacks use these weights rather than opportunistic status/HP filtering. Explicit ability targets, announced single-target finishers, taunts and protection rules retain their intended targeting; AoEs still hit their full scope. Existing slot damage/healing/ECHO bonuses are unchanged. Active Battle Party slot descriptions show the new probabilities.

## Verification

- `check_finisher_flow_298.cjs`: Armory Collapse AoE scope, full response window, no pre-impact recovery, immediate Break cancellation and no later execution, physical vs magical Silence, Stun, mark cleanse, dead caster/target, fixed single target and Echo preservation. Also invokes the real asynchronous attack engine for unguarded and guarded Armory Collapse and verifies all three party members take damage, Guard mitigates, and pending clears after impact.
- `check_finisher_modes_298.cjs`: Whirlpool prepare/execute/recovery and Silence, Rift single/AoE/cleanse and physical vs magical Silence, Root/Oath native interruption exceptions, Root recovery timing, Guidance's explicitly allowed mark movement and cleanse.
- `check_formation_298.cjs`: 10,000 evenly spaced deterministic target rolls produce Rear 1,000 / Middle 2,000 / Front 7,000. Existing slot damage/healing/ECHO, non-party behavior and menu descriptions are checked.
- `check_finisher_balance_frozen_298.cjs`: exact source comparison with the prior release for direct damage, multiplier, Guard reduction/recovery, totals, healing, developer scaling and enemy costs.

These are controlled browser/state regression checks, including real attack resolution; they are not exhaustive manual playthroughs of every boss combination.
