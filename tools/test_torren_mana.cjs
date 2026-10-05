const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
assert.equal(run("basicAttackMpRecoveryRate('Torren')"), .15);
for (const id of ['Verseborn', 'Glimmer', 'Mira', 'Seerin', 'Kael', 'Sparky']) {
  assert.equal(run(`basicAttackMpRecoveryRate('${id}')`), .06);
}
assert.equal(run("Math.round(46 * basicAttackMpRecoveryRate('Torren'))"), 7);
assert.equal(run("compactTalentTrees.Torren.find(t=>t.name==='Stone Memory').value"), .2);
assert.ok(run("capsHtml('Torren').includes('15% Max MP')"));
assert.ok(run("skillCatalogueHtml('Torren').includes('15% Max MP')"));
console.log('PASS Torren recovery, Stone Memory and mana descriptions');
assert.ok(run(`(()=>{const sk=baseJobs.Sparky.skills.find(s=>s.name==='Prrrp');return sk.power===0&&sk.otherAllyOnly&&sk.fixedBaseCost&&sk.manaRecovery===12&&!skillTargetsEnemies(sk);})()`));
run(`progressFor('Sparky').talents=[];progressFor('Sparky').level=40;state.gameMode='hallBattles';`);
assert.equal(run(`skillMpCost('Sparky',baseJobs.Sparky.skills.find(s=>s.name==='Prrrp'),{id:'Sparky',statuses:[]})`),5);
assert.equal(run(`prrrpManaAmount({id:'Sparky'},baseJobs.Sparky.skills.find(s=>s.name==='Prrrp'))`),12);
run(`progressFor('Sparky').talents=['Warm Little Heart','Never Too Small'];`);
assert.equal(run(`prrrpManaAmount({id:'Sparky',prrrpWindow:2},baseJobs.Sparky.skills.find(s=>s.name==='Prrrp'))`),17);
assert.equal(run(`skillMpCost('Sparky',baseJobs.Sparky.skills.find(s=>s.name==='Prrrp'),{id:'Sparky',prrrpWindow:2,statuses:[]})`),3);
assert.ok(run(`(()=>{const source={id:'Sparky',hp:40,max:40,mp:10,maxmp:20,statuses:[]},target={id:'Torren',hp:100,max:100,mp:43,maxmp:46,statuses:[]};const sk=baseJobs.Sparky.skills.find(s=>s.name==='Prrrp');return restorePrrrpMana(source,target,sk)===3&&target.mp===46&&target.hp===100&&restorePrrrpMana(source,source,sk)===0;})()`));
console.log('PASS Sparky MP transfer, fixed cost, talents, cap and no self-recovery');
