const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve(__dirname, '../../../previews/status-system-qa'); fs.mkdirSync(output, { recursive: true });
const files = ['verseborn-battle-20261011213722312.txt', 'verseborn-battle-20261011215247583.txt', 'verseborn-battle-20261011215610150.txt'];
function parse(file) {
  const raw = fs.readFileSync(path.join('C:/Users/Henri/Downloads', file), 'utf8'), heroes = [];
  let hero = null, gear = null;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#1 |')) break;
    let match = line.match(/^(\w+) \| Level (\d+)$/);
    if (match) { hero = { id: match[1], level: Number(match[2]), gear: [] }; heroes.push(hero); gear = null; continue; }
    match = line.match(/^  (WEAPON|ARMOUR|RING|NECKLACE|HELMET): (.+?) \| (\w+)$/);
    if (match && hero) { gear = { slot: match[1].toLowerCase(), name: match[2].replace(/ #\d+$/, ''), rarity: match[3], affixes: [] }; hero.gear.push(gear); continue; }
    match = line.match(/^    Base stats: (\{.+\})$/); if (match && gear) gear.stats = JSON.parse(match[1]);
    match = line.match(/^    Affix: ([^:]+): (.+)$/); if (match && gear) gear.affixes.push({ label: match[1], description: match[2] });
  }
  return { file, raw, stage: Number(raw.match(/^Hall (\d+)\//)[1]), heroes, resistedBefore: (raw.match(/RESISTED/g) || []).length };
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true }), reports = [];
  try {
    for (const file of files) {
      const snapshot = parse(file), page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
      page.on('pageerror', error => errors.push(error.stack));
      await page.goto(process.env.HALL_TEST_URL || 'http://127.0.0.1:8744/'); await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
      await page.evaluate(snapshot => {
        state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; mode = 'walk';
        state.party = ['Verseborn', ...HALL_RECRUITS]; state.activeParty = snapshot.heroes.map(hero => hero.id);
        state.flags.hallBaseStatsV1 = true; state.gold = 100000;
        for (const hero of snapshot.heroes) {
          const progress = progressFor(hero.id); progress.level = hero.level; progress.talents = [];
          for (const gear of hero.gear) {
            const base = gearByName(gear.name); if (!base) throw Error('Unknown logged gear: ' + gear.name);
            const entries = gear.affixes.map(saved => {
              const canonical = Object.values(affixPools).flat().find(entry => entry.label === saved.label);
              if (!canonical) throw Error('Unknown logged affix: ' + saved.label);
              const match = saved.description.match(/([\d.]+)(%?)/), value = match ? Number(match[1]) / (match[2] ? 100 : 1) : canonical.min;
              const entry = { ...canonical, value }; delete entry.statusRulesVersion;
              if (['statusOnHit', 'statusResistance', 'allStatusResistance', 'statusSeverityReduction'].includes(entry.type)) { delete entry.min; delete entry.max; }
              if (entry.key === 'poisonward') entry.type = 'poisonReduction';
              return entry;
            });
            const ref = addOwnedGear(gear.name, 1, { separateCopy: true, rarity: gear.rarity, stats: gear.stats, affixes: entries })[0];
            baseJobs[hero.id].gear[gear.slot] = ref;
          }
        }
        StatusSystem.migrateOwned(); hallBattleProgress().unlockedStage = 60; hallBattleProgress().pendingRecruit = null;
        state.inventory['Stillwater Soup'] = 2; state.inventory['Razorleaf Wax'] = 2;
        HallHub.select('meal', 'stillwater'); HallHub.select('coating', 'razorwax'); HallHub.select('blessing', 'clarity');
        resolveEnemyTurn = () => {}; finishTurn = () => { if (battle) battle.resolving = false; };
        HallHub.openPreparation(snapshot.stage); HallHub.beginStage();
        const unit = battle.party.find(unit => unit.id === 'Glimmer'); unit.form = 'mech'; unit.formTurns = 4; unit.mp = unit.maxmp;
        battle.enemies.forEach(enemy => { enemy.hp = enemy.max = 100000; enemy.baseEvasion = 0; });
        battle.turnQueue = [{ side: 'party', id: unit.id, name: unit.name, agi: 100 }]; battle.turnIndex = 0; battle.resolving = false;
        Math.random = () => .25;
        useSkill(unit, TRANSFORMED_SKILLS.mech.find(skill => skill.name === 'Arc Reactor Burst'), battle.enemies[0]);
      }, { stage: snapshot.stage, heroes: snapshot.heroes });
      await page.waitForFunction(() => battle?.actionHistory?.some(action => action.message.includes('uses Arc Reactor Burst')));
      const result = await page.evaluate(() => {
        const entry = battle.actionHistory.find(action => action.message.includes('uses Arc Reactor Burst'));
        const unique = (entry.statusResults || []).every(target => {
          const keys = target.results.map(result => result.origin + ':' + result.type); return keys.length === new Set(keys).size;
        });
        return { message: entry.message, statusResults: entry.statusResults, unique, profiles: battle.enemies.map(unit => ({ name: unit.name, profile: StatusSystem.enemyProfile(unit) })) };
      });
      assert.equal(result.unique, true); assert.ok(result.statusResults?.length); assert.ok(result.statusResults.some(target => target.results.some(entry => entry.origin === 'ability' && entry.type === 'defenseDown')));
      assert.ok(!result.message.includes('RESISTED /')); assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, 'hall-' + snapshot.stage + '-status-replay.png') });
      reports.push({ file, stage: snapshot.stage, originalResistedCount: snapshot.resistedBefore, ...result });
      assert.equal(fs.readFileSync(path.join('C:/Users/Henri/Downloads', file), 'utf8'), snapshot.raw, 'Original battle log changed');
      await page.close(); console.log('PASS Hall ' + snapshot.stage + ': logged gear reconstructed; actual AoE has unique gear/native attempts and compact per-enemy results.');
    }
    fs.writeFileSync(path.join(output, 'hall-log-replays.json'), JSON.stringify(reports, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
