// Enemy tempo uses the real queue and a separate budget from party Echo actions.
(() => {
  'use strict';
  STATUS_DEFS.haste={label:'HASTE',short:'HST',buff:true,value:.2,duration:3,color:'#72dfcf',desc:'20% faster initiative while active. Battle Echo is the separate, dispellable extra-action buff.'};
  STATUS_DEFS.battleEcho={label:'BATTLE ECHO',short:'ECHO',buff:true,duration:3,color:'#c9a3ff',desc:'The next regular damaging action grants one immediate, lighter Echo Strike. Dispel to cancel. Cannot echo an Ultimate or chain another Echo.'};
  STATUS_DEFS.exhaustion={label:'EXHAUSTION',short:'EXH',negative:true,value:.25,duration:2,color:'#b4a08e',desc:'After an Echo action: 25% less damage and initiative for two own actions. Cannot receive another Battle Echo.'};
  statusIconAliases.haste='agilityUp';statusIconAliases.battleEcho='echoPower';statusIconAliases.exhaustion='overheated';
  DISPEL_PRIORITY.battleEcho=101;DISPEL_PRIORITY.haste=79;CLEANSE_PRIORITY.exhaustion=25;
  const eligible=()=>Boolean(state.gameMode==='hallBattles'&&mode==='battle'&&battle&&!battle.ended&&(battle.hallStage>=1&&battle.hallStage<=50||battle.whirlpoolEncounter||battle.enemies?.some(e=>e.whirlpoolKey)));
  function prime(unit){
    if(!eligible()||unit.hp<=0||unit.enemyTempoPrimed||statusOf(unit,'exhaustion')||(battle.enemyTempoPrimed||0)>=2||(battle.enemyExtraTurns||0)>=2)return false;
    unit.enemyTempoPrimed=true;battle.enemyTempoPrimed=(battle.enemyTempoPrimed||0)+1;
    applyStatus(unit,'haste',unit,{force:true,value:.2,duration:3});
    applyStatus(unit,'battleEcho',unit,{force:true,duration:3});
    reorderRemainingTurns();return true;
  }
  function queue(unit){
    const turn=currentTurn(),index=battle?.enemies?.indexOf(unit);
    if(!eligible()||turn?.side!=='enemy'||turn.extra||index<0||unit.hp<=0||unit.enemyTempoSpent||!statusOf(unit,'battleEcho')||statusOf(unit,'exhaustion')||(battle.enemyExtraTurns||0)>=2)return false;
    unit.statuses=ensureStatuses(unit).filter(s=>s.type!=='battleEcho');unit.enemyTempoSpent=true;
    battle.enemyExtraTurns=(battle.enemyExtraTurns||0)+1;
    battle.turnQueue.splice(battle.turnIndex+1,0,{side:'enemy',index,name:unit.name+' · ECHO',agi:battleInitiative(unit,unit.stats.agi),extra:true,enemyTempo:true});
    return true;
  }
  const oldInitiative=battleInitiative,oldOutgoing=outgoingDamageMultiplier;
  battleInitiative=function(unit,...args){return oldInitiative(unit,...args)*(1+statusValue(unit,'haste'))*(statusOf(unit,'exhaustion')?.75:1);};
  outgoingDamageMultiplier=function(unit,...args){return oldOutgoing(unit,...args)*(statusOf(unit,'exhaustion')?.75:1);};
  const oldChoose=chooseEnemyAction;
  chooseEnemyAction=function(unit){
    const turn=currentTurn();
    const action=eligible()&&turn?.enemyTempo&&battle.enemies[turn.index]===unit
      ? {kind:'melee',name:'Echo Strike',element:'Physical',coefficient:.75,mpCost:0}
      : oldChoose(unit);
    if(eligible())unit.enemyTempoAction={battle,turn,action};
    return action;
  };
  const oldResolve=resolveEnemyTurn;
  resolveEnemyTurn=function(turn,...args){
    const unit=eligible()&&turn?.enemyTempo?battle.enemies[turn.index]:null,normalActions=unit?.actionsTaken||0;
    const result=oldResolve(turn,...args);
    // A bonus strike must not skip a scheduled warning/charge in the normal AI.
    if(unit)unit.actionsTaken=normalActions;
    return result;
  };
  const oldComplete=completeBattleAction;
  completeBattleAction=function(log){
    const turn=currentTurn(),unit=turn?.side==='enemy'?battle.enemies[turn.index]:null,stamp=unit?.enemyTempoAction;
    let result=oldComplete(log);if(!eligible()||!unit||unit.hp<=0)return result;
    let note='';
    if(turn.enemyTempo){
      unit.statuses=ensureStatuses(unit).filter(s=>s.type!=='haste');
      applyStatus(unit,'exhaustion',unit,{force:true,value:.25,duration:2});
      note=` ${unit.name}: EXHAUSTION — damage and initiative -25% for two own actions.`;
    }else if(stamp?.battle===battle&&stamp.turn===turn&&stamp.action.kind!=='ultimate'&&!stamp.action.isUltimate&&!stamp.action.noTempo&&enemyActionDealsDamage(stamp.action)){
      if(queue(unit))note=` ${unit.name}: BATTLE ECHO grants one immediate Echo Strike (${battle.enemyExtraTurns}/2 enemy bonus actions used).`;
      else if(prime(unit))note=` ${unit.name}: HASTE +20% initiative; BATTLE ECHO readied. Dispel Echo before its next regular attack to cancel the bonus action.`;
    }
    if(note){result+=note;const recorded=battle.actionHistory?.at(-1);if(recorded)recorded.message+=note;}
    return result;
  };
  window.EnemyTempo={eligible,prime,queue};
})();
