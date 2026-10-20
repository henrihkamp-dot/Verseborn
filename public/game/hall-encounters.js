// Encounter composition and presentation only. Core combat rules remain native.
(() => {
  'use strict';
  const summons = {
    shadow: { name:'Veil Recall', hint:'Shade calls one Shadow Echo below 65% HP.', hp:.65,
      adds:[{name:'Shadow Echo',sprite:'Shade',role:'utility',weak:'Holy Fire',size:.57,hp:.16,buff:'agilityUp',value:.1}] },
    archive: { name:'Archive Recall', hint:'After two actions, sealed records materialize to protect the Custodian.', actions:2,
      adds:[{name:'Archive Seal',sprite:'Seal Bearer',role:'utility',weak:'Shadow',size:.6,hp:.12,buff:'defenseUp',value:.12},
        {name:'Record Wisp',sprite:'High Administrator Thaddeus',role:'utility',weak:'Sound',size:.52,hp:.12,cleanse:true,buff:'defenseUp',value:.08}] }
  };
  function summonPlan(u) {
    if(u?.summonedBy || battle?.riftEncounter || battle?.whirlpoolEncounter || battle?.sparring) return null;
    if(battle?.hallStage===26 && u.hallEnemyKey==='shade') return summons.shadow;
    if(!battle?.hallStage && state.gameMode==='story' && battle?.spawnRef?.id==='archive-custodian' && u.name==='Archive Custodian') return summons.archive;
    return null;
  }
  function notice(title,text) {
    if(!battle)return;
    battle.encounterNotice={title,text,until:tick+300};
    // Keep bespoke boss/finisher announcements intact; use the compact command heading.
  }
  function phaseTitle(stage,number,enemies=[]) {
    const info=hallBattleInfo(stage),last=info&&number===info.waves.length+1;
    if(stage===20&&number===2)return 'THE DRAGON DESCENDS';
    if(stage===21&&number===2)return 'REINFORCEMENTS ARRIVE';
    if(stage===25&&number===2)return 'THE GATE OPENS';
    if(stage===35&&number===2)return 'THE ROYAL GUARD ARRIVES';
    if(stage===50)return ['THE WINTER WAKES','THE EMBER RISES','THE FINAL SUNRISE','SUNRISE UNBOUND'][number-1];
    return last?'FINAL FORMATION':number>1?'REINFORCEMENTS ARRIVE':'OPENING FORMATION';
  }
  function encounterLabel(stage) {
    if(stage>=51)return 'Bespoke boss';
    if(stage===50)return 'Endurance finale';
    if(hallBattleInfo(stage)?.encounterTier==='elite-gauntlet')return 'Elite gauntlet';
    if(stage===26)return 'Summon boss';
    return hallBattleInfo(stage)?.boss?'Boss encounter':'Formation encounter';
  }
  function dismissSummons() {
    if(!battle)return;
    for(const u of battle.enemies) if(u.summonedBy && (u.summonedBy.hp<=0 || !battle.enemies.includes(u.summonedBy))) {
      if(u.hp>0){u.hp=0;u.anim='death';u.deathTick=tick;u.defeatUntil=tick+30;u.dismissed=true;}
    }
  }
  function summon(u,plan) {
    if(!battle||battle.ended||battle.phaseTransition||u.hp<=0||!battle.enemies.includes(u)||u.encounterSummoned)return [];
    const slots=Math.max(0,Math.min(2-battle.enemies.filter(e=>e.hp>0&&e.summonedBy).length,3-battle.enemies.length));
    if(!slots)return [];
    u.encounterSummoned=true;
    const added=plan.adds.slice(0,slots).map(spec=>{
      const source=enemy(spec.name,12,Math.max(1,Math.round(u.baseAtk*.35)),spec.weak,u.color,1,spec.sprite);
      source.levelHint=u.level;source.fixedLevel=true;source.resistanceTier='normal';
      const add=prepareEnemyForBattle(source);
      add.hp=add.max=add.baseMax=Math.max(1,Math.round(u.max*spec.hp));
      add.stats={...add.stats,str:Math.max(1,Math.round(u.stats.str*.35)),mag:Math.max(1,Math.round(u.stats.mag*.35)),agi:Math.max(1,Math.round(u.stats.agi*.8))};
      add.role=spec.role;add.summonedBy=u;add.summonSpec=spec;add.encounterSize=spec.size;add.arrivalTick=tick;add.xp=0;add.npcBoss=false;add.resistanceTier='normal';add.affixes={};add.baseEvasion=.05;add.crit=.04;
      battle.enemies.push(add);
      // Append stable indices; existing targets and queued actions are never renumbered.
      battle.turnQueue.push({side:'enemy',index:battle.enemies.length-1,name:add.name,agi:battleInitiative(add,add.stats.agi)});
      return add;
    });
    notice(plan.name,added.map(e=>e.name).join(' + ')+(added.length===1?' materializes.':' materialize.')+' Defeat them to remove their support.');
    return added;
  }
  const oldChoose=chooseEnemyAction;
  chooseEnemyAction=function(u) {
    dismissSummons();
    if(u.summonedBy && u.hp>0){
      const owner=u.summonedBy,spec=u.summonSpec;
      if(statusOf(u,'silence'))return {kind:'melee',name:'Fading Strike',element:'Physical',mpCost:0,coefficient:.35,noTempo:true};
      if(spec.cleanse && ensureStatuses(owner).some(s=>STATUS_DEFS[s.type]?.negative))return {name:'Restore the Record',kind:'cleanse',element:'Arcane',target:owner,mpCost:0,noTempo:true};
      return {name:spec.buff==='agilityUp'?'Veil Tempo':'Seal Ward',kind:'buff',element:'Arcane',target:owner,mpCost:0,noTempo:true,buffs:[{type:spec.buff,value:spec.value,duration:2}]};
    }
    const plan=summonPlan(u),pending=['preparing','executing'].includes(u.finisherState?.state);
    if(plan && u.hp>0 && !u.encounterSummoned && !pending && !currentTurn()?.enemyTempo && !statusOf(u,'silence') &&
      (plan.hp?u.hp/u.max<=plan.hp:(u.actionsTaken||0)>=plan.actions)) {
      return {name:plan.name+' — '+plan.adds.map(a=>a.name).join(' + '),kind:'utility',element:'Shadow',target:u,mpCost:0,noTempo:true,endgameEffect:'encounterSummon',encounterSummon:plan};
    }
    return oldChoose(u);
  };
  const oldEffect=endgameResolveEnemyEffect;
  endgameResolveEnemyEffect=function(u,a,t){
    if(a.endgameEffect!=='encounterSummon')return oldEffect(u,a,t);
    const added=summon(u,a.encounterSummon);
    return added.length?' '+a.encounterSummon.name+': '+added.map(e=>e.name).join(' + ')+' arrive.':' No records materialize.';
  };
  const oldStart=startBattle;
  startBattle=function(...args){
    const result=oldStart(...args);
    if(!battle||mode!=='battle')return result;
    const live=battle.enemies.filter(e=>e.hp>0),plan=live.map(summonPlan).find(Boolean);
    if(!battle.hallStage && battle.spawnRef?.boss && live.length===1)live[0].encounterArchetype=plan?'summon':'solo-boss';
    if(battle.hallStage || battle.spawnRef?.boss){
      const label=battle.hallStage?encounterLabel(battle.hallStage):plan?'Summon boss':'Boss encounter';
      notice(label,`${live.length} ${live.length===1?'enemy':'enemies'} · ${live[0]?.name||''}${plan?' · '+plan.hint:''}`);
    }
    return result;
  };
  const oldTurnStart=processTurnStart;
  processTurnStart=function(u){const result=oldTurnStart(u);dismissSummons();return result;};
  const oldWin=winBattle;
  winBattle=function(...args){dismissSummons();return oldWin(...args);};
  // Display multipliers never enter stats, initiative, targeting or damage.
  function soloScale(u) {
    if(u.summonedBy)return u.encounterSize||.6;
    const live=battle?.enemies.filter(e=>e.hp>0)||[];
    if(live.length!==1||live[0]!==u)return 1;
    const large=/Dragon|Wyrm|Leviathan|Guardian|Solinar/.test(u.name);
    if(u.encounterArchetype==='solo-boss'||u.encounterArchetype==='summon')return large?1.28:1.45;
    return u.resistanceTier==='boss'?large?1.2:1.4:u.resistanceTier==='elite'?1.28:1.17;
  }
  window.HallEncounters={summons,summonPlan,summon,dismissSummons,soloScale,phaseTitle,encounterLabel,notice};
})();
