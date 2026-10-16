const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve(__dirname, '../../../outputs/melee-advance-224');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4196/?qa=hallstage&stage=8');
    await page.waitForFunction('runtimeAssetsReady', null, { timeout: 120000 });
    await page.evaluate(() => {
      runCurrentTurn = () => {};
      window.qaNow = performance.now();
      Object.defineProperty(performance, 'now', { value: () => window.qaNow });
    });
    const results = await page.evaluate(() => {
      const results = [];
      for (const id of ['Verseborn','Torren','Glimmer','Sparky','Mira','Kael','Seerin','Tinus']) {
        const unit = battleUnit(id);
        battle.party = [unit];battle.resolving = true;
        const foe = battle.enemies[0];
        const home = partyBattlePosition(0, 1);
        unit.anim = 'melee';
        effect = makeBattleEffect(unit, { anim:'melee', power:1, basicAttack:true }, foe);
        const start = effect.startedAt, timing = effect.timing;
        const samples = [0,250,timing.impactMs,1000,timing.totalMs-1].map(ms => partyMeleeMotion(unit,start+ms));
        results.push({ id, home, samples, target:enemyBattlePosition(0,battle.enemies.length), ended:partyMeleeMotion(unit,start+timing.totalMs) });
        if (makeBattleEffect(unit,{anim:'magic',power:1},foe).meleeMotion) throw Error('Magic moved');
        if (makeBattleEffect(unit,{anim:'melee',power:-1,targetSide:'self'},unit).meleeMotion) throw Error('Healing moved');
      }
      return results;
    });
    for (const { id, home, samples, target, ended } of results) {
      assert.equal(samples[0].x, home[0], id+' starts at home');
      assert.equal(samples[0].y, home[1]);
      assert.equal(samples[2].x, target[0]-28, id+' reaches weapon range');
      assert.equal(samples[2].y, target[1]);
      assert.ok(Math.abs(samples[4].x-home[0])<.01, id+' returns home');
      assert.equal(ended,null);
      if(id==='Seerin') assert.ok(samples[3].rotation < -1 && samples[3].y < samples[3].groundY);
      if(id==='Glimmer') assert.ok(samples[1].jet && samples[3].jet && samples[3].returning);
    }
    for (const id of ['Seerin','Glimmer']) {
      await page.evaluate(id => {
        const unit=battleUnit(id);battle.party=[unit];unit.anim='melee';battle.resolving=true;
        effect=makeBattleEffect(unit,{anim:'melee',power:1,basicAttack:true},battle.enemies[0]);
        window.qaStart=effect.startedAt;
      }, id);
      for (const ms of [0,250,650,1000,1349]) {
        await page.evaluate(ms=>{window.qaNow=window.qaStart+ms;drawBattleScene();},ms);
        await page.screenshot({path:path.join(output,id+'-'+ms+'.png')});
      }
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({characters:results.length,phases:5,errors,output}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
