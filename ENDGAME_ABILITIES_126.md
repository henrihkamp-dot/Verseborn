# Ember Hall 51-60: abilities en rotaties (release 126)

Dit overzicht is uit de actuele definities gegenereerd. Het repertoire is niet hetzelfde als een gegarandeerde rotatie: stage-specifieke acties hebben voorrang op de standaard AI. Controle, HP, MP, Resonance en levende companions veranderen keuzes.

Voorbereidingsacties doen geen damage; de huidige algemene animatie kan wel een aanval naar een party-lid suggereren. De Sentinel gebruikt zijn normale aanvallen wanneer zijn speciale stage-rol niet actief is.

## 51 - Nocturne Reception

### Fase 1

Sentinel: Reception Combination voorbereiden (geen damage) -> gerichte impact -> opnieuw voorbereiden. Seal Bearer beschermt hem tijdens voorbereiding.

#### Dawn Gate Sentinel: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Gate Halberd | melee | Physical | 0 | {"coefficient":0.9,"breakPower":2} |
| Dawn Window | magic | Holy Fire | 20 | {"coefficient":0.92} |
| Hold the Line | buff | Holy Fire | 36 | {"allAllies":true,"buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.2}]} |
| Sentinel Ward | heal | Holy Fire | 24 | {"healing":true,"healCoefficient":1.12} |
| Last Gate Protocol | ultimate | Holy Fire | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"barrier","duration":3,"value":0.25}]} |

#### Seal Bearer: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Seal Staff | melee | Physical | 0 | {"coefficient":0.75} |
| Seal Mend | cleanse | Holy Fire | 12 | {"cleanse":true} |
| Protective Seal | buff | Holy Fire | 16 | {"targetRole":"threatened","buffs":[{"type":"statusWard","duration":2,"value":0.45}]} |
| Seal Sanctuary | buff | Holy Fire | 0 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |

### Fase 2

Thaddeus: voorbereiden -> impact. Reginald beschermt de spreker; Custodian healt gewonde allies of cleanset waar zijn kit dat toestaat.

#### High Administrator Thaddeus: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Audit Stamp | melee | Physical | 0 | {"coefficient":0.8,"status":{"type":"disrupted","chance":0.25,"duration":3,"value":0.15}} |
| Tech Pulse | magic | Tech | 20 | {"coefficient":0.92,"status":{"type":"stun","chance":0.35}} |
| Administrative Order | buff | Tech | 22 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25}]} |
| Null Mandate | dispel | Tech | 24 | {"dispel":true} |
| Administrative Lock | utility | Tech | 16 | {"recentSkillLock":true,"status":{"type":"administrativeLock","chance":1,"duration":2,"value":0.5}} |
| Final Audit | ultimate | Tech | 0 | {"coefficient":1.16,"allTargets":true,"status":{"type":"disrupted","chance":0.7,"duration":3,"value":0.15}} |

#### Archive Custodian: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ledger Crush | melee | Physical | 0 | {"coefficient":0.78} |
| Forbidden Index | magic | Arcane | 21 | {"coefficient":0.96} |
| Restore Entry | heal | Arcane | 27 | {"healing":true,"healCoefficient":1.45,"cleanse":true} |
| Preservation Protocol | buff | Arcane | 28 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.18}]} |
| Resonance Lock | utility | Arcane | 24 | {"partyResonanceDrain":18,"status":{"type":"disrupted","chance":0.6,"duration":3,"value":0.15}} |
| Archive Lock | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"partyResonanceDrain":30} |
| Archive | dispel | Arcane | 18 | {"dispel":true} |

#### Sir Reginald: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Knight's Blow | melee | Physical | 0 | {"coefficient":0.9,"breakPower":2} |
| Earth Pulse | magic | Earth | 21 | {"coefficient":0.96,"scaling":"str","breakPower":1,"status":{"type":"stun","chance":0.3}} |
| Shadow Pulse | utility | Shadow | 22 | {"coefficient":0.84,"damaging":true,"status":{"type":"poison","chance":0.55,"duration":4}} |
| Knight's Oath | buff | Earth | 24 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28}]} |
| Oathbreaker | ultimate | Earth | 0 | {"coefficient":1.62,"scaling":"str","breakPower":3,"payoff":"broken","payoffMultiplier":1.2} |

### Fase 3

Veyr: ontbrekende Protected Guest aanwijzen -> Last Courtesy voorbereiden -> gerichte impact. Break verwijdert de bescherming en opent een 30% direct-damage venster. AoE op de gast wordt verzwakt, zonder rebuke.

#### Concierge Veyr: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Courtesy Blade | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Nocturne Rebuke | magic | Sound | 16 | {"coefficient":0.8,"breakPower":0} |
| Closed Reception | ultimate | Sound | 0 | {"coefficient":1.15,"allTargets":true,"breakPower":0} |

#### Seal Bearer: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Seal Staff | melee | Physical | 0 | {"coefficient":0.75} |
| Seal Mend | cleanse | Holy Fire | 12 | {"cleanse":true} |
| Protective Seal | buff | Holy Fire | 16 | {"targetRole":"threatened","buffs":[{"type":"statusWard","duration":2,"value":0.45}]} |
| Seal Sanctuary | buff | Holy Fire | 0 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |

#### Dawn Gate Sentinel: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Gate Halberd | melee | Physical | 0 | {"coefficient":0.9,"breakPower":2} |
| Dawn Window | magic | Holy Fire | 20 | {"coefficient":0.92} |
| Hold the Line | buff | Holy Fire | 36 | {"allAllies":true,"buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.2}]} |
| Sentinel Ward | heal | Holy Fire | 24 | {"healing":true,"healCoefficient":1.12} |
| Last Gate Protocol | ultimate | Holy Fire | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"barrier","duration":3,"value":0.25}]} |

## 52 - Sanctuary Under Pressure

### Fase 1

Gewonde Clergy: Prayer voorbereiden -> heal op de meest gewonde ally -> offensieve herstelactie. Justin beschermt de healer tijdens voorbereiding.

#### Corrupt Clergy: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Mace Seal | melee | Physical | 0 | {"coefficient":0.75} |
| Binding Litany | magic | Holy Fire | 20 | {"coefficient":0.94} |
| Clergy Ward | heal | Holy Fire | 25 | {"healing":true,"healCoefficient":1.65,"cleanse":true} |
| Purging Litany | cleanse | Holy Fire | 20 | {"cleanse":true} |
| Dark Benediction | buff | Holy Fire | 29 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"defenseUp","duration":2,"value":0.18}]} |
| Final Absolution | ultimate | Holy Fire | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"barrier","duration":3,"value":0.22}]} |

#### Saint Justin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sanctified Strike | melee | Holy Fire | 0 | {"coefficient":0.92,"scaling":"hybrid"} |
| Radiant Ward | magic | Holy Fire | 19 | {"coefficient":0.88} |
| Merciful Seal | heal | Holy Fire | 25 | {"healing":true,"healCoefficient":1.35,"cleanse":true} |
| Radiant Oath | buff | Holy Fire | 27 | {"targetRole":"threatened","buffs":[{"type":"barrier","duration":3,"value":0.25},{"type":"damageUp","duration":2,"value":0.12}]} |
| Saint's Judgment | ultimate | Holy Fire | 0 | {"coefficient":1.62,"scaling":"hybrid"} |
| Holy Purification | cleanse | Holy Fire | 16 | {"cleanse":true,"teamBuffs":[{"type":"statusWard","duration":2,"value":0.35}]} |

### Fase 2

Gewonde Lysra: dezelfde herstelcyclus. Seal Bearer versterkt de heal; Justin maakt cleanse mogelijk.

