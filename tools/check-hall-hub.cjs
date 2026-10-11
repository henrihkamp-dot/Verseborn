const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve(__dirname, '../../../previews/emberhall-hub-qa');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.goto(process.env.HALL_TEST_URL || 'http://127.0.0.1:8744/');
    await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
    assert.equal(await page.evaluate(() => mode), 'title');
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    const setup = await page.evaluate(() => {
      state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; mode = 'walk';
      state.party = ['Verseborn']; state.activeParty = ['Verseborn'];
      const gated = ['Torren', 'Mira', 'Kael', 'Seerin', 'Sparky', 'Glimmer'].map(id => HallHub.openService(id));
      state.party = ['Verseborn', ...HALL_RECRUITS]; state.activeParty = ['Verseborn', 'Torren', 'Mira'];
      hallBattleProgress().unlockedStage = 60; hallBattleProgress().pendingRecruit = null;
      state.gold = 10000; state.inventory['Emberroot Stew'] = 3; state.inventory['Nightshade Oil'] = 2;
      return { gated, categories: [inventoryCategory('Emberroot Stew'), inventoryCategory('Nightshade Oil')], locked: HallHub.openPreparation(61) };
    });
    assert.deepEqual(setup.gated, [false, false, false, false, false, false]);
    assert.deepEqual(setup.categories, ['consumables', 'consumables']); assert.equal(setup.locked, false);
    await page.evaluate(() => startHallBattleStage(58));
    assert.equal(await page.evaluate(() => mode), 'hallMap');
    await page.locator('[data-select="meal"]').click(); await page.locator('[value="emberroot"]').check(); await page.locator('[data-done]').click();
    await page.locator('[data-select="coating"]').click(); await page.locator('[value="nightshade"]').check(); await page.locator('[data-done]').click();
    await page.locator('[data-select="blessing"]').click(); await page.locator('[value="resolve"]').check(); await page.locator('[data-done]').click();
    assert.deepEqual(await page.evaluate(() => ({ ...HallHub.progress().selected })), { meal: 'emberroot', coating: 'nightshade', blessing: 'resolve' });
    await page.screenshot({ path: path.join(output, 'stage-preparation-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'stage-preparation-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.hub-screen *')].every(node => node.getBoundingClientRect().right <= innerWidth + 2)));
    await page.setViewportSize({ width: 1280, height: 900 });
    const basic = await page.evaluate(() => {
      const before = totals('Verseborn').max;
      HallHub.beginStage(); const second = HallHub.beginStage();
      const unit = battle.party[0], max = unit.max;
      unit.hp = 0; markBattleUnitDown(unit); const survived = unit.hp;
      unit.hp = 0; markBattleUnitDown(unit); const twice = unit.hp; unit.hp = max; unit.down = false;
      return { before, max, second, survived, twice, mode, stage: battle.hallStage, meal: state.inventory['Emberroot Stew'], coating: state.inventory['Nightshade Oil'], effects: battle.hubSupport, report: battle.meterTuning.hallSupport };
    });
    assert.equal(basic.mode, 'battle'); assert.equal(basic.stage, 58); assert.equal(basic.max, Math.round(basic.before * 1.15));
    assert.equal(basic.second, false); assert.equal(basic.survived, 1); assert.equal(basic.twice, 0);
    assert.equal(basic.meal, 2); assert.equal(basic.coating, 1); assert.equal(basic.report.blessing, 'Blessing of Resolve');
    await page.evaluate(() => { battle.ended = true; mode = 'walk'; battle = null; returnToHallAfterBattle(); });
    const checks = await page.evaluate(() => {
      const results = {};
      HallHub.select('coating', null);
      for (const meal of HallHub.meals) {
        state.inventory[meal.name] = 2; HallHub.select('meal', meal.id); HallHub.select('blessing', 'clarity');
        const raw = totals('Verseborn'); HallHub.openPreparation(1); HallHub.beginStage();
        const unit = battle.party.find(unit => unit.id === 'Verseborn');
        results[meal.id] = { max: unit.max, maxmp: unit.maxmp, str: totals('Verseborn').str, mag: totals('Verseborn').mag, raw };
        if (meal.defense) results.defense = incomingDamageMultiplier(unit);
        if (meal.hpRegen || meal.mpRegen) { unit.hp -= 10; unit.mp = 0; processTurnEnd(unit); results[meal.id].hp = unit.hp; results[meal.id].mp = unit.mp; }
        const cost = skillMpCost('Verseborn', { name: 'Test spell', cost: 20, anim: 'magic', element: 'Sound' }, unit);
        results.cost = cost;
        battle.ended = true; battle = null; mode = 'walk'; returnToHallAfterBattle();
      }
      HallHub.select('meal', 'emberroot'); HallHub.select('coating', 'nightshade'); HallHub.select('blessing', 'shelter');
      state.inventory['Emberroot Stew'] = 0; HallHub.openPreparation(1); results.outOfStock = HallHub.beginStage(); results.mode = mode;
      state.inventory['Emberroot Stew'] = 2; state.inventory['Nightshade Oil'] = 2;
      HallHub.beginStage(); results.barrier = battle.party.every(unit => statusValue(unit, 'barrier') === .25);
      battle.ended = true; battle = null; mode = 'walk'; returnToHallAfterBattle();
      results.saved = saveGame(hallSaveKey(1)); const selected = { ...HallHub.progress().selected }; loadGame(hallSaveKey(1));
      results.roundTrip = JSON.stringify(selected) === JSON.stringify(HallHub.progress().selected);
      return results;
    });
    assert.equal(checks.emberroot.max, Math.round(checks.emberroot.raw.max * 1.15));
    assert.equal(checks.moonbroth.maxmp, Math.round(checks.moonbroth.raw.mp * 1.15));
    assert.equal(checks.ironroast.str, Math.round(checks.ironroast.raw.str * 1.12));
    assert.equal(checks.sagepot.mag, Math.round(checks.sagepot.raw.mag * 1.12));
    assert.ok(checks.renewal.hp > checks.renewal.max - 10); assert.ok(checks.stillwater.mp > 0);
    assert.equal(checks.outOfStock, false); assert.equal(checks.mode, 'hallMap'); assert.equal(checks.barrier, true); assert.equal(checks.roundTrip, true);
    const practice = await page.evaluate(() => {
      mode = 'walk'; HallHub.openService('Seerin');
      const before = { gold: state.gold, inventory: JSON.stringify(state.inventory), stage: hallBattleProgress().unlockedStage, active: [...state.activeParty], xp: progressFor('Verseborn').xp };
      const started = HallHub.startSparring('Verseborn', 'Torren');
      const size = [battle.party.length, battle.enemies.length];
      const reward = "Torren's Sparring Seal";
      HallHub.finishSparring('victory');
      const first = gearCopyCount(reward);
      return { started, size, before, first, after: { gold: state.gold, inventory: JSON.stringify(state.inventory), stage: hallBattleProgress().unlockedStage, active: [...state.activeParty], xp: progressFor('Verseborn').xp } };
    });
    assert.equal(practice.started, true); assert.deepEqual(practice.size, [1, 1]); assert.deepEqual(practice.before, practice.after); assert.equal(practice.first, 1);
    await page.evaluate(() => completeBattleResult()); await page.waitForTimeout(350);
    const rematch = await page.evaluate(() => { HallHub.startSparring('Verseborn', 'Torren'); HallHub.finishSparring('victory'); return gearCopyCount("Torren's Sparring Seal"); });
    assert.equal(rematch, 1);
    await page.evaluate(() => completeBattleResult()); await page.waitForTimeout(350);
    const loot = await page.evaluate(() => { const gold = state.gold; const find = HallHub.scavenge(() => 0); return { gold: state.gold - gold, find, none: HallHub.scavenge(() => 1) }; });
    assert.ok(loot.gold > 0); assert.equal(loot.none, null);
    const combat = await page.evaluate(() => {
      const rawParty = [...state.activeParty], results = {};
      for (const id of state.party) {
        mode = 'hallMap'; HallHub.startSparring('Verseborn', id);
        const opponent = battle.enemies[0]; results[id] = { action: chooseEnemyAction(opponent).name, hp: opponent.max, stats: totals(id).max };
        battle.enemyResonance = 100; results[id].chargedAction = chooseEnemyAction(opponent).name;
        HallHub.finishSparring('defeat'); battle = null; mode = 'walk';
      }
      state.activeParty = rawParty; state.inventory['Hearthguard Plate'] = 2; state.inventory['Dulling Oil'] = 2;
      HallHub.select('meal', 'hearthplate'); HallHub.select('blessing', 'clarity'); HallHub.select('coating', 'dulling'); HallHub.openPreparation(1); HallHub.beginStage();
      const unit = battle.party[0], target = battle.enemies[0], skill = { name: 'Test spell', anim: 'magic', cost: 20, element: 'Arcane' };
      results.discount = skillMpCost(unit.id, skill, unit); results.defense = incomingDamageMultiplier(unit);
      const random = Math.random; Math.random = () => 0;
      const first = enemyDamageRoll(target, { kind: 'melee', scaling: 'str', coefficient: 1 }, unit).damage;
      applyWeaponBasicAttackEffect(unit, target);
      results.coating = statusValue(target, 'hubStrengthDown');
      results.reduced = enemyDamageRoll(target, { kind: 'melee', scaling: 'str', coefficient: 1 }, unit).damage < first;
      results.cleansed = Boolean(enemyCleanseOne(target)); Math.random = random;
      battle.ended = true; battle = null; mode = 'walk'; returnToHallAfterBattle();
      HallHub.select('blessing', 'mercy'); HallHub.select('meal', null); HallHub.select('coating', null); HallHub.openPreparation(1); HallHub.beginStage(); results.healing = healingReceived(battle.party[0], 100);
      battle.ended = true; battle = null; mode = 'walk'; returnToHallAfterBattle();
      const wares = vendorWares('torrenKitchen'), index = wares.findIndex(item => item.name === 'Moonbean Broth');
      state.inventorySlots = 100; openVendor('torrenKitchen'); const count = state.inventory['Moonbean Broth'] || 0; buyWare(index); results.bought = state.inventory['Moonbean Broth'] === count + 1; closeVendor();
      results.shopGear = vendorWares('marla').filter(item => item.kind === 'gear').every(item => gearByName(item.name).rarity === 'Common' && gearByName(item.name).effects.length === 0);
      return results;
    });
    for (const id of ['Verseborn', 'Torren', 'Mira', 'Kael', 'Glimmer', 'Seerin', 'Sparky']) { assert.ok(combat[id].action); assert.equal(combat[id].hp, combat[id].stats); }
    assert.equal(combat.discount, 18); assert.equal(combat.defense, .9); assert.equal(combat.coating, .12); assert.equal(combat.reduced, true); assert.equal(combat.cleansed, true); assert.equal(combat.healing, 115); assert.equal(combat.bought, true); assert.equal(combat.shopGear, true);
    await page.evaluate(() => HallHub.openService('Kael'));
    await page.screenshot({ path: path.join(output, 'sanctuary.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS title, recruitment gates, preparation UI desktop/mobile, independent selections, consumption, support stats, regen, barrier, fatal-hit protection, save round-trip, 1v1 sparring/rewards/rematches/resource restoration, scavenging; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
