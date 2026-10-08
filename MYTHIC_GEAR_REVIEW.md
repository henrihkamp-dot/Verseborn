# Ember Hall 41-50 Mythic Gear Review

Local review only. This version has not been published.

## Rarity And Base-Stat Floor

Mythic is a real rarity tier above Legendary and always rolls five affixes. The ranges below compare the sum of an item's fixed base stats. Every weakest Mythic is stronger than the strongest level-40 Hall Legendary in the same slot.

| Slot | Hall Legendary range | Mythic range | Mythic floor advantage |
| --- | ---: | ---: | ---: |
| Weapon | 17-30 | 31-33 | +1 |
| Armour | 16-23 | 29-30 | +6 |
| Ring | 15-20 | 25 | +5 |
| Necklace | 16-21 | 26 | +5 |
| Helmet | 15-22 | 27 | +5 |

Mythic is integrated into loot generation, labels, inventory display, filtering and rarity sorting. It has its own cyan-white and gold-accented visual identity.

## Stage Loot Tables

Each stage has exactly four unique Mythics. Every item has an equal 25% chance whenever that stage's complete multi-phase battle is won. Previously owned items are not removed from the pool, so duplicates remain possible.

| Stage | Encounter theme | Mythic pool |
| --- | --- | --- |
| 41 | Sootline uprising, Ash Quarter thugs and angry gnome mob | **Riotbrand Maul** (weapon), **Ash Quarter Bulwark** (armour), **Gnomefire Seal** (ring), **Sootline Chain** (necklace) |
| 42 | Reverie Interdict, Shade, Nyx and the archive custodians | **Interdict Crozier** (weapon), **Archive Veil** (armour), **Margin of Silence** (ring), **Custodian's Last Circlet** (helmet) |
| 43 | Grumm, Kaeldrin, Lysra and King Maeric's Stonewake trial | **Worldsplitter Axe** (weapon), **Stonewake Crownplate** (armour), **King's Faultline Torque** (necklace), **Spellbinder Bastion** (helmet) |
| 44 | Clock Goblin, Tibby and the False Dawn locks | **Midnight Chime Cannon** (weapon), **Riot Clockwork Band** (ring), **Lockbreaker Pendant** (necklace), **Tibby's Grandmaster Goggles** (helmet) |
| 45 | Berend, Jory, Marla and the tavern mob | **Blimpstone Banquet Coat** (armour), **Last Call Signet** (ring), **Bellwick Encore Locket** (necklace), **Marla's Lantern Crown** (helmet) |
| 46 | Prince Lucan, King Maeric and the royal decree | **Cindralis Edictblade** (weapon), **Nullcourt Regalia** (armour), **Prince's Unbroken Seal** (ring), **Crown Decree Chain** (necklace) |
| 47 | Red Memory, Tja, the Last Sentinel and Frostmile | **Red Memory Halberd** (weapon), **Sentinel Emberplate** (armour), **Frostburn Signet** (ring), **Tja's Winterflame Crown** (helmet) |
| 48 | Nyx, the Scribe, the Custodian and the unwritten archive | **Unwritten Quillblade** (weapon), **Vael's Black Index** (armour), **Nameless Archive Chain** (necklace), **Nullscript Halo** (helmet) |
| 49 | Full-company reprise with Shade, Grumm, Tja, Kaeldrin, Lysra, Jory, Maeric, Marla and Rava | **Reprise Company Mantle** (armour), **Hall of Names Signet** (ring), **Final Company Medallion** (necklace), **Reprise Command Crown** (helmet) |
| 50 | Frostmile Wyrm, Ember Leviathan and Solinar's final sunrise | **Solinar's Frostfire Greatsword** (weapon), **Eclipse of Solinar** (ring), **Confluence Heart** (necklace), **Final Sunrise Crown** (helmet) |

## Slot Distribution

The 40-item pool is evenly divided:

| Slot | Count |
| --- | ---: |
| Weapon | 8 |
| Armour | 8 |
| Ring | 8 |
| Necklace | 8 |
| Helmet | 8 |

## Three-Piece Sets

All bonuses reuse mechanics that already exist in the game. A bonus activates only when all three distinct pieces are equipped.

| Set | Three pieces | Three-piece bonus |
| --- | --- | --- |
| Ashen Insurrection | Riotbrand Maul, Ash Quarter Bulwark, Gnomefire Seal | 10% additional chance to Stun on hit |
| Forbidden Margin | Interdict Crozier, Margin of Silence, Custodian's Last Circlet | Inflicted statuses last +1 turn |
| Stonewake Crown | Worldsplitter Axe, Stonewake Crownplate, King's Faultline Torque | +2 stagger on weakness hits |
| Clockwork Riot | Midnight Chime Cannon, Riot Clockwork Band, Tibby's Grandmaster Goggles | +20% opening turn progress |
| Tavern Refrain | Blimpstone Banquet Coat, Bellwick Encore Locket, Marla's Lantern Crown | +25 Resonance at battle start |
| Royal Decree | Cindralis Edictblade, Prince's Unbroken Seal, Crown Decree Chain | +22% status application chance |
| Frostburn Old Guard | Red Memory Halberd, Sentinel Emberplate, Tja's Winterflame Crown | 18% stronger personal guard |
| Unwritten Names | Unwritten Quillblade, Vael's Black Index, Nameless Archive Chain | 8% skill Echo turn progress |
| Company Reprise | Reprise Company Mantle, Hall of Names Signet, Final Company Medallion | +20% damage against afflicted targets |
| Final Sunrise | Solinar's Frostfire Greatsword, Eclipse of Solinar, Final Sunrise Crown | +25% weakness damage |

Each set piece has exactly the same 25% chance as the standalone fourth item in its stage. There are no guarantees, weights, pity systems or duplicate protection.

## Existing-Save Migration

On load, each old Platinum item is converted to a Mythic item of the same slot. Existing separate item instance IDs remain unchanged, so equipped references remain valid. The migration changes only the base item name and rarity while preserving the full affix list and any stored upgrade or Echo-state fields. It does not reroll affixes and does not reset save data.

Older non-instance save entries are converted into separate Mythic copies with their existing affixes copied exactly. The new Mythic base item then supplies the higher base-stat floor.

The word `Platinum` remains only as an internal legacy-save token so old saves can be recognized. It is not shown in current loot, labels, filters or UI.

## Validation

- Existing runtime QA: 70/70 passed.
- Expanded combat and gear QA: 132/132 passed.
- Production build completed successfully.
- Ember Hall stages 1-40 continue through their existing reward code and tables.
- No deployment or publication has been performed.
