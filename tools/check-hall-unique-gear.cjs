const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.goto(process.env.HALL_TEST_URL || 'http://127.0.0.1:8744/');
    await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
    const gate = await page.evaluate(() => {
      state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; state.party = ['Verseborn', 'Torren', 'Glimmer']; state.activeParty = [...state.party];
      const hero = progressFor('Verseborn'); hero.level = 40; hero.rank0 = rank0Choices.Verseborn[0].name; hero.talents = [talentTrees.Verseborn[0].name];
      mode = 'menu'; menuTab = 'skills'; selectedSkillHero = 'Verseborn'; renderMenu();
      const absent = !document.querySelector('[data-reset-talents]'); resetTalents('Verseborn'); const guarded = hero.talents.length === 1;
      state.party.push('Kael'); renderMenu(); const present = Boolean(document.querySelector('[data-reset-talents]'));
      const rank0 = hero.rank0; resetTalents('Verseborn');
      return { absent, guarded, present, cleared: hero.talents.length === 0, rank0: hero.rank0 === rank0 };
    });
    assert.deepEqual(gate, { absent: true, guarded: true, present: true, cleared: true, rank0: true });
    const unique = await page.evaluate(() => {
      state.gold = 999999; hallBattleProgress().artifactShopUnlocks = [51, 52];
      openVendor('workshop'); const wares = vendorWares('workshop'), index = wares.findIndex(ware => ware.artifactShop), ware = wares[index];
      buyWare(index); const gold = state.gold, refs = echoGearInstanceRefs(ware.name);
      buyWare(index); const blocked = state.gold === gold && echoGearInstanceRefs(ware.name).length === 1;
      const html = shopWareRowHtml(ware, index);
      delete gearInstances[refs[0]]; syncEchoForgeCopies(ware.name); buyWare(index);
      return { blocked, persisted: state.gold === gold && !echoGearInstanceRefs(ware.name).length, disabled: html.includes('disabled') && html.includes('Purchased'), stage: ware.hallStage };
    });
    assert.equal(unique.blocked, true); assert.equal(unique.persisted, true); assert.equal(unique.disabled, true);
    const cleanup = await page.evaluate(() => {
      const artifact = GLIMMER_ARTIFACT_CATALOG.find(entry => entry.stage === 52), name = artifact.gear.name;
      const refs = addOwnedGear(name, 3, { separateCopy: true, rarity: 'Artifact', rollAffixes: false, stats: { ...artifact.gear.stats }, affixes: [] });
      baseJobs.Verseborn.gear[artifact.gear.slot] = refs[0]; baseJobs.Torren.gear[artifact.gear.slot] = refs[1];
      const spare = 'Hall Ironblade'; addOwnedGear(spare, 3, { rarity: 'Common', rollAffixes: false });
      delete hallBattleProgress().equippedOnlyCleanup;
      const equipment = JSON.stringify(Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, hero.gear]))), instance = JSON.stringify(gearInstances[refs[0]]), gold = state.gold;
      const migrated = migrateHallEquippedOnlyV1();
      const retained = echoGearInstanceRefs(name);
      const onlyEquipped = state.ownedGear.every(name => Object.values(baseJobs).some(hero => Object.values(hero.gear).some(ref => gearBaseName(ref) === name)));
      const key = hallSaveKey(1); mode = 'walk'; saveGame(key);
      addOwnedGear(spare, 1, { rarity: 'Common', rollAffixes: false }); saveGame(key); loadGame(key);
      return { migrated, equipment: equipment === JSON.stringify(Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, hero.gear]))), instance: instance === JSON.stringify(gearInstances[refs[0]]), beforeInstance: JSON.parse(instance), afterInstance: gearInstances[refs[0]], kept: retained, expected: refs.slice(0, 2), removed: !gearInstances[refs[2]], onlyEquipped, gold: state.gold === gold, laterLoot: state.ownedGear.includes(spare), history: hallBattleProgress().purchasedArtifactStages.includes(52) };
    });
    assert.equal(cleanup.migrated, true); assert.equal(cleanup.equipment, true); assert.equal(cleanup.instance, true, JSON.stringify(cleanup));
    assert.deepEqual(cleanup.kept, cleanup.expected); assert.equal(cleanup.removed, true); assert.equal(cleanup.onlyEquipped, true); assert.equal(cleanup.gold, true); assert.equal(cleanup.laterLoot, true); assert.equal(cleanup.history, true);
    const support = await page.evaluate(() => {
      state.party = ['Verseborn', 'Torren', 'Mira', 'Kael']; state.activeParty = ['Mira', 'Torren', 'Kael'];
      state.inventory['Emberroot Stew'] = 2; state.inventory['Nightshade Oil'] = 2;
      HallHub.select('meal', 'emberroot'); HallHub.select('coating', 'nightshade'); HallHub.select('blessing', 'clarity');
      const raw = totals('Mira').max; HallHub.openPreparation(1); HallHub.beginStage();
      const unit = battle.party.find(unit => unit.id === 'Mira'), cost = skillMpCost('Mira', { name: 'Test', anim: 'magic', cost: 20 }, unit);
      const realCount = unit.statuses.length; drawBattleStatusBadges(unit, 100, 100); const presented = statusHoverAreas.at(-1).unit;
      return { raw, max: unit.max, cost, tooltip: statusTooltipHtml(presented), chips: statusBadgesHtml(unit), realCount, after: unit.statuses.length };
    });
    assert.equal(support.max, Math.round(support.raw * 1.15)); assert.equal(support.cost, 18); assert.equal(support.after, support.realCount);
    for (const name of ['Emberroot Stew', 'Nightshade Oil', 'Blessing of Clarity']) assert.ok(support.tooltip.includes(name));
    for (const name of ['Torren Meal', 'Mira Coating', 'Kael Blessing']) assert.ok(support.chips.includes(name));
    const output = path.resolve(__dirname, '../../../previews/emberhall-hub-qa'); fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'support-visible-in-battle.png') });
    assert.deepEqual(errors, []);
    console.log('PASS Kael reset gating/Rank 0 preservation, unique Artifact purchases/history, equipped-only one-time cleanup preserving every equipped roll and later loot, visible support and real combat effects.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
