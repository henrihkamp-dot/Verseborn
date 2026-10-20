# Ember Hall encounter revamp — implementation report (v301)

1. **Compositions.** All 60 encounters now match the requested formation baseline. Changed stages: 3, 7, 8, 22, 24, 25, 28, 29, 31, 33, 34, 36, 41, 42 and 43. Existing enemy names, art, recruitment gates and reward systems remain. Story Dock Foreman now has one Brokk support.
2. **Phases.** Removed redundant extra waves at 22, 24, 28, 31, 33, 34 and 36. Stage 25 now opens with Clock Goblin + Lord Sprocket, followed by Sentinel + Goblin. Stages 41–43 have two phases; 44–49 have three; 50 retains its four solo phases. Stage 20 remains the first major two-phase boss.
3. **True solos.** King Maeric's Stage 35 opening and all four Stage 50 phases remain solo. Story Dawn Gate Sentinel remains solo, with its existing Hold the Line / Sentinel Ward / Last Gate Protocol kit. Stage 1 and Stage 21's opening remain ordinary learning solos, not promoted bosses. No extra full turns were added.
4. **Summons.** Stage 26 Shade uses Veil Recall once, on its first eligible normal action at or below 65% HP, creating one small Shadow Echo (16% of boss HP; grants +10% AGI for two actions). Story Archive Custodian uses Archive Recall once after two completed actions: Archive Seal (12% HP; +12% defense) and Record Wisp (12% HP; cleanse or +8% defense). Summoning consumes the boss action and inflicts no bonus pressure hit. A prepared/executing finisher takes priority; Silence prevents the summon action. Existing status rules govern adds. Silenced adds lose utility and use a weak basic strike.
5. **Boss + support.** Existing Dock Foreman/Brokk, Custodian/Seal Bearer, Kaeldrin/Lysra, Dragon Lord/Ash Wyrm and the thematic final formations at 51–60 remain. Normal pre-existing supports must still be defeated after their boss dies. Pure summons are dismissed when their owner dies and grant no extra XP/loot.
6. **Stage 41–50 curve.** The advanced blend is `clamp((stage - 41) / 9, 0, 1)`. Opening HP bonus rises from 0% at 41 to 12% at 50; attack-stat bonus from 0% to 8%. Existing per-phase advanced bonuses (+8% HP / +4% attack at full strength) use the same blend. Base stage progression is unchanged. Stage 50 and 51–60 stats match the prior release. A separate elite-gauntlet encounter tier labels 41–49; legacy reward/music/boss-resistance flags are intentionally retained, avoiding incidental status or reward changes from presentation labels.
7. **Solo visuals.** Live formation determines presentation, including when normal companions die. Regular solos use 1.17x, elites 1.28x, bosses roughly 1.4–1.45x; naturally large monsters use smaller added multipliers (typically 1.2–1.28x). Existing finale scaling is retained. Actual opaque bounds cap height below the timeline. Solos move toward 73% battlefield width / 70% depth, with a subtle enlarged shadow. Scale and position interpolate when adds appear or die; idle motion remains native. Death freezes the current scale/position. Cards, click bounds, damage numbers and VFX anchors follow the same measured sprite. No stats change because a unit is alone.
8. **Files/functions.** `game.js`: HALL_BATTLE_BLUEPRINTS, hallEnemiesForStage, drawBattleScene phase captions, winBattle summoned-loot exclusion. New `hall-encounters.js`: data-driven summon plans, one safe summon path, owner-death cleanup, native AI/effect hooks, encounter labels and phase titles. `battle-command.js`: solo presentation, smooth live-slot positions, bounds-aware cards/hit/VFX anchoring. `encounter-overview.js`: compact tier/phase/summon hint. `index.html`: module and cache updates.
9. **Verification.** `tools/check_encounters_301.cjs`: validates all keys/counts; representative 1/5/10/20/21/26/35/40/41/44/50 and 51/55/58/60 encounters; real phase transitions; preserved 50–60 stats; one-shot summons, burst-to-1-HP trigger, death dismissal, living support persistence, turn-order insertion, cap, silence, no summon reward/phase leakage; actual asynchronous summon without damage; real double-click attack against enlarged Maeric; screenshot bounds for beginner, humanoid and large monster solos. Existing v299 Break/finisher suites and v300 retreat tests pass. Exact source comparisons protect damage, Guard, healing, skill coefficients, Break, status, Echo, targeting, intercept and bespoke boss functions. Runtime syntax and diff checks pass. These are focused regression/playtests, not a full human balance playthrough of every stage.
10. **Art/content.** No new art and no placeholders. Summons reuse Shade, Seal Bearer and Thaddeus sprites at reduced scale. Distinct optional summon artwork can be added later but is not required. No known missing content blocks this implementation.

