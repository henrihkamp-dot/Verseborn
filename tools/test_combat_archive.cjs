const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
for (let stage = 1; stage <= 60; stage++) {
  assert.ok(run(`(()=>{lexiconStage=${stage};const html=hallLexiconHtml();const info=hallBattleInfo(${stage});return html.includes(archiveEscape(info.name))&&[info.enemies,...info.waves].flat().every(key=>html.includes(archiveEscape(HALL_ENEMY_LIBRARY[key].name)))&&html.includes('archive-stats');})()`), `Stage ${stage}`);
}
assert.ok(run(`combatReferenceHtml().includes('6% maximum MP') && combatReferenceHtml().includes('Role Icons')`));
assert.equal(run(`archiveEscape('<script>')`), '&lt;script&gt;');
console.log('PASS all 60 lexicon stages, enemy stats, combat reference and escaping');