#### Lysra: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Spellstaff Sweep | melee | Physical | 0 | {"coefficient":0.72} |
| Arcane Missile | magic | Arcane | 18 | {"coefficient":1} |
| Barrier Spell | heal | Arcane | 24 | {"healing":true,"healCoefficient":1.45,"conditionalCleanse":true,"cleanse":true} |
| Arcane Aegis | buff | Arcane | 28 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"barrier","duration":3,"value":0.22}],"cleanseAlly":true} |
| Astral Convergence | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"magicUp","duration":3,"value":0.25}]} |

#### Seal Bearer: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Seal Staff | melee | Physical | 0 | {"coefficient":0.75} |
| Seal Mend | cleanse | Holy Fire | 12 | {"cleanse":true} |
| Protective Seal | buff | Holy Fire | 16 | {"targetRole":"threatened","buffs":[{"type":"statusWard","duration":2,"value":0.45}]} |
| Seal Sanctuary | buff | Holy Fire | 0 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |

#### Saint Justin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sanctified Strike | melee | Holy Fire | 0 | {"coefficient":0.92,"scaling":"hybrid"} |
| Radiant Ward | magic | Holy Fire | 19 | {"coefficient":0.88} |
| Merciful Seal | heal | Holy Fire | 25 | {"healing":true,"healCoefficient":1.35,"cleanse":true} |
| Radiant Oath | buff | Holy Fire | 27 | {"targetRole":"threatened","buffs":[{"type":"barrier","duration":3,"value":0.25},{"type":"damageUp","duration":2,"value":0.12}]} |
| Saint's Judgment | ultimate | Holy Fire | 0 | {"coefficient":1.62,"scaling":"hybrid"} |
| Holy Purification | cleanse | Holy Fire | 16 | {"cleanse":true,"teamBuffs":[{"type":"statusWard","duration":2,"value":0.35}]} |

### Fase 3

Gewonde Maelin: tijdelijke wards + Renewal voorbereiden -> party-heal -> offensieve herstelactie. Silence/Break annuleert de voorbereiding, verwijdert haar wards en geeft haar 25% magic vulnerability. Geen herstelritueel wanneer niemand voldoende gewond is of haar MP ontoereikend is.

#### Sister Maelin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sanctuary Staff | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Pressure of Light | magic | Holy Fire | 16 | {"coefficient":0.8,"breakPower":0} |
| Sanctuary Renewal | ultimate | Holy Fire | 0 | {"coefficient":1.15,"allTargets":true,"breakPower":0} |

#### Saint Justin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sanctified Strike | melee | Holy Fire | 0 | {"coefficient":0.92,"scaling":"hybrid"} |
| Radiant Ward | magic | Holy Fire | 19 | {"coefficient":0.88} |
| Merciful Seal | heal | Holy Fire | 25 | {"healing":true,"healCoefficient":1.35,"cleanse":true} |
| Radiant Oath | buff | Holy Fire | 27 | {"targetRole":"threatened","buffs":[{"type":"barrier","duration":3,"value":0.25},{"type":"damageUp","duration":2,"value":0.12}]} |
| Saint's Judgment | ultimate | Holy Fire | 0 | {"coefficient":1.62,"scaling":"hybrid"} |
| Holy Purification | cleanse | Holy Fire | 16 | {"cleanse":true,"teamBuffs":[{"type":"statusWard","duration":2,"value":0.35}]} |

#### Seal Bearer: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Seal Staff | melee | Physical | 0 | {"coefficient":0.75} |
| Seal Mend | cleanse | Holy Fire | 12 | {"cleanse":true} |
| Protective Seal | buff | Holy Fire | 16 | {"targetRole":"threatened","buffs":[{"type":"statusWard","duration":2,"value":0.45}]} |
| Seal Sanctuary | buff | Holy Fire | 0 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |

## 53 - The Final Inspection

### Fase 1

Auditor: Assessment voorbereiden -> gerichte impact -> melee-herstelactie. Custodian ondersteunt herstel/cleanse.

Tegenreactie: Break the Auditor before assessment; remove the Custodian to stop restoration.
Mark/status: disrupted. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Inkbound Auditor: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Quill Rend | melee | Physical | 0 | {"coefficient":0.9,"status":{"type":"bleed","chance":0.2,"duration":3}} |
| Red Ink Edict | magic | Shadow | 21 | {"coefficient":1,"status":{"type":"poison","chance":0.65,"duration":4},"extraStatuses":[{"type":"marked","chance":0.5,"duration":4,"value":0.12}]} |
| Red Ledger | buff | Shadow | 20 | {"targetSide":"self","buffs":[{"type":"critUp","duration":3,"value":0.15}]} |
| Audit of the Nameless | ultimate | Shadow | 0 | {"coefficient":1.7,"payoff":"afflicted","payoffMultiplier":1.25,"critBonus":0.15} |
| Audit | utility | Shadow | 16 | {"auditSkill":true,"status":{"type":"audit","chance":1,"duration":2,"value":0.5}} |

#### Archive Custodian: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ledger Crush | melee | Physical | 0 | {"coefficient":0.78} |
| Forbidden Index | magic | Arcane | 21 | {"coefficient":0.96} |
| Restore Entry | heal | Arcane | 27 | {"healing":true,"healCoefficient":1.45,"cleanse":true} |
| Preservation Protocol | buff | Arcane | 28 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.18}]} |
| Resonance Lock | utility | Arcane | 24 | {"partyResonanceDrain":18,"status":{"type":"disrupted","chance":0.6,"duration":3,"value":0.15}} |
| Archive Lock | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"partyResonanceDrain":30} |
| Archive | dispel | Arcane | 18 | {"dispel":true} |

### Fase 2

Thaddeus: Sentence voorbereiden -> impact -> herstelactie. Escorts beschermen hem tijdens voorbereiding.

Tegenreactie: Reginald protects the speaker. Break him or interrupt Thaddeus before sentencing.
Mark/status: silence. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### High Administrator Thaddeus: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Audit Stamp | melee | Physical | 0 | {"coefficient":0.8,"status":{"type":"disrupted","chance":0.25,"duration":3,"value":0.15}} |
| Tech Pulse | magic | Tech | 20 | {"coefficient":0.92,"status":{"type":"stun","chance":0.35}} |
| Administrative Order | buff | Tech | 22 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25}]} |
| Null Mandate | dispel | Tech | 24 | {"dispel":true} |
| Administrative Lock | utility | Tech | 16 | {"recentSkillLock":true,"status":{"type":"administrativeLock","chance":1,"duration":2,"value":0.5}} |
| Final Audit | ultimate | Tech | 0 | {"coefficient":1.16,"allTargets":true,"status":{"type":"disrupted","chance":0.7,"duration":3,"value":0.15}} |

#### Sir Reginald: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Knight's Blow | melee | Physical | 0 | {"coefficient":0.9,"breakPower":2} |
| Earth Pulse | magic | Earth | 21 | {"coefficient":0.96,"scaling":"str","breakPower":1,"status":{"type":"stun","chance":0.3}} |
| Shadow Pulse | utility | Shadow | 22 | {"coefficient":0.84,"damaging":true,"status":{"type":"poison","chance":0.55,"duration":4}} |
| Knight's Oath | buff | Earth | 24 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28}]} |
| Oathbreaker | ultimate | Earth | 0 | {"coefficient":1.62,"scaling":"str","breakPower":3,"payoff":"broken","payoffMultiplier":1.2} |

#### Seal Bearer: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Seal Staff | melee | Physical | 0 | {"coefficient":0.75} |
| Seal Mend | cleanse | Holy Fire | 12 | {"cleanse":true} |
| Protective Seal | buff | Holy Fire | 16 | {"targetRole":"threatened","buffs":[{"type":"statusWard","duration":2,"value":0.45}]} |
| Seal Sanctuary | buff | Holy Fire | 0 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |

### Fase 3

Voss roteert No repeated skills / No buffs / No magic / Designated target first. Stamps verhogen de straf; 2 stamps geven defense reduction en buff removal, 3 geven Silence. Bij actieve order en de juiste actiepositie: Final Notice voorbereiden -> impact -> herstelactie.

