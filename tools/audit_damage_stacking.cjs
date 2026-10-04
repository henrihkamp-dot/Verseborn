const fs=require('node:fs');
const prefix=fs.readFileSync(__dirname+'/test_combat.cjs','utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false});sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+';return {run};')(require,__dirname);
const raw=fs.readFileSync(process.argv[2],'utf8');
run(`localStorage.setItem(hallSaveKey(),${JSON.stringify(raw)});loadGame(hallSaveKey());mode='walk';state.developerTuning={};`);
run(`function stackingProbe(id,name,form=null){
 const u=battleUnit(id);if(form)u.form=form;
 const stats=totals(id);const sk=battleSkills(id,u).find(s=>s.name===name);
 if(!sk)return {id,name,error:'skill unavailable'};
 const enemy=prepareEnemyForBattle(hallEnemiesForStage(55,hallBattleInfo(55).waves[1],2)[0],'emberHallBattles');
 battle={hallStage:55,party:[u],enemies:[enemy],enemyResonance:50};
 const gear=baseJobs[id].gear;
 const raw=()=>sk.coefficient?skillOffensiveStat(id,sk,u)*sk.coefficient:sk.power+skillOffensiveStat(id,sk,u);
 const base=raw();const talent=skillDamageTalentMultiplier(u,sk,enemy,false);const ultimate=sk.anim==='ultimate'?ultimatePotencyMultiplier(id,sk):1;
 const clean=outgoingDamageMultiplier(u,skillScaling(sk)==='str'?'melee':'magic',enemy);
 const noGear=(()=>{baseJobs[id].gear={};try{return {stats:totals(id),base:raw(),outgoing:outgoingDamageMultiplier(u,skillScaling(sk)==='str'?'melee':'magic',enemy)};}finally{baseJobs[id].gear=gear;}})();
 u.statuses=[{type:'damageUp',value:.234,remaining:3},{type:skillScaling(sk)==='str'?'strengthUp':'magicUp',value:.234,remaining:3}];
 enemy.statuses=[{type:'shadowExposed',remaining:3},{type:'burn',remaining:3},{type:'marked',value:.15,remaining:3}];
 const weakness=skillWeaknessMultiplier(id,sk,enemy);
 const exposedTalent=skillDamageTalentMultiplier(u,sk,enemy,false);
 const buffed=outgoingDamageMultiplier(u,skillScaling(sk)==='str'?'melee':'magic',enemy);
 const critical=(sk.criticalMultiplier||2)*(1+typedTalentValue(id,'markedCritDamage')+typedTalentValue(id,'assassinSynergy'));
 const broken=id==='Torren'?1+typedTalentValue(id,'brokenDamage'):1;
 const unbuffed=Math.round(base*talent*ultimate*clean);
 const buffedCrit=Math.round(base*exposedTalent*ultimate*weakness*buffed*critical*broken);
 return {id,name,stats,base,noGear,talent,ultimate,clean,exposedTalent,weakness,buffed,critical,broken,unbuffed,buffedCrit,coreCrit:Math.round(buffedCrit*1.6),afflictedGear:effectValue(id,'afflictedDamage'),physicalGear:effectValue(id,'physicalDamage'),magicGear:effectValue(id,'magicDamage'),holyGear:effectValue(id,'holyFollowUp')};
}`);
const probes=run(`[
 stackingProbe('Torren','Attack'),stackingProbe('Torren','Foundation Break'),
 stackingProbe('Mira','Voidthorn Mark'),stackingProbe('Kael','Umbral Wave','shadowpriest'),
 stackingProbe('Glimmer','Gearstorm Barrage','mech'),stackingProbe('Sparky','ULT: Eternal Flame')
]`);
const equipment=run(`['Torren','Mira','Kael','Glimmer','Sparky'].map(id=>({id,weaknessDamage:effectValue(id,'weaknessDamage'),shadowUp:typedTalentValue(id,'shadowDamage'),gear:Object.values(baseJobs[id].gear).map(ref=>({ref,name:gearByName(ref)?.name,effects:gearEffects(gearByName(ref)).filter(e=>['physicalDamage','magicDamage','weaknessDamage','afflictedDamage'].includes(e.type))}))}))`);
console.log(JSON.stringify({note:'Controlled scenario: +23.4% Damage Up and primary buff; target exposed/burning/marked. No exact combat snapshot, no random roll or added Break damage. No-gear comparison retains level and talents.',probes,equipment},null,2));
