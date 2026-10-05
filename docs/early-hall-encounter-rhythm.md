# Early Hall encounter rhythm

First encounter-design pass for stages 1-40. No player, loot, economy,
enemy-stat-context, or endgame balance changes.

- Stages 1-4 retain their original introductory behavior.
- Stages 5-40 retain normal enemy profiles between combination cycles.
- Each formation's first enemy leads its announced combination after its
  first action, then every four own actions for boss stages or five otherwise.
- The marked target can Guard, remove the mark, or interrupt the leader.
  Break remains an interrupt for these early formations.
- Active companions add 0.15 to the 1.05 impact coefficient. Their existing
  healing/cleansing moves remain available in healer/cleanser formations.
- The impact is single-target. Killing companions weakens it.
- A resolved combination is followed by a non-damaging recovery action and
  15% physical/magic vulnerability for one own-action duration.
- Follow-up waves switch between defensive escort and offensive support,
  rather than merely replaying the same support behavior.

Themes progress through archive, faultline, ancient fire, clockwork,
unwritten records, royal assault, and the final echo. Existing skill-lock,
dispel, heal, and ultimate behavior remains between cycles.

Verification: test_early_hall_rhythms.cjs checks each formation at stages
5-40 for valid preparation, impact, recovery, cleansing, and Break interruption.
This is not a full balance simulation or visual playtest. In particular,
ordinary and boss survivability still needs real low/mid-level save reports.
The known stage 21-40 Hall stat-context discrepancy is deliberately untouched.