#### Guild Inspector Voss: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Inspector's Gavel | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Violation Assessment | magic | Tech | 16 | {"coefficient":0.8,"breakPower":0} |
| Final Notice | ultimate | Tech | 0 | {"coefficient":1.15,"allTargets":true,"breakPower":0} |

#### Inkbound Auditor: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Quill Rend | melee | Physical | 0 | {"coefficient":0.9,"status":{"type":"bleed","chance":0.2,"duration":3}} |
| Red Ink Edict | magic | Shadow | 21 | {"coefficient":1,"status":{"type":"poison","chance":0.65,"duration":4},"extraStatuses":[{"type":"marked","chance":0.5,"duration":4,"value":0.12}]} |
| Red Ledger | buff | Shadow | 20 | {"targetSide":"self","buffs":[{"type":"critUp","duration":3,"value":0.15}]} |
| Audit of the Nameless | ultimate | Shadow | 0 | {"coefficient":1.7,"payoff":"afflicted","payoffMultiplier":1.25,"critBonus":0.15} |
| Audit | utility | Shadow | 16 | {"auditSkill":true,"status":{"type":"audit","chance":1,"duration":2,"value":0.5}} |

#### Seal Bearer: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Seal Staff | melee | Physical | 0 | {"coefficient":0.75} |
| Seal Mend | cleanse | Holy Fire | 12 | {"cleanse":true} |
| Protective Seal | buff | Holy Fire | 16 | {"targetRole":"threatened","buffs":[{"type":"statusWard","duration":2,"value":0.45}]} |
| Seal Sanctuary | buff | Holy Fire | 0 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |

## 54 - The Starless Passage

### Fase 1

Wyrm: mark + Crossfire voorbereiden -> impact -> herstelactie. Pillar bouwt Break op het target.

Tegenreactie: Cleanse the mark or interrupt the Wyrm. The Pillar builds Break on the marked target.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Ash Wyrm: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ash Fang | melee | Ancient Fire | 0 | {"coefficient":1.05,"woundedPriority":true} |
| Scorching Breath | utility | Ancient Fire | 14 | {"status":{"type":"scorched","chance":1,"duration":2,"value":0.25},"woundedPriority":true} |
| Cinder Hunt | magic | Ancient Fire | 18 | {"coefficient":1.15,"woundedPriority":true} |
| Ashen Torrent | ultimate | Ancient Fire | 0 | {"coefficient":1.15,"allTargets":true} |

#### Cracked Pillar: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Stonefall | melee | Earth | 0 | {"coefficient":0.9,"breakPower":3} |
| Faultline | magic | Earth | 22 | {"coefficient":1,"scaling":"str","breakPower":2,"status":{"type":"stun","chance":0.32}} |
| Stone Guard | buff | Earth | 27 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28},{"type":"barrier","duration":2,"value":0.18}]} |
| Armory Collapse | ultimate | Earth | 0 | {"coefficient":1.04,"allTargets":true,"breakPower":3} |
| Shatter the Broken | melee | Earth | 18 | {"coefficient":1.2,"payoff":"broken","payoffMultiplier":1.4,"breakPower":2} |

### Fase 2

Plumpin: mark + Falling Star voorbereiden -> impact -> herstelactie. Companions versterken de impact.

Tegenreactie: Cleanse the mark or interrupt Plumpin; surviving companions amplify the impact.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Elder Plumpin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Gourd Bonk | melee | Physical | 0 | {"coefficient":0.8,"randomMinorDebuff":true} |
| Gourd Burst | magic | Shadow | 19 | {"coefficient":0.96} |
| Fairy Spores | utility | Shadow | 24 | {"status":{"type":"sleep","chance":0.55,"duration":3},"extraStatuses":[{"type":"poison","chance":0.6,"duration":4}]} |
| Fairy Fortune | buff | Shadow | 21 | {"targetRole":"random","randomBuff":true} |
| Harvest Moon | ultimate | Shadow | 0 | {"coefficient":1.1,"allTargets":true,"status":{"type":"poison","chance":0.8,"duration":4}} |
| Ancient Renewal | cleanse | Ancient Fire | 16 | {"cleanse":true,"selfCleanse":true,"limitedUses":1} |

#### Gorg: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Furnace Fist | melee | Physical | 0 | {"coefficient":0.92,"status":{"type":"burn","chance":0.2,"duration":4}} |
| Ancient Fire Pulse | magic | Ancient Fire | 20 | {"coefficient":1.02,"status":{"type":"burn","chance":0.55,"duration":4}} |
| Furnace Rage | buff | Ancient Fire | 12 | {"targetSide":"self","belowHalf":true,"buffs":[{"type":"damageUp","duration":2,"value":0.25}]} |
| Magma Collapse | ultimate | Ancient Fire | 0 | {"coefficient":1.16,"allTargets":true,"payoff":"burning","payoffMultiplier":1.18} |

#### Ash Wyrm: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ash Fang | melee | Ancient Fire | 0 | {"coefficient":1.05,"woundedPriority":true} |
| Scorching Breath | utility | Ancient Fire | 14 | {"status":{"type":"scorched","chance":1,"duration":2,"value":0.25},"woundedPriority":true} |
| Cinder Hunt | magic | Ancient Fire | 18 | {"coefficient":1.15,"woundedPriority":true} |
| Ashen Torrent | ultimate | Ancient Fire | 0 | {"coefficient":1.15,"allTargets":true} |

### Fase 3

Guide: Guidance Mark -> eventueel eenmaal verplaatsen -> Astral Impact. Cleanse wist de pending aanval; controle onderbreekt. Companions richten fysieke Break-druk op het gemarkeerde target.

#### Draconic Guide: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Crystal Staff | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Astral Projectile | magic | Sigil | 16 | {"coefficient":0.8,"breakPower":0} |
| Starless Convergence | ultimate | Sigil | 0 | {"coefficient":1.15,"allTargets":true,"breakPower":0} |

#### Ash Wyrm: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ash Fang | melee | Ancient Fire | 0 | {"coefficient":1.05,"woundedPriority":true} |
| Scorching Breath | utility | Ancient Fire | 14 | {"status":{"type":"scorched","chance":1,"duration":2,"value":0.25},"woundedPriority":true} |
| Cinder Hunt | magic | Ancient Fire | 18 | {"coefficient":1.15,"woundedPriority":true} |
| Ashen Torrent | ultimate | Ancient Fire | 0 | {"coefficient":1.15,"allTargets":true} |

#### Cracked Pillar: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Stonefall | melee | Earth | 0 | {"coefficient":0.9,"breakPower":3} |
| Faultline | magic | Earth | 22 | {"coefficient":1,"scaling":"str","breakPower":2,"status":{"type":"stun","chance":0.32}} |
| Stone Guard | buff | Earth | 27 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28},{"type":"barrier","duration":2,"value":0.18}]} |
| Armory Collapse | ultimate | Earth | 0 | {"coefficient":1.04,"allTargets":true,"breakPower":3} |
| Shatter the Broken | melee | Earth | 18 | {"coefficient":1.2,"payoff":"broken","payoffMultiplier":1.4,"breakPower":2} |

## 55 - The Memory Root

### Fase 1

Gorg: Root Bind + Rootline Impact voorbereiden -> impact -> herstelactie. Pillar bouwt Break.

Tegenreactie: Cleanse Root Bind or Break Gorg before impact; the Pillar builds Break.
Mark/status: rootBind. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Gorg: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Furnace Fist | melee | Physical | 0 | {"coefficient":0.92,"status":{"type":"burn","chance":0.2,"duration":4}} |
| Ancient Fire Pulse | magic | Ancient Fire | 20 | {"coefficient":1.02,"status":{"type":"burn","chance":0.55,"duration":4}} |
| Furnace Rage | buff | Ancient Fire | 12 | {"targetSide":"self","belowHalf":true,"buffs":[{"type":"damageUp","duration":2,"value":0.25}]} |
| Magma Collapse | ultimate | Ancient Fire | 0 | {"coefficient":1.16,"allTargets":true,"payoff":"burning","payoffMultiplier":1.18} |

