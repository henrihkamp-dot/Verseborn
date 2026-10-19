// Shared bookkeeping/feedback only; native damage, interrupts and recovery values stay native.
(() => {
 'use strict';
 const live=()=>battle?.enemies||[];
 let transitionDepth=0;
 const reasonText={broken:'BREAK',stun:'STUNNED',sleep:'ASLEEP',silence:'SILENCED',dispel:'REQUIRED BUFF DISPELLED',cleanse:'TARGET MARK CLEANSED',target:'TARGET NO LONGER AVAILABLE'};
 function notify(text){if(!battle)return;(battle.finisherFeedback??=[]).push(text);receptionAnnounce('Finisher',text);}
 function begin(unit,config){
  if(unit.finisherState&&['preparing','executing'].includes(unit.finisherState.state))return unit.finisherState;
  const record={...config,state:'preparing',scope:config.scope||'single',target:config.scope==='all-allies'||config.scope==='all-enemies'?null:config.target};unit.finisherState=record;
  notify(`${unit.name} begins preparing ${record.name}. Target: ${record.scope==='all-allies'?'ALL ALLIES':record.scope==='all-enemies'?'ENEMY FORMATION':record.target?.name||'SELF'}.`);return record;
 }
 function cancel(unit,reason){const p=unit.finisherState;if(!p||p.state!=='preparing')return false;p.state='cancelled';p.reason=reason;p.cancel?.(reason);p.clear?.();notify(`${p.name.toUpperCase()} CANCELLED — ${reasonText[reason]||reason}. ${unit.name}${p.recoveryText?': '+p.recoveryText:'.'}`);addBattleFloater(unit,0,{kind:'dispel',text:`CANCELLED — ${reasonText[reason]||reason}`});unit.lastFinisher=p;unit.finisherState=null;return true;}
 function clear(unit){const p=unit.finisherState;if(p){p.clear?.();unit.finisherState=null;}unit.lastFinisher=null;if(unit.hp<=0){if(unit.hallTactics)unit.hallTactics.recovery=0;if(unit.riftState)unit.riftState.recovery=0;if(unit.whirlpoolState)unit.whirlpoolState.recovery=0;if(unit.encounterMechanic){unit.encounterMechanic.stageRecovery=false;unit.encounterMechanic.sanctuaryRecovery=false;unit.encounterMechanic.receptionPending=false;unit.encounterMechanic.receptionWindow=0;unit.encounterMechanic.charging=false;unit.encounterMechanic.pending=null;}delete unit.ultimateTelegraphed;}}
 function execute(unit,action){const p=unit.finisherState;if(!p||p.state==='cancelled')return action;if(p.state==='executing')return p.executionAction;p.state='executing';return p.executionAction={...action,finisherToken:p,noTempo:true,...(p.scope==='single'?{target:p.target,lockedFinisherTarget:true}:{} )};}
 function finish(unit){const p=unit.finisherState;if(p?.state!=='executing')return;p.state='executed';p.clear?.();p.after?.();unit.lastFinisher=p;unit.finisherState=null;if(p.afterText)notify(`${unit.name}: ${p.afterText}`);}
 function sweep(){if(transitionDepth)return;for(const u of live()){const p=u.finisherState;if(!p)continue;if(u.hp<=0){clear(u);continue;}if(p.state!=='preparing')continue;if(p.scope==='single'&&(!p.target||p.target.hp<=0)){cancel(u,'target');continue;}const control=p.controls?.find(type=>statusOf(u,type));if(control){cancel(u,control);continue;}if(p.mark&&!statusOf(p.target,p.mark)){cancel(u,'cleanse');continue;}if(p.requiredBuff&&!statusOf(u,p.requiredBuff))cancel(u,'dispel');}}
 const oldApply=applyStatus,oldCleanse=removeCleanseStatus,oldDispel=dispelStatus,oldDown=markBattleUnitDown;
 applyStatus=function(...args){const result=oldApply(...args);sweep();return result;};
 removeCleanseStatus=function(...args){const result=oldCleanse(...args);sweep();return result;};
 dispelStatus=function(...args){const result=oldDispel(...args);sweep();return result;};
 markBattleUnitDown=function(u){const result=oldDown(u);if(u?.hp<=0)clear(u);sweep();return result;};
 const oldHud=updateBossMechanicDisplay;
 updateBossMechanicDisplay=function(...args){sweep();return oldHud(...args);};
 const oldComplete=completeBattleAction;
 const oldSummary=finishAttackDamageSummary;
 finishAttackDamageSummary=function(log=''){const feedback=battle?.finisherFeedback?.splice(0)||[],hits=!!battle?.attackDamage?.length;const result=oldSummary([log,...feedback].filter(Boolean).join(' '));const cancelled=feedback.filter(text=>text.includes(' CANCELLED — '));if(hits&&cancelled.length)battle.lastAttackDamage+=' / '+cancelled.join(' ');return result;};
 completeBattleAction=function(log){sweep();const turn=currentTurn(),u=turn?.side==='enemy'?battle.enemies[turn.index]:null;if(u&&!turn.enemyTempo&&u.finisherState?.impactResolved)finish(u);const feedback=battle.finisherFeedback?.splice(0)||[];if(feedback.length&&battle.meterActionRecorded&&battle.actionHistory?.length)battle.actionHistory.at(-1).message+=' '+feedback.join(' ');return oldComplete([log,...feedback].filter(Boolean).join(' '));};
 const oldEffect=endgameResolveEnemyEffect;
 endgameResolveEnemyEffect=function(u,a,t){let text;transitionDepth++;try{text=oldEffect(u,a,t);}finally{transitionDepth--;}const d=u.encounterMechanic;if(!d)return text;
  if(a.endgameEffect==='moveMark'&&u.finisherState?.name==='Guided Astral Impact'){u.finisherState.target=d.pending;notify(`Guided Astral Impact target moves to ${d.pending.name}.`);}
  const kinds={mark:['Guided Astral Impact','guidanceMark'],occult:['Delayed Occult Echo','marked'],charge:[enemyActionForKind(u,'ultimate').name,null],receptionPrepare:[u.endgameBoss==='guest'?'Last Courtesy':'Reception Combination',null],sanctuaryPrepare:[u.endgameBoss==='sanctuary'?'Sanctuary Renewal':'Renewal Prayer',null]};
  const config=kinds[a.endgameEffect];if(!config){sweep();return text;}const [name,mark]=config,healing=a.endgameEffect==='sanctuaryPrepare',all=healing?!!u.endgameBoss:a.endgameEffect==='charge',target=healing?null:a.endgameEffect==='receptionPrepare'?d.receptionTarget:d.pending;
  begin(u,{name,scope:all?(healing?'all-enemies':'all-allies'):healing?'self':'single',target,mark,legacy:true,resolve:()=>healing?sanctuaryEnemyAction(u):a.endgameEffect==='receptionPrepare'?receptionEnemyAction(u):endgameEnemyAction(u),controls:u.endgameBoss?['stun','sleep',...(u.endgameBoss!=='oath'?['silence']:[])]:['stun','sleep','silence'],cancel:()=>{if(healing)interruptSanctuaryRitual(u);else endgameInterrupt(u);},clear:()=>{if(a.endgameEffect==='receptionPrepare')d.receptionPending=false;else if(healing)d.sanctuaryPending=false;else if(a.endgameEffect==='charge')d.charging=false;else d.pending=null;if(mark)clearEndgameStatus(mark,u);}});return text;
 };
 const oldChoose=chooseEnemyAction;
 chooseEnemyAction=function(u){sweep();const p=u.finisherState;const echo=currentTurn()?.enemyTempo;const action=!echo&&p?.state==='executing'?p.executionAction:!echo&&p?.state==='preparing'&&p.resolve?p.resolve():oldChoose(u);if(!p&&!HallTactics.active()&&enemyAbilityProfile(u)?.telegraphUltimate&&u.ultimateTelegraphed&&action.kind==='buff'&&action.name.startsWith('Gathering')){const move=enemyActionForKind(u,'ultimate');begin(u,{name:move.name,scope:move.allTargets?'all-allies':'single',target:move.allTargets?null:chooseEnemyTarget(u,move),legacy:true,resolve:()=>({...move}),controls:['silence','stun','sleep'],clear:()=>{delete u.ultimateTelegraphed;}});}if(p?.state==='preparing'&&p.legacy&&!currentTurn()?.enemyTempo){if(action.name===p.name)return execute(u,action);if(['Unspent Prayer'].includes(action.name))cancel(u,'no wounded allies remain');}return action;};
 window.FinisherFlow={begin,cancel,clear,execute,finish,sweep,notify};
})();
