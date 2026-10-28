# Personal Rift equipment replacement

- Forty character-bound Personal Artifacts occupy weapon, armour, helmet, necklace and first-ring slots.
- Base-stat budgets use each equipped item in the supplied slot-1 save (5), increased by 10%, then weighted by character role. Integer rounding stays within half a point.
- Two fixed core affixes replace the old universal five-affix Rift rolls. Support armour adds one buff action; controller helmets add one inflicted-debuff action. Seerin’s necklace adds one buff action.
- Weapons, necklaces and first rings provide character-focused gameplay effects. Weapon status procs use the existing `weapon` trigger, so basic attacks and STR-scaling weapon skills qualify while spells do not. Verseborn and Torren retain their basic-only song-charge/barrier effects.
- Thirty-two non-weapons are shuffled into fixed pools across Rifts 1–9. Rift 10 contains only the eight weapons. Each victory grants one item, prioritising unowned entries in its pool.
- Old Rift items are removed from active catalogues, drops and the merchant. A private resolver retains their definitions solely for old-save migration; equipped retired Rift items convert to the owner's same-slot replacement, and unequipped retired gear is removed.
- Destiny Ring II is excluded from conversion, deletion and the catalogue. Tests compare all eight original references and complete instances before/after loading.
- The supplied conversion replaces all forty equipped slots, including non-Rift gear, without editing the original file. Its output remains outside the source repository.
- Developer reward recovery grants missing pool items for cleared Rifts, with separate claim keys.
- Auto Equip retains its open state across strategy, source, member and apply actions. Portraits resolve against their script's game root and fall back to the unchanged source art if a hosted request fails.

Validation: owner restrictions, total stat budgets, all forty art aliases, actual first/repeat Rift reward paths, no retired catalogue entries, unchanged Destiny rings, weapon triggers, +12% signature damage, converted-save loading, persistent Auto Equip, selector image loading, and all-mode battle openings.
