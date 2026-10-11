const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve(__dirname, '../../../previews/sw-walk/game-qa');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.HALL_TEST_URL || process.argv[2] || 'http://127.0.0.1:8744/');
    await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
    assert.equal(await page.evaluate(() => mode), 'title');
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await page.evaluate(() => {
      state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; state.party = Object.keys(baseJobs);
      activeRecruitScene = null; mode = 'walk'; el.menu.classList.add('hidden');
      window.walkCalls = [];
      const original = ctx.drawImage;
      ctx.drawImage = function(image, ...args) {
        if (image === emberHallWorld.images.VersebornWalk) {
          walkCalls.push({ frame: args[0] / 128, row: args[1] / 128, width: args[2], height: args[3], flip: this.getTransform().a < 0, moving: emberHallWorld.player.walking });
          if (walkCalls.length > 5000) walkCalls.shift();
        }
        return original.call(this, image, ...args);
      };
    });
    const cases = [
      ['down', ['ArrowDown'], 0, 0, false, 320, 250],
      ['up', ['ArrowUp'], 1, 1, false, 320, 300],
      ['left', ['ArrowLeft'], 3, 2, false, 340, 260],
      ['right', ['ArrowRight'], 2, 2, true, 290, 260],
      ['southwest', ['ArrowLeft', 'ArrowDown'], 5, 3, false, 320, 270],
      ['southeast', ['ArrowRight', 'ArrowDown'], 4, 3, true, 320, 270],
      ['northwest', ['ArrowLeft', 'ArrowUp'], 7, 4, false, 320, 270],
      ['northeast', ['ArrowRight', 'ArrowUp'], 6, 4, true, 320, 270]
    ];
    for (const [name, keys, facing, row, flip, x, y] of cases) {
      await page.evaluate(({ x, y }) => { Object.assign(emberHallWorld.player, { x, y, phase: 0 }); walkCalls.length = 0; }, { x, y });
      for (const key of keys) await page.keyboard.down(key);
      // Two key events can straddle a rendered frame; begin sampling once both are held.
      await page.evaluate(() => { emberHallWorld.player.phase = 0; walkCalls.length = 0; });
      await page.waitForTimeout(1250);
      const result = await page.evaluate(() => ({ ...emberHallWorld.player, calls: walkCalls.filter(call => call.moving), blocked: emberHallWorld.collision(emberHallWorld.player.x, emberHallWorld.player.y) }));
      assert.equal(result.facing, facing, name); assert.equal(result.blocked, false, name);
      assert.deepEqual([...new Set(result.calls.map(call => call.frame))].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7], `${name}: complete cycle`);
      assert.ok(result.calls.every(call => call.row === row && call.flip === flip && call.width === 128 && call.height === 128), `${name}: wrong crop/mirror`);
      assert.ok(result.phase >= 8 && result.phase < 11, `${name}: movement-linked cadence`);
      await page.screenshot({ path: path.join(output, `${name}-walking.png`) });
      for (const key of keys) await page.keyboard.up(key);
      await page.waitForTimeout(80);
      const stopped = await page.evaluate(() => ({ moving: emberHallWorld.player.walking, phase: emberHallWorld.player.phase, call: walkCalls.at(-1) }));
      assert.equal(stopped.moving, false); assert.equal(stopped.call.frame, 8, `${name}: neutral idle`);
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(() => emberHallWorld.player.phase), stopped.phase, 'Idle must not advance gait');
      await page.screenshot({ path: path.join(output, `${name}-idle.png`) });
    }
    await page.evaluate(() => { Object.assign(emberHallWorld.player, { x: 300, y: 260, phase: 2.5 }); emberHallWorld.navigate(340, 300); });
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => emberHallWorld.player.facing), 4);
    await page.waitForFunction(() => !emberHallWorld.target && !emberHallWorld.player.walking);
    assert.equal(await page.evaluate(() => walkCalls.at(-1).frame), 8);
    await page.evaluate(() => { Object.assign(emberHallWorld.player, { x: 410, y: 260, phase: 3 }); });
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250);
    const wall = await page.evaluate(() => ({ ...emberHallWorld.player, frame: walkCalls.at(-1).frame }));
    assert.equal(wall.walking, false); assert.equal(wall.frame, 8);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => emberHallWorld.player.phase), wall.phase, 'Blocked feet must not keep walking');
    await page.keyboard.up('ArrowRight');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { Object.assign(emberHallWorld.player, { x: 320, y: 300 }); });
    await page.screenshot({ path: path.join(output, 'mobile.png') });
    const colors = await page.evaluate(() => {
      const data = ctx.getImageData(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT).data, colors = new Set();
      for (let i = 0; i < data.length; i += 40) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      return colors.size;
    });
    assert.ok(colors > 100, 'Canvas must contain rendered scene pixels');
    assert.deepEqual(errors, []);
    console.log('PASS: 8 directions, all 8 walk frames, correct crops/mirroring, distance cadence, idle/blocked poses, click path, desktop/mobile canvas, title entry, no browser errors.');
    console.log('These checks verify playback, not anatomy. Inspect the contact sheet and animated captures separately.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
