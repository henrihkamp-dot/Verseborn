// Status rules share one action transaction, while native skills and gear keep separate attempts.
(() => {
  const VERSION = 2, dots = new Set(['poison', 'burn', 'bleed']), controls = new Set(['sleep', 'stun', 'silence']);
  const scalableDebuffs = new Set(['agilityDown', 'defenseDown', 'magicDefenseDown', 'disrupted', 'hubStrengthDown', 'hubMagicDown', 'physicalVulnerability', 'magicVulnerability', 'holyVulnerability', 'mentalPressure', 'anchored', 'rootBind', 'scorched', 'marked', 'critExposed', 'administrativeLock', 'audit']);
  const tracked = ['poison', 'bleed', 'burn', 'sleep', 'stun', 'silence', 'defenseDown', 'agilityDown', 'disrupted'];
  const legacyRanges = new Map(Object.values(affixPools).flat().map(entry => [entry.key, { min: entry.min, max: entry.max }]));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const diminish = values => 1 - values.reduce((left, value) => left * (1 - clamp(Number(value) || 0, 0, .8)), 1);
  const title = type => (STATUS_DEFS[type]?.label || type).toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
  const actorId = unit => unit?.id || unit?.sparringId;
  const archetypes = {
    fighter: { sleep: .85, stun: .85, silence: 1, poison: 1, bleed: 1, defenseDown: .9 },
    bruiser: { sleep: 1.05, stun: .7, poison: 1.1, bleed: 1, agilityDown: 1.1 },
    tank: { sleep: 1, stun: .65, poison: .9, bleed: .8, defenseDown: .5, agilityDown: 1.1 },
    healer: { sleep: .8, stun: .95, silence: .65, poison: 1.1, bleed: 1, disrupted: .8 },
    caster: { sleep: .7, stun: 1, silence: .6, poison: 1, bleed: 1.1, disrupted: .75 },
    controller: { sleep: .5, stun: .9, silence: .8, poison: 1.1, bleed: .9, agilityDown: .65 },
    assassin: { sleep: .7, stun: 1.05, silence: 1, poison: .75, bleed: 1.1, agilityDown: .6 },
    support: { sleep: .85, stun: .9, silence: .75, poison: 1.1, bleed: 1, defenseDown: .75 }
  };
  const identities = {
    Shade: { sleep: .2, stun: 1.15, poison: 1, bleed: .6, silence: .85 },
    'Nyx Vael': { sleep: .4, stun: .4, silence: .65, poison: 1.15, bleed: .9, disrupted: .6 },
    'Archive Custodian': { sleep: .95, stun: .9, poison: 1, bleed: .9, defenseDown: .3, magicDefenseDown: .3, agilityDown: .4, disrupted: .4, silence: .8 },
    'Dawn Gate Sentinel': { sleep: .65, stun: .3, poison: .85, bleed: .65, silence: 1.1, defenseDown: .7 },
    'Red Dragon Lord': { sleep: .8, stun: .35, poison: .35, burn: .2, bleed: 1.1, defenseDown: 1.15, silence: .85 },
    'Ash Wyrm': { sleep: .85, stun: .4, poison: .4, burn: .15, bleed: 1.1, defenseDown: 1.1 },
    'Elder Plumpin': { sleep: .65, stun: .55, poison: .4, burn: .3, bleed: .8, silence: 1.1 },
    'Saint Justin': { poison: 1.1, sleep: .7, stun: .8, silence: .45, defenseDown: 1 },
    'Dock Foreman': { poison: 1.1, sleep: .8, stun: .4, bleed: .85, defenseDown: 1.1 },
    'Lord Sprocket': { poison: .4, bleed: .5, stun: 1.1, sleep: .8, silence: .8, disrupted: 1.15 },
    Solinar: { poison: .45, burn: .15, bleed: 1.1, sleep: .65, stun: .4, defenseDown: .8 },
    'High Administrator Thaddeus': { poison: .9, sleep: .75, stun: .65, silence: .5, defenseDown: 1.1 }
  };
  const endgame = {
    guest: { poison: 1.1, bleed: .9, silence: .75, disrupted: .5 },
    sanctuary: { poison: 1.15, bleed: .85, silence: .8, defenseDown: .55 },
    inspection: { poison: .8, bleed: 1.1, silence: .75, agilityDown: .4 },
    guidance: { poison: 1, bleed: .8, silence: .85, agilityDown: .4 },
    root: { poison: .3, bleed: .45, burn: .8, defenseDown: 1.15, silence: .9 },
    echo: { poison: 1.05, bleed: .65, silence: .55, disrupted: 1.1 },
    veil: { poison: 1.1, bleed: .5, silence: .8, disrupted: .5 },
    oath: { poison: 1.1, bleed: 1.1, silence: .7, defenseDown: .5 },
    crescendo: { poison: .7, bleed: 1.05, silence: .85, disrupted: .55 },
    archive: { poison: .85, bleed: 1.05, silence: .75, defenseDown: .4, agilityDown: .5 }
  };
  function enemyProfile(unit = {}) {
    if (unit.sparringId) return Object.fromEntries(Object.keys(STATUS_DEFS).filter(type => STATUS_DEFS[type].negative).map(type => [type, 1 - resistance(unit.sparringId, type).total]));
    const role = unit.role || enemyAbilityProfile(unit)?.role || 'fighter';
    const family = archetypes[role] || (/tank|guard|defend/.test(role) ? archetypes.tank : /mage|magic/.test(role) ? archetypes.caster : archetypes.fighter);
    const profile = { ...Object.fromEntries(Object.keys(STATUS_DEFS).filter(type => STATUS_DEFS[type].negative).map(type => [type, 1])), ...family };
    if (unit.resistanceTier === 'boss') { profile.sleep = Math.min(profile.sleep, .55); profile.stun = Math.min(profile.stun, .5); }
    Object.assign(profile, identities[unit.name] || identities[enemyIdentityName(unit)] || {}, unit.endgameBoss ? endgame[unit.endgameBoss] || {} : {}, unit.statusChances || {});
    if (unit.endgameBoss) { profile.sleep = 0; profile.stun = 0; }
    return profile;
  }
  function enemyIdentityName(unit) { return enemyAnimationFiles[unit.name] || unit.name; }
  const oldPrepare = prepareEnemyForBattle;
  prepareEnemyForBattle = (...args) => { const unit = oldPrepare(...args); unit.statusIdentity = enemyProfile(unit); return unit; };
  function gearEntries(id) {
    if (!baseJobs[id]) return [];
    return [...Object.values(baseJobs[id].gear).flatMap(ref => ref ? [...gearEffects(gearByName(ref)), ...gearAffixes(ref)] : []), ...activeMythicSetEffects(id)];
  }
  function resistance(id, type) {
    const entries = gearEntries(id), specific = diminish(entries.filter(entry => entry.type === 'statusResistance' && entry.status === type).map(entry => entry.value));
    const broad = Math.min(.3, diminish(entries.filter(entry => entry.type === 'allStatusResistance').map(entry => entry.value)));
    const gear = Math.min(.6, 1 - (1 - specific) * (1 - broad));
    const talent = Math.min(.3, typedTalentValue(id, 'statusResistance'));
    return { gear, specific, broad, total: Math.min(.75, 1 - (1 - gear) * (1 - talent)) };
  }
  function attackerChance(source, type, base) {
    const id = actorId(source);
    const gear = id ? gearEntries(id).filter(entry => entry.type === 'statusChance' && (!entry.status || entry.status === type)).reduce((sum, entry) => sum + entry.value, 0) : 0;
    const bonus = id ? typedTalentValue(id, 'statusChance', type) + gear : 0;
    return Math.max(0, base * (1 + bonus));
  }
  statusApplicationChance = (target, type, base = 1, source = null) => {
    const id = actorId(target), isEnemy = !id;
    let chance = attackerChance(source, type, base);
    if (isEnemy) chance *= enemyProfile(target)[type] ?? 1;
    else {
      const immune = gearEntries(id).some(entry => entry.type === 'statusImmunity' && (!entry.status || entry.status === type));
      if (immune) return 0;
      chance *= 1 - resistance(id, type).total;
      if (battle?.party?.includes(target)) chance *= 1 - (HallHub.supportForBattle()?.meal?.resistance || 0);
    }
    chance *= 1 - clamp(statusValue(target, 'statusWard'), 0, .6);
    return clamp(chance, 0, .95);
  };
  function durationReduction(target, type, duration) {
    const id = actorId(target);
    let reduction = effectValue(id, 'statusDurationReduction') + effectValue(id, 'specificDurationReduction', type);
    target.statusGuards ||= {};
    if (controls.has(type) && duration > 1 && !target.statusGuards.firstControl) {
      const first = effectValue(id, 'firstControlDurationReduction');
      if (first) { reduction += first; target.statusGuards.firstControl = true; }
    }
    const blessing = battle?.party?.includes(target) ? HallHub.supportForBattle()?.blessing : null;
    if (duration > 1 && blessing?.firstStatusDuration && !target.statusGuards.kaelDuration) {
      reduction += blessing.firstStatusDuration; target.statusGuards.kaelDuration = true;
    }
    return Math.min(2, Math.max(0, reduction));
  }
  function severityReduction(target, type) {
    if (!dots.has(type) && !scalableDebuffs.has(type)) return 0;
    const entries = gearEntries(actorId(target)).filter(entry => entry.type === 'statusSeverityReduction' && (entry.status === type || entry.status === 'debuff' && !dots.has(type) && !controls.has(type)));
    return Math.min(.6, diminish(entries.map(entry => entry.value)));
  }
  function dotReduction(unit, type) {
    let reduction = severityReduction(unit, type);
    const blessing = battle?.party?.includes(unit) ? HallHub.supportForBattle()?.blessing : null;
    unit.statusGuards ||= {};
    if (['poison', 'bleed'].includes(type) && blessing?.firstDotReduction && !unit.statusGuards.kaelDot) {
      reduction = 1 - (1 - reduction) * (1 - blessing.firstDotReduction); unit.statusGuards.kaelDot = true;
    }
    return Math.min(.8, reduction);
  }
  let action = null;
  const oldApply = applyStatus;
  function resultRecord(target, type, origin, result) {
    if (action && action.battle === battle && result.outcome !== 'no-proc') {
      if (!action.results.has(target)) action.results.set(target, []);
      action.results.get(target).push({ type, origin, ...result });
    }
    return result;
  }
  applyStatus = (target, type, source, options = {}) => {
    const def = STATUS_DEFS[type], origin = options.origin || 'ability';
    if (!target || !def || target.hp <= 0) return { applied: false, message: '', outcome: 'invalid' };
    if (!def.negative) return oldApply(target, type, source, options);
    const inAction = action && action.battle === battle && action.source === source;
    const cache = inAction ? action.attempts : null;
    if (cache && !cache.has(target)) cache.set(target, new Map());
    const key = origin + ':' + (origin === 'gear' ? type : options.applicationKey || type);
    if (cache?.get(target).has(key)) return { ...cache.get(target).get(key), message: '', repeated: true };
    const complete = result => {
      result.type = type; result.origin = origin;
      result.nativeSource = options.applicationKey || null;
      if (origin === 'gear') result.sources = options.sources || 1;
      if (cache) cache.get(target).set(key, result);
      if (inAction) resultRecord(target, type, origin, result);
      return inAction ? { ...result, message: '' } : result;
    };
    const immutable = target.endgameBoss && ['stun', 'sleep'].includes(type) || !actorId(target) && target.statusChances?.[type] === 0 || actorId(target) && gearEntries(actorId(target)).some(entry => entry.type === 'statusImmunity' && (!entry.status || entry.status === type));
    const roll = options.force ? 0 : Math.random(), base = attackerChance(source, type, options.chance ?? 1);
    if (origin === 'gear' && roll >= base) return complete({ applied: false, message: '', outcome: 'no-proc' });
    if (immutable) return complete({ applied: false, message: title(type) + ' IMMUNE', outcome: 'immune' });
    if (!options.force && roll >= statusApplicationChance(target, type, options.chance ?? 1, source)) return complete({ applied: false, message: title(type) + ' RESISTED', outcome: 'resisted' });
    const before = statusOf(target, type) ? { ...statusOf(target, type) } : null;
    const result = oldApply(target, type, source, { ...options, force: true });
    if (!result.applied) return complete({ ...result, outcome: /IMMUNE/.test(result.message) ? 'immune' : 'resisted' });
    const applied = statusOf(target, type);
    if (applied) {
      applied.origins = [...new Set([...(before?.origins || (before?.origin ? [before.origin] : [])), origin])];
      if (origin === 'gear' && before) {
        if (before.remaining > applied.remaining) { applied.remaining = before.remaining; result.shortened = 0; }
        applied.initialRemaining = Math.max(applied.initialRemaining, before.initialRemaining || 0);
        if (Number.isFinite(before.value) && Number.isFinite(applied.value)) applied.value = Math.max(before.value, applied.value);
      }
      applied.origin = origin; result.duration = applied.remaining;
    }
    return complete({ ...result, outcome: 'applied', message: title(type) + (result.shortened ? ` (${result.duration} actions / shortened)` : '') });
  };
  function begin(source, skill) { action = { battle, source, skill, pending: new Map(), results: new Map(), attempts: new Map(), nativeTargets: new Set() }; }
  function eligible(entry, skill, hit) {
    const trigger = entry.trigger || 'damage';
    return trigger === 'damage' || trigger === 'basic' && skill.basicAttack || trigger === 'weapon' && (skill.basicAttack || skillScaling(skill) === 'str') || trigger === 'spell' && !skill.basicAttack && skillScaling(skill) === 'mag' || trigger === 'crit' && hit.critical || trigger === 'break' && hit.broken;
  }
  function procSources(source, skill, hit = {}) {
    const id = actorId(source);
    const entries = gearEntries(id).filter(entry => entry.type === 'statusOnHit' && eligible(entry, skill, hit)).map(entry => ({ type: entry.status, chance: entry.value, duration: entry.duration, potency: entry.potency, scaling: skillScaling(skill) }));
    if (skill.basicAttack) {
      const basic = weaponBasicAttackEffect(gearByName(baseJobs[id]?.gear.weapon));
      if (basic?.type === 'status') entries.push({ ...basic, type: basic.status, chance: basic.chance ?? 1, duration: (basic.duration || 2) + typedTalentValue(id, 'basicDebuffDuration'), scaling: basic.status === 'poison' ? 'str' : 'mag' });
      const coating = battle?.party?.includes(source) ? HallHub.supportForBattle()?.coating : null;
      if (coating) entries.push({ type: coating.status, chance: coating.chance, duration: coating.duration, value: coating.value, scaling: coating.status === 'bleed' ? 'str' : 'agi' });
    }
    return entries;
  }
  function queue(source, target, skill, hit = {}) {
    if (!action || action.battle !== battle || action.source !== source || !(skill.power > 0 || skill.coefficient) || skill.statusOnly || target.hp <= 0) return;
    if (!action.pending.has(target)) action.pending.set(target, { critical: false, broken: false });
    const flags = action.pending.get(target); flags.critical ||= Boolean(hit.critical); flags.broken ||= Boolean(hit.broken);
  }
  function groupedProcs(source, skill, hit) {
    const grouped = new Map();
    for (const entry of procSources(source, skill, hit)) {
      if (!STATUS_DEFS[entry.type]?.negative || !entry.chance) continue;
      if (!grouped.has(entry.type)) grouped.set(entry.type, []);
      grouped.get(entry.type).push(entry);
    }
    return [...grouped].map(([type, sources]) => {
      const stun = type === 'stun' && actorId(source) === 'Mira' && (skill.doublesStunChance || statusOf(source, 'stunFocus')) ? 2 : 1;
      const cap = controls.has(type) ? .45 : dots.has(type) ? .65 : .85;
      const best = sources.slice().sort((a, b) => (b.value || 0) - (a.value || 0) || (b.duration || 0) - (a.duration || 0))[0];
      return { ...best, type, chance: Math.min(cap, sources.reduce((sum, entry) => sum + entry.chance, 0) * stun), duration: Math.max(...sources.map(entry => entry.duration || (type === 'poison' ? 3 : STATUS_DEFS[type]?.duration || 2))), origin: 'gear', sources: sources.length };
    });
  }
  function summary(results) {
    return [...results].map(([target, entries]) => {
      const applied = [...new Set(entries.filter(entry => entry.applied).map(entry => title(entry.type) + (entry.shortened ? ` (${entry.duration} actions / shortened)` : '')))];
      const resisted = [...new Set(entries.filter(entry => entry.outcome === 'resisted' && !entries.some(other => other.type === entry.type && other.applied)).map(entry => title(entry.type)))];
      const immune = [...new Set(entries.filter(entry => entry.outcome === 'immune').map(entry => title(entry.type)))];
      const notes = [...applied, ...(resisted.length ? ['Resisted: ' + resisted.join(', ')] : []), ...(immune.length ? ['Immune: ' + immune.join(', ')] : [])];
      return notes.length ? ` ${target.name}: ${notes.join('; ')}.` : '';
    }).join('');
  }
  function finish() {
    if (!action || action.battle !== battle) { action = null; return ''; }
    for (const [target, hit] of action.pending) if (target.hp > 0) {
      for (const entry of groupedProcs(action.source, action.skill, hit)) applyStatus(target, entry.type, action.source, { ...entry, damageKind: action.skill.anim, element: action.skill.element });
    }
    const text = summary(action.results);
    battle.lastStatusResults = [...action.results].map(([target, results]) => ({ target: target.name, results: results.map(result => ({ type: result.type, origin: result.origin, nativeSource: result.nativeSource, sources: result.sources, outcome: result.outcome, duration: result.duration, shortened: result.shortened })) }));
    battle.pendingStatusResults = battle.lastStatusResults;
    // The action summary is authoritative; avoid repeating the same statuses in the damage banner.
    if (battle.attackStatuses) battle.attackStatuses = [];
    action = null;
    return text;
  }
  const oldSkills = applySkillStatuses;
  applySkillStatuses = (source, target, skill) => {
    const own = !action; if (own) begin(source, skill);
    if (action.nativeTargets.has(target)) return [];
    action.nativeTargets.add(target);
    const notes = oldSkills(source, target, skill);
    if (own) { queue(source, target, skill); notes.push(finish().trim()); }
    return notes.filter(Boolean);
  };
  const oldWeapon = applyWeaponBasicAttackEffect;
  applyWeaponBasicAttackEffect = (source, target) => {
    const own = !action, skill = { name: 'Attack', power: 1, basicAttack: true, anim: 'melee', scaling: 'str' };
    if (own) begin(source, skill);
    const note = oldWeapon(source, target);
    if (own) { queue(source, target, skill); return [note, finish().trim()].filter(Boolean).join(' / '); }
    return note;
  };
  const oldDuration = statusDurationFor;
  statusDurationFor = (source, type, requested) => {
    if (source?.sparringId && !source.id) source = { ...source, id: source.sparringId };
    if (type === 'sleep') {
      const bonus = source?.id ? typedTalentValue(source.id, 'statusDuration', type) + effectValue(source.id, 'statusDuration') : 0;
      return clamp(Math.round((requested || STATUS_DEFS.sleep.duration || 2) + bonus), 1, 5);
    }
    return oldDuration(source, type, requested);
  };
  const oldFormat = formatAffix;
  const triggerLabel = trigger => ({ damage: 'damaging action', basic: 'basic attack', weapon: 'weapon/STR hit', spell: 'spell hit', crit: 'critical hit', break: 'Break action' })[trigger] || 'damaging action';
  formatAffix = entry => {
    if (entry.type === 'statusOnHit') return `${entry.label}: ${Math.round(entry.value * 100)}% ${title(entry.status)} per ${triggerLabel(entry.trigger)} (combined once per target)`;
    if (entry.type === 'statusResistance') return `${entry.label}: ${Math.round(entry.value * 100)}% ${title(entry.status)} application resistance`;
    if (entry.type === 'allStatusResistance') return `${entry.label}: ${Math.round(entry.value * 100)}% all-status application resistance`;
    if (entry.type === 'statusSeverityReduction') return `${entry.label}: ${Math.round(entry.value * 100)}% less ${entry.status === 'debuff' ? 'stat-debuff severity' : title(entry.status) + ' damage'}`;
    if (entry.type === 'statusDurationReduction') return `${entry.label}: negative statuses last -${entry.value} action(s); minimum 1`;
    if (entry.type === 'specificDurationReduction') return `${entry.label}: ${title(entry.status)} lasts -${entry.value} action(s); minimum 1`;
    if (entry.type === 'firstControlDurationReduction') return `${entry.label}: first reducible control lasts -${entry.value} action(s)`;
    if (entry.type === 'statusDuration') return `${entry.label}: inflicted negative statuses last +${entry.value} action(s)`;
    if (entry.type === 'buffDuration') return `${entry.label}: positive buffs last +${entry.value} action(s)`;
    return oldFormat(entry);
  };
  function rebalanceEntry(entry, slot = null) {
    if (!entry || entry.statusRulesVersion === VERSION) return false;
    const canonical = Object.values(affixPools).flat().find(candidate => candidate.key && candidate.key === entry.key);
    if (canonical && ['statusOnHit', 'statusResistance', 'allStatusResistance', 'poisonReduction', 'statusSeverityReduction', 'statusDurationReduction', 'statusDuration', 'statusChance', 'buffDuration'].includes(entry.type)) {
      const range = Number.isFinite(entry.min) && Number.isFinite(entry.max) ? entry : legacyRanges.get(entry.key) || canonical;
      const position = range.max > range.min ? clamp((entry.value - range.min) / (range.max - range.min), 0, 1) : 1;
      Object.assign(entry, { type: canonical.type, min: canonical.min, max: canonical.max, value: Math.round((canonical.min + position * (canonical.max - canonical.min)) * 100) / 100 });
      if (canonical.status) entry.status = canonical.status;
      if (canonical.trigger) entry.trigger = canonical.trigger;
      entry.statusRulesVersion = VERSION; entry.text = formatAffix(entry); return true;
    }
    if (entry.type === 'poisonReduction') { entry.type = 'statusSeverityReduction'; entry.status = 'poison'; }
    else if (entry.type === 'allStatusResistance') entry.value = Math.min(.16, entry.value * .5);
    else if (entry.type === 'statusOnHit') { entry.value = clamp(entry.value, .1, .3); entry.trigger ||= slot === 'weapon' ? 'weapon' : 'damage'; }
    else if (!['statusResistance', 'statusSeverityReduction', 'statusDurationReduction', 'specificDurationReduction', 'statusDuration', 'statusChance', 'buffDuration', 'firstControlDurationReduction'].includes(entry.type)) return false;
    entry.statusRulesVersion = VERSION;
    if (entry.key) entry.text = formatAffix(entry);
    else entry.label = formatAffix({ ...entry, label: 'Special' }).replace(/^Special: /, '');
    return true;
  }
  for (const [slot, pool] of Object.entries(affixPools)) {
    for (const entry of pool) {
      if (entry.type === 'statusOnHit') {
        entry.min = slot === 'weapon' ? .12 : .1; entry.max = slot === 'weapon' ? .24 : .2;
        entry.trigger = slot === 'weapon' ? entry.status === 'sleep' ? 'spell' : 'weapon' : 'damage'; entry.weight = .55;
      }
      if (entry.type === 'statusResistance') { entry.min = .15; entry.max = .35; }
      if (entry.type === 'allStatusResistance') { entry.min = .04; entry.max = .1; entry.minRarity = 'Legendary'; entry.weight = .25; }
      if (entry.type === 'poisonReduction') { entry.type = 'statusSeverityReduction'; entry.status = 'poison'; }
    }
  }
  affixPools.armour.push(
    affix('bloodward', 'Bloodward', 'statusSeverityReduction', .15, .3, { status: 'bleed' }),
    affix('quietMind', 'Quiet Mind', 'statusResistance', .15, .35, { status: 'silence' }),
    affix('clearheaded', 'Clearheaded', 'specificDurationReduction', 1, 1, { status: 'sleep' }),
    affix('temperedMind', 'Tempered Mind', 'statusSeverityReduction', .15, .3, { status: 'debuff' })
  );
  affixPools.weapon.push(
    affix('bloodletter', 'Bloodletter', 'statusOnHit', .12, .24, { status: 'bleed', trigger: 'weapon', weight: .55 }),
    affix('spellvenom', 'Hex Venom', 'statusOnHit', .12, .24, { status: 'poison', trigger: 'spell', weight: .55 }),
    affix('criticalShock', 'Critical Shock', 'statusOnHit', .16, .28, { status: 'stun', trigger: 'crit', weight: .45 })
  );
  const visited = new WeakSet();
  for (const gear of Object.values(gearDb).flat()) {
    if (visited.has(gear)) continue; visited.add(gear);
    for (const entry of gearEffects(gear)) {
      if (gear.name === 'Nullcourt Regalia' && entry.type === 'statusDurationReduction') entry.type = 'firstControlDurationReduction';
      rebalanceEntry(entry, gear.slot);
    }
  }
  for (const set of Object.values(MYTHIC_SETS)) rebalanceEntry(set.bonus);
  for (const basic of Object.values(WEAPON_BASIC_ATTACK_EFFECTS)) if (basic.type === 'status') {
    const chance = controls.has(basic.status) ? 45 : dots.has(basic.status) ? 65 : 85;
    basic.label = `BASIC ATTACK: ${chance}% ${title(basic.status)} base chance before resistance; combined gear roll`;
  }
  function allowed(entry, chosen, gear, rarity) {
    if (entry.minRarity && gearRarityRank(rarity) < gearRarityRank(entry.minRarity)) return false;
    if (chosen.some(other => other.key === entry.key)) return false;
    const proc = [...gearEffects(gear), ...chosen].find(other => other.type === 'statusOnHit');
    if (entry.type === 'statusOnHit' && proc && !gear.allowMixedStatuses) return entry.status === proc.status && !chosen.some(other => other.type === 'statusOnHit');
    if (['statusResistance', 'allStatusResistance'].includes(entry.type) && chosen.some(other => ['statusResistance', 'allStatusResistance'].includes(other.type))) return false;
    return true;
  }
  function weightedChoice(entries, theme, preferred) {
    const weights = entries.map(entry => (entry.weight || 1) * (entry.theme && entry.theme === theme ? 3 : 1) * (entry.type === 'statusOnHit' && entry.status === preferred ? 2 : 1));
    let cursor = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
    for (let index = 0; index < entries.length; index++) { cursor -= weights[index]; if (cursor <= 0) return entries[index]; }
    return entries.at(-1);
  }
  function generate(gear, rarity, theme = '', countOverride = null, existing = []) {
    const count = Number.isInteger(countOverride) ? Math.max(0, countOverride) : RARITY_AFFIX_COUNTS[rarity] || 0;
    const chosen = [...existing];
    const build = gearEntries(selectedGearHero || state.activeParty[0]).filter(entry => entry.type === 'statusOnHit').reduce((counts, entry) => { counts[entry.status] = (counts[entry.status] || 0) + entry.value; return counts; }, {});
    const preferred = gearEffects(gear).find(entry => entry.type === 'statusOnHit')?.status || { swamp: 'poison', ruins: 'sleep', mountain: 'stun' }[theme] || Object.keys(build).sort((a, b) => build[b] - build[a])[0];
    while (chosen.length < count) {
      const candidates = gearAffixPool(gear).filter(entry => allowed(entry, chosen, gear, rarity));
      if (!candidates.length) break;
      const template = weightedChoice(candidates, theme, preferred), entry = { ...template, value: randomAffixValue(template), statusRulesVersion: VERSION };
      entry.text = formatAffix(entry); chosen.push(entry);
    }
    return chosen;
  }
  rollGearAffixes = (gear, rarity, theme = '', count = null) => generate(gear, rarity, theme, count);
  topUpGearAffixes = (ref, rarity = gearRarity(ref), theme = 'dragon') => {
    const gear = gearByName(ref); if (!gear) return [];
    const entries = generate(gear, rarity, theme, null, gearAffixes(ref));
    if (gearInstance(ref)) gearInstance(ref).affixes = entries; else state.gearAffixes[ref] = entries;
    return entries;
  };
  function migrateOwned() {
    let changed = false;
    const migrate = (entries, slot) => { for (const entry of entries || []) if (rebalanceEntry(entry, slot)) changed = true; };
    for (const [ref, entries] of Object.entries(state.gearAffixes || {})) migrate(entries, gearByName(ref)?.slot);
    for (const instance of Object.values(state.gearInstances || {})) { migrate(instance.affixes, gearByName(instance.name)?.slot); migrate(instance.effects, gearByName(instance.name)?.slot); }
    for (const offer of Object.values(state.hallBattles?.shopOffers || {})) migrate(offer.affixes, gearByName(offer.name)?.slot);
    state.flags ||= {};
    if (state.flags.statusRulesVersion !== VERSION) { state.flags.statusRulesVersion = VERSION; changed = true; }
    return changed;
  }
  const oldLoad = loadGame, oldSave = saveGame;
  loadGame = key => {
    const loaded = oldLoad(key); if (!loaded) return false;
    if (migrateOwned()) {
      const saveKey = key || activeSaveKey();
      try { const data = JSON.parse(localStorage.getItem(saveKey)); if (data?.state) localStorage.setItem(saveKey, JSON.stringify({ ...data, state })); } catch {}
    }
    return true;
  };
  saveGame = key => { if (!['title', 'battle', 'transition'].includes(mode)) migrateOwned(); return oldSave(key); };
  const oldArchive = hallLexiconHtml;
  hallLexiconHtml = () => {
    const template = document.createElement('template'); template.innerHTML = oldArchive();
    const info = hallBattleInfo(lexiconStage), units = [info.enemies, ...info.waves].flatMap((keys, phase) => hallEnemiesForStage(lexiconStage, keys, phase).map(unit => prepareEnemyForBattle(unit, 'emberHallBattles')));
    const details = [...template.content.querySelectorAll('.archive-enemy')];
    details.forEach((detail, index) => {
      const unit = units[index]; if (!unit) return;
      const profile = enemyProfile(unit), p = document.createElement('p'); p.className = 'archive-note';
      p.textContent = 'Status profile: ' + tracked.map(type => `${title(type)} ${profile[type] === 0 ? 'immune' : profile[type] < 1 ? Math.round((1 - profile[type]) * 100) + '% resistance' : profile[type] > 1 ? '+' + Math.round((profile[type] - 1) * 100) + '% susceptibility' : 'normal'}`).join(' / ');
      detail.querySelector('.archive-stats')?.after(p);
    });
    return template.innerHTML;
  };
  const oldTooltip = statusTooltipHtml, oldDisplay = statusDisplayData, oldRecord = recordDamageMeterAction;
  statusDisplayData = (unit, status) => {
    const data = oldDisplay(unit, status);
    if (['hubStrengthDown', 'hubMagicDown'].includes(status.type)) data.description = `Outgoing ${status.type === 'hubStrengthDown' ? 'STR' : 'MAG'} damage reduced by ${Math.round(statusValue(unit, status.type) * 100)}%.`;
    const origin = status.origins?.length > 1 ? 'Ability + Gear' : status.origin === 'gear' ? 'Gear' : 'Ability';
    return STATUS_DEFS[status.type]?.negative && status.origin ? { ...data, kind: origin + ' / Debuff' } : data;
  };
  statusTooltipHtml = unit => {
    const html = oldTooltip(unit); if (unit.id || !unit.stats) return html;
    const profile = enemyProfile(unit);
    return html + `<section><b>Status identity</b><small>${tracked.map(type => `${title(type)}: ${profile[type] === 0 ? 'immune' : profile[type] < 1 ? Math.round((1 - profile[type]) * 100) + '% resistance' : profile[type] > 1 ? '+' + Math.round((profile[type] - 1) * 100) + '% susceptibility' : 'normal'}`).join(' / ')}</small></section>`;
  };
  recordDamageMeterAction = message => {
    oldRecord(message);
    if (battle?.pendingStatusResults && battle.actionHistory?.length) {
      battle.actionHistory.at(-1).statusResults = JSON.parse(JSON.stringify(battle.pendingStatusResults));
      delete battle.pendingStatusResults;
    }
  };
  equippedProcChances = id => {
    const source = battle?.party?.find(unit => unit.id === id) || { id, statuses: [] };
    return groupedProcs(source, { basicAttack: true, power: 1, anim: 'melee', scaling: 'str' }, {}).map(entry => ({ type: entry.type, raw: entry.chance, normalChance: Math.min(.95, attackerChance(source, entry.type, entry.chance)) }));
  };
  const oldCaps = capsHtml;
  capsHtml = id => oldCaps(id).replace('Boss Poison: 1.5% max HP per tick', 'Boss Poison: 2.5% max HP per normal tick / 3% with CRIT').replace('</div>', '<span>Application resistance from gear: 60% max / broad gear contribution: 30% max</span><span>Negative-duration reduction: 2 actions max / minimum 1 action</span></div>');
  window.StatusSystem = { version: VERSION, archetypes, identities, enemyProfile, resistance, durationReduction, severityReduction, dotReduction, begin, queue, finish, groupedProcs, summary, migrateOwned, allowed, inAction: () => Boolean(action) };
})();
