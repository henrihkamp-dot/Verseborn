const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.HALL_TEST_URL || 'http://127.0.0.1:8744/');
    await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
    const result = await page.evaluate(() => {
      state.gameMode = 'hallBattles'; state.map = 'emberHallBattles'; state.party = Object.keys(baseJobs);
      state.activeParty = state.party.slice(0, 3);
      const scene = RECRUIT_SCENES.find(s => s.recruit === 'Torren');
      playRecruitScene(scene, { replay: true });
      const actor = activeRecruitScene.actors.find(a => a.id === 'Verseborn');
      applyRecruitSceneAction({ actor: 'Verseborn', anim: 'magic', motion: 'flourish', duration: 66 });
      const hallDuration = actor.actionUntil - actor.actionStarted;
      state.gameMode = 'story';
      applyRecruitSceneAction({ actor: 'Verseborn', anim: 'magic', motion: 'flourish', duration: 66 });
      const storyDuration = actor.actionUntil - actor.actionStarted;
      state.gameMode = 'hallBattles';
      actor.anim = 'magic'; actor.motion = 'flourish'; actor.actionStarted = tick; actor.actionUntil = tick + 160;
      const calls = [], original = ctx.drawImage;
      ctx.drawImage = function(image, ...args) {
        if (image === emberHallWorld.images.VersebornLute) calls.push(args);
        return original.call(this, image, ...args);
      };
      const start = tick;
      try {
        for (let i = 0; i < 16; i++) { tick = start + i * 10; drawRecruitScene(); }
      } finally { tick = start; ctx.drawImage = original; }
      const pose = recruitScenePoseAt(actor, .5, true);
      return { calls, hallDuration, storyDuration, pose: [pose.x, pose.y], dimensions: [emberHallWorld.images.VersebornLute.width, emberHallWorld.images.VersebornLute.height] };
    });
    assert.deepEqual(result.dimensions, [400, 400]);
    assert.equal(result.hallDuration, 132);
    assert.equal(result.storyDuration, 66);
    assert.equal(result.calls.length, 16);
    assert.equal(new Set(result.calls.map(a => `${a[0]},${a[1]}`)).size, 16);
    assert.equal(new Set(result.calls.map(a => a.slice(4).join(','))).size, 1, 'Actor must stay anchored and retain scale');
    assert.deepEqual(result.pose, [0, 0]);
    await page.evaluate(() => {
      const actor = activeRecruitScene.actors.find(a => a.id === 'Verseborn');
      actor.actionStarted = tick - 70; actor.actionUntil = tick + 90;
      drawRecruitScene();
    });
    await page.screenshot({ path: path.resolve('../../previews/verseborn-lute-in-hall.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: all 16 lute frames, fixed position and scale, no scene errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
