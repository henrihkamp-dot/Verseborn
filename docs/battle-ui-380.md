# Open battle UI

Implement the reviewed desktop mockup with existing art: airy translucent dock, illustrated action cards, compact circular turn portraits, current-turn glow, custom vector Resonance gems and faceted tracks, numeric readings, and preserved enemy ULT expenditure feedback. No new bitmap assets.

Five permanent action tabs: Basic, Attack actions, Buff & Debuff, Heal & Defence, Ultimate. Items is separate. Partition the existing native loadout by primary function once; never change native skill categories or per-category save loadout fields. Guard skills only appear where already learned; no new combat actions. Preserve transformed and Rift skills. Existing selections are recovered by skill ID/name across old category memories.

Large cards use the same CharacterAbilityArt assignment and compressed files as Status. Explicit Use button dispatches existing activation, target, item and Defend functions. First skill click locks/targets; action is confirmed by button, second skill click or existing keyboard/gamepad controls. Guard/hp/mp/damage/turn ordering, native sprite animation code and saves unchanged.

Battle-only CSS keeps 16:9 desktop arena and renders a readable paginated dock at 1920x1080,1600x900,1366x768. Legacy compact-density styles explicitly reset, rather than leaving hidden category labels or 48px cards.
