# Boss Control Recovery - Release 133

- A successful Stun or Sleep on a boss lasts one own turn. They share a recovery window, so extra hits cannot refresh control or switch between them.
- After that turn, both are resisted for two further own turns. Recovery and its expiry are recorded in the battle log. A resisted application does not start recovery.
- Break and Silence remain independent. Ordinary Stage 51-60 escorts retain their normal control rules, even where their resistance tier is marked boss by the encounter roster.
- Stage 51-60 main bosses deal 12% more direct damage and have 10% more effective initiative. Healing, DoTs, HP, mana costs and player builds are unchanged.
- Main bosses lead the queue on their first action and rounds 1, 4, 7, 10, etc. The remaining rounds use agility. Queue reordering preserves the same initiative calculation.
- Existing preparation and reaction windows remain. Koru-Vak's physical preparation also survives Silence at actual turn start; fresh Break still interrupts it.

Focused tests cover the shared immunity, normal escorts and heroes, independent Silence/Break, all ten boss openings, queue reordering and damage scaling. A deterministic Veyr melee example changes from 215 to 240 damage. Full-party playthrough balance still needs player reports.
