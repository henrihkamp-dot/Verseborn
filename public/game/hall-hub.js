(() => {
  const meals = [
    { id: 'emberroot', name: 'Emberroot Stew', price: 30, desc: '+15% Max HP for the stage.', hp: .15 },
    { id: 'moonbroth', name: 'Moonbean Broth', price: 35, desc: '+15% Max MP for the stage.', mp: .15 },
    { id: 'ironroast', name: 'Ironroot Roast', price: 40, desc: '+12% STR for the stage.', str: .12 },
    { id: 'sagepot', name: 'Sageleaf Hotpot', price: 40, desc: '+12% MAG for the stage.', mag: .12 },
    { id: 'hearthplate', name: 'Hearthguard Plate', price: 45, desc: '10% less incoming damage for the stage.', defense: .10 },
    { id: 'renewal', name: 'Renewal Porridge', price: 45, desc: 'Recover 3% Max HP after each own action.', hpRegen: .03 },
    { id: 'stillwater', name: 'Stillwater Soup', price: 50, desc: 'Recover 3% Max MP after each own action.', mpRegen: .03 },
    { id: 'cleanspice', name: 'Clean-spice Curry', price: 40, desc: '20% lower incoming status chance for the stage.', resistance: .20 }
  ];
  const coatings = [
    { id: 'nightshade', name: 'Nightshade Oil', price: 35, desc: 'Basic hits: 30% Poison chance, before resistance.', status: 'poison', chance: .30, duration: 3 },
    { id: 'razorwax', name: 'Razorleaf Wax', price: 35, desc: 'Basic hits: 30% Bleed chance, before resistance.', status: 'bleed', chance: .30, duration: 3 },
    { id: 'rustbite', name: 'Rustbite Oil', price: 40, desc: 'Basic hits: 30% Armor Break chance; Defense -15% for 3 actions.', status: 'defenseDown', chance: .30, duration: 3, value: .15 },
    { id: 'snare', name: 'Snare Resin', price: 35, desc: 'Basic hits: 35% chance to reduce AGI by 15% for 3 actions.', status: 'agilityDown', chance: .35, duration: 3, value: .15 },
    { id: 'dulling', name: 'Dulling Oil', price: 40, desc: 'Basic hits: 30% chance to reduce STR by 12% for 3 actions.', status: 'hubStrengthDown', chance: .30, duration: 3, value: .12 },
    { id: 'nullsalt', name: 'Nullsalt Paste', price: 40, desc: 'Basic hits: 30% chance to reduce MAG by 12% for 3 actions.', status: 'hubMagicDown', chance: .30, duration: 3, value: .12 }
  ];
  const blessings = [
    { id: 'shelter', name: 'Blessing of Shelter', desc: 'Start with a 25% Barrier for 2 own actions.', barrier: .25 },
    { id: 'clarity', name: 'Blessing of Clarity', desc: 'Active skills cost 10% less MP for the stage.', discount: .10 },
    { id: 'mercy', name: 'Blessing of Mercy', desc: '+15% healing received for the stage.', healing: .15 },
    { id: 'resolve', name: 'Blessing of Resolve', desc: 'Each party member survives their first fatal hit at 1 HP.', resolve: true },
    { id: 'overture', name: 'Blessing of Overture', desc: 'Begin with +15 Resonance (shared ultimate charge).', resonance: 15 },
    { id: 'composure', name: 'Blessing of Composure', desc: 'Each ally: the first reducible negative status lasts 1 action less; minimum 1.', firstStatusDuration: 1 },
    { id: 'purity', name: 'Blessing of Purity', desc: 'Each ally: the first Poison or Bleed tick deals 50% less damage.', firstDotReduction: .5 }
  ];
  const categories = { meal: meals, coating: coatings, blessing: blessings };
  const owners = { meal: 'Torren', coating: 'Mira', blessing: 'Kael' };
  const services = { Marla: 'General Shop', Glimmer: 'Stage Shop', Torren: 'Kitchen', Mira: 'Coating Supply', Kael: 'Sanctuary', Seerin: 'Shadow Trials', Sparky: 'Scavenging' };
  const labels = { meal: 'Torren Meal', coating: 'Mira Coating', blessing: 'Kael Blessing' };
  let prepStage = null, startingSupport = null, sparringSnapshot = null, noticeTimer;
  let preparationNotes = [];
  const curios = new Image();
  curios.src = 'assets/ui/loot-icons.png';
  const recruited = id => id === 'Marla' || state.party.includes(id);
  const entry = (category, id) => categories[category]?.find(item => item.id === id);
  const stock = item => Math.max(0, Math.floor(Number(state.inventory[item?.name]) || 0));
  const escaped = value => escapeMarkup(String(value ?? ''));
  function progress() {
    upgradeShadowRewards();
    const hall = hallBattleProgress();
    if (!hall.hub || typeof hall.hub !== 'object' || Array.isArray(hall.hub)) hall.hub = {};
    const hub = hall.hub;
    if (!hub.selected || typeof hub.selected !== 'object' || Array.isArray(hub.selected)) hub.selected = {};
    for (const category of Object.keys(categories)) {
      if (!entry(category, hub.selected[category])) hub.selected[category] = null;
    }
    hub.sparringWins = Array.isArray(hub.sparringWins) ? [...new Set(hub.sparringWins.filter(id => HALL_RECRUITS.includes(id) || id === 'Verseborn'))] : [];
    hub.shadowDefeated = Array.isArray(hub.shadowDefeated) ? [...new Set(hub.shadowDefeated.filter(id => Object.hasOwn(baseJobs, id)))] : [];
    return hub;
  }
  function supportForBattle() {
    return startingSupport || (mode === 'battle' && battle && !battle.ended ? battle.hubSupport : null);
  }
  function memberEffect(unit, category) {
    return unit?.id && battle?.party?.includes(unit) ? supportForBattle()?.[category] : null;
  }
  for (const [category, icon] of [['meal', 'vampiric'], ['coating', 'poison'], ['blessing', 'barrier']]) {
    STATUS_DEFS['hub_' + category] = { label: labels[category], short: category[0].toUpperCase() };
    statusIconAliases['hub_' + category] = icon;
  }
  function supportPresentation(unit) {
    const member = unit?.id && battle?.party?.find(member => member.id === unit.id);
    if (!member || !supportForBattle()) return [];
    return Object.keys(categories).flatMap(category => {
      const effect = memberEffect(member, category); if (!effect) return [];
      const spent = category === 'blessing' && (effect.resolve && member.hubResolveUsed || effect.barrier && !statusOf(member, 'barrier') || effect.resonance || effect.firstStatusDuration && member.statusGuards?.kaelDuration || effect.firstDotReduction && member.statusGuards?.kaelDot);
      return [{ type: 'hub_' + category, effect, category, remaining: 0, spent: Boolean(spent) }];
    });
  }
  const oldDrawStatusBadges = drawBattleStatusBadges, oldStatusDisplay = statusDisplayData, oldStatusBadges = statusBadgesHtml;
  drawBattleStatusBadges = (unit, ...args) => {
    const support = supportPresentation(unit);
    return oldDrawStatusBadges(support.length ? { ...unit, statuses: [...support, ...(unit.statuses || [])] } : unit, ...args);
  };
  statusDisplayData = (unit, status) => status.effect && status.category ? {
    name: status.effect.name, kind: labels[status.category], remaining: 0,
    timing: status.spent ? 'Already used / stage-start effect applied' : 'Active for this stage',
    compact: status.spent ? 'USED' : status.category[0].toUpperCase(),
    description: status.effect.desc
  } : oldStatusDisplay(unit, status);
  statusBadgesHtml = unit => oldStatusBadges(unit) + (supportPresentation(unit).length ? `<div class="status-chips hub-combat-chips">${supportPresentation(unit).map(status => `<span class="hub-${status.category}" title="${escaped(status.effect.name + ': ' + status.effect.desc)}">${labels[status.category]}${status.spent ? ' / used' : ''}</span>`).join('')}</div>` : '');
  for (const [category, items] of Object.entries(categories)) {
    if (category === 'blessing') continue;
    items.forEach(item => inventoryDb[item.name] = { type: category === 'meal' ? 'Meal' : 'Weapon Coating', desc: item.desc, short: 'Selected at Stage Preparation. Consumed only when the stage begins.', hubCategory: category });
  }
  const oldInventoryCategory = inventoryCategory, oldInventoryIcon = inventoryIcon;
  inventoryCategory = name => inventoryDb[name]?.hubCategory ? 'consumables' : oldInventoryCategory(name);
  inventoryIcon = name => inventoryDb[name]?.hubCategory ? { sheet: 'item', index: inventoryDb[name].hubCategory === 'meal' ? 0 : 1 } : oldInventoryIcon(name);
  vendors.torrenKitchen = { name: "Torren's Kitchen", blurb: 'Packed meals for the next trial.', wares: meals.map(item => ({ kind: 'item', ...item })) };
  vendors.miraCoatings = { name: "Mira's Coating Supply", blurb: 'One coating. Every basic hit.', wares: coatings.map(item => ({ kind: 'item', ...item })) };
  const supplies = [
    { name: 'Hall Ironblade', slot: 'weapon', stats: { str: 4 }, price: 80 },
    { name: 'Hall Focus Rod', slot: 'weapon', stats: { mag: 4 }, price: 80 },
    { name: 'Hall Padded Vest', slot: 'armour', stats: { stam: 4 }, price: 85 },
    { name: 'Hall Copper Band', slot: 'ring', stats: { agi: 3 }, price: 65 },
    { name: 'Hall Tempered Blade', slot: 'weapon', stats: { str: 7 }, price: 180, unlock: 15 },
    { name: 'Hall Scholar Rod', slot: 'weapon', stats: { mag: 7 }, price: 180, unlock: 15 },
    { name: 'Hall Quilted Armor', slot: 'armour', stats: { stam: 7 }, price: 190, unlock: 15 }
  ];
  supplies.forEach(item => gearDb[item.slot].push({ ...item, rarity: 'Common', effects: [] }));
  const sparringRewards = {
    Verseborn: { str: 2, mag: 3 }, Torren: { stam: 4, str: 1 }, Mira: { agi: 4, str: 1 },
    Kael: { mag: 3, stam: 2 }, Glimmer: { mag: 3, agi: 2 }, Seerin: { str: 3, stam: 2 }, Sparky: { mag: 2, echo: 3 }
  };
  Object.entries(sparringRewards).forEach(([id, stats]) => gearDb.ring.push({ name: `${id}'s Sparring Seal`, slot: 'ring', stats, rarity: 'Common', effects: [] }));

  const shadowTrials = {
  "Verseborn": {
    "ring": "Ring of the Unwritten Refrain",
    "unique": "Resonant Encore",
    "effectType": "resonantEncore",
    "stats": {
      "mag": 30,
      "echo": 27,
      "agi": 21
    },
    "affixKeys": [
      "resonant",
      "prolonging",
      "alchemist",
      "siphoning",
      "resolute"
    ],
    "ability": "Interacting with Resonance empowers the next support or healing action by 15%. No additional cast.",
    "legacy": "Ring of the Unbroken Refrain",
    "desc": "An unheard refrain answers every song. Silence the echo, then let Sound carry the Hall forward."
  },
  "Mira": {
    "ring": "Ring of the Hollow Veil",
    "unique": "Voidthorn Precision",
    "effectType": "voidthornPrecision",
    "stats": {
      "str": 30,
      "agi": 27,
      "mag": 21
    },
    "affixKeys": [
      "fleet",
      "keen",
      "alchemist",
      "quickstart",
      "siphoning"
    ],
    "ability": "Deal 12% additional damage against enemies affected by Silence or Shadow Exposed. Both statuses do not stack this bonus.",
    "legacy": "Ring of the Last Whisper",
    "desc": "A perfect strike waits in the darkness. Break her silence before precision breaks your formation."
  },
  "Seerin": {
    "ring": "Ring of the Last Ember",
    "unique": "Flame’s Answer",
    "effectType": "flamesAnswer",
    "stats": {
      "str": 30,
      "stam": 27,
      "mag": 21
    },
    "affixKeys": [
      "resolute",
      "prolonging",
      "leeching",
      "siphoning",
      "keen"
    ],
    "ability": "After successfully intercepting an ally’s hit or reducing a hit with Personal Guard or Party Guard, the next offensive action deals 15% more damage.",
    "legacy": "Ring of the Hearthward Oath",
    "desc": "The oath has become a burning wall. Face the shield that would protect the Hall from itself."
  },
  "Kael": {
    "ring": "Ring of the Broken Oath",
    "unique": "Measured Mercy",
    "effectType": "measuredMercy",
    "stats": {
      "mag": 30,
      "stam": 27,
      "echo": 21
    },
    "affixKeys": [
      "resolute",
      "prolonging",
      "resonant",
      "fleet",
      "siphoning"
    ],
    "ability": "Healing a target below 50% HP restores 15% more HP and grants 8% Defense Up for 1 action.",
    "legacy": "Ring of the Unspent Mercy",
    "desc": "Every quiet rite has a shadow. Withstand his sigils and the mercy he refuses to surrender."
  },
  "Torren": {
    "ring": "Ring of the Deep Foundation",
    "unique": "Stone Remembers",
    "effectType": "stoneRemembers",
    "stats": {
      "stam": 30,
      "str": 27,
      "agi": 21
    },
    "affixKeys": [
      "resolute",
      "prolonging",
      "leeching",
      "keen",
      "quickstart"
    ],
    "ability": "Torren’s damaging Earth abilities generate 1 additional Break per target, once per action. Works with Foundation Break and his other Earth attacks.",
    "legacy": "Ring of the Mountain Within",
    "desc": "The mountain remembers every blow. Guard your allies while his foundations threaten to split the Hall."
  },
  "Glimmer": {
    "ring": "Ring of Impossible Maintenance",
    "unique": "Overclocked Patch",
    "effectType": "overclockedPatch",
    "stats": {
      "mag": 30,
      "agi": 27,
      "echo": 21
    },
    "affixKeys": [
      "fleet",
      "resonant",
      "siphoning",
      "alchemist",
      "quickstart"
    ],
    "ability": "Successful healing or deploying a Combat Drone empowers the next damaging Tech action by 12%. One charge per support action; charges do not stack.",
    "legacy": "Ring of the Endless Workshop",
    "desc": "A machine without an off switch wears a familiar smile. Outlast the engineer and her relentless inventions."
  },
  "Sparky": {
    "ring": "Ring of the Remembered Ember",
    "unique": "Hungry Flame",
    "effectType": "hungryFlame",
    "stats": {
      "mag": 30,
      "echo": 27,
      "stam": 21
    },
    "affixKeys": [
      "leeching",
      "siphoning",
      "keen",
      "resonant",
      "alchemist"
    ],
    "ability": "Receiving a buff or healing, or restoring HP through Vampiric, empowers the next damaging action by 12%. Charges do not stack.",
    "legacy": "Ring of the Everhungry Ember",
    "desc": "The smallest ember casts a hungry shadow. Survive the fire before Emberblood restores what you took."
  }
};
  const shadowRequirement = 'Encounter unavailable — this Flameguard member has not yet entered Ember Hall.';
  let shadowParty = [], selectedShadow = null;
  for (const [id, trial] of Object.entries(shadowTrials)) {
    const ring = item(trial.ring, 'ring', { ...trial.stats }, trial.ability,
      { type: trial.effectType, value: 1, label: trial.unique + ': ' + trial.ability, artifactUnique: true });
    ring.rarity = 'Shadow Personal Artifact'; ring.shadowArtifact = true; gearDb.ring.push(ring); gearOwners[trial.ring] = [id]; artifactGearNames.add(trial.ring);
    // Keep legacy references loadable until their existing copy is upgraded in place.
    gearDb.ring.push({ ...ring, name: trial.legacy }); gearOwners[trial.legacy] = [id]; artifactGearNames.add(trial.legacy);
  }
  function premiumShadowAffixes(id) {
    const trial = shadowTrials[id], gear = gearByName(trial.ring), pool = gearAffixPool(gear);
    return trial.affixKeys.map(key => {
      const template = pool.find(entry => entry.key === key);
      if (!template) throw new Error('Invalid Shadow Ring affix: ' + key);
      const entry = { ...template, value: template.max, ...(window.StatusSystem ? { statusRulesVersion: StatusSystem.version } : {}) };
      entry.text = formatAffix(entry); return entry;
    });
  }
  function upgradeShadowRewards() {
    for (const [id, trial] of Object.entries(shadowTrials)) {
      for (const name of [trial.ring, trial.legacy]) if (state.gearRarities?.[name]) state.gearRarities[name] = 'Shadow Personal Artifact';
      for (const instance of Object.values(gearInstances)) if ([trial.ring, trial.legacy].includes(instance.name)) instance.rarity = 'Shadow Personal Artifact';
      for (const instance of Object.values(gearInstances)) if ([trial.ring, trial.legacy].includes(instance.name) && instance.shadowRewardVersion !== 2) {
        instance.name = trial.ring; instance.stats = { ...trial.stats }; instance.affixes = premiumShadowAffixes(id); instance.rarity = 'Shadow Personal Artifact'; instance.shadowRewardVersion = 2;
      }
      for (const hero of Object.values(baseJobs)) for (const slot of Object.keys(hero.gear)) if (hero.gear[slot] === trial.legacy) hero.gear[slot] = trial.ring;
      if (state.ownedGear.includes(trial.legacy)) {
        state.ownedGear = [...new Set(state.ownedGear.map(name => name === trial.legacy ? trial.ring : name))];
        if (state.gearCopies[trial.legacy]) { state.gearCopies[trial.ring] = Math.max(state.gearCopies[trial.ring] || 0, state.gearCopies[trial.legacy]); delete state.gearCopies[trial.legacy]; }
      }
    }
  }
  const oldShadowLoad = loadGame;
  loadGame = (...args) => { const result = oldShadowLoad(...args); if (result) upgradeShadowRewards(); return result; };
  function shadowRewardHtml(id) {
    const trial = shadowTrials[id], affixes = premiumShadowAffixes(id);
    return '<section class="shadow-reward"><h4>' + escaped(trial.ring) + '</h4><p>SHADOW PERSONAL ARTIFACT RING / Character-bound: ' + id + ' only</p><div class="shadow-reward-stats">' + Object.entries(trial.stats).map(([stat,value]) => '<span>' + stat.toUpperCase() + ' <b>+' + value + '</b></span>').join('') + '</div><h4>Shadow Personal Artifact Affixes</h4><ul>' + affixes.map(entry => '<li>' + escaped(formatAffix(entry)) + '</li>').join('') + '</ul><h4>Unique Effects</h4><p><strong>' + escaped(trial.unique) + '</strong><br>' + escaped(trial.ability) + '</p></section>';
  }
  function shadowStats(id) {
    const stats = Object.fromEntries(Object.entries(baseJobs[id].stats).map(([key, value]) => [key, Math.round((value + Math.floor(39 * (.32 + value / 30))) * 2)]));
    return { ...stats, max: (30 + stats.stam * 4) * 8 * 6, mp: 180 };
  }
  function hasShadowRing(unit) {
    return Boolean(unit?.id && shadowTrials[unit.id] && battle?.party?.includes(unit) && effectValue(unit.id, shadowTrials[unit.id].effectType));
  }
  function offensiveShadowSkill(sk) { return skillTargetsEnemies(sk) && sk.power >= 0 && !sk.statusOnly && !sk.dispel; }
  function beginShadowAction(source, sk) {
    source.shadowActionContext = { resonance: state.resonance, enemyResonance: battle.enemyResonance, support: !skillTargetsEnemies(sk) || sk.power < 0, offensive: offensiveShadowSkill(sk), ready: Boolean(source.shadowUniqueReady), success: false };
    if (hasShadowRing(source) && source.shadowUniqueReady && (source.id === 'Verseborn' && source.shadowActionContext.support || source.id === 'Seerin' && source.shadowActionContext.offensive || source.id === 'Sparky' && source.shadowActionContext.offensive || source.id === 'Glimmer' && source.shadowActionContext.offensive && sk.element === 'Tech')) delete source.shadowUniqueReady;
  }
  function shadowBreakBonus(source, sk) {
    return source?.id === 'Torren' && hasShadowRing(source) && offensiveShadowSkill(sk) && sk.element === 'Earth' ? 1 : 0;
  }
  function shadowDamageBonus(source, sk, target) {
    if (!hasShadowRing(source) || !offensiveShadowSkill(sk)) return 0;
    if (source.id === 'Mira') return statusOf(target,'silence') || statusOf(target,'shadowExposed') ? .12 : 0;
    const ready = source.shadowActionContext?.ready ?? source.shadowUniqueReady;
    if (!ready) return 0;
    return source.id === 'Seerin' ? .15 : source.id === 'Sparky' ? .12 : source.id === 'Glimmer' && sk.element === 'Tech' ? .12 : 0;
  }
  function shadowHealingBonus(source, ally) {
    if (!hasShadowRing(source)) return 0;
    if (source.id === 'Kael' && ally.hp < ally.max * .5) return .15;
    return source.id === 'Verseborn' && source.shadowActionContext?.ready && source.shadowActionContext.support ? .15 : 0;
  }
  function shadowHealed(source, ally, restored, belowHalf = false) {
    if (restored <= 0) return;
    if (hasShadowRing(ally) && ally.id === 'Sparky') ally.shadowUniqueReady = true;
    if (!hasShadowRing(source)) return;
    if (source.id === 'Kael' && belowHalf) {
      const current = statusOf(ally,'defenseUp');
      applyStatus(ally,'defenseUp',source,{ force:true,value:Math.max(.08,current?.value || 0),duration:Math.max(1,current?.remaining || 0) });
    }
    if (source.id === 'Glimmer' && source.shadowActionContext) source.shadowActionContext.success = true;
  }
  function shadowDefended(unit, guarded, intercepted, partyGuard, damage) {
    if (!hasShadowRing(unit) || damage <= 0 || unit.hp <= 0) return;
    if (unit.id === 'Seerin' && (guarded || intercepted || partyGuard)) unit.shadowUniqueReady = true;
  }
  const oldShadowStatus = applyStatus;
  applyStatus = (target,type,source,options) => {
    const result = oldShadowStatus(target,type,source,options);
    if (result.applied) {
      if (target?.id === 'Sparky' && hasShadowRing(target) && STATUS_DEFS[type]?.buff) target.shadowUniqueReady = true;
      if (type === 'combatDrone' && source?.id === 'Glimmer' && hasShadowRing(source) && source.shadowActionContext) source.shadowActionContext.success = true;
    }
    return result;
  };
  function finishShadowAction(source, sk) {
    const context = source.shadowActionContext;
    if (context && hasShadowRing(source)) {
      if (source.id === 'Verseborn' && !context.support && (state.resonance !== context.resonance || battle.enemyResonance !== context.enemyResonance || sk.anim === 'ultimate' || sk.enemyResonanceClear || sk.enemyResonanceLock || sk.enemyResonanceDrain)) source.shadowUniqueReady = true;
      if (source.id === 'Glimmer' && context.success && context.support) source.shadowUniqueReady = true;
    }
    delete source.shadowActionContext;
  }
  const oldWares = vendorWares, oldOpenVendor = openVendor, oldBuy = buyWare;
  vendorWares = id => {
    if (state.gameMode !== 'hallBattles') return oldWares(id);
    const owner = { workshop: 'Glimmer', torrenKitchen: 'Torren', miraCoatings: 'Mira' }[id];
    if (owner && !recruited(owner)) return [];
    if (id !== 'marla') return oldWares(id);
    return [...oldWares(id).filter(ware => ware.kind !== 'gear'), ...supplies.filter(item => hallBattleProgress().unlockedStage >= (item.unlock || 1)).map(item => ({ kind: 'gear', name: item.name, price: item.price, rarity: 'Common' }))];
  };
  openVendor = id => {
    if (state.gameMode === 'hallBattles') {
      const owner = { workshop: 'Glimmer', torrenKitchen: 'Torren', miraCoatings: 'Mira' }[id];
      if (owner && !recruited(owner)) return false;
    }
    return oldOpenVendor(id);
  };
  buyWare = index => { const result = oldBuy(index); if (state.gameMode === 'hallBattles') queueSave(); return result; };
  function overlay(title, content, back) {
    mode = 'hallMap'; heldDirection = null; fieldDestination = null;
    el.menu.classList.remove('hidden', 'is-shop');
    el.menu.dataset.menuView = 'hall-hub';
    document.querySelector('.menu-tabs').classList.add('hidden');
    el.menuBody.innerHTML = `<section class="hub-screen"><header class="hub-header"><h2>${escaped(title)}</h2><button type="button" data-hub-back aria-label="${back ? 'Back' : 'Close'}">${back ? '&larr;' : '&times;'}</button></header>${content}</section>`;
    el.menuBody.querySelector('[data-hub-back]').onclick = back || closeHallOverlay;
  }
  function select(category, id) {
    if (!categories[category] || mode === 'battle') return false;
    if (id !== null) {
      const item = entry(category, id);
      if (!recruited(owners[category]) || !item || category !== 'blessing' && !stock(item)) return false;
    }
    progress().selected[category] = id;
    queueSave();
    return true;
  }
  function supportIcon(category, item) {
    return `<span class="hub-support-icon hub-${category}" aria-hidden="true">${category === 'blessing' ? '&#10022;' : inventoryItemIconHtml(item?.name || (category === 'meal' ? meals[0].name : coatings[0].name))}</span>`;
  }
  function showChoices(category, returnTo = renderPreparation) {
    const selected = progress().selected[category];
    overlay(labels[category], `<fieldset class="hub-choices"><legend>${category === 'blessing' ? 'One blessing / no inventory cost' : 'One selection / consumed at stage start'}</legend>${categories[category].map(item => {
      const available = recruited(owners[category]) && (category === 'blessing' || stock(item) > 0);
      return `<label>${supportIcon(category, item)}<input type="radio" name="hub-choice" value="${item.id}" ${selected === item.id ? 'checked' : ''} ${available ? '' : 'disabled'}><span><strong>${escaped(item.name)}</strong><small>${escaped(item.desc)}</small></span><b>${category === 'blessing' ? 'FREE' : 'Owned: ' + stock(item)}</b></label>`;
    }).join('')}</fieldset><footer class="hub-footer"><button type="button" data-remove>Clear slot</button><button type="button" data-done>Done</button></footer>`, returnTo);
    el.menuBody.querySelectorAll('[name=hub-choice]').forEach(input => input.onchange = () => select(category, input.value));
    el.menuBody.querySelector('[data-remove]').onclick = () => { select(category, null); returnTo(); };
    el.menuBody.querySelector('[data-done]').onclick = returnTo;
  }
  function encounterSupportHtml() {
    clearExhaustedSupport();
    const selected=progress().selected;
    const slots=Object.keys(categories).map(category=>{const item=entry(category,selected[category]),unlocked=recruited(owners[category]);return `<section class="hub-slot hub-${category}"><h3>${labels[category]}</h3>${supportIcon(category,item)}<strong>${item?escaped(item.name):'None selected'}</strong><p>${item?escaped(item.desc):unlocked?'Select to view effects and choose support.':'Recruit '+owners[category]+' to unlock'}</p><small>${item&&category!=='blessing'?'Owned: '+stock(item):category==='blessing'?'No consumable cost':'Consumed at battle start'}</small><div><button type="button" data-encounter-support="${category}" ${unlocked?'':'disabled'}>${item?'Change':'Select'}</button><button type="button" data-encounter-clear="${category}" aria-label="Remove ${category}" ${item?'':'disabled'}>&times;</button></div></section>`;}).join('');
    const active=Object.keys(categories).flatMap(category=>{const item=entry(category,selected[category]);return item?[`<span class="hub-${category}"><b>${labels[category]}</b> ${escaped(item.name)}<small>${escaped(item.desc)}</small></span>`]:[];}).join('');
    return `<section class="hub-loadout"><h3>Battle Support</h3><div>${slots}</div></section><section class="hub-active"><h3>Active Support</h3>${active||'<p>No support selected.</p>'}</section>`;
  }
  function bindEncounterSupport(returnTo) {
    el.menuBody.querySelectorAll('[data-encounter-support]').forEach(button=>button.onclick=()=>showChoices(button.dataset.encounterSupport,returnTo));
    el.menuBody.querySelectorAll('[data-encounter-clear]').forEach(button=>button.onclick=()=>{select(button.dataset.encounterClear,null);returnTo();});
  }
  function beginSupportedBattle(begin) {
    clearExhaustedSupport();
    const support={},consumed=[];
    for(const category of Object.keys(categories)){const item=entry(category,progress().selected[category]);if(item&&(!recruited(owners[category])||category!=='blessing'&&!stock(item))){notice(item.name+' is unavailable. Change or remove it before beginning.');return false;}support[category]=item?{...item}:null;}
    startingSupport=support;
    try {for(const category of ['meal','coating'])if(support[category]){state.inventory[support[category].name]--;consumed.push(support[category].name);}if(begin()===false||mode!=='battle'||!battle)throw Error('Battle did not begin');battle.hubSupport=support;battle.meterTuning.hallSupport=Object.fromEntries(Object.keys(categories).map(category=>[category,support[category]?.name||null]));return true;}
    catch(error){for(const name of consumed)state.inventory[name]=(state.inventory[name]||0)+1;notice('The battle could not begin. Your support items were returned.');return false;}
    finally {startingSupport=null;}
  }
  function validStage(stage) {
    const hall = hallBattleProgress();
    return state.gameMode === 'hallBattles' && Number.isInteger(stage) && hallBattleInfo(stage) && (stage <= hall.unlockedStage || hall.clearedStages.includes(stage));
  }
  function openPreparation(stage) {
    if (!validStage(stage) || mode === 'battle' || hallBattleProgress().pendingRecruit) return false;
    prepStage = stage;
    preparationNotes = [];
    renderPreparation();
    return true;
  }
  function clearExhaustedSupport() {
    const selected = progress().selected;
    let cleared = false;
    for (const category of ['meal', 'coating']) {
      const item = entry(category, selected[category]);
      if (item && stock(item) === 0) {
        selected[category] = null;
        preparationNotes.push(`${item.name} is used up. Its slot has been cleared. You can begin without it or select another support item.`);
        cleared = true;
      }
    }
    if (cleared) queueSave();
    return cleared;
  }
  function renderPreparation() {
    clearExhaustedSupport();
    const info = hallBattleInfo(prepStage); if (!info) return openHallBattleMap();
    const details = hallEncounterDetails(info), selected = progress().selected;
    const profiles = [info.enemies, ...info.waves].flat().map(key => HALL_ENEMY_LIBRARY[key]);
    const party = state.activeParty.filter(id => state.party.includes(id)).slice(0, 3);
    const description = info.description || info.desc || (info.waves.length ? 'One trial, multiple enemy formations. Support lasts through every phase.' : info.boss ? 'Defeat the boss formation to claim this Hall record.' : 'Clear the opposing formation and advance the Hall records.');
    const slots = Object.keys(categories).map(category => {
      const item = entry(category, selected[category]), unlocked = recruited(owners[category]);
      return `<section class="hub-slot hub-${category}"><h3>${labels[category]}</h3>${supportIcon(category, item)}<strong>${item ? escaped(item.name) : 'None selected'}</strong><p>${item ? escaped(item.desc) : unlocked ? 'Optional' : 'Recruit ' + owners[category] + ' to unlock'}</p><small>${item && category !== 'blessing' ? 'Owned: ' + stock(item) : category === 'blessing' ? 'No consumable cost' : 'Consumed at stage start'}</small><div><button type="button" data-select="${category}" ${unlocked ? '' : 'disabled'}>${item ? 'Change' : 'Select'}</button><button type="button" data-clear="${category}" aria-label="Remove ${category}" ${item ? '' : 'disabled'}>&times;</button></div></section>`;
    }).join('');
    const active = Object.keys(categories).flatMap(category => { const item = entry(category, selected[category]); return item ? [`<span class="hub-${category}"><b>${labels[category]}</b> ${escaped(item.name)}<small>${escaped(item.desc)}</small></span>`] : []; }).join('');
    overlay(`Stage ${String(prepStage).padStart(2, '0')} / ${info.name}`, `<section class="hub-stage-info"><div class="hub-stage-tags"><b>${info.boss ? 'BOSS' : 'NORMAL'}</b>${profiles.some(profile => profile.node >= 3) ? '<b>ELITE</b>' : ''}<span>Enemy level ${Math.min(prepStage, MAX_LEVEL)}</span></div><p>${escaped(description)}</p><dl><dt>Enemies</dt><dd>${escaped(details.enemies)}</dd><dt>Threats &amp; modifiers</dt><dd>${escaped(details.traits)}</dd><dt>Weaknesses</dt><dd>${escaped(details.weaknesses)}</dd><dt>Rewards</dt><dd>${escaped(rollHallGearRarity(prepStage))} gear, gold and EXP${info.boss ? ' / boss bonus' : ''}${prepStage >= 51 ? ' / Artifact shop unlock on first clear' : ''}</dd></dl></section><section class="hub-party"><h3>Party</h3><div>${party.map(id => { const hero = baseJobs[id], stats = totals(id); return `<article><img src="${menuPortraitSource(id)}" alt="${escaped(id)}"><div><strong>${escaped(id)} <small>Lv ${progressFor(id).level}</small></strong><span>HP ${hero.hp}/${stats.max} &nbsp; MP ${hero.mp}/${stats.mp}</span><small>${Object.entries(hero.gear).map(([slot, ref]) => escaped(gearSlotLabel(slot)) + ': ' + escaped(gearDisplayName(ref))).join(' / ')}</small></div></article>`; }).join('')}</div></section><section class="hub-loadout"><h3>Stage Support</h3>${preparationNotes.map(note => `<p class="hub-preparation-note" role="status">${escaped(note)}</p>`).join('')}<div>${slots}</div></section><section class="hub-active"><h3>Active Support</h3>${active || '<p>No support selected.</p>'}</section><footer class="hub-footer"><span>Meals &amp; Coatings are consumed only when the stage begins.</span><button type="button" data-begin ${party.length ? '' : 'disabled'}>Begin Stage &rarr;</button></footer>`, openHallBattleMap);
    el.menuBody.querySelectorAll('[data-select]').forEach(button => button.onclick = () => showChoices(button.dataset.select));
    el.menuBody.querySelectorAll('[data-clear]').forEach(button => button.onclick = () => { select(button.dataset.clear, null); renderPreparation(); });
    el.menuBody.querySelector('[data-begin]').onclick = beginStage;
  }
  const oldStartStage = startHallBattleStage;
  startHallBattleStage = openPreparation;
  function beginStage() {
    if (mode !== 'hallMap' || !validStage(prepStage) || !state.activeParty.length) return false;
    clearExhaustedSupport();
    const selected = progress().selected, support = {}, consumed = [];
    for (const category of Object.keys(categories)) {
      const item = entry(category, selected[category]);
      if (!item) { support[category] = null; continue; }
      if (!recruited(owners[category]) || category !== 'blessing' && !stock(item)) {
        notice(`${item.name} is unavailable. Change or remove it before beginning.`); return false;
      }
      support[category] = { ...item };
    }
    const stage = prepStage;
    startingSupport = support;
    try {
      for (const category of ['meal', 'coating']) if (support[category]) {
        state.inventory[support[category].name]--; consumed.push(support[category].name);
      }
      oldStartStage(stage);
      if (mode !== 'battle' || battle?.hallStage !== stage) throw Error('Stage did not begin');
      battle.hubSupport = support;
      battle.meterTuning.hallSupport = Object.fromEntries(Object.keys(categories).map(category => [category, support[category]?.name || null]));
      prepStage = null;
      return true;
    } catch (error) {
      consumed.forEach(name => state.inventory[name]++);
      notice('The stage could not begin. Your support items were returned.');
      console.error(error); return false;
    } finally { startingSupport = null; }
  }
  const oldTotals = totals, oldInitialize = initializeEndgameFormation;
  totals = id => {
    const total = oldTotals(id), meal = supportForBattle()?.meal;
    if (!meal || !state.activeParty.includes(id)) return total;
    for (const [stat, key] of [['max', 'hp'], ['mp', 'mp'], ['str', 'str'], ['mag', 'mag']]) if (meal[key]) total[stat] = Math.round(total[stat] * (1 + meal[key]));
    return total;
  };
  initializeEndgameFormation = () => {
    if (startingSupport && battle && !battle.hubSupport) {
      battle.hubSupport = startingSupport;
      const blessing = startingSupport.blessing;
      if (blessing?.barrier) battle.party.forEach(unit => applyStatus(unit, 'barrier', unit, { duration: 2, value: blessing.barrier, force: true }));
      if (blessing?.resonance) state.resonance = Math.min(100, state.resonance + blessing.resonance);
    }
    return oldInitialize();
  };
  const oldIncoming = incomingDamageMultiplier, oldStatusChance = statusApplicationChance, oldCost = skillMpCost, oldHealing = healingReceived, oldEnd = processTurnEnd;
  incomingDamageMultiplier = unit => oldIncoming(unit) * (1 - (memberEffect(unit, 'meal')?.defense || 0));
  statusApplicationChance = (target, ...args) => oldStatusChance(target, ...args) * (1 - (memberEffect(target, 'meal')?.resistance || 0));
  skillMpCost = (id, sk, unit = null) => {
    const cost = oldCost(id, sk, unit), discount = memberEffect(unit, 'blessing')?.discount || 0;
    return discount && sk?.anim !== 'ultimate' && cost > 0 ? Math.max(1, Math.round(cost * (1 - discount))) : cost;
  };
  healingReceived = (unit, amount) => oldHealing(unit, amount * (1 + (memberEffect(unit, 'blessing')?.healing || 0)));
  processTurnEnd = unit => {
    const notes = oldEnd(unit), meal = memberEffect(unit, 'meal');
    if (meal && unit.hp > 0) {
      const hp = meal.hpRegen ? Math.min(unit.max - unit.hp, Math.max(1, Math.round(unit.max * meal.hpRegen))) : 0;
      const mp = meal.mpRegen ? Math.min(unit.maxmp - unit.mp, Math.max(1, Math.round(unit.maxmp * meal.mpRegen))) : 0;
      unit.hp += hp; unit.mp += mp;
      if (hp) addBattleFloater(unit, hp, { kind: 'heal' });
      if (mp) addBattleMpGain(unit, mp, 'Kitchen');
      if (hp || mp) notes.push(`${meal.name}: +${hp} HP / +${mp} MP.`);
    }
    return notes;
  };
  const oldDown = markBattleUnitDown;
  markBattleUnitDown = unit => {
    if (unit?.hp <= 0 && memberEffect(unit, 'blessing')?.resolve && !unit.hubResolveUsed) {
      unit.hubResolveUsed = true; unit.hp = 1; unit.down = false; unit.anim = 'idle'; unit.deathTick = null;
      addBattleFloater(unit, 0, { kind: 'heal', text: 'RESOLVE / 1 HP' }); return false;
    }
    return oldDown(unit);
  };
  const oldPartyDefeated = partyIsDefeated;
  partyIsDefeated = () => { battle?.party?.filter(unit => unit.hp <= 0).forEach(markBattleUnitDown); return oldPartyDefeated(); };
  STATUS_DEFS.hubStrengthDown = { label: 'STRENGTH REDUCED', short: 'STR-', negative: true, duration: 3, value: .12 };
  STATUS_DEFS.hubMagicDown = { label: 'MAGIC REDUCED', short: 'MAG-', negative: true, duration: 3, value: .12 };
  CLEANSE_PRIORITY.hubStrengthDown = 45;
  CLEANSE_PRIORITY.hubMagicDown = 45;
  const oldWeapon = applyWeaponBasicAttackEffect, oldEnemyRoll = enemyDamageRoll;
  applyWeaponBasicAttackEffect = (source, target) => {
    const existing = oldWeapon(source, target), coating = memberEffect(source, 'coating');
    if (window.StatusSystem || !coating || !target || target.hp <= 0) return existing;
    const result = applyStatus(target, coating.status, source, { chance: coating.chance, duration: coating.duration, ...(coating.value ? { value: coating.value } : {}), scaling: coating.status === 'bleed' ? 'str' : 'agi' });
    return [existing, result.message ? `${coating.name}: ${result.message}` : ''].filter(Boolean).join(' / ');
  };
  enemyDamageRoll = (unit, action, target) => {
    const type = action.scaling === 'str' || action.kind === 'melee' || action.element === 'Physical' ? 'hubStrengthDown' : 'hubMagicDown';
    const result = oldEnemyRoll(unit, action, target);
    return { ...result, damage: Math.max(1, Math.round(result.damage * (1 - statusValue(unit, type)))) };
  };
  function notice(text) {
    let toast = document.querySelector('.hub-notice');
    if (!toast) { toast = document.createElement('div'); toast.className = 'hub-notice'; toast.setAttribute('role', 'status'); document.querySelector('.game').append(toast); }
    toast.textContent = text; toast.hidden = false;
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { toast.hidden = true; }, 5500);
  }
  function scavenge(random = Math.random) {
    if (!recruited('Sparky') || random() >= .25) return null;
    const finds = [
      { gold: 15 + Math.min(60, hallBattleProgress().unlockedStage), name: 'Gold' },
      { name: 'Clockwork Tonic' }, { name: "Marla's Soup" }, { name: 'Phoenix Ticket' },
      { name: 'Resonant Stone' }, { name: 'Iron Chain Link' },
      ...(recruited('Torren') ? meals.slice(0, 3).map(item => ({ name: item.name })) : []),
      ...(recruited('Mira') ? coatings.slice(0, 3).map(item => ({ name: item.name })) : [])
    ];
    const find = finds[Math.min(finds.length - 1, Math.floor(random() * finds.length))];
    if (find.gold) state.gold += find.gold;
    else find.stored = addInventoryItem(find.name);
    progress().lastFind = { ...find, at: Date.now() };
    return find;
  }
  const oldWin = winBattle, oldShowResult = showBattleResult;
  showBattleResult = (kind, entries = [], after = null) => {
    if (kind === 'victory' && battle?.hallStage && !battle.hubScavenged) {
      battle.hubScavenged = true;
      const find = scavenge();
      if (find) {
        entries = [...entries, { kind: find.gold ? 'gold' : 'item', icon: '*', label: 'Sparky found ' + find.name, value: find.gold ? '+' + find.gold + ' G' : 'x1', detail: find.stored === false ? "Stored in Marli's stash" : 'Scavenging' }];
        const originalAfter = after;
        after = () => { originalAfter?.(); notice(`Sparky found ${find.gold ? find.gold + ' G' : find.name + ' x1'}${find.stored === false ? ' / sent to stash' : ''}.`); };
      }
    }
    return oldShowResult(kind, entries, after);
  };
  function openService(id) {
    if (!services[id] || !recruited(id) || mode === 'battle' || activeRecruitScene) return false;
    if (id === 'Marla') { openVendor('marla'); return true; }
    if (id === 'Glimmer') { openVendor('workshop'); return true; }
    if (id === 'Torren') { openVendor('torrenKitchen'); return true; }
    if (id === 'Mira') { openVendor('miraCoatings'); return true; }
    if (id === 'Seerin') { renderSparring(); return true; }
    if (id === 'Sparky') {
      const find = progress().lastFind;
      overlay("Sparky's Finds", `<div class="hub-resident"><img src="${menuPortraitSource('Sparky')}" alt="Sparky"><p>${find ? 'Last find: ' + escaped(find.gold ? find.gold + ' G' : find.name) + (find.stored === false ? ' / stored in the stash.' : '.') : 'Sparky is keeping an eye out for useful things.'}</p></div><p>Occasionally brings back extra loot after cleared stages.</p>`);
      return true;
    }
    overlay("Kael's Sanctuary", `<div class="hub-resident"><img src="${menuPortraitSource('Kael')}" alt="Kael"><p>One blessing for the next trial. Your current choice: <b>${escaped(entry('blessing', progress().selected.blessing)?.name || 'None')}</b></p></div><button type="button" data-sanctuary-bless>Blessings</button><section class="hub-respec"><h3>Redistribute Talents</h3>${state.party.map(hero => `<div><strong>${escaped(hero)}</strong><span>${progressFor(hero).talents.length} spent</span><button type="button" data-respec="${hero}" ${progressFor(hero).talents.length ? '' : 'disabled'}>Reset talents</button></div>`).join('')}</section>`);
    el.menuBody.querySelector('[data-sanctuary-bless]').onclick = () => showChoices('blessing', () => openService('Kael'));
    el.menuBody.querySelectorAll('[data-respec]').forEach(button => button.onclick = () => {
      const id = button.dataset.respec, hero = progressFor(id), rank0 = hero.rank0;
      hero.talents = []; if (rank0 !== undefined) hero.rank0 = rank0;
      progressFor(id); updatePanels(); queueSave(); openService('Kael');
    });
    return true;
  }
  const duelArt = {
  "Seerin": {
    "file": "seerin.webp",
    "columns": 4,
    "rows": 5,
    "cellWidth": 192,
    "cellHeight": 208,
    "baseline": 196,
    "referenceHeight": 131,
    "rowMap": {
      "idle": 0,
      "melee": 1,
      "magic": 2,
      "ultimate": 3,
      "death": 4
    },
    "vfx": {
      "file": "seerin-vfx.webp",
      "columns": 4,
      "rows": 3,
      "cellWidth": 208,
      "cellHeight": 208,
      "baseline": 196,
      "referenceHeight": 133,
      "rowMap": {
        "projectile": 0,
        "magic": 1,
        "ultimate": 2
      }
    },
    "idleFrameOffsets": [
      [
        0,
        0
      ],
      [
        -3,
        -1
      ],
      [
        10,
        -1
      ],
      [
        10,
        -1
      ]
    ]
  },
  "Sparky": {
    "file": "sparky.webp",
    "columns": 4,
    "rows": 5,
    "cellWidth": 192,
    "cellHeight": 208,
    "baseline": 196,
    "referenceHeight": 140,
    "rowMap": {
      "idle": 0,
      "melee": 1,
      "magic": 2,
      "ultimate": 3,
      "death": 4
    },
    "vfx": {
      "file": "sparky-vfx.webp",
      "columns": 4,
      "rows": 3,
      "cellWidth": 208,
      "cellHeight": 208,
      "baseline": 196,
      "referenceHeight": 145,
      "rowMap": {
        "projectile": 0,
        "magic": 1,
        "ultimate": 2
      }
    },
    "idleFrameOffsets": [
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        -1,
        1
      ],
      [
        -3,
        1
      ]
    ]
  },
  "Glimmer": {
    "file": "glimmer.webp",
    "columns": 4,
    "rows": 5,
    "cellWidth": 192,
    "cellHeight": 208,
    "baseline": 196,
    "referenceHeight": 121,
    "rowMap": {
      "idle": 0,
      "melee": 1,
      "magic": 2,
      "ultimate": 3,
      "death": 4
    },
    "vfx": {
      "file": "glimmer-vfx.webp",
      "columns": 4,
      "rows": 3,
      "cellWidth": 208,
      "cellHeight": 208,
      "baseline": 196,
      "referenceHeight": 138,
      "rowMap": {
        "projectile": 0,
        "magic": 1,
        "ultimate": 2
      }
    },
    "idleFrameOffsets": [
      [
        0,
        0
      ],
      [
        0,
        0
      ],
      [
        -1,
        0
      ],
      [
        -9,
        0
      ]
    ]
  },
  "Torren": {
    "file": "torren.webp",
    "columns": 4,
    "rows": 5,
    "cellWidth": 192,
    "cellHeight": 208,
    "baseline": 196,
    "referenceHeight": 140,
    "rowMap": {
      "idle": 0,
      "melee": 1,
      "magic": 2,
      "ultimate": 3,
      "death": 4
    },
    "vfx": {
      "file": "torren-vfx.webp",
      "columns": 4,
      "rows": 3,
      "cellWidth": 208,
      "cellHeight": 208,
      "baseline": 196,
      "referenceHeight": 154,
      "rowMap": {
        "projectile": 0,
        "magic": 1,
        "ultimate": 2
      }
    },
    "idleFrameOffsets": [
      [
        0,
        0
      ],
      [
        4,
        0
      ],
      [
        8,
        -1
      ],
      [
        6,
        -1
      ]
    ]
  },
  "Mira": {
    "file": "mira.webp",
    "columns": 4,
    "rows": 5,
    "cellWidth": 192,
    "cellHeight": 208,
    "baseline": 196,
    "referenceHeight": 146,
    "rowMap": {
      "idle": 0,
      "melee": 1,
      "magic": 2,
      "ultimate": 3,
      "death": 4
    },
    "vfx": {
      "file": "mira-vfx.webp",
      "columns": 4,
      "rows": 3,
      "cellWidth": 208,
      "cellHeight": 208,
      "baseline": 196,
      "referenceHeight": 151,
      "rowMap": {
        "projectile": 0,
        "magic": 1,
        "ultimate": 2
      }
    },
    "idleFrameOffsets": [
      [
        0,
        0
      ],
      [
        -12,
        0
      ],
      [
        -9,
        1
      ],
      [
        -11,
        0
      ]
    ]
  },
  "Verseborn": {
    "file": "verseborn.webp",
    "columns": 4,
    "rows": 5,
    "cellWidth": 192,
    "cellHeight": 208,
    "baseline": 196,
    "referenceHeight": 138,
    "rowMap": {
      "idle": 0,
      "melee": 1,
      "magic": 2,
      "ultimate": 3,
      "death": 4
    },
    "vfx": {
      "file": "verseborn-vfx.webp",
      "columns": 4,
      "rows": 3,
      "cellWidth": 208,
      "cellHeight": 208,
      "baseline": 196,
      "referenceHeight": 147,
      "rowMap": {
        "projectile": 0,
        "magic": 1,
        "ultimate": 2
      }
    },
    "idleFrameOffsets": [
      [
        0,
        0
      ],
      [
        3,
        1
      ],
      [
        13,
        0
      ],
      [
        6,
        0
      ]
    ]
  },
  "Kael": {
    "file": "kael.webp",
    "columns": 4,
    "rows": 5,
    "cellWidth": 192,
    "cellHeight": 208,
    "baseline": 196,
    "referenceHeight": 130,
    "rowMap": {
      "idle": 0,
      "melee": 1,
      "magic": 2,
      "ultimate": 3,
      "death": 4
    },
    "vfx": {
      "file": "kael-vfx.webp",
      "columns": 4,
      "rows": 3,
      "cellWidth": 208,
      "cellHeight": 208,
      "baseline": 196,
      "referenceHeight": 149,
      "rowMap": {
        "projectile": 0,
        "magic": 1,
        "ultimate": 2
      }
    },
    "idleFrameOffsets": [
      [
        0,
        0
      ],
      [
        13,
        0
      ],
      [
        11,
        0
      ],
      [
        7,
        1
      ]
    ]
  }
};
  let duelArtPromise;
  function loadDuelArt() {
    return duelArtPromise ||= Promise.all(Object.values(duelArt).flatMap(sheet => [sheet, sheet.vfx]).map(sheet => new Promise(resolve => {
      const image = new Image(); image.onload = () => { sheet.image = image; resolve(); }; image.onerror = () => resolve();
      image.src = 'assets/sprites/hall-duels/' + sheet.file;
    })));
  }
  function drawDuelOpponent(unit, x, y) {
    const sheet = duelArt[unit.sparringId];
    if (!battle?.sparring || state.gameMode !== 'hallBattles' || !sheet?.image) return false;
    const dying = unit.hp <= 0 || unit.anim === 'death', attacking = unit.anim === 'attack';
    const animation = dying ? 'death' : attacking ? unit.attackStyle === 'ultimate' ? 'ultimate' : unit.attackStyle === 'melee' ? 'melee' : 'magic' : 'idle';
    const column = dying ? Math.min(3, Math.floor(Math.max(0, tick - (unit.deathTick ?? tick)) / 5)) : attacking ? Math.min(3, Math.floor((unit.animTick || 0) / 6)) : [0,1,2,3,2,1][Math.floor((tick + unit.sparringId.length * 3) / 36) % 6];
    const scale = (battleSpriteHeights[unit.sparringId] || 54) * BATTLE_COMPOSITION_SCALE * 2 / sheet.referenceHeight;
    const width = Math.round(sheet.cellWidth * scale), height = Math.round(sheet.cellHeight * scale);
    const anchorOffset = animation === "idle" ? sheet.idleFrameOffsets?.[column] || [0, 0] : [0, 0];
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet.image, column * sheet.cellWidth, sheet.rowMap[animation] * sheet.cellHeight, sheet.cellWidth, sheet.cellHeight, Math.round(x + 8 - width / 2 + anchorOffset[0] * scale), Math.round(y + 31 - sheet.baseline * scale + anchorOffset[1] * scale), width, height); ctx.restore();
    if (attacking && unit.lastAnimDrawTick !== tick) { unit.animTick = (unit.animTick || 0) + 1; unit.lastAnimDrawTick = tick; }
    return true;
  }
  const oldBattleOffset = battleOffset;
  battleOffset = unit => {
    if (battle?.sparring && unit.sparringId && unit.anim !== "attack" && unit.hp > 0) { if (unit.flash > 0) unit.flash--; return 0; }
    return oldBattleOffset(unit);
  };
  const oldEnemyAnimationSheetFor = enemyAnimationSheetFor;
  enemyAnimationSheetFor = unit => battle?.sparring && unit.sparringId && duelArt[unit.sparringId]?.image ? duelArt[unit.sparringId] : oldEnemyAnimationSheetFor(unit);
  const oldBattleVitals = drawBattleVitals;
  drawBattleVitals = (unit, x, baseline, enemySide) => oldBattleVitals(unit, x, baseline + (enemySide && battle?.sparring && unit.sparringId ? 8 : 0), enemySide);
  const oldEnemyEffect = makeEnemyBattleEffect, oldDrawEffect = drawEffect;
  makeEnemyBattleEffect = (unit, target, action) => {
    const fx = oldEnemyEffect(unit, target, action);
    if (battle?.sparring && state.gameMode === 'hallBattles' && unit.sparringId && duelArt[unit.sparringId]?.vfx.image) {
      fx.hallDuelVfx = unit.sparringId;
      fx.timing = { ...fx.timing, totalMs: Math.max(fx.timing.totalMs, fx.timing.impactMs + 600) };
    }
    return fx;
  };
  drawEffect = () => {
    const fx = effect, sheet = duelArt[fx?.hallDuelVfx]?.vfx;
    if (!battle?.sparring || !sheet?.image) return oldDrawEffect();
    const elapsed = performance.now() - fx.startedAt, impact = elapsed >= fx.timing.impactMs;
    const support = ['buff','cleanse'].includes(fx.actionKind), ultimate = fx.actionKind === 'ultimate';
    const progress = Math.max(0, Math.min(1, elapsed / Math.max(1, fx.timing.impactMs)));
    const row = impact ? ultimate ? 2 : 1 : ultimate || support ? 1 : 0;
    const frame = impact ? Math.min(3, Math.floor((elapsed - fx.timing.impactMs) / 150)) : Math.min(3, Math.floor(progress * 4));
    const x = support ? fx.toX : impact ? fx.toX : fx.fromX + (fx.toX - fx.fromX) * progress;
    const y = support ? fx.toY : impact ? fx.toY : fx.fromY + (fx.toY - fx.fromY) * progress;
    const size = ultimate ? 92 : impact || support ? 64 : 48;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (elapsed > fx.timing.totalMs - 160) ctx.globalAlpha = Math.max(0, (fx.timing.totalMs - elapsed) / 160);
    // These projectiles already face left, toward the player's fighter.
    ctx.drawImage(sheet.image, frame * sheet.cellWidth, row * sheet.cellHeight, sheet.cellWidth, sheet.cellHeight, Math.round(x - size / 2), Math.round(y - size / 2), size, size); ctx.restore();
    fx.t++;
    if (elapsed >= fx.timing.totalMs) effect = null;
  };

  function renderSparring(opponent = selectedShadow) {
    if (state.gameMode !== 'hallBattles' || !recruited('Seerin')) return false;
    loadDuelArt();
    shadowParty = shadowParty.filter(id => recruited(id)).slice(0, 3);
    if (!shadowParty.length) shadowParty = state.activeParty.filter(id => recruited(id)).slice(0, 3);
    selectedShadow = opponent && recruited(opponent) ? opponent : null;
    const defeated = progress().shadowDefeated;
    const cards = Object.entries(shadowTrials).map(([id, trial], index) => {
      const unlocked = recruited(id), won = defeated.includes(id);
      if (!unlocked) return '<button type="button" class="hall-stage shadow-stage is-locked" disabled><span>SHADOW TRIAL ' + (index + 1) + ' / LOCKED</span><div class="shadow-mystery" aria-hidden="true">?</div><strong>Unknown Flameguard</strong><small>Locked</small><p>' + shadowRequirement + '</p></button>';
      return '<button type="button" class="hall-stage shadow-stage ' + (won ? 'is-cleared ' : '') + (selectedShadow === id ? 'is-selected' : '') + '" data-shadow="' + id + '" aria-pressed="' + (selectedShadow === id) + '"><span>SHADOW TRIAL ' + (index + 1) + ' / ' + (won ? 'DEFEATED' : 'AVAILABLE') + '</span><img src="assets/sprites/hall-duels/' + id.toLowerCase() + '-portrait.webp" alt="Shadow ' + id + '"><strong>Shadow ' + id + '</strong><small>Recommended level 40 / Personal trial</small><em>' + trial.ring + '</em><i>' + (won ? 'FIRST CLEAR EARNED / REPLAY' : 'FIRST CLEAR REWARD / Shadow Personal Artifact Ring') + '</i></button>';
    }).join('');
    const trial = shadowTrials[selectedShadow];
    const details = trial ? '<section class="shadow-detail" aria-label="Shadow encounter preview"><div class="hub-stage-tags"><b>Shadow ' + selectedShadow + '</b><span>' + (defeated.includes(selectedShadow) ? 'Defeated / Replay' : 'Available') + '</span><span>Recommended level 40</span></div><div class="shadow-preview"><img src="assets/sprites/hall-duels/' + selectedShadow.toLowerCase() + '-portrait.webp" alt="Shadow ' + selectedShadow + ' enemy preview"><div><h3>Shadow ' + selectedShadow + '</h3><p>' + trial.desc + '</p><dl class="hub-stage-info"><dt>Encounter</dt><dd>Level 40 / one Shadow / 60-round limit</dd><dt>' + (defeated.includes(selectedShadow) ? 'First clear earned' : 'FIRST CLEAR REWARD') + '</dt><dd><strong>' + trial.ring + '</strong><br>Shadow Personal Artifact Ring / ' + selectedShadow + ' only</dd><dt>Personal reward</dt><dd>' + shadowRewardHtml(selectedShadow) + '</dd></dl></div></div><h3>Your party (' + shadowParty.length + '/3)</h3><p>Select 1–3 Hall members. Trial items and vitals are restored afterward; no EXP or normal stage progress.</p><div class="shadow-party">' + state.party.map(id => '<button type="button" data-shadow-party="' + id + '" aria-pressed="' + shadowParty.includes(id) + '" ' + (!shadowParty.includes(id) && shadowParty.length >= 3 ? 'disabled' : '') + '><strong>' + id + '</strong><small>Level ' + progressFor(id).level + (shadowParty.includes(id) ? ' / Selected' : '') + '</small></button>').join('') + '</div>' + encounterSupportHtml() + '<footer class="hub-footer"><p>' + (defeated.includes(selectedShadow) ? 'Replay available. The unique Shadow Personal Artifact Ring is already earned.' : 'Guaranteed first victory: ' + trial.ring) + '</p><button type="button" data-shadow-start ' + (!shadowParty.length ? 'disabled' : '') + '>Start Battle</button></footer></section>' : '<p class="shadow-empty">Select an available Shadow trial to preview its encounter and first-clear reward.</p>';
    overlay('Ember Hall / Shadow Trials', '<nav class="shadow-path-nav"><button type="button" data-ember-path>Ember Battles</button><button type="button" aria-current="page" disabled>Shadow Trials</button></nav><p>' + defeated.length + '/7 trials defeated. Shadows awaken as Flameguard members enter Ember Hall.</p><div class="hall-stage-grid shadow-grid">' + cards + '</div>' + details);
    el.menuBody.querySelector('[data-ember-path]').onclick = renderHallBattleMap;
    el.menuBody.querySelectorAll('[data-shadow]').forEach(button => button.onclick = () => { renderSparring(button.dataset.shadow); el.menuBody.querySelector('.shadow-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    el.menuBody.querySelectorAll('[data-shadow-party]').forEach(button => button.onclick = () => { const id = button.dataset.shadowParty; if (shadowParty.includes(id)) shadowParty = shadowParty.filter(member => member !== id); else if (shadowParty.length < 3 && recruited(id)) shadowParty.push(id); renderSparring(); });
    bindEncounterSupport(()=>renderSparring());
    const start = el.menuBody.querySelector('[data-shadow-start]'); if (start) start.onclick = () => startSparring([...shadowParty], selectedShadow);
  }
  function startSparring(fighters, opponent) {
    const party = Array.isArray(fighters) ? [...new Set(fighters)] : [fighters];
    if (state.gameMode !== 'hallBattles' || !recruited('Seerin') || !shadowTrials[opponent] || !recruited(opponent) || !party.length || party.length > 3 || party.some(id => !Object.hasOwn(baseJobs, id) || !recruited(id)) || mode !== 'hallMap') return false;
    loadDuelArt();
    sparringSnapshot = { activeParty: [...state.activeParty], resonance: state.resonance, fieldWard: state.fieldWard, inventory: { ...state.inventory }, stash: { ...state.stash }, heroes: Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, { hp: hero.hp, mp: hero.mp }])) };
    const total = shadowStats(opponent);
    state.activeParty = party;
    const opponentUnit = enemy('Shadow ' + opponent, total.max, total.str, baseJobs[opponent].element, baseJobs[opponent].color || '#bd9971', 1, opponent);
    opponentUnit.sparringId = opponent; opponentUnit.levelHint = 40; opponentUnit.fixedLevel = true;
    const began=beginSupportedBattle(()=>{
    el.menu.classList.add('hidden'); document.querySelector('.menu-tabs').classList.remove('hidden');
    startBattle('Shadow Trial / ' + opponent, [opponentUnit], undefined, null, [], { combatMapId: 'emberHallBattles', roundCap: 60 });
    battle.sparring = { fighter: party[0], party, opponent }; battle.startingResonance = state.resonance;
    });
    if(!began){state.activeParty=sparringSnapshot.activeParty;sparringSnapshot=null;}
    return began;
  }
  const oldPrepareEnemy = prepareEnemyForBattle, oldEnemyAction = chooseEnemyAction, oldDrawEnemy = drawEnemy;
  prepareEnemyForBattle = (source, ...args) => {
    const prepared = oldPrepareEnemy(source, ...args);
    if (!source.sparringId) return prepared;
    const total = shadowStats(source.sparringId);
    return { ...prepared, hp: total.max, max: total.max, maxmp: total.mp, mp: total.mp, atk: total.str, stats: { ...total }, baseEvasion: FLAMEGUARD_BASE_EVASION[source.sparringId] || .05, resistanceTier: 'normal', crit: .12, xp: 0, sparringId: source.sparringId };
  };
  chooseEnemyAction = unit => {
    if (!unit.sparringId) return oldEnemyAction(unit);
    const silenced = Boolean(statusOf(unit, 'silence'));
    const skills = battleSkills(unit.sparringId, unit).filter(sk => !sk.otherAllyOnly && !sk.encore && !sk.immediateTurn && !sk.dispel && !sk.revive && !sk.transform && (!silenced || sk.anim === 'melee' || sk.basicAttack || sk.anim === 'ultimate' && skillScaling(sk) === 'str') && (sk.anim === 'ultimate' ? battle.enemyResonance >= 100 : skillMpCost(unit.sparringId, sk, unit) <= unit.mp));
    const offensive = sk => skillTargetsEnemies(sk) && !sk.statusOnly && (sk.power > 0 || sk.coefficient > 0 || sk.basicAttack);
    const damage = skills.filter(sk => sk.anim !== 'ultimate' && offensive(sk));
    const heal = skills.find(sk => sk.anim !== 'ultimate' && sk.power < 0);
    // Coefficient-based capstones can have zero flat power. Carry their area
    // targeting and level-40/ECHO potency into the enemy action as well.
    const readyUltimates = skills.filter(sk => sk.anim === 'ultimate');
    const healingUltimate = readyUltimates.find(sk => sk.power < 0 && unit.hp < unit.max * .6);
    const payoff = sk => (sk.coefficient || Math.abs(sk.power) / 20) * (sk.allEnemies ? battle.party.filter(hero => hero.hp > 0).length : 1);
    const damagingUltimate = readyUltimates.filter(offensive).sort((a,b) => payoff(b) - payoff(a))[0];
    const ultimate = healingUltimate || damagingUltimate;
    const buff = skills.find(sk => sk.anim !== 'ultimate' && sk.buffs?.length && !skillTargetsEnemies(sk) && !statusOf(unit, sk.buffs[0].type));
    const chosen = ultimate || (heal && unit.hp < unit.max * .45 ? heal : buff && !((unit.actionsTaken || 0) % 4) ? buff : damage[(unit.actionsTaken || 0) % Math.max(1, damage.length)] || skills.find(sk => sk.basicAttack));
    if (!chosen) return oldEnemyAction(unit);
    const isBuff = chosen.power >= 0 && !skillTargetsEnemies(chosen);
    const potency = chosen.anim === 'ultimate' ? 1.44 * (1 + (unit.stats.echo || 0) * .0015) : 1;
    return { kind: chosen.anim === 'ultimate' ? 'ultimate' : isBuff ? 'buff' : chosen.anim === 'melee' ? 'melee' : 'magic', name: chosen.name, basicAttack: Boolean(chosen.basicAttack), element: chosen.element, scaling: skillScaling(chosen), mpCost: chosen.anim === 'ultimate' ? 0 : skillMpCost(unit.sparringId, chosen, unit), ...(isBuff ? { target: unit } : { coefficient: (chosen.coefficient || Math.max(.7, Math.abs(chosen.power) / 20)) * potency }), healing: chosen.power < 0, healCoefficient: (chosen.coefficient || 1.2) * potency, allTargets: Boolean(chosen.allEnemies), ...(chosen.status ? { status: { ...chosen.status } } : {}), extraStatuses: chosen.extraStatuses?.map(status => ({ ...status })), buffs: chosen.buffs, crit: unit.crit };

  };
  drawEnemy = (unit, x, y) => drawDuelOpponent(unit, x, y) ? true : unit.sparringId ? drawSprite(unit.sparringId, x, y, 1, unit.anim === 'attack' ? unit.attackStyle === 'melee' ? 'melee' : 'magic' : unit.hp <= 0 ? 'death' : 'idle', tick) : oldDrawEnemy(unit, x, y);
  function finishSparring(result) {
    if (!battle?.sparring || battle.ended || !sparringSnapshot) return false;
    const opponent = battle.sparring.opponent, entries = [];
    battle.ended = true; battle.resolving = true;
    archiveDamageMeter(result);
    state.activeParty = sparringSnapshot.activeParty;
    state.resonance = sparringSnapshot.resonance; state.fieldWard = sparringSnapshot.fieldWard;
    state.inventory = sparringSnapshot.inventory; state.stash = sparringSnapshot.stash;
    for (const [id, stats] of Object.entries(sparringSnapshot.heroes)) Object.assign(baseJobs[id], stats);
    sparringSnapshot = null;
    if (result === 'victory' && !progress().shadowDefeated.includes(opponent)) {
      progress().shadowDefeated.push(opponent);
      const reward = shadowTrials[opponent].ring;
      addOwnedGear(reward, 1, { rarity: 'Shadow Personal Artifact', stats: { ...shadowTrials[opponent].stats }, affixes: premiumShadowAffixes(opponent), separateCopy: true, rollAffixes: false });
      upgradeShadowRewards();
      entries.push({ kind: 'gear', icon: 'E', label: reward, detail: 'FIRST CLEAR / Shadow Personal Artifact / ' + opponent + ' only', value: 'x1' });
    } else if (result === 'victory') entries.push({ kind: 'record', icon: '#', label: 'Shadow defeated', detail: 'First-win reward already earned', value: 'REMATCH' });
    updatePanels();
    oldShowResult(result === 'victory' ? 'victory' : 'defeat', entries, () => { returnToHallAfterBattle(); renderSparring(); queueSave(); });
    return true;
  }
  winBattle = log => battle?.sparring ? finishSparring('victory') : oldWin(log);
  const oldDefeat = triggerPartyDefeat, oldDraw = endBattleDraw;
  triggerPartyDefeat = log => battle?.sparring ? finishSparring('defeat') : oldDefeat(log);
  endBattleDraw = log => battle?.sparring ? finishSparring('draw') : oldDraw(log);
  function drawAreas(camera) {
    ctx.save();
    if (recruited('Sparky') && curios.complete && curios.naturalWidth) {
      const cell = curios.naturalWidth / 5;
      for (const [index, x, y, size] of [[0, 179, 84, 12], [4, 186, 86, 10], [2, 178, 90, 9]]) {
        ctx.drawImage(curios, index * cell, 0, cell, curios.naturalHeight, x - camera.x, y - camera.y, size, size);
      }
    }
    ctx.restore();
  }
  window.HallHub = { encounterSupportHtml, bindEncounterSupport, beginSupportedBattle, meals, coatings, blessings, services, progress, shadowTrials, shadowStats, hasShadowRing, premiumShadowAffixes, upgradeShadowRewards, shadowRewardHtml, beginShadowAction, finishShadowAction, shadowBreakBonus, shadowDamageBonus, shadowHealingBonus, shadowHealed, shadowDefended, renderSparring, select, openPreparation, renderPreparation, beginStage, openService, startSparring, finishSparring, scavenge, drawAreas, recruited, supportForBattle, loadDuelArt, duelArt };
  const duelQa = new URLSearchParams(location.search);
  if (['hallduel','duelselect'].includes(duelQa.get('qa'))) loadDuelArt().then(() => {
    state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; state.party = duelQa.get('recruits') ? duelQa.get('recruits').split(',').filter(id => Object.hasOwn(baseJobs,id)) : Object.keys(baseJobs); state.activeParty = ['Verseborn','Torren','Glimmer']; mode = 'walk';
    state.activeParty = state.activeParty.filter(id => recruited(id));
    refreshHeroVitals(); updatePanels(); renderSparring();
    if (duelQa.get('opponent') && recruited(duelQa.get('opponent'))) renderSparring(duelQa.get('opponent'));
    if (duelQa.get('qa') === 'hallduel') startSparring(duelQa.get('fighter') || 'Verseborn', duelQa.get('opponent') || 'Seerin');
  });
})();