#### Cracked Pillar: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Stonefall | melee | Earth | 0 | {"coefficient":0.9,"breakPower":3} |
| Faultline | magic | Earth | 22 | {"coefficient":1,"scaling":"str","breakPower":2,"status":{"type":"stun","chance":0.32}} |
| Stone Guard | buff | Earth | 27 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28},{"type":"barrier","duration":2,"value":0.18}]} |
| Armory Collapse | ultimate | Earth | 0 | {"coefficient":1.04,"allTargets":true,"breakPower":3} |
| Shatter the Broken | melee | Earth | 18 | {"coefficient":1.2,"payoff":"broken","payoffMultiplier":1.4,"breakPower":2} |

### Fase 2

Plumpin: Root Bind + Memory Bloom voorbereiden -> impact -> herstelactie.

Tegenreactie: Cleanse the roots or interrupt Plumpin. Strike during the recovery after Bloom.
Mark/status: rootBind. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Elder Plumpin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Gourd Bonk | melee | Physical | 0 | {"coefficient":0.8,"randomMinorDebuff":true} |
| Gourd Burst | magic | Shadow | 19 | {"coefficient":0.96} |
| Fairy Spores | utility | Shadow | 24 | {"status":{"type":"sleep","chance":0.55,"duration":3},"extraStatuses":[{"type":"poison","chance":0.6,"duration":4}]} |
| Fairy Fortune | buff | Shadow | 21 | {"targetRole":"random","randomBuff":true} |
| Harvest Moon | ultimate | Shadow | 0 | {"coefficient":1.1,"allTargets":true,"status":{"type":"poison","chance":0.8,"duration":4}} |
| Ancient Renewal | cleanse | Ancient Fire | 16 | {"cleanse":true,"selfCleanse":true,"limitedUses":1} |

#### Ash Wyrm: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ash Fang | melee | Ancient Fire | 0 | {"coefficient":1.05,"woundedPriority":true} |
| Scorching Breath | utility | Ancient Fire | 14 | {"status":{"type":"scorched","chance":1,"duration":2,"value":0.25},"woundedPriority":true} |
| Cinder Hunt | magic | Ancient Fire | 18 | {"coefficient":1.15,"woundedPriority":true} |
| Ashen Torrent | ultimate | Ancient Fire | 0 | {"coefficient":1.15,"allTargets":true} |

#### Gorg: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Furnace Fist | melee | Physical | 0 | {"coefficient":0.92,"status":{"type":"burn","chance":0.2,"duration":4}} |
| Ancient Fire Pulse | magic | Ancient Fire | 20 | {"coefficient":1.02,"status":{"type":"burn","chance":0.55,"duration":4}} |
| Furnace Rage | buff | Ancient Fire | 12 | {"targetSide":"self","belowHalf":true,"buffs":[{"type":"damageUp","duration":2,"value":0.25}]} |
| Magma Collapse | ultimate | Ancient Fire | 0 | {"coefficient":1.16,"allTargets":true,"payoff":"burning","payoffMultiplier":1.18} |

### Fase 3

Guardian: Memory Adaptation op herhaalde aanvalscategorie. Root Eruption wordt op vaste actieposities voorbereid, veroorzaakt AoE met kans op roots en opent de Core. Native Core-acties en Break kunnen de Core ook openen. Core: +60% incoming damage.

#### Memory Root Guardian: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Root Impact | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Memory Roots | magic | Earth | 16 | {"coefficient":0.8,"status":{"type":"rootBind","chance":0.85,"duration":2,"value":0.25},"breakPower":0} |
| Ancient Overgrowth | ultimate | Earth | 0 | {"coefficient":1.15,"allTargets":true,"status":{"type":"rootBind","chance":0.85,"duration":2,"value":0.25},"breakPower":0} |

#### Cracked Pillar: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Stonefall | melee | Earth | 0 | {"coefficient":0.9,"breakPower":3} |
| Faultline | magic | Earth | 22 | {"coefficient":1,"scaling":"str","breakPower":2,"status":{"type":"stun","chance":0.32}} |
| Stone Guard | buff | Earth | 27 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28},{"type":"barrier","duration":2,"value":0.18}]} |
| Armory Collapse | ultimate | Earth | 0 | {"coefficient":1.04,"allTargets":true,"breakPower":3} |
| Shatter the Broken | melee | Earth | 18 | {"coefficient":1.2,"payoff":"broken","payoffMultiplier":1.4,"breakPower":2} |

#### Elder Plumpin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Gourd Bonk | melee | Physical | 0 | {"coefficient":0.8,"randomMinorDebuff":true} |
| Gourd Burst | magic | Shadow | 19 | {"coefficient":0.96} |
| Fairy Spores | utility | Shadow | 24 | {"status":{"type":"sleep","chance":0.55,"duration":3},"extraStatuses":[{"type":"poison","chance":0.6,"duration":4}]} |
| Fairy Fortune | buff | Shadow | 21 | {"targetRole":"random","randomBuff":true} |
| Harvest Moon | ultimate | Shadow | 0 | {"coefficient":1.1,"allTargets":true,"status":{"type":"poison","chance":0.8,"duration":4}} |
| Ancient Renewal | cleanse | Ancient Fire | 16 | {"cleanse":true,"selfCleanse":true,"limitedUses":1} |

## 56 - The Strange Refrain

### Fase 1

Tja: mark + Strange Duet voorbereiden -> impact -> herstelactie. Tibby versterkt de combinatie.

Tegenreactie: Tibby amplifies the delayed echo. Cleanse the mark or interrupt Tja.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Tja: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Frost Flourish | melee | Physical | 0 | {"coefficient":0.78,"status":{"type":"agilityDown","chance":0.25,"duration":3,"value":0.15}} |
| Crystal Waltz | magic | Ice | 22 | {"coefficient":0.92,"status":{"type":"sleep","chance":0.42,"duration":3}} |
| Ice Lance | magic | Ice | 25 | {"coefficient":1.12,"status":{"type":"agilityDown","chance":0.65,"duration":3,"value":0.15}} |
| Winter Rhythm | buff | Ice | 24 | {"targetSide":"self","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"critUp","duration":2,"value":0.1}]} |
| Winter Encore | ultimate | Ice | 0 | {"coefficient":1.12,"allTargets":true,"status":{"type":"sleep","chance":0.35,"duration":2}} |

#### Tibby: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Trunk Bash | melee | Physical | 0 | {"coefficient":0.9,"breakPower":1} |
| Starry Flourish | magic | Arcane | 19 | {"coefficient":1,"scaling":"hybrid"} |
| Showtime | buff | Arcane | 20 | {"targetSide":"self","buffs":[{"type":"critUp","duration":3,"value":0.15}]} |
| Grand Entrance | ultimate | Arcane | 0 | {"coefficient":1.58,"scaling":"hybrid","status":{"type":"stun","chance":0.55}} |

### Fase 2

Jory: mark + Borrowed Refrain voorbereiden -> impact -> herstelactie. Lysra kan healen; Nyx ondersteunt de druk.

Tegenreactie: Lysra restores the performers while Nyx adds pressure. Interrupt Jory or dismantle the ensemble.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Jory Bellwick: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Lute Crack | melee | Physical | 0 | {"coefficient":0.76,"status":{"type":"disrupted","chance":0.2,"duration":3,"value":0.15}} |
| Star Note | magic | Sound | 18 | {"coefficient":0.96} |
| Discordant Chord | utility | Sound | 22 | {"status":{"type":"magicVulnerability","chance":0.75,"duration":3,"value":0.18}} |
| Dissonant Purge | dispel | Sound | 22 | {"dispel":true} |
| Battle Hymn | buff | Sound | 34 | {"allAllies":true,"buffs":[{"type":"damageUp","duration":3,"value":0.15}]} |
| Grand Chord | ultimate | Sound | 0 | {"coefficient":1.1,"allTargets":true,"teamBuffs":[{"type":"damageUp","duration":2,"value":0.15}]} |

#### Lysra: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Spellstaff Sweep | melee | Physical | 0 | {"coefficient":0.72} |
| Arcane Missile | magic | Arcane | 18 | {"coefficient":1} |
| Barrier Spell | heal | Arcane | 24 | {"healing":true,"healCoefficient":1.45,"conditionalCleanse":true,"cleanse":true} |
| Arcane Aegis | buff | Arcane | 28 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"barrier","duration":3,"value":0.22}],"cleanseAlly":true} |
| Astral Convergence | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"magicUp","duration":3,"value":0.25}]} |

