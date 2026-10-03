const fs=require('node:fs'),path=require('node:path');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false}); sandbox.window = sandbox;');
const {run}=new Function('require','__dirname',prefix+'\nreturn {run};')(require,__dirname);
const startingCompanions=process.argv[3]?process.argv[3].split(','):['Torren','Glimmer'];
const result=run(`(()=>{
  let seed=${Number(process.argv[2]||37)};Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  resetHallBattleRun();${JSON.stringify(startingCompanions)}.forEach(id=>addParty(id));state.activeParty=state.party.slice(0,3);finishTurn=()=>{};triggerPartyDefeat=()=>{};
  const results=[];
  for(let stage=1;stage<=20;stage++){
    restoreHallParty();state.party.forEach(id=>{const p=progressFor(id);p.rank0=rank0Choices[id][0].name;for(const tier of [1,2,3,4]){const choices=talentTrees[id].filter(t=>t.tier===tier);for(const t of choices.slice(0,2)){if(p.talents.length>=(tier-1)*2&&p.talents.length<talentPointsEarned(p.level)&&!p.talents.includes(t.name))p.talents.push(t.name);}}});
    const info=hallBattleInfo(stage),allEnemies=[];let actions=0,rounds=0,damageTaken=0,heals=0;
    const party=state.activeParty.map(battleUnit);party.forEach(u=>{u.hp=u.max;u.mp=u.maxmp;});
    for(const [phase,keys] of [info.enemies,...info.waves].entries()){
      const enemies=hallEnemiesForStage(stage,keys,phase).map(e=>prepareEnemyForBattle(e));allEnemies.push(...enemies);
      battle={party,enemies,enemyResonance:0,defeated:[],usedOnce:{},round:1,turnQueue:[],turnIndex:0,extraTurns:0,resolving:false,hallStage:stage};mode='battle';
      for(let round=1;round<=60&&party.some(u=>u.hp>0)&&enemies.some(e=>e.hp>0);round++){
        battle.round=round;rounds++;
        const order=[...party,...enemies].filter(u=>u.hp>0).sort((a,b)=>effectiveAgility(b,b.id?totals(b.id).agi:b.stats.agi)-effectiveAgility(a,a.id?totals(a.id).agi:a.stats.agi));
        for(const u of order){
          if(u.hp<=0||!party.some(p=>p.hp>0)||!enemies.some(e=>e.hp>0))continue;
          battle.turnQueue=[u.id?{side:'party',id:u.id}:{side:'enemy',index:enemies.indexOf(u)}];battle.turnIndex=0;battle.resolving=false;
          const turn=processTurnStart(u);if(turn.skip){processTurnEnd(u);continue;}
          if(u.id){
            if(enemies.some(e=>e.hp>0&&e.ultimateTelegraphed)&&party.filter(p=>p.hp>0).every(p=>p.hp/p.max>=.75)){useDefend(u);actions++;processTurnEnd(u);continue;}
            if(u.hp/u.max<.35&&state.inventory["Marla's Soup"]>0){useBattleItem(u,"Marla's Soup");heals++;actions++;processTurnEnd(u);continue;}
            const skills=battleSkills(u.id,u).filter(s=>!s.transform&&(!s.oncePerBattle||!battle.usedOnce[s.oncePerBattle])&&(s.anim==='ultimate'?state.resonance>=100:skillMpCost(u.id,s,u)<=u.mp));
            const wounded=party.filter(p=>p.hp>0).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
            let chosen=wounded.hp/wounded.max<.75?skills.find(s=>s.power<0&&(!s.targetSide||s.targetSide!=='self'||wounded===u)):null;
            if(chosen)heals++;
            const target=enemies.filter(e=>e.hp>0).sort((a,b)=>(a.hp/a.max-(['healer','utility','controller'].includes(a.role)?.3:0))-(b.hp/b.max-(['healer','utility','controller'].includes(b.role)?.3:0)))[0];
            if(!chosen&&['healer','utility'].includes(target.role)&&!statusOf(target,'silence'))chosen=skills.find(s=>s.status?.type==='silence');
            const healReserve=skills.filter(s=>s.power<0&&s.anim!=='ultimate').reduce((n,s)=>Math.max(n,skillMpCost(u.id,s,u)*2),0);
            if(!chosen)chosen=skills.filter(s=>skillTargetsEnemies(s)&&!s.statusOnly&&!s.dispel&&(s.power>0||s.coefficient)&&(s.anim==='ultimate'||skillMpCost(u.id,s,u)===0||u.mp-skillMpCost(u.id,s,u)>=healReserve)).sort((a,b)=>skillExpectedOutput(u.id,b,u)*(b.allEnemies?enemies.filter(e=>e.hp>0).length:1)-skillExpectedOutput(u.id,a,u)*(a.allEnemies?enemies.filter(e=>e.hp>0).length:1))[0];
            if(chosen){useSkill(u,chosen,chosen.power<0?wounded:target);__impact();actions++;}
            else u.guarding=true;
          }else{
            const before=party.reduce((s,p)=>s+p.hp,0);resolveEnemyTurn({side:'enemy',index:enemies.indexOf(u)},'');__impact();damageTaken+=before-party.reduce((s,p)=>s+p.hp,0);actions++;
          }
          processTurnEnd(u);
        }
      }
    }
    const won=party.some(u=>u.hp>0)&&allEnemies.every(e=>e.hp<=0);
    results.push({stage,level:progressFor('Verseborn').level,party:state.activeParty.join('+'),won,rounds,actions,damageTaken,heals,hp:party.map(u=>Math.round(u.hp/u.max*100))});
    if(!won){results.push({debug:party.map(u=>({id:u.id,max:u.max,mp:u.mp,skills:battleSkills(u.id,u).filter(s=>s.power<0).map(s=>({name:s.name,cost:s.cost,target:s.targetSide}))}))});break;}
    const xp=allEnemies.reduce((s,e)=>s+(e.xp||20),0)+(info.boss?120+Math.max(...allEnemies.map(e=>e.level))*12:0);awardPartyXp(xp);
    guaranteeHallBattleGearReward({drops:[],gearDrops:[]},stage);autoEquipParty('all');
    if(stage===7)addParty('Seerin');if(stage===14)addParty('Kael');state.activeParty=state.party.slice(0,3);state.resonance=Math.min(100,state.resonance+15);
  }
  return JSON.stringify(results);
})()`);
console.log(result);
