# Status Interaction Rules

## Enemy identities

`status-system.js` defines role profiles and named overrides, using the existing enemy definitions and ability roles. Values are application multipliers: 1 is normal, below 1 is resistance, above 1 is relative susceptibility. Enemy level does not impose blanket status resistance. Bosses have stronger hard-control resistance, but DoTs and soft debuffs retain their own profiles. Existing explicit encounter immunities remain, including Sleep/Stun immunity for Stage 51-60 main bosses. Ordinary boss control recovery is unchanged.

Examples:

| Enemy | Poison | Sleep | Stun | Defense Down |
| --- | --- | --- | --- | --- |
| Shade | 1.00 | 0.20 | 1.15 | role baseline |
| Nyx Vael | 1.15 | 0.40 | 0.40 | role baseline |
| Archive Custodian | 1.00 | 0.95 | 0.90 | 0.30 |
| Dawn Gate Sentinel | 0.85 | 0.65 | 0.30 | 0.70 |
| Red Dragon Lord | 0.35 | 0.80 | 0.35 | 1.15 |

The enemy lexicon and battle hover panels show these profiles.

## Offensive actions

An action transaction collects all eligible gear sources for each hit target. Additional hits only update the target's crit/Break eligibility; they never add another roll. Duplicate sources add their base chances, capped at 45% for control, 65% for DoTs, and 85% for softer negative effects. Status-chance support modifies that one attempt before resistance. Final application chance is capped at 95%.

Basic weapon negatives and Mira's Coatings are included in this same resolver. Coatings and basic-weapon effects remain basic-only. Explicit trigger categories are damaging action, weapon/STR hit, spell hit, basic attack, critical hit and Break action. Weapon Venomous/Stormbreaking are weapon/STR triggers; Drowsing is a spell trigger. Armour and accessory seals explicitly use damaging actions. Existing mixed builds retain every affix; the resolver consolidates only attempts of the same type.

Ability-native statuses are independent. Each declared native source uses its own chance, duration and normal resistance interaction, with one attempt per target per action. A skill and a distinct talent can each have their intentional attempt; additional hits do not repeatedly roll the same source. A native Poison and supplemental gear Poison may each attempt to apply, but multiple equipment sources never create multiple equipment rolls. Supplemental gear never shortens or weakens an already-active native status. Break and forced encounter rules are preserved; offensive status talents use their explicit chance and target resistance rather than a pre-roll followed by forced application.

Mira's temporary Stun Focus doubles the consolidated base chance after its ordinary gear cap, before application support and target resistance. It never adds another roll.

## Defensive systems

- Application resistance: specific and broad gear use diminishing returns. Broad gear resistance is capped at 30%; combined gear resistance at 60%. Talents and temporary wards remain separate. Ordinary stacking never grants immunity.
- Duration reduction: applied only after a successful application; capped at two actions, with a one-action minimum. Cruel increases inflicted negative durations; Prolonging only increases positive buff durations. Sleep has a five-action maximum and Stun remains one action.
- Severity reduction: reduces only the named DoT or scalable debuff. Poisonward now protects against Poison damage, not application and not Burn/Bleed. Bloodward protects against Bleed. Stat-debuff protection does not prevent hard control.
- Immunity: explicit encounter/rare-item effects only. Stage 51-60 boss hard-control immunity is preserved.

Nullcourt Regalia's broad protection is reduced to 12%; its second intrinsic status effect shortens the first reducible control effect. Random Steadfast remains ordinary duration protection, so the two are no longer identical permanent modifiers. Veil of the Last Archivist's 40% Sleep protection and Helm of the Worldroot's 50% Stun protection remain valuable specialist effects.

Kael's Composure shortens each ally's first reducible negative status. Purity halves each ally's first Poison/Bleed tick. Neither grants massive flat broad resistance.

## Migration and generation

Owned affixes, instance affixes and stored shop offers receive a deterministic, versioned migration. Affix keys and relative roll quality are preserved while affected status roles/ranges/text are updated. No gear is deleted; IDs, rarity, copies, unrelated stats/affixes and progression are unchanged. The earlier equipped-only inventory-cleanup migration is no longer run when loading saves. Broader legacy gear conversions, rarity upgrades, affix top-ups and base-stat rerolls are bypassed on this status-migration load path; unrelated historical gear is retained as stored.

New random items receive at most one offensive proc affix/family and one application-resistance affix. Status-support and severity/duration affixes can synergise with it. Broad resistance is restricted to Legendary+ random generation. Named effects and explicit mixed-status items remain possible. Existing mixed items are not stripped. Top-ups and reforging follow the same combination restrictions. Themed drops and the selected build favour compatible proc families without hard-locking them.

## Results and reports

Untriggered random gear does not produce a misleading resisted message. Genuine resisted or immune attempts remain visible. Each target gets one compact summary of applied, shortened, resisted and immune statuses. Cleanses, expiration and Break feedback remain intact. Battle reports keep the human-readable summary and also store structured per-target outcomes with `ability`/`gear` origins.

Validation: `tools/check-status-system.cjs` covers the requested 21 scenarios plus defensive separation, quiet misses, compact logs and Kael compatibility. Log replay tests use the uploaded Hall 36/38/39 equipment snapshots. Existing save checks run in isolated browser storage; original exported files are never edited.