#### Nyx Vael: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Margin Snap | melee | Shadow | 0 | {"coefficient":0.78,"status":{"type":"shadowExposed","chance":0.3,"duration":2}} |
| Quiet Index | magic | Shadow | 22 | {"coefficient":0.72,"status":{"type":"sleep","chance":0.58,"duration":3}} |
| Gravebind | utility | Shadow | 24 | {"status":{"type":"silence","chance":0.7,"duration":2},"extraStatuses":[{"type":"agilityDown","chance":0.7,"duration":3,"value":0.15}]} |
| Unwrite Boon | dispel | Shadow | 24 | {"dispel":true} |
| Veil of Nyx | buff | Shadow | 25 | {"targetSide":"self","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"evasion","duration":2,"value":0.2}]} |
| Final Index | ultimate | Shadow | 0 | {"coefficient":1.08,"allTargets":true,"status":{"type":"sleep","chance":0.5,"duration":2}} |

### Fase 3

Malkhius: Echo Sigil kopieert een sterke buff (of MAG +20% als niets beschikbaar is) -> occult mark -> delayed echo. Een pending echo heeft voorrang. Cleanse van de mark voorkomt de delayed echo. Companions buffen afwisselend zijn MAG.

#### Malkhius: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sigil Blade | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Occult Echo | magic | Shadow | 16 | {"coefficient":0.8,"status":{"type":"disrupted","chance":0.85,"duration":2,"value":0.2},"breakPower":0} |
| Shadow Refrain | ultimate | Shadow | 0 | {"coefficient":1.15,"allTargets":true,"status":{"type":"disrupted","chance":0.85,"duration":2,"value":0.2},"breakPower":0} |

#### Tja: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Frost Flourish | melee | Physical | 0 | {"coefficient":0.78,"status":{"type":"agilityDown","chance":0.25,"duration":3,"value":0.15}} |
| Crystal Waltz | magic | Ice | 22 | {"coefficient":0.92,"status":{"type":"sleep","chance":0.42,"duration":3}} |
| Ice Lance | magic | Ice | 25 | {"coefficient":1.12,"status":{"type":"agilityDown","chance":0.65,"duration":3,"value":0.15}} |
| Winter Rhythm | buff | Ice | 24 | {"targetSide":"self","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"critUp","duration":2,"value":0.1}]} |
| Winter Encore | ultimate | Ice | 0 | {"coefficient":1.12,"allTargets":true,"status":{"type":"sleep","chance":0.35,"duration":2}} |

#### Jory Bellwick: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Lute Crack | melee | Physical | 0 | {"coefficient":0.76,"status":{"type":"disrupted","chance":0.2,"duration":3,"value":0.15}} |
| Star Note | magic | Sound | 18 | {"coefficient":0.96} |
| Discordant Chord | utility | Sound | 22 | {"status":{"type":"magicVulnerability","chance":0.75,"duration":3,"value":0.18}} |
| Dissonant Purge | dispel | Sound | 22 | {"dispel":true} |
| Battle Hymn | buff | Sound | 34 | {"allAllies":true,"buffs":[{"type":"damageUp","duration":3,"value":0.15}]} |
| Grand Chord | ultimate | Sound | 0 | {"coefficient":1.1,"allTargets":true,"teamBuffs":[{"type":"damageUp","duration":2,"value":0.15}]} |

## 57 - Mistress of Nocturne

### Fase 1

Shade: Beguiling Veil + Dream Pursuit voorbereiden -> impact -> herstelactie.

Tegenreactie: Cleanse the illusion before the pursuit; interrupt Shade to open a counterattack.
Mark/status: beguilingVeil. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Shade: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Twin Fang | melee | Physical | 0 | {"coefficient":0.98,"status":{"type":"bleed","chance":0.2,"duration":3}} |
| Throwing Daggers | magic | Shadow | 20 | {"coefficient":1.02,"scaling":"str","status":{"type":"poison","chance":0.45,"duration":4}} |
| Predator's Focus | buff | Shadow | 25 | {"targetSide":"self","buffs":[{"type":"critUp","duration":3,"value":0.15},{"type":"agilityUp","duration":3,"value":0.25}]} |
| Shadow Storm | ultimate | Shadow | 0 | {"coefficient":1.65,"payoff":"afflictedOrBroken","payoffMultiplier":1.3,"critBonus":0.15} |

#### Nyx Vael: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Margin Snap | melee | Shadow | 0 | {"coefficient":0.78,"status":{"type":"shadowExposed","chance":0.3,"duration":2}} |
| Quiet Index | magic | Shadow | 22 | {"coefficient":0.72,"status":{"type":"sleep","chance":0.58,"duration":3}} |
| Gravebind | utility | Shadow | 24 | {"status":{"type":"silence","chance":0.7,"duration":2},"extraStatuses":[{"type":"agilityDown","chance":0.7,"duration":3,"value":0.15}]} |
| Unwrite Boon | dispel | Shadow | 24 | {"dispel":true} |
| Veil of Nyx | buff | Shadow | 25 | {"targetSide":"self","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"evasion","duration":2,"value":0.2}]} |
| Final Index | ultimate | Shadow | 0 | {"coefficient":1.08,"allTargets":true,"status":{"type":"sleep","chance":0.5,"duration":2}} |

### Fase 2

Thaddeus: Beguiling Veil + False Testimony voorbereiden -> impact -> herstelactie. Beide companions kunnen met beschikbare heals ondersteunen.

Tegenreactie: Two healers sustain the speaker. Cleanse the illusion or interrupt Thaddeus.
Mark/status: beguilingVeil. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Archive Custodian: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ledger Crush | melee | Physical | 0 | {"coefficient":0.78} |
| Forbidden Index | magic | Arcane | 21 | {"coefficient":0.96} |
| Restore Entry | heal | Arcane | 27 | {"healing":true,"healCoefficient":1.45,"cleanse":true} |
| Preservation Protocol | buff | Arcane | 28 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.18}]} |
| Resonance Lock | utility | Arcane | 24 | {"partyResonanceDrain":18,"status":{"type":"disrupted","chance":0.6,"duration":3,"value":0.15}} |
| Archive Lock | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"partyResonanceDrain":30} |
| Archive | dispel | Arcane | 18 | {"dispel":true} |

#### Lysra: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Spellstaff Sweep | melee | Physical | 0 | {"coefficient":0.72} |
| Arcane Missile | magic | Arcane | 18 | {"coefficient":1} |
| Barrier Spell | heal | Arcane | 24 | {"healing":true,"healCoefficient":1.45,"conditionalCleanse":true,"cleanse":true} |
| Arcane Aegis | buff | Arcane | 28 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"barrier","duration":3,"value":0.22}],"cleanseAlly":true} |
| Astral Convergence | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"magicUp","duration":3,"value":0.25}]} |

#### High Administrator Thaddeus: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Audit Stamp | melee | Physical | 0 | {"coefficient":0.8,"status":{"type":"disrupted","chance":0.25,"duration":3,"value":0.15}} |
| Tech Pulse | magic | Tech | 20 | {"coefficient":0.92,"status":{"type":"stun","chance":0.35}} |
| Administrative Order | buff | Tech | 22 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25}]} |
| Null Mandate | dispel | Tech | 24 | {"dispel":true} |
| Administrative Lock | utility | Tech | 16 | {"recentSkillLock":true,"status":{"type":"administrativeLock","chance":1,"duration":2,"value":0.5}} |
| Final Audit | ultimate | Tech | 0 | {"coefficient":1.16,"allTargets":true,"status":{"type":"disrupted","chance":0.7,"duration":3,"value":0.15}} |

