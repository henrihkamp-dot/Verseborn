const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const output = path.resolve(__dirname, '../.analysis-battle/enemies-v2/qa');
const base = 'http://127.0.0.1:4183/game/';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  const missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() === 404) missing.push(response.url()); });
  try {
    for (const stage of (process.argv.includes('--mobile-only') ? [] : [49, 50])) {
      await page.goto(`${base}?qa=hallstage&stage=${stage}`, { waitUntil: 'networkidle' });
      await page.locator('#battle:not(.hidden)').waitFor();
      await page.waitForTimeout(1000);
      const count = stage === 50 ? 4 : 3;
      for (let phase = 1; phase <= count; phase++) {
        const state = await page.evaluate(() => ({
          name: battle.name,
          enemies: battle.enemies.map(unit => unit.name),
          alive: battle.party.map(unit => [unit.hp, unit.mp]),
          waves: battle.waves.length,
          stage: battle.hallStage
        }));
        assert.equal(state.stage, stage);
        assert.equal(state.waves, count - phase);
        await page.locator('.game').screenshot({ path: path.join(output, `stage-${stage}-phase-${phase}.png`) });
        console.log(`${stage}.${phase}: ${state.enemies.join(', ')} / HP-MP ${JSON.stringify(state.alive)}`);
        if (phase < count) {
          await page.evaluate(() => {
            battle.enemies.forEach(unit => { unit.hp = 0; });
            winBattle('Phase cleared.');
          });
          await page.waitForFunction(() => battle.phaseTransition?.step === 'fallen');
          if (stage === 50 && phase === 1) {
            await page.waitForTimeout(650);
            await page.locator('.game').screenshot({ path: path.join(output, 'stage-50-frostmile-fallen.png') });
          }
          await page.waitForFunction(() => battle.phaseTransition?.step === 'incoming');
          if (stage === 50 && phase === 1) await page.locator('.game').screenshot({ path: path.join(output, 'stage-50-phase-transition.png') });
          await page.waitForFunction(() => !battle.phaseTransition && battle.enemies.some(unit => unit.hp > 0));
          await page.waitForTimeout(150);
        }
      }
    }
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    phone.on('pageerror', error => errors.push(error.message));
    phone.on('response', response => { if (response.status() === 404) missing.push(response.url()); });
    await phone.goto(`${base}?qa=hallstage&stage=50`, { waitUntil: 'networkidle' });
    await phone.locator('#battle:not(.hidden)').waitFor();
    await phone.waitForTimeout(500);
    await phone.locator('.game').screenshot({ path: path.join(output, 'stage-50-phone-frostmile.png') });
    for (let phase = 1; phase < 4; phase++) {
      await phone.evaluate(() => {
        battle.enemies.forEach(unit => { unit.hp = 0; });
        winBattle('Phase cleared.');
      });
      await phone.waitForFunction(() => !battle.phaseTransition && battle.enemies.some(unit => unit.hp > 0));
    }
    await phone.locator('.game').screenshot({ path: path.join(output, 'stage-50-phone-solinar-enraged.png') });
    for (const [width, height] of [[390, 844], [375, 667]]) {
      await phone.setViewportSize({ width, height });
      await phone.waitForTimeout(150);
      const canvas = await phone.locator('#screen').boundingBox();
      const commands = await phone.locator('#battle').boundingBox();
      console.log(await phone.evaluate(() => ({ html: document.documentElement.className, mode: document.body.dataset.playMode, finale: document.getElementById('battle').dataset.hallFinale, shellPadding: getComputedStyle(document.querySelector('.shell')).paddingTop, shellPlace: getComputedStyle(document.querySelector('.shell')).placeItems })));
      console.log(`Phone ${width}x${height}: canvas ${canvas.y.toFixed(0)}-${(canvas.y + canvas.height).toFixed(0)}, commands ${commands.y.toFixed(0)}-${(commands.y + commands.height).toFixed(0)}`);
      assert.ok(commands.y >= canvas.y + canvas.height - 1, 'The finale command panel must sit below the whole canvas');
      assert.ok(commands.y + commands.height <= height + 1, 'The finale command panel must fit the phone viewport');
      await phone.screenshot({ path: path.join(output, `stage-50-phone-${width}x${height}.png`) });
    }
    await phone.close();
    await page.goto(`${base}?qa=result-down`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.locator('.game').screenshot({ path: path.join(output, 'flameguard-death.png') });
    assert.deepEqual(missing.filter(url => !url.endsWith('/favicon.ico')), []);
    assert.deepEqual(errors.filter(message => !message.includes('404 (File not found)')), []);
    console.log('Hall browser captures passed without missing game assets or page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
