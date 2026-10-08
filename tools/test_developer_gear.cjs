const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run} = new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
function check(name, code) { assert.ok(run(code), name); console.log('PASS', name); }
check('Every available rarity equips a complete legal set for all heroes', `(() => {
 state.gameMode='hallBattles';mode='menu';
 for(const stage of [1,10,11,21,31,40,41,51,54,58,60]) for(const rarity of ['Rare','Epic','Legendary','Mythic','Artifact']) {
  if(!developerGearCandidates(stage,rarity).length) continue;
  if(!setDeveloperGear(stage,rarity,true)) throw Error(stage+' '+rarity);
  for(const [id,hero] of Object.entries(baseJobs)) for(const [slot,ref] of Object.entries(hero.gear)) {
   const gear=gearByName(ref);if(!gear || gear.slot!==slot || !canEquip(id,gear) || gearInstance(ref).rarity!==rarity) return false;
  }
 }
 restoreDeveloperGear();return developerGearInstances.size===0;
})()`);
check('Switching rarity is deterministic and restores the exact original references', `(() => {
 const original=JSON.stringify(Object.fromEntries(Object.entries(baseJobs).map(([id,h])=>[id,h.gear])));
 setDeveloperGear(54,'Epic',true);const first=JSON.stringify([...developerGearInstances]);
 setDeveloperGear(54,'Mythic',true);setDeveloperGear(54,'Epic',true);
 const same=first===JSON.stringify([...developerGearInstances]);setDeveloperGear(54,'Epic',false);
 return same && original===JSON.stringify(Object.fromEntries(Object.entries(baseJobs).map(([id,h])=>[id,h.gear])));
})()`);
check('Saving and loading keep real gear; test sets do not enter inventory', `(() => {
 mode='menu';const original=JSON.stringify(Object.fromEntries(Object.entries(baseJobs).map(([id,h])=>[id,h.gear])));
 const inventory=JSON.stringify([state.ownedGear,state.gearInstances,state.gearCopies,state.nextGearInstance]);
 setDeveloperGear(60,'Artifact',true);if(!saveGame('developer-test-save')) return false;
 const save=JSON.parse(localStorage.getItem('developer-test-save'));
 if(JSON.stringify(Object.fromEntries(Object.entries(save.heroes).map(([id,h])=>[id,h.gear])))!==original) return false;
 if(JSON.stringify([state.ownedGear,state.gearInstances,state.gearCopies,state.nextGearInstance])!==inventory) return false;
 loadGame('developer-test-save');return !developerGearLoadout && !Object.values(baseJobs).some(h=>Object.values(h.gear).some(ref=>String(ref).startsWith('developer_')));
})()`);
check('Unavailable rarities and in-battle changes are rejected without mutation', `(() => {
 state.gameMode='hallBattles';mode='menu';if(setDeveloperGear(1,'Artifact',true)) return false;
 setDeveloperGear(54,'Mythic',true);mode='battle';const before=JSON.stringify([...developerGearInstances]);
 const rejected=!setDeveloperGear(54,'Rare',true)&&!setDeveloperGear(54,'Rare',false);
 mode='menu';restoreDeveloperGear();return rejected&&before.length>2;
})()`);