### Fase 3

Morvanna: Veil -> buff inversion -> Dream Collapse voorbereiden -> gerichte impact -> herstelactie. Veil op het slachtoffer versterkt Collapse; cleanse voorkomt die bonus. Native magic kan Sleep toepassen.

#### Lady Morvanna: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Nocturne Lash | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Dream Pressure | magic | Shadow | 16 | {"coefficient":0.8,"status":{"type":"mentalPressure","chance":0.9,"duration":2,"value":0.2},"breakPower":0} |
| Court of Illusions | ultimate | Shadow | 0 | {"coefficient":1.15,"allTargets":true,"status":{"type":"mentalPressure","chance":0.9,"duration":2,"value":0.2},"breakPower":0} |

#### Nyx Vael: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Margin Snap | melee | Shadow | 0 | {"coefficient":0.78,"status":{"type":"shadowExposed","chance":0.3,"duration":2}} |
| Quiet Index | magic | Shadow | 22 | {"coefficient":0.72,"status":{"type":"sleep","chance":0.58,"duration":3}} |
| Gravebind | utility | Shadow | 24 | {"status":{"type":"silence","chance":0.7,"duration":2},"extraStatuses":[{"type":"agilityDown","chance":0.7,"duration":3,"value":0.15}]} |
| Unwrite Boon | dispel | Shadow | 24 | {"dispel":true} |
| Veil of Nyx | buff | Shadow | 25 | {"targetSide":"self","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"evasion","duration":2,"value":0.2}]} |
| Final Index | ultimate | Shadow | 0 | {"coefficient":1.08,"allTargets":true,"status":{"type":"sleep","chance":0.5,"duration":2}} |

#### Archive Custodian: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ledger Crush | melee | Physical | 0 | {"coefficient":0.78} |
| Forbidden Index | magic | Arcane | 21 | {"coefficient":0.96} |
| Restore Entry | heal | Arcane | 27 | {"healing":true,"healCoefficient":1.45,"cleanse":true} |
| Preservation Protocol | buff | Arcane | 28 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.18}]} |
| Resonance Lock | utility | Arcane | 24 | {"partyResonanceDrain":18,"status":{"type":"disrupted","chance":0.6,"duration":3,"value":0.15}} |
| Archive Lock | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"partyResonanceDrain":30} |
| Archive | dispel | Arcane | 18 | {"dispel":true} |

## 58 - Trial of Iron

### Fase 1

Brokk: Iron Double Impact voorbereiden -> Break-impact -> herstelactie. Pillar bouwt extra Break.

Tegenreactie: Break Brokk before the chained impact. The Pillar builds Break; Guard remains useful.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Brokk: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Hammerfall | melee | Physical | 0 | {"coefficient":0.95,"breakPower":2} |
| Holy Pulse | magic | Holy Fire | 18 | {"coefficient":0.92,"scaling":"hybrid"} |
| Shield the Weak | buff | Earth | 14 | {"targetRole":"protected","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |
| Judgment Breaker | ultimate | Holy Fire | 0 | {"coefficient":1.62,"scaling":"str","breakPower":3} |

#### Cracked Pillar: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Stonefall | melee | Earth | 0 | {"coefficient":0.9,"breakPower":3} |
| Faultline | magic | Earth | 22 | {"coefficient":1,"scaling":"str","breakPower":2,"status":{"type":"stun","chance":0.32}} |
| Stone Guard | buff | Earth | 27 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28},{"type":"barrier","duration":2,"value":0.18}]} |
| Armory Collapse | ultimate | Earth | 0 | {"coefficient":1.04,"allTargets":true,"breakPower":3} |
| Shatter the Broken | melee | Earth | 18 | {"coefficient":1.2,"payoff":"broken","payoffMultiplier":1.4,"breakPower":2} |

### Fase 2

Grumm: Oathbound Assault voorbereiden -> impact -> herstelactie. Escorts beschermen hem.

Tegenreactie: Break Grumm to cancel the assault or remove the escorts protecting him.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Grumm: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Granite Cleave | melee | Physical | 0 | {"coefficient":0.94,"breakPower":2} |
| Boulder Toss | magic | Earth | 20 | {"coefficient":1,"scaling":"str","breakPower":1} |
| Stone Shelter | buff | Earth | 16 | {"targetRole":"protected","buffs":[{"type":"defenseUp","duration":2,"value":0.3}]} |
| Mountain Breaker | ultimate | Earth | 0 | {"coefficient":1.68,"scaling":"str","breakPower":3,"payoff":"broken","payoffMultiplier":1.22} |

#### Kaeldrin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Rankbreaker | melee | Physical | 0 | {"coefficient":0.94,"status":{"type":"physicalVulnerability","chance":0.2,"duration":3,"value":0.18}} |
| Radiant Lance | magic | Holy Fire | 20 | {"coefficient":1.02,"scaling":"hybrid"} |
| Commander's Shelter | buff | Holy Fire | 18 | {"targetRole":"protected","protectAlly":true,"buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |
| Divine Seal | heal | Holy Fire | 24 | {"healing":true,"healCoefficient":1.15} |
| Blade of Dawn | ultimate | Holy Fire | 0 | {"coefficient":1.68,"scaling":"hybrid"} |

#### Sir Reginald: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Knight's Blow | melee | Physical | 0 | {"coefficient":0.9,"breakPower":2} |
| Earth Pulse | magic | Earth | 21 | {"coefficient":0.96,"scaling":"str","breakPower":1,"status":{"type":"stun","chance":0.3}} |
| Shadow Pulse | utility | Shadow | 22 | {"coefficient":0.84,"damaging":true,"status":{"type":"poison","chance":0.55,"duration":4}} |
| Knight's Oath | buff | Earth | 24 | {"targetSide":"self","buffs":[{"type":"defenseUp","duration":3,"value":0.28}]} |
| Oathbreaker | ultimate | Earth | 0 | {"coefficient":1.62,"scaling":"str","breakPower":3,"payoff":"broken","payoffMultiplier":1.2} |

### Fase 3

Koru-Vak: Oathguard trekt single-target attacks naar hem; Chained Judgment wordt voorbereid -> Break-impact -> herstelactie. Break annuleert voorbereiding en opent Broken Oath (+75% incoming damage). Na het venster keert een sterker schild terug.

#### Koru-Vak, the Iron Oathkeeper: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Chained Impact | melee | Physical | 0 | {"coefficient":0.7,"breakPower":3} |
| Iron Chain | magic | Physical | 16 | {"coefficient":0.8,"breakPower":3} |
| Oathbreaker Impact | ultimate | Physical | 0 | {"coefficient":1.15,"allTargets":true,"breakPower":4} |

#### Grumm: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Granite Cleave | melee | Physical | 0 | {"coefficient":0.94,"breakPower":2} |
| Boulder Toss | magic | Earth | 20 | {"coefficient":1,"scaling":"str","breakPower":1} |
| Stone Shelter | buff | Earth | 16 | {"targetRole":"protected","buffs":[{"type":"defenseUp","duration":2,"value":0.3}]} |
| Mountain Breaker | ultimate | Earth | 0 | {"coefficient":1.68,"scaling":"str","breakPower":3,"payoff":"broken","payoffMultiplier":1.22} |

#### Brokk: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Hammerfall | melee | Physical | 0 | {"coefficient":0.95,"breakPower":2} |
| Holy Pulse | magic | Holy Fire | 18 | {"coefficient":0.92,"scaling":"hybrid"} |
| Shield the Weak | buff | Earth | 14 | {"targetRole":"protected","buffs":[{"type":"defenseUp","duration":2,"value":0.25}]} |
| Judgment Breaker | ultimate | Holy Fire | 0 | {"coefficient":1.62,"scaling":"str","breakPower":3} |

