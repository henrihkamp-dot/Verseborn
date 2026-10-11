const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.HALL_TEST_URL || 'http://127.0.0.1:8744/');
    await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
    await page.evaluate(() => {
      state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; state.party = Object.keys(baseJobs);
      activeRecruitScene = null; mode = 'walk'; el.menu.classList.add('hidden');
      window.diagonalCalls = [];
      const original = ctx.drawImage;
      ctx.drawImage = function(image, ...args) {
        if (image === emberHallWorld.images.VersebornWalk) diagonalCalls.push(args);
        return original.call(this, image, ...args);
      };
    });
    for (const [horizontal, vertical, direction] of [['ArrowRight','ArrowDown',4],['ArrowLeft','ArrowDown',5],['ArrowRight','ArrowUp',6],['ArrowLeft','ArrowUp',7]]) {
      await page.evaluate(() => { Object.assign(emberHallWorld.player, { x: 320, y: 260, phase: 0 }); diagonalCalls.length = 0; });
      await page.keyboard.down(horizontal); await page.keyboard.down(vertical);
      await page.waitForTimeout(400);
      const state = await page.evaluate(() => ({ facing: emberHallWorld.player.facing, collision: emberHallWorld.collision(emberHallWorld.player.x, emberHallWorld.player.y), rows: diagonalCalls.map(a => a[1]), frames: diagonalCalls.map(a => a[0]) }));
      await page.keyboard.up(horizontal); await page.keyboard.up(vertical);
      assert.equal(state.facing, direction); assert.equal(state.collision, false);
      assert.ok(state.rows.includes((direction < 6 ? 3 : 4) * 128));
      assert.ok(new Set(state.frames).size > 1);
      await page.screenshot({ path: path.resolve(`../../previews/verseborn-diagonal-${direction}.png`) });
    }
    await page.evaluate(() => { Object.assign(emberHallWorld.player, { x: 300, y: 260 }); emberHallWorld.navigate(340, 300); });
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => emberHallWorld.player.facing), 4);
    assert.equal(await page.evaluate(() => emberHallWorld.collision(emberHallWorld.player.x, emberHallWorld.player.y)), false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.resolve('../../previews/verseborn-diagonal-mobile.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: all four diagonal keyboard directions, click-to-walk, animated frames, collision safety, desktop/mobile rendering');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
