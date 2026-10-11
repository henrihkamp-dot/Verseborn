const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const affected = new Set(['statusOnHit', 'statusResistance', 'allStatusResistance', 'poisonReduction', 'statusSeverityReduction', 'statusDurationReduction', 'specificDurationReduction', 'statusDuration', 'statusChance', 'buffDuration', 'firstControlDurationReduction']);
const files = fs.readdirSync('C:/Users/Henri/Downloads').filter(name => /^verseborn-ember-hall-slot.*\.json$/.test(name));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const file of files) {
      const pathname = path.join('C:/Users/Henri/Downloads', file), raw = fs.readFileSync(pathname, 'utf8'), original = JSON.parse(raw), page = await browser.newPage();
      await page.goto(process.env.HALL_TEST_URL || 'http://127.0.0.1:8744/'); await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
      const saved = await page.evaluate(raw => {
        const key = hallSaveKey(1); localStorage.setItem(key, raw); if (!loadGame(key)) throw Error('Load failed');
        const first = JSON.parse(localStorage.getItem(key)); loadGame(key); const second = JSON.parse(localStorage.getItem(key));
        return { first, second, owned: [...state.ownedGear], copies: { ...state.gearCopies }, equipped: Object.fromEntries(Object.entries(baseJobs).map(([id, hero]) => [id, hero.gear])) };
      }, raw);
      assert.deepEqual(saved.owned, original.state.ownedGear, file + ': gear deleted');
      assert.deepEqual(saved.copies, original.state.gearCopies, file + ': copies changed');
      assert.deepEqual(saved.first, saved.second, file + ': repeated migration changed data');
      assert.equal(saved.first.state.gold, original.state.gold); assert.deepEqual(saved.first.state.party, original.state.party);
      assert.equal(saved.first.state.hallBattles.unlockedStage, original.state.hallBattles.unlockedStage);
      for (const [id, hero] of Object.entries(original.heroes)) assert.deepEqual(saved.equipped[id], hero.gear, file + ': equipped links changed');
      for (const [id, instance] of Object.entries(original.state.gearInstances || {})) {
        const migrated = saved.first.state.gearInstances[id]; assert.ok(migrated, file + ': instance removed');
        assert.equal(migrated.rarity, instance.rarity); assert.equal(migrated.name, instance.name); assert.deepEqual(migrated.stats, instance.stats);
        for (const entry of instance.affixes || []) if (!affected.has(entry.type)) assert.deepEqual(migrated.affixes.find(candidate => candidate.key === entry.key), entry, file + ': unrelated affix changed');
      }
      for (const [ref, entries] of Object.entries(original.state.gearAffixes || {})) for (const entry of entries) if (!affected.has(entry.type)) assert.deepEqual(saved.first.state.gearAffixes[ref].find(candidate => candidate.key === entry.key), entry);
      assert.equal(fs.readFileSync(pathname, 'utf8'), raw); await page.close(); console.log('PASS ' + file + ': every item/copy/equipped link, rarity, base stat and unrelated affix preserved; migration idempotent.');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