## 59 - The Last Chorus

### Fase 1

Jory: Opening Chorus voorbereiden -> impact -> herstelactie. Tja versterkt de impact.

Tegenreactie: Tja strengthens the chorus. Silence Jory or eliminate the accompaniment.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Jory Bellwick: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Lute Crack | melee | Physical | 0 | {"coefficient":0.76,"status":{"type":"disrupted","chance":0.2,"duration":3,"value":0.15}} |
| Star Note | magic | Sound | 18 | {"coefficient":0.96} |
| Discordant Chord | utility | Sound | 22 | {"status":{"type":"magicVulnerability","chance":0.75,"duration":3,"value":0.18}} |
| Dissonant Purge | dispel | Sound | 22 | {"dispel":true} |
| Battle Hymn | buff | Sound | 34 | {"allAllies":true,"buffs":[{"type":"damageUp","duration":3,"value":0.15}]} |
| Grand Chord | ultimate | Sound | 0 | {"coefficient":1.1,"allTargets":true,"teamBuffs":[{"type":"damageUp","duration":2,"value":0.15}]} |

#### Tja: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Frost Flourish | melee | Physical | 0 | {"coefficient":0.78,"status":{"type":"agilityDown","chance":0.25,"duration":3,"value":0.15}} |
| Crystal Waltz | magic | Ice | 22 | {"coefficient":0.92,"status":{"type":"sleep","chance":0.42,"duration":3}} |
| Ice Lance | magic | Ice | 25 | {"coefficient":1.12,"status":{"type":"agilityDown","chance":0.65,"duration":3,"value":0.15}} |
| Winter Rhythm | buff | Ice | 24 | {"targetSide":"self","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"critUp","duration":2,"value":0.1}]} |
| Winter Encore | ultimate | Ice | 0 | {"coefficient":1.12,"allTargets":true,"status":{"type":"sleep","chance":0.35,"duration":2}} |

### Fase 2

Jory: Sanctified Chorus voorbereiden -> impact -> herstelactie. Lysra/Justin kunnen healen.

Tegenreactie: Lysra and Justin sustain the chorus. Silence the singer or defeat the healers.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Lysra: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Spellstaff Sweep | melee | Physical | 0 | {"coefficient":0.72} |
| Arcane Missile | magic | Arcane | 18 | {"coefficient":1} |
| Barrier Spell | heal | Arcane | 24 | {"healing":true,"healCoefficient":1.45,"conditionalCleanse":true,"cleanse":true} |
| Arcane Aegis | buff | Arcane | 28 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25},{"type":"barrier","duration":3,"value":0.22}],"cleanseAlly":true} |
| Astral Convergence | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"magicUp","duration":3,"value":0.25}]} |

#### Saint Justin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sanctified Strike | melee | Holy Fire | 0 | {"coefficient":0.92,"scaling":"hybrid"} |
| Radiant Ward | magic | Holy Fire | 19 | {"coefficient":0.88} |
| Merciful Seal | heal | Holy Fire | 25 | {"healing":true,"healCoefficient":1.35,"cleanse":true} |
| Radiant Oath | buff | Holy Fire | 27 | {"targetRole":"threatened","buffs":[{"type":"barrier","duration":3,"value":0.25},{"type":"damageUp","duration":2,"value":0.12}]} |
| Saint's Judgment | ultimate | Holy Fire | 0 | {"coefficient":1.62,"scaling":"hybrid"} |
| Holy Purification | cleanse | Holy Fire | 16 | {"cleanse":true,"teamBuffs":[{"type":"statusWard","duration":2,"value":0.35}]} |

#### Jory Bellwick: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Lute Crack | melee | Physical | 0 | {"coefficient":0.76,"status":{"type":"disrupted","chance":0.2,"duration":3,"value":0.15}} |
| Star Note | magic | Sound | 18 | {"coefficient":0.96} |
| Discordant Chord | utility | Sound | 22 | {"status":{"type":"magicVulnerability","chance":0.75,"duration":3,"value":0.18}} |
| Dissonant Purge | dispel | Sound | 22 | {"dispel":true} |
| Battle Hymn | buff | Sound | 34 | {"allAllies":true,"buffs":[{"type":"damageUp","duration":3,"value":0.15}]} |
| Grand Chord | ultimate | Sound | 0 | {"coefficient":1.1,"allTargets":true,"teamBuffs":[{"type":"damageUp","duration":2,"value":0.15}]} |

### Fase 3

Selyra: rings opbouwen, afgewisseld met magic -> Crescendo aankondigen -> Grand Crescendo. Rings versterken damage; controle annuleert charging en rings. Gedode of gecontroleerde supports verlagen de ringcapaciteit. Companions buffen/healen waar mogelijk.

#### Selyra Quill, the Grand Cantor: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Cantor's Stroke | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Harmonic Ring | magic | Sound | 16 | {"coefficient":0.8,"status":{"type":"silence","chance":0.65,"duration":2},"breakPower":0} |
| Grand Crescendo | ultimate | Sound | 0 | {"coefficient":1.15,"allTargets":true,"status":{"type":"silence","chance":0.65,"duration":2},"breakPower":0} |

#### Jory Bellwick: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Lute Crack | melee | Physical | 0 | {"coefficient":0.76,"status":{"type":"disrupted","chance":0.2,"duration":3,"value":0.15}} |
| Star Note | magic | Sound | 18 | {"coefficient":0.96} |
| Discordant Chord | utility | Sound | 22 | {"status":{"type":"magicVulnerability","chance":0.75,"duration":3,"value":0.18}} |
| Dissonant Purge | dispel | Sound | 22 | {"dispel":true} |
| Battle Hymn | buff | Sound | 34 | {"allAllies":true,"buffs":[{"type":"damageUp","duration":3,"value":0.15}]} |
| Grand Chord | ultimate | Sound | 0 | {"coefficient":1.1,"allTargets":true,"teamBuffs":[{"type":"damageUp","duration":2,"value":0.15}]} |

#### Saint Justin: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sanctified Strike | melee | Holy Fire | 0 | {"coefficient":0.92,"scaling":"hybrid"} |
| Radiant Ward | magic | Holy Fire | 19 | {"coefficient":0.88} |
| Merciful Seal | heal | Holy Fire | 25 | {"healing":true,"healCoefficient":1.35,"cleanse":true} |
| Radiant Oath | buff | Holy Fire | 27 | {"targetRole":"threatened","buffs":[{"type":"barrier","duration":3,"value":0.25},{"type":"damageUp","duration":2,"value":0.12}]} |
| Saint's Judgment | ultimate | Holy Fire | 0 | {"coefficient":1.62,"scaling":"hybrid"} |
| Holy Purification | cleanse | Holy Fire | 16 | {"cleanse":true,"teamBuffs":[{"type":"statusWard","duration":2,"value":0.35}]} |

## 60 - The First Record

### Fase 1

Thaddeus: Sealed Record voorbereiden -> impact -> herstelactie. Auditor en Custodian gebruiken hun bestaande rotation-pressure en herstelkits.

Tegenreactie: The Auditor pressures your rotation; the Custodian restores it. Interrupt Thaddeus before the record resolves.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### Inkbound Auditor: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Quill Rend | melee | Physical | 0 | {"coefficient":0.9,"status":{"type":"bleed","chance":0.2,"duration":3}} |
| Red Ink Edict | magic | Shadow | 21 | {"coefficient":1,"status":{"type":"poison","chance":0.65,"duration":4},"extraStatuses":[{"type":"marked","chance":0.5,"duration":4,"value":0.12}]} |
| Red Ledger | buff | Shadow | 20 | {"targetSide":"self","buffs":[{"type":"critUp","duration":3,"value":0.15}]} |
| Audit of the Nameless | ultimate | Shadow | 0 | {"coefficient":1.7,"payoff":"afflicted","payoffMultiplier":1.25,"critBonus":0.15} |
| Audit | utility | Shadow | 16 | {"auditSkill":true,"status":{"type":"audit","chance":1,"duration":2,"value":0.5}} |

