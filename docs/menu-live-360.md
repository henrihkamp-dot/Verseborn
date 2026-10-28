# Desktop menu integration

The reviewed menu layout is loaded by the normal game entry. Production startup only enables presentation: it does not recruit characters, change progression, grant gear, or write saves. The separate menu-preview entry alone initializes the fictional roster and continues to require isolated storage.

- Talent circles are larger, learned nodes retain character-colored rings and bright names, and the inspected node has a separate dashed outer ring.
- Gear and item page sizes use the available height; desktop tests at 1600x1000 show 5 gear entries and 10 items.
- System starts with Downloads; Developer also offers save/report downloads using existing export functions.
- Combat Guide includes practical planning, preparation, recovery and report chapters.
- Menu bounds follow the existing game frame. Styles apply only to the nine menu views. Moving to maps clears menu artwork and removes the presentation marker.

Validation: live-entry interaction suite, all eight talent trees and unlock/reset behavior, battle openings, demo save isolation, and no-scroll 1280x720 layouts. All four mode maps match their original computed layout, typography and button styles with the redesign stylesheet disabled. No battle, reward, portrait mapping, save schema or storage-key code changed.


## Illustrated desktop revision

- Field Archive uses visible chapter/stage buttons and Encounters / Scene Library tabs. All 21 currently supported replay actions fit together at 1280x720, subject to the existing recruitment/seen/awakening gates. Native replay handlers are moved intact; progression is not unlocked by the library.
- Only System hosts save-slot downloads and the last ten battle reports. A file-load proxy opens the existing restore picker, preserving its preview, confirmation and backup behavior. The title-screen restore launcher remains available.
- Gear gives 43% width to the character scene and 18% to a taller, slot-shaped equipment arrangement; all six native slot and lock controls remain.
- Status Overview includes the native chosen-talents, equipped-proc and duration panels, native combined affix totals, and recovery rates calculated with the existing sustain functions. One illustrated Abilities gallery retains native descriptions and calculated metrics.
- Biographies expand only the existing bios, game welcomes and current-revamp comic summaries. Verseborn is human. No new family histories, chronology or character races were invented.
- 219 distinct WebP images (256x256, 4,021,288 bytes total): 80 personal/Rift gear, 103 ability symbols including locked/form skills and future Defend buttons, 36 consumables/support items. No character figures are used in ability art. Portrait-based drafts were excluded.
- Every Torren meal, Mira coating and Kael blessing has its own effect-specific art. Images use lazy decoding/loading where rendered as images; there is no bulk preload.
- The reusable CharacterAbilityArt.source(hero, ability, form) API is available for future battle-button work. Battle animations, combat rules, rewards and save formats remain unchanged.

Sources: docs/comics/README.md; current main-series issue summaries 1-4; specials 3-6; characterBios, RECRUIT_SCENES and the current welcome-comic data; tinus-character.js. The original generated PNGs remain outside the deployed game. The icon manifest records selected source sheets by basename.