## Advanced opening bonuses

| Stage | Added HP | Added attack stat | Phases |
|---|---:|---:|---:|
| 41 | 0.00% | 0.00% | 2 |
| 42 | 1.33% | 0.89% | 2 |
| 43 | 2.67% | 1.78% | 2 |
| 44 | 4.00% | 2.67% | 3 |
| 45 | 5.33% | 3.56% | 3 |
| 46 | 6.67% | 4.44% | 3 |
| 47 | 8.00% | 5.33% | 3 |
| 48 | 9.33% | 6.22% | 3 |
| 49 | 10.67% | 7.11% | 3 |
| 50 | 12.00% | 8.00% | 4 |

## Final encounter composition register

| Stage | Encounter | Phases (→) |
|---|---|---|
| 1 | Sootline Opening | Slobbo |
| 2 | Chain Runners | Slobbo + Slobbo |
| 3 | Dock Ledger Patrol | Brokk + Slobbo |
| 4 | Ink in the Rain | Slobbo + High Administrator Thaddeus |
| 5 | The Dock Foreman | Dock Foreman + Brokk |
| 6 | Courtyard Seal | Gorg + Corrupt Clergy |
| 7 | Dormitory Scribes | High Administrator Thaddeus + Seal Bearer |
| 8 | Saint Justin | Saint Justin + Corrupt Clergy |
| 9 | Clergy Lockdown | Brokk + Inkbound Auditor + Corrupt Clergy |
| 10 | The Archive Custodian | Archive Custodian + Seal Bearer |
| 11 | Crown Step Construct | Gorg + Saint Justin |
| 12 | Registry Faultline | Cracked Pillar + Slobbo + Seal Bearer |
| 13 | The Unbreakable | Grumm + Seal Bearer |
| 14 | Spellbinder Trial | Lysra + Inkbound Auditor |
| 15 | The Ex-Rank | Kaeldrin + Lysra |
| 16 | Buried Hall Memory | Ash Wyrm + Gorg + Seal Bearer |
| 17 | Armory Collapse | Cracked Pillar + Grumm + Archive Custodian |
| 18 | Elder Plumpin | Elder Plumpin + Saint Justin + Ash Wyrm |
| 19 | Resonance Breach | Grumm + Ash Wyrm + Seal Bearer |
| 20 | The Red Dragon Lord | Kaeldrin + Seal Bearer → Red Dragon Lord + Ash Wyrm |
| 21 | Clock Goblin Patrol | Clock Goblin → Clock Goblin + Lord Sprocket |
| 22 | Calibration Locks | Lord Sprocket + Clock Goblin + Gorg |
| 23 | Baron Revus Veln | Baron Revus Veln + Clock Goblin |
| 24 | Seal at the Gate | Dawn Gate Sentinel + Lord Sprocket |
| 25 | Last Gate Protocol | Clock Goblin + Lord Sprocket → Dawn Gate Sentinel + Clock Goblin |
| 26 | The Shadow's Edge | Shade |
| 27 | Stone and Shadow | Grumm + Shade → Grumm + Shade + Lysra |
| 28 | Quiet Refrain | Nyx Vael + Jory Bellwick |
| 29 | Cinderhorn Convergence | Rava + Lysra + Ash Wyrm |
| 30 | Full-Rank Company | Kaeldrin + Shade + Grumm → Nyx Vael + Jory Bellwick + Lysra |
| 31 | Audit of the Forbidden | Inkbound Auditor + Archive Custodian + High Administrator Thaddeus |
| 32 | Cinderhorn Hunt | Rava + Red Dragon Lord |
| 33 | The Quiet Archive | Nyx Vael + Archive Custodian + Shade |
| 34 | Winter Spellbinders | Tja + Lysra + Jory Bellwick |
| 35 | Crown of Cindervale | King Maeric → King Maeric + Dawn Gate Sentinel + Kaeldrin |
| 36 | Three Unwritten Names | Shade + Nyx Vael + Jory Bellwick |
| 37 | Stonewake Rebellion | Grumm + Rava + Kaeldrin → Rava + Kaeldrin + Lysra |
| 38 | Royal Winter | Tja + King Maeric → Tja + King Maeric + Dawn Gate Sentinel |
| 39 | The Final Archive | Archive Custodian + Dawn Gate Sentinel + Red Dragon Lord → Dawn Gate Sentinel + Lord Sprocket + Clock Goblin |
| 40 | Hall of Forty Echoes | King Maeric + Kaeldrin + Dawn Gate Sentinel → King Maeric + Grumm + Tja |
| 41 | Sootline Uprising | Angry Gnome Mob + Ash Quarter Thugg → Slobbo + Brokk + Ash Quarter Thugg |
| 42 | Reverie Interdict | Corrupt Clergy + Saint Justin → High Administrator Thaddeus + Archive Custodian |
| 43 | Stonewake Last Trial | Grumm + Gorg → Kaeldrin + Lysra |
| 44 | Clockwork Riot | Clock Goblin + Lord Sprocket → Tibby + Ash Quarter Thugg → Gorg + Lord Sprocket + Clock Goblin |
| 45 | Tavern Refrain | Angry Gnome Mob + Tibby → Berend Blimpstone + Jory Bellwick → Marla + Berend Blimpstone + Angry Gnome Mob |
| 46 | Noble Decree | Baron Revus Veln + Saint Justin → Prince Lucan Cindralis + King Maeric → Prince Lucan Cindralis + Red Dragon Lord + King Maeric |
| 47 | Ember Old Guard | Elder Plumpin + Tja → Red Dragon Lord + Brokk → Dawn Gate Sentinel + Red Dragon Lord + Tja |
| 48 | Names in the Archive | Nyx Vael + High Administrator Thaddeus → Archive Custodian + Prince Lucan Cindralis → Saint Justin + Baron Revus Veln + Nyx Vael |
| 49 | Company Reprise | Shade + Grumm + Tja → Kaeldrin + Lysra → King Maeric + Marla + Rava |
| 50 | Solinar's Final Sunrise | Frostmile Wyrm → Ember Leviathan → Solinar → Solinar (Enraged) |
| 51 | Nocturne Reception | Dawn Gate Sentinel + Seal Bearer → High Administrator Thaddeus + Archive Custodian + Sir Reginald → Concierge Veyr + Seal Bearer + Dawn Gate Sentinel |
| 52 | Sanctuary Under Pressure | Corrupt Clergy + Saint Justin → Lysra + Seal Bearer + Saint Justin → Sister Maelin + Saint Justin + Seal Bearer |
| 53 | The Final Inspection | Inkbound Auditor + Archive Custodian → High Administrator Thaddeus + Sir Reginald + Seal Bearer → Guild Inspector Voss + Inkbound Auditor + Seal Bearer |
| 54 | The Starless Passage | Ash Wyrm + Cracked Pillar → Elder Plumpin + Gorg + Ash Wyrm → Draconic Guide + Ash Wyrm + Cracked Pillar |
| 55 | The Memory Root | Gorg + Cracked Pillar → Elder Plumpin + Ash Wyrm + Gorg → Memory Root Guardian + Cracked Pillar + Elder Plumpin |
| 56 | The Strange Refrain | Tja + Tibby → Jory Bellwick + Lysra + Nyx Vael → Malkhius + Tja + Jory Bellwick |
| 57 | Mistress of Nocturne | Shade + Nyx Vael → Archive Custodian + Lysra + High Administrator Thaddeus → Lady Morvanna + Nyx Vael + Archive Custodian |
| 58 | Trial of Iron | Brokk + Cracked Pillar → Grumm + Kaeldrin + Sir Reginald → Koru-Vak, the Iron Oathkeeper + Grumm + Brokk |
| 59 | The Last Chorus | Jory Bellwick + Tja → Lysra + Saint Justin + Jory Bellwick → Selyra Quill, the Grand Cantor + Jory Bellwick + Saint Justin |
| 60 | The First Record | Inkbound Auditor + High Administrator Thaddeus + Archive Custodian → King Maeric + Prince Lucan Cindralis + Dawn Gate Sentinel → Ilyss Vanthe, the First Archivist + Archive Custodian + Inkbound Auditor |