#### High Administrator Thaddeus: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Audit Stamp | melee | Physical | 0 | {"coefficient":0.8,"status":{"type":"disrupted","chance":0.25,"duration":3,"value":0.15}} |
| Tech Pulse | magic | Tech | 20 | {"coefficient":0.92,"status":{"type":"stun","chance":0.35}} |
| Administrative Order | buff | Tech | 22 | {"targetRole":"caster","buffs":[{"type":"magicUp","duration":3,"value":0.25}]} |
| Null Mandate | dispel | Tech | 24 | {"dispel":true} |
| Administrative Lock | utility | Tech | 16 | {"recentSkillLock":true,"status":{"type":"administrativeLock","chance":1,"duration":2,"value":0.5}} |
| Final Audit | ultimate | Tech | 0 | {"coefficient":1.16,"allTargets":true,"status":{"type":"disrupted","chance":0.7,"duration":3,"value":0.15}} |

#### Archive Custodian: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ledger Crush | melee | Physical | 0 | {"coefficient":0.78} |
| Forbidden Index | magic | Arcane | 21 | {"coefficient":0.96} |
| Restore Entry | heal | Arcane | 27 | {"healing":true,"healCoefficient":1.45,"cleanse":true} |
| Preservation Protocol | buff | Arcane | 28 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.18}]} |
| Resonance Lock | utility | Arcane | 24 | {"partyResonanceDrain":18,"status":{"type":"disrupted","chance":0.6,"duration":3,"value":0.15}} |
| Archive Lock | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"partyResonanceDrain":30} |
| Archive | dispel | Arcane | 18 | {"dispel":true} |

### Fase 2

Maeric: Royal Execution voorbereiden -> impact -> herstelactie. Lucan en Sentinel beschermen hem tijdens voorbereiding.

Tegenreactie: Lucan and the Sentinel escort Maeric. Break the King, dismantle his escorts, or Guard the announced target.
Mark/status: marked. Cleanse van deze status annuleert de speciale gerichte impact. Onderbreken opent 20% physical en magic vulnerability voor 2 acties.

#### King Maeric: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Sceptre Judgment | melee | Physical | 0 | {"coefficient":0.9,"status":{"type":"marked","chance":0.25,"duration":4,"value":0.12}} |
| Lion Seal | magic | Holy Fire | 21 | {"coefficient":0.94} |
| Royal Command | buff | Holy Fire | 38 | {"allAllies":true,"buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"strengthUp","duration":3,"value":0.2}]} |
| Royal Repeal | dispel | Holy Fire | 26 | {"dispel":true} |
| Royal Bulwark | heal | Holy Fire | 26 | {"healing":true,"healCoefficient":1.15} |
| Crown of Cindervale | ultimate | Holy Fire | 0 | {"coefficient":1.1,"allTargets":true,"teamBuffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"strengthUp","duration":3,"value":0.2}]} |

#### Prince Lucan Cindralis: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Prince's Blade | melee | Physical | 0 | {"coefficient":0.94,"status":{"type":"critExposed","chance":0.25,"duration":2,"value":0.12}} |
| Blue Edict | magic | Arcane | 20 | {"coefficient":1.02,"scaling":"hybrid"} |
| Royal Pressure | utility | Arcane | 21 | {"status":{"type":"marked","chance":0.8,"duration":4,"value":0.12}} |
| Royal Momentum | buff | Arcane | 25 | {"targetSide":"self","buffs":[{"type":"agilityUp","duration":3,"value":0.25},{"type":"critUp","duration":3,"value":0.15}]} |
| Cindralis Decree | ultimate | Arcane | 0 | {"coefficient":1.68,"scaling":"hybrid","payoff":"marked","payoffMultiplier":1.22} |

#### Dawn Gate Sentinel: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Gate Halberd | melee | Physical | 0 | {"coefficient":0.9,"breakPower":2} |
| Dawn Window | magic | Holy Fire | 20 | {"coefficient":0.92} |
| Hold the Line | buff | Holy Fire | 36 | {"allAllies":true,"buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.2}]} |
| Sentinel Ward | heal | Holy Fire | 24 | {"healing":true,"healCoefficient":1.12} |
| Last Gate Protocol | ultimate | Holy Fire | 0 | {"coefficient":1.08,"allTargets":true,"teamBuffs":[{"type":"barrier","duration":3,"value":0.25}]} |

### Fase 3

Ilyss: Buff / Skill / Memory Record afwisselen -> opgeslagen effect reproduceren, met magic op iedere derde actiepositie. Buff Record neemt een buff weg; Skill Record blokkeert tijdelijk een recent skill; Memory Record bewaart een recent effect. Controle wist het record voordat het wordt gereproduceerd.

#### Ilyss Vanthe, the First Archivist: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Archive Chain | melee | Physical | 0 | {"coefficient":0.7,"breakPower":1} |
| Recorded Rupture | magic | Sigil | 16 | {"coefficient":0.8,"breakPower":0} |
| The Living Archive | ultimate | Sigil | 0 | {"coefficient":1.15,"allTargets":true,"breakPower":0} |

#### Archive Custodian: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Ledger Crush | melee | Physical | 0 | {"coefficient":0.78} |
| Forbidden Index | magic | Arcane | 21 | {"coefficient":0.96} |
| Restore Entry | heal | Arcane | 27 | {"healing":true,"healCoefficient":1.45,"cleanse":true} |
| Preservation Protocol | buff | Arcane | 28 | {"targetRole":"threatened","buffs":[{"type":"defenseUp","duration":3,"value":0.25},{"type":"barrier","duration":2,"value":0.18}]} |
| Resonance Lock | utility | Arcane | 24 | {"partyResonanceDrain":18,"status":{"type":"disrupted","chance":0.6,"duration":3,"value":0.15}} |
| Archive Lock | ultimate | Arcane | 0 | {"coefficient":1.08,"allTargets":true,"partyResonanceDrain":30} |
| Archive | dispel | Arcane | 18 | {"dispel":true} |

#### Inkbound Auditor: beschikbaar basisrepertoire

| Ability | Type | Element | Basis MP | Effectdefinitie |
|---|---|---|---:|---|
| Quill Rend | melee | Physical | 0 | {"coefficient":0.9,"status":{"type":"bleed","chance":0.2,"duration":3}} |
| Red Ink Edict | magic | Shadow | 21 | {"coefficient":1,"status":{"type":"poison","chance":0.65,"duration":4},"extraStatuses":[{"type":"marked","chance":0.5,"duration":4,"value":0.12}]} |
| Red Ledger | buff | Shadow | 20 | {"targetSide":"self","buffs":[{"type":"critUp","duration":3,"value":0.15}]} |
| Audit of the Nameless | ultimate | Shadow | 0 | {"coefficient":1.7,"payoff":"afflicted","payoffMultiplier":1.25,"critBonus":0.15} |
| Audit | utility | Shadow | 16 | {"auditSkill":true,"status":{"type":"audit","chance":1,"duration":2,"value":0.5}} |

## Leeshulp effectdefinities

coefficient = damagefactor van de scaling stat; healCoefficient = healingfactor. allTargets = AoE; allAllies = party-effect. buffs/status/extraStatuses geven type, waarde, duur en eventuele kans. chance 0.7 betekent 70%; value 0.25 betekent doorgaans 25%. healing = herstel, cleanse = een verwijderbaar negatief effect verwijderen, dispel = buff verwijderen. breakPower bepaalt extra Break-opbouw. Basis MP kan door efficiency/developer-instellingen wijzigen. Damage bevat ook level, buffs, resistances, crit, Guard en developer-instellingen.
