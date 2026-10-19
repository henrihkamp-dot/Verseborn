const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 async function measure(baseline){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(baseline)await page.route('**/game.js?*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('ENEMY_DIRECT_DAMAGE_MULTIPLIER = 1.45','ENEMY_DIRECT_DAMAGE_MULTIPLIER = 1')});});
  await page.goto('http://127.0.0.1:4211/game/?qa=duelselect');await page.waitForFunction(()=>runtimeAssetsReady&&window.TinusWhirlpool);
  await page.evaluate(()=>Promise.all([TinusWhirlpool.ready,EmberRift.ready]));
  const result=await page.evaluate(()=>{
   Math.random=()=>.5;state.developerTuning={};state.party=Object.keys(baseJobs);hallBattleProgress().unlockedStage=60;
   for(const id of state.party){progressFor(id).level=40;const t=totals(id);baseJobs[id].hp=t.max;baseJobs[id].mp=t.mp;}
   const rows=[],invariants=[];const actions=[];
   for(const party of [['Mira','Glimmer','Sparky'],['Torren','Seerin','Tinus'],['Verseborn','Kael','Torren']]){
    state.activeParty=[...party];
    const capture=label=>{
     mode='battle';battle.resolving=false;battle.party.forEach(t=>{t.statuses=[];if(progressFor(t.id).level!==40)throw Error('Level reset '+t.id+' '+progressFor(t.id).level);});
     const enemy=battle.enemies.find(e=>e.npcBoss||e.endgameBoss)||battle.enemies[0];enemy.statuses=[];for(let turn=0;turn<8;turn++){enemy.actionsTaken=turn;const action=chooseEnemyAction(enemy);if(enemyActionDealsDamage(action)){actions.push({label,party:party.join('/'),name:action.name,kind:action.kind,aoe:enemyActionHitsAll(enemy,action),hits:battle.party.map(target=>({id:target.id,hp:target.max,damage:enemyDamageRoll(enemy,action,target).damage}))});}}enemy.actionsTaken=0;
     for(const target of battle.party){
      const damage=kind=>enemyDamageRoll(enemy,{name:'Pressure probe',kind,scaling:kind==='melee'?'str':'mag',element:kind==='melee'?'Physical':'Sound',coefficient:kind==='ultimate'?1.9:1,hallEcho:kind==='echo'},target).damage;
      const basic=damage('melee'),spell=damage('magic'),ultimate=damage('ultimate'),echo=damage('echo');
      const saved=target.hp;target.hp=target.max;target.statuses=[{type:'burn',value:17,remaining:2,source:enemy,critChance:0}];processTurnStart(target);const dot=target.max-target.hp;target.hp=saved;target.statuses=[];
      const heal=baseJobs[target.id].skills.find(s=>s.power<0);const basicSkill=battleSkills(target.id,target).find(s=>s.basicAttack);const playerOutput=basicSkill?skillExpectedOutput(target.id,basicSkill,target):null;
      invariants.push({label,party:party.join('/'),id:target.id,playerOutput,hp:target.max,mp:target.maxmp,enemyHP:enemy.max,enemyMP:enemy.maxmp,dot,guard:defendReduction(target),heal:heal?healingAmount(target.id,heal,target):null,costs:baseJobs[target.id].skills.map(s=>skillMpCost(target.id,s,target)),resonance:state.resonance,agi:totals(target.id).agi});
      rows.push({label,party:party.join('/'),target:target.id,enemy:enemy.name,tier:enemy.resistanceTier,max:target.max,basic,spell,echo,ultimate,guarded:Math.ceil(basic*(1-defendReduction(target)/100)),basicPercent:Math.round(basic/target.max*100),ultimatePercent:Math.round(ultimate/target.max*100)});
     }
    };
    for(const stage of [1,25,51,...[...Array(60)].map((_,i)=>i+1).filter(s=>!hallBattleInfo(s).boss&&hallEnemiesForStage(s)[0]?.resistanceTier==="elite").slice(0,1)]){mode='walk';startHallBattleStage(stage);HallHub.beginStage();capture('Hall '+stage);}
    mode='walk';state.map='emberRiftVault';EmberRift.progress().unlocked=true;EmberRift.startEncounter(1);capture('Rift 1');
    mode='walk';state.map='emberHallBattles';TinusRecruitment.progress().recruited=true;TinusWhirlpool.progress().cleared= [1,2,3,4,5,6,7,8];TinusWhirlpool.start(1);capture('Whirlpool 1');
   }
   return {rows,invariants,actions};
  });assert.deepEqual(errors,[]);await page.close();return result;
 }
 const before=await measure(true),after=await measure(false);assert.deepEqual(after.invariants,before.invariants,'HP, MP, DoT, Guard, healing, costs, Resonance or initiative changed');
 let increased=0,capped=0;
 after.rows.forEach((r,i)=>{const b=before.rows[i];for(const key of ['basic','spell','echo','ultimate']){assert.ok(r[key]>=b[key],`${r.label} ${key} decreased`);assert.ok(r[key]<=b[key]*1.45+4,`${r.label} ${key} scaled twice`);if(r[key]>b[key]+1)increased++;else capped++;}assert.ok(r.guarded<r.basic);});
 assert.ok(increased>100,'Expected widespread direct-damage increase');for(let i=0;i<after.rows.length;i++)if(after.rows[i].label==='Hall 1')for(const key of ['basic','spell','echo','ultimate'])assert.ok(Math.abs(after.rows[i][key]-before.rows[i][key]*1.45)<=4,'Uncapped multiplier missing');assert.ok(after.rows.some(r=>r.tier==='elite'),'Missing elite encounter');assert.ok(after.rows.some(r=>r.tier==='boss'),'Missing boss encounter');const outliers=after.rows.filter(r=>r.basicPercent>50||r.ultimatePercent>70);
 fs.writeFileSync('../../outputs/enemy-pressure-297.json',JSON.stringify({method:'Deterministic level-40 QA loadouts, rear/middle/front slots; sampled direct rolls, not complete manual fights',before,after,increased,capped,outliers},null,2));
 console.log('PASS direct damage probes, preserved non-direct invariants and Defend:',{rows:after.rows.length,increased,capped,outliers:outliers.length});console.table(after.rows.map(({label,target,basicPercent,ultimatePercent})=>({label,target,basicPercent,ultimatePercent})));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
