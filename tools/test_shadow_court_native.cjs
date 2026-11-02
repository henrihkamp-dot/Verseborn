const fs=require('fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;').replace('  focus() {}','  focus() {} remove() {}');
const {run,sandbox,vm}=new Function('require','__dirname',prefix+`;return {run,sandbox,vm};`)(require,__dirname);
sandbox.fetch=async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(__dirname+'/../public/game/shadow-court-iii/manifest.json'))});
sandbox.Image=class {set src(v){this.complete=true;this.width=768;this.height=768;this.onload?.();}};
run(`document.getElementById('screen').parentElement=document.body;document.body.remove=()=>{};window.EnemyStature={profile:()=>({})};window.EncounterPortraits={unit:()=>''};window.ShadowBonus={previewEnemies:()=>[],onTurnStart:()=>{},onTurnEnd:()=>{}};window.TrialNavigation={mount:()=>{}};window.BattleCommandUI={captureSprite:(u,x,y,fn)=>fn()};`);
for(const name of ['hall-hub.js','status-system.js','battle-action-model.js','shadow-court-rules.js','shadow-court.js'])vm.runInContext(fs.readFileSync(__dirname+'/../public/game/'+name,'utf8').replace('catch(error){for(const name of consumed)','catch(error){console.error(error);for(const name of consumed)'),sandbox,{filename:name});
let n=0;function check(name,code){assert.ok(run(code),name);console.log('PASS',name);n++;}
(async()=>{
run(`state.gameMode='hallBattles';state.map='emberHallBattles';state.party=['Mira','Verseborn','Seerin'];state.activeParty=['Verseborn'];mode='hallMap';HallHub.setShadowFormation(['Mira','Seerin'],false);`);
check('Custodian and previous clear gate direct battle requests',`!ShadowCourt.available(0)&&!ShadowCourt.available(1)&&!ShadowCourt.start('vesper')`);
await run(`ShadowCourt.load('vesper')`);
run(`state.shadowTwistClears=['custodian'];`);
check('Loaded encounter starts with selected party and exactly one native boss',`ShadowCourt.start('vesper')&&battle.party.map(p=>p.id).join(',')==='Mira,Seerin'&&battle.enemies.length===1&&battle.enemies[0].courtKey==='vesper'`);
check('Defeat restores inventory, party, vitals and grants no clear or gold',`(()=>{const gold=state.gold,old=ShadowCourt.snapshot;state.inventory['QA item']=1;baseJobs.Mira.hp=1;const ok=ShadowCourt.finish('defeat');return ok&&state.gold===gold&&!ShadowCourt.clears().includes('vesper')&&JSON.stringify(state.inventory)===JSON.stringify(old.inventory)&&state.activeParty.join(',')===old.party.join(',')&&baseJobs.Mira.hp===old.vitals.Mira.hp&&!ShadowCourt.snapshot})()`);
run(`mode='hallMap';ShadowCourt.start('vesper');`);
check('Victory grants first clear once and unlocks next trial',`(()=>{const gold=state.gold;return ShadowCourt.finish('victory')&&state.gold===gold+2500&&ShadowCourt.available(1)&&!ShadowCourt.finish('victory')&&state.gold===gold+2500})()`);
run(`mode='hallMap';ShadowCourt.start('vesper');`);
check('Replay gives only replay gold and no duplicate progression',`(()=>{const gold=state.gold;return ShadowCourt.finish('victory')&&state.gold===gold+650&&ShadowCourt.clears().filter(k=>k==='vesper').length===1})()`);
await run(`ShadowCourt.load('hollow-king')`);
run(`state.shadowCourtClears=[...ShadowCourt.keys];mode='hallMap';ShadowCourt.start('hollow-king');battle.turnQueue=[{side:'party',id:'Mira'}];battle.turnIndex=0;battle.resolving=false;battle.courtRules.orders.Mira='KNEEL';state.inventory['Clockwork Tonic']=2;battle.party[0].mp=0;`);
check('Instant native items obey KNEEL exactly once',`(()=>{const before=battle.courtRules.authority;useBattleItem(battle.party[0],'Clockwork Tonic');return battle.courtRules.authority===before+12&&state.inventory['Clockwork Tonic']===1})()`);
check('Court clear records survive actual save/load',`(()=>{ShadowCourt.finish('defeat');mode='hallMap';saveGame(HALL_SAVE_KEY);const saved=JSON.parse(localStorage.getItem(HALL_SAVE_KEY));return saved.state.shadowCourtClears.length===7&&loadGame(HALL_SAVE_KEY)&&state.shadowCourtClears.length===7})()`);
console.log(n+' native integration checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
