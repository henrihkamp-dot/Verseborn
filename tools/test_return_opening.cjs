const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
assert.ok(run(`(() => {
  const originalSave = saveGame, originalNotice = showHudNotice;
  const originalMode = mode;
  let saved = false, reloaded = false, warned = false;
  window.location = {reload(){if(!saved)throw Error('Reload before save');reloaded=true;}};
  saveGame = () => {saved=true;return true;};
  showHudNotice = () => {warned=true;};
  mode='menu';
  const success=returnToOpeningScreen() && reloaded;
  saved=false;reloaded=false;
  saveGame=()=>false;
  const failure=!returnToOpeningScreen() && !reloaded && warned;
  mode='battle';
  const blocked=!returnToOpeningScreen() && !reloaded;
  saveGame=originalSave;showHudNotice=originalNotice;mode=originalMode;
  return success && failure && blocked;
})()`));
console.log('PASS opening screen: save before reload, save failure protection, combat blocked');
