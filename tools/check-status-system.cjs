const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve(__dirname, '../../../previews/status-system-qa'); fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.goto(process.env.HALL_TEST_URL || 'http://127.0.0.1:8744/'); await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
    assert.equal(await page.evaluate(() => mode), 'title'); assert.equal(await page.evaluate(() => localStorage.length), 0);
    const results = await page.evaluate(() => {
      const results = [], check = (name, pass, details = null) => { results.push({ name, pass: Boolean(pass), details }); };
      state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; state.party = ['Verseborn', ...HALL_RECRUITS]; state.activeParty = ['Verseborn', 'Torren', 'Kael'];
      state.developerTuning = {}; Object.values(state.heroProgress).forEach(progress => { progress.talents = []; progress.rank0 = null; });
      HallHub.progress().selected = { meal: null, coating: null, blessing: null };
      const random = Math.random; let rolls = 0;
      const source = { id: 'Verseborn', name: 'Verseborn', hp: 1000, max: 1000, mp: 100, maxmp: 100, statuses: [], stats: totals('Verseborn'), anim: 'idle' };
      const makeEnemy = (name = 'Slobbo', extra = {}) => prepareEnemyForBattle({ ...enemy(name, 1000, 10, 'Tech', '#aaa', 1), ...extra });
      const skill = { name: 'Test strike', anim: 'melee', element: 'Physical', power: 1, scaling: 'str', basicAttack: true };
      const setup = (enemies = [makeEnemy()]) => {
        source.statuses = []; source.statusGuards = {}; mode = 'battle';
        battle = { party: [source], enemies, round: 1, usedOnce: {}, enemyResonance: 0, hubSupport: null, attackDamage: [], attackStatuses: [], turnQueue: [], turnIndex: 0, defeated: [], waves: [] };
        baseJobs.Verseborn.gear = { weapon: 'Voice of Verse', armour: null, ring: 'Promise Ring', necklace: 'Cinder Star', helmet: null };
        for (const ref of ['Voice of Verse', 'Promise Ring', 'Cinder Star']) state.gearAffixes[ref] = [];
        rolls = 0; Math.random = () => { rolls++; return 0; }; return enemies;
      };
      const procs = entries => entries.forEach(([ref, type, value, trigger = 'damage']) => state.gearAffixes[ref].push({ key: 'test-' + type + '-' + ref, label: 'Test', type: 'statusOnHit', status: type, value, trigger }));
      let [target] = setup(); procs([['Voice of Verse', 'poison', .2]]);
      StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill); let text = StatusSystem.finish();
      check('1. Basic / one Poison source', rolls === 1 && statusOf(target, 'poison') && text.includes('Poison'), { rolls, text });
      [target] = setup(); procs([['Voice of Verse', 'poison', .07], ['Promise Ring', 'poison', .06], ['Cinder Star', 'poison', .14]]);
      const combined = StatusSystem.groupedProcs(source, skill, {})[0].chance;
      StatusSystem.begin(source, skill); for (let i = 0; i < 8; i++) StatusSystem.queue(source, target, skill); StatusSystem.finish();
      check('2. Duplicate Poison / one roll per action', rolls === 1 && Math.abs(combined - .27) < .00001, { rolls, combined });
      [target] = setup(); procs([['Voice of Verse', 'poison', .2], ['Promise Ring', 'sleep', .2], ['Cinder Star', 'stun', .2]]);
      StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill); StatusSystem.finish();
      check('3. Deliberate Poison + Sleep + Stun', rolls === 3 && ['poison', 'sleep', 'stun'].every(type => statusOf(target, type)), { rolls });
      const aoe = { ...skill, name: 'AoE', basicAttack: false, allEnemies: true };
      let enemies = setup([makeEnemy(), makeEnemy('Brokk'), makeEnemy('Clock Goblin')]);
      procs([['Voice of Verse', 'poison', .2], ['Promise Ring', 'sleep', .2], ['Cinder Star', 'stun', .2]]);
      StatusSystem.begin(source, aoe); for (let hit = 0; hit < 4; hit++) enemies.forEach(enemy => StatusSystem.queue(source, enemy, aoe)); text = StatusSystem.finish();
      check('4. AoE / three targets', rolls === 9 && battle.lastStatusResults.length === 3, { rolls, text });
      enemies = setup([makeEnemy(), makeEnemy('Brokk'), makeEnemy('Clock Goblin')]);
      procs([['Voice of Verse', 'poison', .07], ['Promise Ring', 'poison', .06], ['Cinder Star', 'poison', .14]]);
      StatusSystem.begin(source, aoe); for (let hit = 0; hit < 4; hit++) enemies.forEach(enemy => StatusSystem.queue(source, enemy, aoe)); StatusSystem.finish();
      check('5. AoE / duplicate sources and multiple hits', rolls === 3, { rolls });
      for (const [number, type] of [[6, 'poison'], [7, 'silence'], [8, 'stun'], [9, 'sleep']]) {
        [target] = setup(); procs([['Promise Ring', type, .2]]);
        const native = { ...skill, name: 'Dedicated ' + type, basicAttack: false, statusOnly: true, power: 0, status: { type, chance: 1, duration: 3 } };
        StatusSystem.begin(source, native); for (let hit = 0; hit < 4; hit++) applySkillStatuses(source, target, native); StatusSystem.queue(source, target, native); StatusSystem.finish();
        check(number + '. Dedicated native ' + type, rolls === 1 && statusOf(target, type)?.origin === 'ability', { rolls, status: statusOf(target, type) });
      }
      for (const [number, type] of [[10, 'poison'], [11, 'sleep'], [12, 'stun']]) {
        [target] = setup(); procs([['Voice of Verse', type, .2], ['Promise Ring', type, .2], ['Cinder Star', type, .2]]);
        const chance = StatusSystem.groupedProcs(source, skill, {})[0].chance;
        StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill); StatusSystem.finish();
        check(number + '. ' + type + '-focused build', rolls === 1 && chance >= .45 && statusOf(target, type), { rolls, chance });
      }
      [target] = setup(); procs([['Voice of Verse', 'poison', .2], ['Promise Ring', 'sleep', .2], ['Cinder Star', 'stun', .2]]);
      state.inventory['Razorleaf Wax'] = 2; battle.hubSupport = { coating: { ...HallHub.coatings.find(entry => entry.id === 'razorwax') } };
      StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill); text = StatusSystem.finish();
      check('13. Mixed build / coating shares resolver', rolls === 4 && statusOf(target, 'bleed'), { rolls, text });
      [target] = setup([makeEnemy('Shade')]);
      check('14. Shade / strong Sleep resistance', statusApplicationChance(target, 'sleep', 1, source) < .3 && statusApplicationChance(target, 'poison', 1, source) > .8);
      [target] = setup([makeEnemy('Red Dragon Lord')]);
      check('15. Dragon / strong Poison resistance', statusApplicationChance(target, 'poison', 1, source) < .4 && statusApplicationChance(target, 'defenseDown', 1, source) > .8);
      [target] = setup([makeEnemy('Shade')]);
      check('16. Selective Stun weakness', statusApplicationChance(target, 'stun', .5, source) > .5 && statusApplicationChance(target, 'sleep', .5, source) < .2);
      [target] = setup([makeEnemy('Nyx Vael', { resistanceTier: 'boss' })]);
      check('17. Boss / strong control but viable DoT', statusApplicationChance(target, 'stun', 1, source) <= .45 && statusApplicationChance(target, 'poison', 1, source) > .8);
      baseJobs.Torren.gear = { weapon: null, armour: 'Ashcloak', ring: 'Promise Ring', necklace: null, helmet: null };
      state.gearAffixes.Ashcloak = [{ type: 'statusResistance', status: 'poison', value: .5 }]; state.gearAffixes['Promise Ring'] = [];
      const defender = battleUnit('Torren'); battle.party.push(defender);
      check('18. Specialist resistance', StatusSystem.resistance('Torren', 'poison').gear >= .5 && StatusSystem.resistance('Torren', 'sleep').gear === 0);
      state.gearAffixes.Ashcloak = [{ type: 'allStatusResistance', value: .5 }]; state.gearAffixes['Promise Ring'] = [{ type: 'allStatusResistance', value: .5 }];
      check('19. Broad resistance / diminishing return and gear cap', StatusSystem.resistance('Torren', 'poison').gear <= .6 && StatusSystem.resistance('Torren', 'poison').broad <= .3);
      const unchanged = { key: 'strong', label: 'Strong', type: 'statPct', stat: 'str', value: .11, min: .05, max: .15 };
      const legacy = { id: 'hall_status_test', name: 'Nullcourt Regalia', rarity: 'Mythic', stats: { stam: 19, str: 7 }, affixes: [
        { key: 'poisonward', label: 'Poisonward', type: 'poisonReduction', min: .12, max: .3, value: .24 },
        { key: 'resolute', label: 'Resolute', type: 'allStatusResistance', min: .08, max: .2, value: .2 }, { ...unchanged }
      ] };
      gearInstances[legacy.id] = legacy; state.gearInstances = gearInstances; state.ownedGear.push(legacy.name);
      const invariant = JSON.stringify({ id: legacy.id, name: legacy.name, rarity: legacy.rarity, stats: legacy.stats, unrelated: legacy.affixes[2] });
      StatusSystem.migrateOwned(); const once = JSON.stringify(state); StatusSystem.migrateOwned();
      check('20. Legacy migration / no delete, reroll or stat change', invariant === JSON.stringify({ id: legacy.id, name: legacy.name, rarity: legacy.rarity, stats: legacy.stats, unrelated: legacy.affixes[2] }) && legacy.affixes[0].type === 'statusSeverityReduction' && legacy.affixes[0].status === 'poison' && legacy.affixes[1].value === .1 && once === JSON.stringify(state), legacy);
      Math.random = random; let valid = true, rollsGenerated = 0;
      for (const rarity of ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Artifact']) for (const slot of ['weapon', 'armour', 'ring']) for (let i = 0; i < 100; i++) {
        const item = { name: 'Generated test', slot, effect: [] }, entries = rollGearAffixes(item, rarity);
        const procFamilies = new Set(entries.filter(entry => entry.type === 'statusOnHit').map(entry => entry.status));
        valid &&= procFamilies.size <= 1 && entries.filter(entry => entry.type === 'statusOnHit').length <= 1 && entries.every(entry => entry.type !== 'allStatusResistance' || gearRarityRank(rarity) >= gearRarityRank('Legendary'));
        rollsGenerated++;
      }
      check('21. Future generation / quality, one proc family, rare broad defence', valid, { rollsGenerated });
      [target] = setup(); procs([['Voice of Verse', 'poison', .2], ['Promise Ring', 'sleep', .2], ['Cinder Star', 'stun', .2]]);
      Math.random = () => .99; StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill); text = StatusSystem.finish();
      check('Untriggered gear is silent', text === '');
      [target] = setup([makeEnemy('Shade')]); procs([['Voice of Verse', 'poison', .2], ['Promise Ring', 'sleep', .2], ['Cinder Star', 'stun', .2]]);
      target.statusChances = { poison: .1, sleep: .1, stun: .1 }; Math.random = () => .1;
      StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill); text = StatusSystem.finish();
      check('Compact per-enemy resisted summary', text.includes('Resisted: Poison, Sleep, Stun') && !text.includes('RESISTED /'), text);
      [target] = setup(); procs([['Voice of Verse', 'poison', .2, 'basic']]);
      StatusSystem.begin(source, aoe); StatusSystem.queue(source, target, aoe); StatusSystem.finish(); check('Basic-only effects do not spread through spells/AoE', rolls === 0);
      baseJobs.Torren.gear = { weapon: null, armour: 'Ashcloak', ring: null, necklace: null, helmet: null };
      state.gearAffixes.Ashcloak = [{ type: 'statusDurationReduction', value: 1 }, { type: 'statusSeverityReduction', status: 'poison', value: .2 }];
      const player = battleUnit('Torren'); player.hp = player.max = 1000; battle.party.push(player); Math.random = () => 0;
      const beforeChance = statusApplicationChance(player, 'poison', 1, target), duration = applyStatus(player, 'sleep', target, { force: true, duration: 4 });
      player.statuses = []; applyStatus(player, 'poison', target, { force: true, value: 100, duration: 3 }); Math.random = () => 1;
      processTurnStart(player); const poisonLoss = 1000 - player.hp;
      player.hp = 1000; player.statuses = []; applyStatus(player, 'burn', target, { force: true, value: 100, duration: 3 }); processTurnStart(player);
      check('Application, duration and severity stay independent', beforeChance === .95 && duration.duration === 3 && duration.shortened === 1 && poisonLoss === 80 && 1000 - player.hp === 100, { beforeChance, duration, poisonLoss, burnLoss: 1000 - player.hp });
      player.statuses = []; player.statusGuards = {}; state.gearAffixes.Ashcloak = []; battle.hubSupport = { blessing: HallHub.blessings.find(entry => entry.id === 'composure') };
      const first = applyStatus(player, 'sleep', target, { force: true, duration: 4 }); player.statuses = []; const second = applyStatus(player, 'sleep', target, { force: true, duration: 4 });
      check('Kael complements gear / first reducible status only', first.duration === 3 && second.duration === 4);
      [target] = setup(); procs([['Promise Ring', 'silence', .2]]);
      const nativeLong = { ...skill, basicAttack: false, name: 'Long Silence', status: { type: 'silence', chance: 1, duration: 5 } };
      StatusSystem.begin(source, nativeLong); applySkillStatuses(source, target, nativeLong); StatusSystem.queue(source, target, nativeLong); StatusSystem.finish();
      check('Gear cannot shorten an active native status', statusOf(target, 'silence').remaining === 5 && statusOf(target, 'silence').origins.length === 2);
      [target] = setup(); target.statusChances = { poison: .5 }; state.gearAffixes['Promise Ring'] = [{ type: 'statusChance', value: .5 }];
      check('Application support modifies the final attempt before resistance', Math.abs(statusApplicationChance(target, 'poison', .2, source) - .15) < .00001 && Math.abs(statusApplicationChance(target, 'poison', 1, source) - .75) < .00001);
      [target] = setup(); procs([['Voice of Verse', 'poison', .2, 'crit']]);
      StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill, { critical: false }); StatusSystem.queue(source, target, skill, { critical: true }); StatusSystem.finish();
      check('Crit trigger / one attempt across multiple hits', rolls === 1 && statusOf(target, 'poison'));
      [target] = setup(); procs([['Promise Ring', 'sleep', .2, 'break']]);
      StatusSystem.begin(source, skill); StatusSystem.queue(source, target, skill, { broken: false }); StatusSystem.finish();
      check('Break proc needs an actual Break', rolls === 0);
      [target] = setup([makeEnemy('Memory Root Guardian', { endgameBoss: 'root', resistanceTier: 'boss' })]);
      const immunity = applyStatus(target, 'stun', source, { force: true }); check('Encounter-specific immunity survives native force', immunity.outcome === 'immune' && !statusOf(target, 'stun'));
      [target] = setup();
      baseJobs.Torren.gear = { weapon: null, armour: 'Ashcloak', ring: null, necklace: null, helmet: null }; state.gearAffixes.Ashcloak = [{ type: 'statusSeverityReduction', status: 'debuff', value: .2 }];
      const defended = battleUnit('Torren'); defended.hp = defended.max = 1000; battle.party.push(defended);
      applyStatus(defended, 'agilityDown', target, { force: true, duration: 3, value: .2 }); applyStatus(defended, 'violationStamp', target, { force: true, duration: 3, value: 3 });
      check('Severity protects stat debuffs, not scripted counters', Math.abs(statusValue(defended, 'agilityDown') - .16) < .00001 && statusValue(defended, 'violationStamp') === 3);
      defended.statuses = []; defended.statusGuards = {}; state.gearAffixes.Ashcloak = [{ type: 'statusSeverityReduction', status: 'poison', value: .2 }];
      battle.hubSupport = { blessing: HallHub.blessings.find(entry => entry.id === 'purity') }; applyStatus(defended, 'poison', target, { force: true, value: 100, duration: 3 }); Math.random = () => 1;
      processTurnStart(defended); const guardedLoss = 1000 - defended.hp; processTurnStart(defended);
      check('Kael Purity / first DoT tick only, stacking with gear', guardedLoss === 40 && 1000 - defended.hp === 120);
      const profiles = Object.values(HALL_ENEMY_LIBRARY).map(raw => { const unit = prepareEnemyForBattle(enemy(raw.name, raw.hp, raw.atk, raw.weak, raw.color, raw.node)); return { name: unit.name, role: unit.role, profile: StatusSystem.enemyProfile(unit) }; });
      check('Every Hall enemy has an audited profile', profiles.length >= 40 && profiles.every(entry => trackedTypes(entry.profile)));
      function trackedTypes(profile) { return ['poison', 'sleep', 'stun', 'silence', 'bleed'].every(type => Number.isFinite(profile[type])); }
      Math.random = random; battle = null; mode = 'walk';
      lexiconStage = 39; const archive = hallLexiconHtml(); check('Lexicon exposes selective resistance identities', archive.includes('Status profile:') && archive.includes('susceptibility'));
      return { results, profiles, archive };
    });
    for (const result of results.results) { assert.equal(result.pass, true, result.name + ': ' + JSON.stringify(result.details)); console.log('PASS ' + result.name); }
    fs.writeFileSync(path.join(output, 'status-validation.json'), JSON.stringify(results, null, 2));
    const practice = await page.evaluate(() => {
      battle = null; mode = 'walk'; HallHub.openService('Seerin');
      baseJobs.Torren.gear = { weapon: null, armour: 'Ashcloak', ring: null, necklace: null, helmet: null };
      state.gearAffixes.Ashcloak = [{ type: 'statusOnHit', status: 'poison', value: .3, trigger: 'damage' }, { type: 'statusResistance', status: 'sleep', value: .5 }];
      const started = HallHub.startSparring('Verseborn', 'Torren'), opponent = battle.enemies[0];
      const chance = statusApplicationChance(opponent, 'sleep', 1, battle.party[0]);
      battle.turnQueue = [{ side: 'enemy', index: 0, name: opponent.name }]; battle.turnIndex = 0; battle.resolving = true;
      chooseEnemyAction = () => ({ kind: 'melee', name: 'Practice Basic', basicAttack: true, element: 'Physical', scaling: 'str', coefficient: .2, mpCost: 0 });
      finishTurn = () => {}; Math.random = () => .1;
      resolveEnemyTurn(battle.turnQueue[0], ''); return { started, chance };
    });
    assert.equal(practice.started, true); assert.equal(practice.chance, .5);
    await page.waitForFunction(() => battle?.actionHistory?.some(action => action.message.includes('Practice Basic')));
    assert.ok(await page.evaluate(() => statusOf(battle.party[0], 'poison')?.origin === 'gear'));
    console.log('PASS actual sparring: opponent gear resistance and offensive gear use the shared rules.');
    await page.evaluate(() => { battle = null; });
    await page.evaluate(() => { mode = 'menu'; el.menu.classList.remove('hidden'); el.menuBody.innerHTML = hallLexiconHtml(); });
    await page.screenshot({ path: path.join(output, 'status-lexicon-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(output, 'status-lexicon-mobile.png') });
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.archive-enemy *')].every(node => node.getBoundingClientRect().right <= innerWidth + 2)));
    assert.deepEqual(errors, []);
    console.log('PASS all status scenarios; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
