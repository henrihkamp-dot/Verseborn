# Interactive menu concepts (356)

Preview: `/game/menu-preview.html`. The default game route retains its existing menu implementation. The preview loads the same game/menu functions into an iframe, then rearranges original live elements; it does not clone native controls or replace their game logic.

## Save isolation

The launcher first fetches and verifies the storage bootstrap and game HTML. The iframe runs the bootstrap before it can write the game document. The game document is written only after the isolation flag is set. Both browser Storage objects redirect reads/writes/deletes/clear/enumeration to `verseborn-menu-concept-356:`. IndexedDB open/delete/database listing use the same isolated namespace. An isolation failure prevents the native game from starting in the preview. The preview initializes fictional progress and inventory each time, with seven normal recruits; Tinus remains available through the native developer recruit control. A persistent top control reopens the menus if a native session/replay action leaves them.

## Native functionality retained

- Status: full identity, specialties, active position, XP, core/output stats, biography, selected talents, equipped proc rates, prolonging effects, all normal/form abilities, stat impacts, caps and glossary.
- Party: all three positions, actual formation bonuses, selecting slots, assigning members, removing members and the complete roster.
- Gear: all six slots including Destiny Ring II, per-slot locks, hero selection, search, slot/rarity/usability/equipped filters, fixed-stat and affix matching modes/checks, sorting, counts, empty/unequip selection, item effects, modifiers, comparison, impact per skill, attribute changes, favorites, individual/team optimization priorities/pools/member selection and equip/unequip actions.
- Items: wallet, bag capacity, ward state, all native categories including field skills/stash, gear tools, item details, targets and use/cast actions, favorites and Open in Gear.
- Combat Guide: all thirteen native topics, roles and the entire status/mechanic icon catalogue.
- Bestiary: all sixty stages, phases/enemies, native statistics, resistance/status notes, rules/rotations, complete move data and recruitment/arrival scene replays.
- System: native sound/autoplay controls, save/session action, both demo-slot exports, battle report exports and original save-file restore picker (writes remain demo-isolated).
- Developer: all party/enemy tuning sliders, gold/shard changes, gear test sets, character level/recruitment/mode unlocks, completion toggles and missing stage reward recovery.

Long lists and reference sections use explicit page/section controls. The desktop overview fits 1280x720 and 1600x1000 without outer scrolling. Native event handlers remain attached when elements are moved. The test captures button/input/select/textarea elements before layout and checks that none were discarded.

## Artwork and bar consistency

`public/game/assets/menu-scenes-356/` contains 24 distinct full illustrations: separate Status, Gear and Party artwork for each of eight characters. Five additional backgrounds cover Items, Combat Guide, Bestiary, System and Developer. The original Talent scenes remain unique to Skills. The preview uses exactly the Skills bar padding, typography, size, background, underline and character accent colors.

Artwork was generated with the built-in imagegen tool, using the unchanged native character portraits solely as identity references. Prompt set: one opaque panoramic 16:9 painted anime-fantasy illustration, no interface/text/frame; character integrated into coherent scenery with matched light, shadows and atmospheric overlap; focal character on the left, quieter continuous environment on the right. Status uses a new thoughtful waist-up pose in a personal setting. Gear uses a new full-body pose inspecting or adjusting equipment in a personal armory/workshop. Party uses a new ready-for-adventure pose in a timber/stone preparation hall. Character identity, palettes and per-character setting descriptions are recorded in `menu-scenes-356/prompts.json`.

For compact publication, these versioned images stay in the source repository and load on demand from the same public GitHub repository. They are not included in the retained Sites archive and do not become normal game-start dependencies. The existing Talent fallback environment atlas now uses the same GitHub delivery path with identical image bytes, freeing bundle room for the prototype code. Native sprite/portrait files, battle animations and save schemas are unchanged.

## Checks

`tools/check_menu_preview_356.cjs`: native control preservation across all tabs; party reassignment; all six gear slots, filters, equip and locks; field healing; bestiary stage selection; sound toggle; developer gold adjustment; 1280x720 outer fit; section density diagnostics; exact top-bar metrics against Skills; original-save sentinel unchanged and all preview writes namespaced.

`tools/check_runtime_352.cjs` validates equivalent parsed operations in the retained compressed runtime. The existing Talent test continues to verify the normal game route separately.
