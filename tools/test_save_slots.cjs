const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const prefix = fs.readFileSync(path.join(__dirname, 'test_combat.cjs'), 'utf8')
  .split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false}); sandbox.confirm=()=>true; sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', `${prefix}\nreturn {run};`)(require, __dirname);

let passed = 0;
function test(name, expression) {
  assert.ok(run(expression), name);
  passed++;
  console.log(`PASS ${name}`);
}

test('Existing save keys remain Save Slot 1 without data migration', `storySaveKey(1)===SAVE_KEY&&hallSaveKey(1)===HALL_SAVE_KEY&&hallSceneHistoryKey(1)===HALL_SCENE_HISTORY_KEY`);
test('Save Slot 2 uses independent Story, Hall and Scene Memory keys', `storySaveKey(2)!==SAVE_KEY&&hallSaveKey(2)!==HALL_SAVE_KEY&&hallSceneHistoryKey(2)!==HALL_SCENE_HISTORY_KEY&&new Set([storySaveKey(2),hallSaveKey(2),hallSceneHistoryKey(2)]).size===3`);

test('Current existing save appears intact in Slot 1 while Slot 2 starts empty', `(() => {
  localStorage.removeItem(storySaveKey(1)); localStorage.removeItem(storySaveKey(2));
  mode='walk'; activeSaveSlot=1; state.gameMode='story'; state.gold=111; state.flags={slotMarker:'original'};
  if(!saveGame()) return false;
  const raw=localStorage.getItem(SAVE_KEY);
  return Boolean(raw)&&JSON.parse(raw).state.flags.slotMarker==='original'&&saveSlotSummary(0,1).exists&&!saveSlotSummary(0,2).exists;
})()`);

test('Starting an empty Slot 2 does not remove or rewrite Slot 1', `(() => {
  const before=localStorage.getItem(storySaveKey(1));
  activeSaveSlot=2; runtimeAssetsReady=true; mode='title'; startTitleGame(false);
  return localStorage.getItem(storySaveKey(1))===before&&!localStorage.getItem(storySaveKey(2));
})()`);

test('Saving Slot 2 never overwrites Slot 1', `(() => {
  const slotOne=localStorage.getItem(storySaveKey(1));
  mode='walk'; activeSaveSlot=2; state.gameMode='story'; state.gold=222; state.flags={slotMarker:'two'};
  if(!saveGame()) return false;
  return localStorage.getItem(storySaveKey(1))===slotOne&&JSON.parse(localStorage.getItem(storySaveKey(2))).state.flags.slotMarker==='two';
})()`);

test('Saving Slot 1 never overwrites Slot 2', `(() => {
  const slotTwo=localStorage.getItem(storySaveKey(2));
  mode='walk'; activeSaveSlot=1; state.gameMode='story'; state.gold=333; state.flags={slotMarker:'one'};
  if(!saveGame()) return false;
  return localStorage.getItem(storySaveKey(2))===slotTwo&&JSON.parse(localStorage.getItem(storySaveKey(1))).state.flags.slotMarker==='one';
})()`);

test('Loading Slot 1 restores only Slot 1 data', `(() => {
  state.gold=0; state.flags={}; activeSaveSlot=1;
  return loadGame(storySaveKey())&&state.gold===333&&state.flags.slotMarker==='one';
})()`);

test('Loading Slot 2 restores only Slot 2 data', `(() => {
  state.gold=0; state.flags={}; activeSaveSlot=2;
  return loadGame(storySaveKey())&&state.gold===222&&state.flags.slotMarker==='two';
})()`);

test('Ember Hall saves and Scene Memories remain isolated by slot', `(() => {
  const hallOne=JSON.stringify({version:4,state:{gameMode:'hallBattles',hallBattles:{unlockedStage:50},party:['Verseborn'],heroProgress:{Verseborn:{level:40}}}});
  const hallTwo=JSON.stringify({version:4,state:{gameMode:'hallBattles',hallBattles:{unlockedStage:7},party:['Verseborn'],heroProgress:{Verseborn:{level:9}}}});
  localStorage.setItem(hallSaveKey(1),hallOne); localStorage.setItem(hallSaveKey(2),hallTwo);
  localStorage.setItem(hallSceneHistoryKey(1),JSON.stringify({seen:['slot-one']}));
  localStorage.setItem(hallSceneHistoryKey(2),JSON.stringify({seen:['slot-two']}));
  return saveSlotSummary(1,1).detail.includes('STAGE 50')&&saveSlotSummary(1,2).detail.includes('STAGE 7')&&localStorage.getItem(hallSceneHistoryKey(1)).includes('slot-one')&&localStorage.getItem(hallSceneHistoryKey(2)).includes('slot-two');
})()`);

test('Title flow selects a slot before showing New and Continue', `(() => {
  runtimeAssetsReady=true; titleMenuState='main'; titleMenuIndex=0; titleSubmenuIndex=0;
  openTitleSubmenu();
  const slotMenu=titleMenuState==='story'&&titleMenuEntriesForState()===saveSlotEntries;
  titleSubmenuIndex=1; activateTitleSelection();
  return slotMenu&&activeSaveSlot===2&&titleMenuState==='storyActions'&&titleMenuEntriesForState()===titleSubmenuEntries[0];
})()`);

console.log(`${passed} focused save-slot checks passed; no full regression run.`);
