const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, '.analysis-battle', 'party-v2', 'battle-v3');
const BASE = 'http://127.0.0.1:4182/game/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HEROES = ['Verseborn', 'Mira', 'Seerin', 'Torren', 'Glimmer', 'Kael', 'Sparky'];

fs.mkdirSync(OUTPUT, { recursive: true });

async function ready(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#battle:not(.hidden)').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
}

async function captureGame(page, filename) {
  const game = page.locator('.game');
  await game.screenshot({ path: path.join(OUTPUT, filename) });
  return await game.boundingBox();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  const captures = {};
  for (const hero of HEROES) {
    await ready(page, `${BASE}?qa=flamesolo&hero=${encodeURIComponent(hero)}`);
    captures[`solo-${hero.toLowerCase()}`] = await captureGame(page, `solo-${hero.toLowerCase()}.png`);
  }

  await ready(page, `${BASE}?qa=flame1`);
  captures['party-verseborn-sparky-glimmer'] = await captureGame(page, 'party-verseborn-sparky-glimmer.png');
  await ready(page, `${BASE}?qa=flame2`);
  captures['party-kael-torren-seerin'] = await captureGame(page, 'party-kael-torren-seerin.png');

  for (const [hero, skillText, slug] of [
    ['Kael', 'Shadowpriest', 'kael-shadow'],
    ['Glimmer', 'Mech Form', 'glimmer-mech'],
  ]) {
    await ready(page, `${BASE}?qa=flamesolo&hero=${encodeURIComponent(hero)}`);
    const transformButton = page.locator('#actions button').filter({ hasText: skillText }).first();
    if (!await transformButton.isVisible()) throw new Error(`${hero} transformation button is unavailable`);
    await transformButton.click();
    await page.waitForTimeout(180);
    captures[`${slug}-transition`] = await captureGame(page, `${slug}-transition.png`);
    await page.waitForTimeout(850);
    captures[`${slug}-active`] = await captureGame(page, `${slug}-active.png`);
  }

  fs.writeFileSync(
    path.join(OUTPUT, 'capture-report.json'),
    JSON.stringify({ captures, consoleErrors }, null, 2) + '\n',
  );
  await browser.close();
  if (consoleErrors.length) {
    console.error(JSON.stringify(consoleErrors, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Captured ${Object.keys(captures).length} clean battle previews.`);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
