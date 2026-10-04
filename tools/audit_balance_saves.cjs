const fs=require('node:fs'),path=require('node:path');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
for(const file of process.argv.slice(2).filter(arg=>arg!=='--normal')){
 const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
 const raw=fs.readFileSync(file,'utf8');
 run(`localStorage.setItem(hallSaveKey(),${JSON.stringify(raw)});loadGame(hallSaveKey());mode='walk';`);
 if(process.argv.includes('--normal')) run('state.developerTuning={};');
 const heroes=run(`state.party.map(id=>({id,stats:totals(id),crit:heroCritChance(id),siphon:combatSustainRate(id,'siphoning'),leech:combatSustainRate(id,'leeching'),inactive:progressFor(id).talents.filter(name=>!activeTalents(id).some(t=>t.name===name)),skills:battleSkills(id).filter(sk=>skillTargetsEnemies(sk)).map(sk=>({name:sk.name,aoe:skillHitsAll(id,sk),cost:skillMpCost(id,sk),damage:Math.round(skillExpectedOutput(id,sk)),mpBack:sk.basicAttack?Math.round(totals(id).mp*.06):sk.anim==='ultimate'?0:Math.floor(skillMpCost(id,sk)*combatSustainRate(id,'siphoning')*2)}))}))`);
 const enemies=run(`[18,40,50,54,60].map(stage=>({stage,phases:[hallBattleInfo(stage).enemies,...hallBattleInfo(stage).waves].map((keys,index)=>hallEnemiesForStage(stage,keys,index).map(e=>{const u=prepareEnemyForBattle(e);return {name:u.name,hp:u.max,str:u.stats.str,mag:u.stats.mag,agi:u.stats.agi,moves:Object.values(enemyAbilityProfile(u).moves).filter(a=>['melee','magic','ultimate'].includes(a.kind)).map(a=>({name:a.name,rawDamage:Math.round(enemyActionScalingStat(u,a)*(a.coefficient||.9)+(u.level-1)*.35),cost:enemyActionMpCost(u,a)}))};}))}))`);
 console.log(JSON.stringify({file:path.basename(file),heroes,enemies}));
}
