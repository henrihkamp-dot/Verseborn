const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8744/');
    await page.waitForFunction(() => runtimeAssetsReady && emberHallWorld.ready);
    const ids = await page.evaluate(() => {
      state.gameMode = 'hallBattles'; state.map = 'emberHallBattles';
      state.party = Object.keys(baseJobs); state.activeParty = state.party.slice(0, 3);
      saveRecruitSceneHistory(emptyRecruitSceneHistory());
      mode = 'walk'; menuTab = 'lore'; toggleMenu();
      return [...document.querySelectorAll('[data-play-arrival-scene]')].map(b => b.dataset.playArrivalScene);
    });
    for (const id of ids) {
      await page.locator(`[data-play-arrival-scene="${id}"]`).click();
      assert.equal(await page.evaluate(() => activeRecruitScene?.id), id);
      await page.evaluate(() => { completeRecruitScene(); menuTab = 'lore'; toggleMenu(); });
      await page.locator(`[data-replay-scene="${id}"]`).click();
      assert.equal(await page.evaluate(() => activeRecruitScene?.replay), true);
      assert.equal(await page.evaluate(() => activeRecruitScene?.id), id);
      await page.evaluate(() => { completeRecruitScene(); menuTab = 'lore'; toggleMenu(); });
    }
    console.log(`PASS: ${ids.length} arrival buttons and their replay buttons`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
