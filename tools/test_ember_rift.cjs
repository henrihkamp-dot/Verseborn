const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0];
prefix=prefix.replace('sandbox.window = sandbox;',`sandbox.fetch=async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../public/game/assets/rift/manifest.json'),'utf8'))}); drawing.createRadialGradient=()=>({addColorStop:noop});drawing.createLinearGradient=()=>({addColorStop:noop});Element.prototype.insertAdjacentElement=noop;Element.prototype.toDataURL=()=> 'data:image/png;base64,test'; sandbox.Image=class {constructor(){this.complete=false;this.width=1152;this.height=1408;}set src(v){this._src=v;if(this.onload&&v.startsWith('assets/rift/')){this.complete=true;this.onload();}}get src(){return this._src;}addEventListener(){}}; sandbox.window=sandbox;`);
prefix += `\nrun(fs.readFileSync(path.join(__dirname,'../public/game/hall-hub.js'),'utf8'));run(fs.readFileSync(path.join(__dirname,'../public/game/ember-rift.js'),'utf8'));return {run,sandbox};`;
const {run,sandbox}=new Function('require','__dirname',prefix)(require,__dirname);
let passed=0;function check(name,code){assert.ok(run(code),name);console.log('PASS '+name);passed++;}
(async()=>{await sandbox.EmberRift.ready;
check('Twenty sheets and six effect families load',`EmberRift.assetsReady&&Object.keys(EmberRift.sheets).length===20&&Object.keys(EmberRift.effects).length===6`);
check('All 60 normal stages required; Shadow progress cannot unlock',`!normalizeHallBattleProgress({clearedStages:Array.from({length:59},(_,i)=>i+1),shadowTrials:{cleared:[1,2,3,4,5]}}).rift.unlocked&&normalizeHallBattleProgress({clearedStages:Array.from({length:60},(_,i)=>i+1)}).rift.unlocked`);
check('Permanent unlock and old Hall data survive migration',`(()=>{const h=normalizeHallBattleProgress({clearedStages:[],rift:{unlocked:true,cleared:[1,1,99],shards:27},startingWelcomeComplete:true});return h.rift.unlocked&&h.rift.cleared.join(',')==='1'&&h.rift.shards===27&&h.startingWelcomeComplete;})()`);
check('Ten new sequential challenges remain separate',`(()=>{state.gameMode='hallBattles';state.hallBattles={clearedStages:Array.from({length:60},(_,i)=>i+1)};return EmberRift.encounters.length===10&&EmberRift.available(1)&&!EmberRift.available(2)&&HALL_BATTLE_BLUEPRINTS.length===60;})()`);
check('Every wave has real new enemies with final animation art',`EmberRift.encounters.every(e=>e.waves.every((w,p)=>w.every((k,i)=>{const u=prepareEnemyForBattle(EmberRift.makeEnemy(k,e.id,p,i));return u.riftKey===k&&u.hp>0&&u.riftState&&enemyAnimationSheetFor(u).cells.length===20;})))`);
check('Cute fantasy retained; only Hearthbound receives final anime revision',`['fae','mushroom','bear','raccoon','rabbit','squirrel'].every(k=>EmberRift.sheets[k].file===k+'-chibi-sheet.webp')&&EmberRift.sheets.elf.file==='elf-repaired-v3.webp'&&['benji','pippa','mina','sella'].every(k=>EmberRift.sheets[k].file===k+'-final-sheet.webp')`);
run(`state.party=['Verseborn','Mira','Seerin'];state.activeParty=[...state.party];state.party.forEach(id=>{progressFor(id).level=40;});state.map='emberRiftVault';mode='walk';`);
check('Real battle starts with Rift identity before first turn',`EmberRift.startEncounter(1)&&battle.riftEncounter===1&&battle.phaseTotal===2&&battle.waves.length===1&&battle.enemies[0].riftKey==='pursuer'`);
check('Marked telegraph cancels when cleansed',`(()=>{const e=battle.enemies[0];e.actionsTaken=1;chooseEnemyAction(e);const target=e.riftState.pending.target;target.statuses=ensureStatuses(target).filter(s=>s.type!=='riftMark');const a=chooseEnemyAction(e);return !e.riftState.pending&&e.riftState.recovery>0&&a.kind!=='ultimate';})()`);
check('Magic telegraph cancels with Silence',`(()=>{battle.riftEncounter=7;const e=prepareEnemyForBattle(EmberRift.makeEnemy('dragon',7,1,0));battle.enemies=[e];e.actionsTaken=1;chooseEnemyAction(e);applyStatus(e,'silence',battle.party[0],{force:true});return !e.riftState.pending&&e.riftState.recovery===2;})()`);
check('Normal attacks and ultimates cannot one-shot full-health heroes',`(()=>{const e=battle.enemies[0],u=battle.party[0];return ['melee','ultimate'].every(kind=>enemyDamageRoll(e,{kind,element:'Shadow',coefficient:100,scaling:'mag'},u).damage<=Math.round(u.max*(kind==='ultimate'?.47:.34)));})()`);
check('Exclusive reward first clear, shards on replay, next lock opens',`(()=>{const first=EmberRift.awardRewards(1),again=EmberRift.awardRewards(1);return EmberRift.progress().cleared.join(',')==='1'&&EmberRift.available(2)&&!EmberRift.available(3)&&first.gold===0&&first.drops.some(d=>d.baseName==='Ashwake Signet')&&!again.drops.some(d=>d.baseName==='Ashwake Signet')&&EmberRift.progress().shards===29;})()`);
check('All exclusive base stat floors exceed normal top tier',`EmberRift.rewards.every(g=>Object.values(g.stats).every(n=>n>=48))`);
check('Physical door and connected room entry/return',`(()=>{mode='walk';state.map='emberHallBattles';const entered=EmberRift.enterRoom();EmberRift.leaveRoom();return entered&&state.map==='emberHallBattles';})()`);
console.log('PASS '+passed+'/'+passed+' focused Ember Rift checks');
})().catch(e=>{console.error(e);process.exitCode=1;});





