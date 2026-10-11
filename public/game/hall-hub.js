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
  const services = { Marla: 'General Shop', Glimmer: 'Stage Shop', Torren: 'Kitchen', Mira: 'Coating Supply', Kael: 'Sanctuary', Seerin: 'Sparring Area', Sparky: 'Scavenging' };
  const labels = { meal: 'Torren Meal', coating: 'Mira Coating', blessing: 'Kael Blessing' };
  let prepStage = null, startingSupport = null, sparringSnapshot = null, noticeTimer;
  const curios = new Image();
  curios.src = 'assets/ui/loot-icons.png';
  const recruited = id => id === 'Marla' || state.party.includes(id);
  const entry = (category, id) => categories[category]?.find(item => item.id === id);
  const stock = item => Math.max(0, Math.floor(Number(state.inventory[item?.name]) || 0));
  const escaped = value => escapeMarkup(String(value ?? ''));
  function progress() {
    const hall = hallBattleProgress();
    if (!hall.hub || typeof hall.hub !== 'object' || Array.isArray(hall.hub)) hall.hub = {};
    const hub = hall.hub;
    if (!hub.selected || typeof hub.selected !== 'object' || Array.isArray(hub.selected)) hub.selected = {};
    for (const category of Object.keys(categories)) {
      if (!entry(category, hub.selected[category])) hub.selected[category] = null;
    }
    hub.sparringWins = Array.isArray(hub.sparringWins) ? [...new Set(hub.sparringWins.filter(id => HALL_RECRUITS.includes(id) || id === 'Verseborn'))] : [];
    return hub;
  }
  function supportForBattle() {
    return startingSupport || (mode === 'battle' && battle && !battle.ended && !battle.sparring ? battle.hubSupport : null);
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
  function validStage(stage) {
    const hall = hallBattleProgress();
    return state.gameMode === 'hallBattles' && Number.isInteger(stage) && hallBattleInfo(stage) && (stage <= hall.unlockedStage || hall.clearedStages.includes(stage));
  }
  function openPreparation(stage) {
    if (!validStage(stage) || mode === 'battle' || hallBattleProgress().pendingRecruit) return false;
    prepStage = stage;
    renderPreparation();
    return true;
  }
  function renderPreparation() {
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
    overlay(`Stage ${String(prepStage).padStart(2, '0')} / ${info.name}`, `<section class="hub-stage-info"><div class="hub-stage-tags"><b>${info.boss ? 'BOSS' : 'NORMAL'}</b>${profiles.some(profile => profile.node >= 3) ? '<b>ELITE</b>' : ''}<span>Enemy level ${Math.min(prepStage, MAX_LEVEL)}</span></div><p>${escaped(description)}</p><dl><dt>Enemies</dt><dd>${escaped(details.enemies)}</dd><dt>Threats &amp; modifiers</dt><dd>${escaped(details.traits)}</dd><dt>Weaknesses</dt><dd>${escaped(details.weaknesses)}</dd><dt>Rewards</dt><dd>${escaped(rollHallGearRarity(prepStage))} gear, gold and EXP${info.boss ? ' / boss bonus' : ''}${prepStage >= 51 ? ' / Artifact shop unlock on first clear' : ''}</dd></dl></section><section class="hub-party"><h3>Party</h3><div>${party.map(id => { const hero = baseJobs[id], stats = totals(id); return `<article><img src="${menuPortraitSource(id)}" alt="${escaped(id)}"><div><strong>${escaped(id)} <small>Lv ${progressFor(id).level}</small></strong><span>HP ${hero.hp}/${stats.max} &nbsp; MP ${hero.mp}/${stats.mp}</span><small>${Object.entries(hero.gear).map(([slot, ref]) => escaped(gearSlotLabel(slot)) + ': ' + escaped(gearDisplayName(ref))).join(' / ')}</small></div></article>`; }).join('')}</div></section><section class="hub-loadout"><h3>Stage Support</h3><div>${slots}</div></section><section class="hub-active"><h3>Active Support</h3>${active || '<p>No support selected.</p>'}</section><footer class="hub-footer"><span>Meals &amp; Coatings are consumed only when the stage begins.</span><button type="button" data-begin ${party.length ? '' : 'disabled'}>Begin Stage &rarr;</button></footer>`, openHallBattleMap);
    el.menuBody.querySelectorAll('[data-select]').forEach(button => button.onclick = () => showChoices(button.dataset.select));
    el.menuBody.querySelectorAll('[data-clear]').forEach(button => button.onclick = () => { select(button.dataset.clear, null); renderPreparation(); });
    el.menuBody.querySelector('[data-begin]').onclick = beginStage;
  }
  const oldStartStage = startHallBattleStage;
  startHallBattleStage = openPreparation;
  function beginStage() {
    if (mode !== 'hallMap' || !validStage(prepStage) || !state.activeParty.length) return false;
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
  function renderSparring() {
    const hero = state.activeParty[0] || state.party[0];
    overlay("Seerin's Sparring Area", `<div class="hub-spar-controls"><label>Your fighter<select data-fighter>${state.party.map(id => `<option ${id === hero ? 'selected' : ''}>${id}</option>`).join('')}</select></label><p>1 vs 1 / no EXP or stage progress / practice items returned</p></div><div class="hub-spar-roster">${state.party.map(id => `<article><img src="${menuPortraitSource(id)}" alt="${escaped(id)}"><div><strong>${escaped(id)}</strong><small>Lv ${progressFor(id).level}</small><p>${progress().sparringWins.includes(id) ? 'First-win reward earned / rematches available' : 'First win: ' + escaped(id + "'s Sparring Seal")}</p></div><button type="button" data-spar="${id}">Spar</button></article>`).join('')}</div>`);
    el.menuBody.querySelectorAll('[data-spar]').forEach(button => button.onclick = () => startSparring(el.menuBody.querySelector('[data-fighter]').value, button.dataset.spar));
  }
  function startSparring(fighter, opponent) {
    if (state.gameMode !== 'hallBattles' || !recruited('Seerin') || !state.party.includes(fighter) || !state.party.includes(opponent) || mode !== 'hallMap') return false;
    sparringSnapshot = { activeParty: [...state.activeParty], resonance: state.resonance, fieldWard: state.fieldWard, inventory: { ...state.inventory }, stash: { ...state.stash }, heroes: Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, { hp: hero.hp, mp: hero.mp }])) };
    const total = oldTotals(opponent);
    state.activeParty = [fighter]; startingSupport = null;
    const opponentUnit = enemy(opponent, total.max, total.str, baseJobs[opponent].element, baseJobs[opponent].color || '#bd9971', 1, opponent);
    opponentUnit.sparringId = opponent; opponentUnit.levelHint = progressFor(opponent).level; opponentUnit.fixedLevel = true;
    el.menu.classList.add('hidden'); document.querySelector('.menu-tabs').classList.remove('hidden');
    startBattle('Sparring / ' + fighter + ' vs ' + opponent, [opponentUnit], undefined, null, [], { combatMapId: 'emberHallBattles', roundCap: 60 });
    battle.sparring = { fighter, opponent }; battle.startingResonance = sparringSnapshot.resonance;
    return true;
  }
  const oldPrepareEnemy = prepareEnemyForBattle, oldEnemyAction = chooseEnemyAction, oldDrawEnemy = drawEnemy;
  prepareEnemyForBattle = (source, ...args) => {
    const prepared = oldPrepareEnemy(source, ...args);
    if (!source.sparringId) return prepared;
    const total = oldTotals(source.sparringId);
    return { ...prepared, hp: total.max, max: total.max, maxmp: total.mp, mp: total.mp, atk: total.str, stats: { ...total }, baseEvasion: FLAMEGUARD_BASE_EVASION[source.sparringId] || .05, resistanceTier: 'normal', crit: heroCritChance(source.sparringId), xp: 0, sparringId: source.sparringId };
  };
  chooseEnemyAction = unit => {
    if (!unit.sparringId) return oldEnemyAction(unit);
    const skills = battleSkills(unit.sparringId).filter(sk => !sk.otherAllyOnly && !sk.encore && !sk.immediateTurn && !sk.dispel && !sk.revive && !sk.transform && (sk.anim === 'ultimate' ? battle.enemyResonance >= 100 : skillMpCost(unit.sparringId, sk, unit) <= unit.mp));
    const damage = skills.filter(sk => skillTargetsEnemies(sk) && !sk.statusOnly && sk.power >= 0);
    const heal = skills.find(sk => sk.power < 0);
    const ultimate = skills.find(sk => sk.anim === 'ultimate' && (sk.power > 0 || sk.power < 0 && unit.hp < unit.max * .6));
    const buff = skills.find(sk => sk.buffs?.length && !skillTargetsEnemies(sk) && !statusOf(unit, sk.buffs[0].type));
    const chosen = ultimate || (heal && unit.hp < unit.max * .45 ? heal : buff && !((unit.actionsTaken || 0) % 4) ? buff : damage[(unit.actionsTaken || 0) % Math.max(1, damage.length)] || skills.find(sk => sk.basicAttack));
    if (!chosen) return oldEnemyAction(unit);
    const isBuff = chosen.power >= 0 && !skillTargetsEnemies(chosen);
    return { kind: chosen.anim === 'ultimate' ? 'ultimate' : isBuff ? 'buff' : chosen.anim === 'melee' ? 'melee' : 'magic', name: chosen.name, basicAttack: Boolean(chosen.basicAttack), element: chosen.element, scaling: skillScaling(chosen), mpCost: chosen.anim === 'ultimate' ? 0 : skillMpCost(unit.sparringId, chosen, unit), ...(isBuff ? { target: unit } : { coefficient: chosen.coefficient || Math.max(.7, Math.abs(chosen.power) / 20) }), healing: chosen.power < 0, healCoefficient: chosen.coefficient || 1.2, ...(chosen.status ? { status: { ...chosen.status } } : {}), buffs: chosen.buffs, crit: unit.crit };
  };
  drawEnemy = (unit, x, y) => unit.sparringId ? drawSprite(unit.sparringId, x, y, 1, unit.anim === 'attack' ? unit.attackStyle === 'melee' ? 'melee' : 'magic' : unit.hp <= 0 ? 'death' : 'idle', tick) : oldDrawEnemy(unit, x, y);
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
    if (result === 'victory' && !progress().sparringWins.includes(opponent)) {
      progress().sparringWins.push(opponent);
      const reward = opponent + "'s Sparring Seal";
      addOwnedGear(reward, 1, { rarity: 'Common', rollAffixes: false });
      entries.push({ kind: 'gear', icon: 'E', label: reward, detail: 'Unique first-win reward', value: 'x1' });
    } else if (result === 'victory') entries.push({ kind: 'record', icon: '#', label: 'Practice complete', detail: 'First-win reward already earned', value: 'REMATCH' });
    updatePanels();
    oldShowResult(result === 'victory' ? 'victory' : 'defeat', entries, () => { returnToHallAfterBattle(); renderSparring(); queueSave(); });
    return true;
  }
  winBattle = log => battle?.sparring ? finishSparring('victory') : oldWin(log);
  const oldDefeat = triggerPartyDefeat, oldDraw = endBattleDraw;
  triggerPartyDefeat = log => battle?.sparring ? finishSparring('defeat') : oldDefeat(log);
  endBattleDraw = log => battle?.sparring ? finishSparring('draw') : oldDraw(log);
  function drawAreas(camera) {
    const areas = { Torren: [18, 13, 111, 80], Sparky: [139, 54, 53, 39], Glimmer: [437, 14, 185, 80], Seerin: [18, 152, 160, 40], Mira: [18, 273, 175, 70], Kael: [449, 273, 172, 70] };
    ctx.save();
    for (const [id, [x, y, w, h]] of Object.entries(areas)) if (!recruited(id)) {
      ctx.fillStyle = 'rgba(15,12,22,.55)'; ctx.fillRect(x - camera.x, y - camera.y, w, h);
    }
    if (recruited('Sparky') && curios.complete && curios.naturalWidth) {
      const cell = curios.naturalWidth / 5;
      for (const [index, x, y, size] of [[0, 179, 84, 12], [4, 186, 86, 10], [2, 178, 90, 9]]) {
        ctx.drawImage(curios, index * cell, 0, cell, curios.naturalHeight, x - camera.x, y - camera.y, size, size);
      }
    }
    ctx.restore();
  }
  window.HallHub = { meals, coatings, blessings, services, progress, select, openPreparation, renderPreparation, beginStage, openService, startSparring, finishSparring, scavenge, drawAreas, recruited, supportForBattle };
})();
