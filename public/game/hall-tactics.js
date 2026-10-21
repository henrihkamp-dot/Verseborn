// Hall 1–50: readable enemy identities, setup/payoff and a real response window.
(() => {
  'use strict';
  const active=()=>Boolean(mode==='battle'&&state.gameMode==='hallBattles'&&battle&&!battle.ended&&battle.hallStage>=1&&battle.hallStage<=50&&!battle.riftEncounter&&!battle.whirlpoolEncounter&&!battle.enemies.some(e=>e.sparringId||e.riftKey||e.whirlpoolKey));
  const memory=u=>u.hallTactics||(u.hallTactics={regular:0,support:0,cooldown:0,pending:null,recovery:0});
  const negative=u=>[...new Set(ensureStatuses(u).filter(s=>STATUS_DEFS[s.type]?.negative&&!s.type.startsWith('hallThreat')).map(s=>s.type))];
  const physical=a=>a.scaling==='str'||a.kind==='melee'||a.element==='Physical';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function identity(u){
    const role=enemyAbilityProfile(u)?.role||u.role;
    if(/Foreman|Brute|Knight|King|Golem/i.test(u.name))return 'executioner';
    if(/Brokk|Custodian|Sentinel|Guard/i.test(u.name)||['tank','healer','support'].includes(role))return 'protector';
    if(/Auditor|Assassin|Poison|Venom|Wraith|Shade|Stalker/i.test(u.name)||role==='dps')return 'hunter';
    if(['caster','controller','mage'].includes(role)||u.stats?.mag>u.stats?.str*1.2)return 'ritual';
    return 'executioner';
  }
  const labels={hunter:'Affliction Hunter',executioner:'Executioner',ritual:'Ritual Caster',protector:'Protector'};
  function traitText(u){const role=identity(u);return role==='hunter'?'+10% damage per different debuff on the target (maximum +30%); Echo excluded.':role==='executioner'?'Announced finishers deal +25% against Broken or physically vulnerable targets; regular attacks do not gain this bonus.':role==='ritual'?'Announced rituals gain +20% with Magic Up or Damage Up. Dispel removes the bonus; Silence interrupts.':'Alternates protection, healing or cleansing with an attack; cannot repeatedly spend every action on support.';}
  for(let i=0;i<12;i++){
    const type='hallThreat'+i;
    STATUS_DEFS[type]={label:'Finisher Target',short:'TARGET',negative:true,duration:2,color:'#ffcb70'};
    statusIconAliases[type]='marked';CLEANSE_PRIORITY[type]=98;
  }
  function removeMark(u,p){if(p?.target)p.target.statuses=ensureStatuses(p.target).filter(s=>s.type!==p.mark);}
  function cancel(u,reason){const d=memory(u),p=d.pending;if(!p)return;
    removeMark(u,p);d.pending=null;d.recovery=1;d.cooldown=2;
    if(battle.hallUltimateOwner===u)delete battle.hallUltimateOwner;
    d.recoveryFrom=p.action.name;d.interrupted=true;
    window.FinisherFlow?.cancel(u,reason);
  }
  function requirements(u,p){return p.scope==='all-allies'?battle.party.some(t=>t.hp>0):p.target?.hp>0&&statusOf(p.target,p.mark);}
  function conditions(u,t){const role=identity(u);return role==='hunter'?negative(t).length>=2:role==='executioner'?statusOf(t,'broken')||statusOf(t,'physicalVulnerability'):role==='ritual'?statusOf(u,'magicUp')||statusOf(u,'damageUp'):false;}
  function basic(u){const magic=!statusOf(u,'silence')&&u.stats.mag>u.stats.str*1.2;let a={...enemyActionForKind(u,magic?'magic':'melee')};
    if(!enemyCanAfford(u,a))a={...enemyActionForKind(u,'melee')};
    return {...a,coefficient:Math.min(.95,a.coefficient||.9),payoff:null,payoffMultiplier:1,critBonus:0};
  }
  function prepare(u,a,t,ultimate){return {kind:'utility',name:a.name+' — preparing',element:a.element,mpCost:0,endgameEffect:'hallFinisherPrepare',hallPlan:{action:{...a,target:a.allTargets?null:t},target:a.allTargets?null:t,ultimate},noTempo:true};}
  const oldRhythm=stageRhythmAction;
  stageRhythmAction=function(u){return active()?null:oldRhythm(u);};
  const oldChoose=chooseEnemyAction;
  chooseEnemyAction=function(u){
    if(!active())return oldChoose(u);
    const d=memory(u),turn=currentTurn();let a;
    const stamp=result=>{if(u.enemyTempoAction?.battle===battle)u.enemyTempoAction.action=result;d.chosen={turn,action:result};return result;};
    if(turn?.enemyTempo){a=oldChoose(u);return stamp({...a,noCrit:true,hallEcho:true,payoff:null,extraStatuses:[],status:null,breakPower:0,noTempo:true});}
    if(d.pending){
      const p=d.pending;
      const control=['stun','sleep',...(!physical(p.action)?['silence']:[])].find(type=>statusOf(u,type));
      if(!requirements(u,p)||control)cancel(u,control||(p.target?.hp<=0?'target':'cleanse'));
      else if(p.targets.some(t=>t.hp>0&&(t.hallResponseCount||0)<=(p.responses[t.id]||0)))return stamp({kind:'utility',name:'Holding '+p.action.name+' — awaiting response',element:p.action.element,mpCost:0,noTempo:true});
      else {
        a={...p.action,...(p.scope==='single'?{target:p.target}:{}),hallFinisher:true,noTempo:true,noCrit:true,payoff:null,payoffMultiplier:1,critBonus:0};
        // Conditions are checked again at impact: cleanse/dispel can remove the bonus.
        return stamp(FinisherFlow.execute(u,a));
      }
    }
    if(d.recovery){d.recovery=0;applyStatus(u,'physicalVulnerability',u,{force:true,value:.15,duration:1});applyStatus(u,'magicVulnerability',u,{force:true,value:.15,duration:1});
      const name=d.recoveryFrom||'the finisher';for(const type of ['physicalVulnerability','magicVulnerability']){const status=statusOf(u,type);if(status){status.recoveryOpening=true;status.finisherName=name;}}return stamp({kind:'utility',name:'Recovery Opening',recoveryFrom:name,recoveryInterrupted:d.interrupted,element:'Physical',mpCost:0,noTempo:true});}
    if(battle.hallUltimateOwner?.hp<=0||!battle.enemies.includes(battle.hallUltimateOwner))delete battle.hallUltimateOwner;
    a={...oldChoose(u)};
    // The dragon's native gathering action is already its preparation turn.
    // Fold that buff into this one windup instead of announcing a second windup.
    if(enemyAbilityProfile(u)?.telegraphUltimate&&u.ultimateTelegraphed&&a.kind==='buff')a={...enemyActionForKind(u,'ultimate'),prepareBuffs:a.buffs};
    // Keep a full team meter reserved for the already announced Ultimate.
    if(a.kind==='ultimate'&&battle.hallUltimateOwner&&battle.hallUltimateOwner!==u)a=basic(u);
    if(statusOf(u,'silence')&&!physical(a))a={...enemyActionForKind(u,'melee')};
    const support=!enemyActionDealsDamage(a);
    if(support&&d.support>=1&&!(a.healing&&d.support<2&&battle.enemies.some(ally=>ally.hp>0&&ally.hp<ally.max*.32)))a=basic(u);
    // Utility debuffs also exert modest pressure; slow alone is no longer a whole action.
    if(a.kind==='utility'&&!a.endgameEffect&&(a.status||a.extraStatuses?.length)){
      const melee=u.stats.str>=u.stats.mag;
      a={...a,kind:melee?'melee':'magic',scaling:melee?'str':'mag',coefficient:.55};
    }
    if(a.status?.type==='agilityDown')a.status={type:physical(a)?'physicalVulnerability':'magicVulnerability',chance:.7,duration:2,value:.2};
    if(u.name==='Dock Foreman'&&a.name==='Anchor Chain')a={...a,kind:'melee',scaling:'str',element:'Physical',coefficient:.6,extraStatuses:[...(a.extraStatuses||[]),{type:'physicalVulnerability',chance:.8,duration:2,value:.2}]};
    // Later ordinary strikes can build a readable role-specific combination.
    if(enemyActionDealsDamage(a)&&a.kind!=='ultimate'&&d.regular%3===2){
      const role=identity(u),extra=role==='executioner'?{type:'physicalVulnerability',value:.2,duration:2,chance:.7}:role==='hunter'?{type:'magicVulnerability',value:.2,duration:2,chance:.65}:role==='ritual'?{type:'silence',duration:1,chance:.55}:{type:'disrupted',value:.15,duration:2,chance:.7};
      a.extraStatuses=[...(a.extraStatuses||[]),extra];
    }
    if(battle.round===1){
      if(['stun','sleep'].includes(a.status?.type))a.status=null;
      a.extraStatuses=(a.extraStatuses||[]).filter(s=>!['stun','sleep'].includes(s.type));
    }
    const candidates=battle.party.filter(t=>t.hp>0),t=a.target&&candidates.includes(a.target)?a.target:chooseEnemyTarget(u,a,candidates);
    const isUlt=(a.kind==='ultimate'||a.isUltimate)&&enemyActionDealsDamage(a);
    const combo=d.regular>=2&&!d.cooldown&&candidates.find(t=>conditions(u,t));
    const heavy=enemyActionDealsDamage(a)&&((a.coefficient||0)>=1.2||a.payoff&&candidates.some(t=>enemyPayoffMatches(a,t)));
    const pendingCount=battle.enemies.filter(e=>e.hp>0&&memory(e).pending).length;
    if((isUlt||combo||heavy)&&t&&pendingCount<(battle.hallStage<=10?1:2)){
      let finisher=isUlt||heavy?a:{...basic(u),name:basic(u).name,coefficient:1.2,breakPower:physical(a)?2:1};
      if(!isUlt&&!heavy)finisher.target=combo;
      if(battle.round===1){a=basic(u);}else return stamp(prepare(u,finisher,finisher.target||t,isUlt));
    }else if(isUlt||heavy)a=basic(u);
    return stamp(a);
  };
  const oldEffect=endgameResolveEnemyEffect;
  endgameResolveEnemyEffect=function(u,a,t){
    if(!active()||a.endgameEffect!=='hallFinisherPrepare')return oldEffect(u,a,t);
    const plan=a.hallPlan,d=memory(u),target=plan.target,index=battle.enemies.indexOf(u),mark='hallThreat'+index;
    const all=enemyActionHitsAll(u,plan.action),targets=all?battle.party.filter(t=>t.hp>0):[target];
    d.pending={...plan,target:all?null:target,scope:all?'all-allies':'single',mark,targets,responses:Object.fromEntries(targets.map(t=>[t.id,t.hallResponseCount||0]))};
    if(!all){applyStatus(target,mark,u,{force:true,duration:2});statusOf(target,mark).finisherName=plan.action.name;}
    FinisherFlow.begin(u,{name:plan.action.name,scope:all?'all-allies':'single',target:all?null:target,mark:all?null:mark,controls:['stun','sleep',...(!physical(plan.action)?['silence']:[])],recoveryText:'its next action is recovery; incoming damage +15% during Recovery Opening',cancel:reason=>cancel(u,reason),clear:()=>{removeMark(u,d.pending);d.pending=null;if(battle.hallUltimateOwner===u)delete battle.hallUltimateOwner;},after:()=>{d.cooldown=3;d.recovery=1;d.recoveryFrom=plan.action.name;d.interrupted=false;},afterText:`${plan.action.name} resolved. Recovery follows on its next action.`});
    if(plan.ultimate)battle.hallUltimateOwner=u;
    if(plan.action.prepareBuffs?.length)enemyApplyBuffs(u,[u],plan.action.prepareBuffs);
    const counter=all?(physical(plan.action)?'Guard or Stun the attacker.':'Guard or Silence/Stun the caster.'):(physical(plan.action)?'Guard, cleanse the target mark, or Stun the attacker.':'Guard, cleanse the target mark, or Silence/Stun the caster.');
    receptionAnnounce(plan.action.name+' — NEXT ACTION',`${u.name} → ${all?'ALL ALLIES':target.name}. Each threatened hero gets a response action first. ${counter}`);
    return ` ${u.name} begins preparing ${plan.action.name}. Target: ${all?'ALL ALLIES':target.name}.`;
  };
  const oldStart=processTurnStart;
  processTurnStart=function(u){const result=oldStart(u);if(active()){
    u.hallSkipped=!!result.skip;
    const p=memory(u).pending;
    if(p&&(result.skip||!physical(p.action)&&statusOf(u,'silence')))cancel(u,['stun','sleep','silence'].find(type=>statusOf(u,type))||'attacker interrupted');
  }return result;};
  const oldEnd=processTurnEnd;
  processTurnEnd=function(u){
    if(!active())return oldEnd(u);
    const held=ensureStatuses(u).filter(s=>s.type.startsWith('hallThreat')&&battle.enemies.some(e=>e.hp>0&&memory(e).pending?.mark===s.type&&memory(e).pending.target===u));
    const before=held.map(s=>s.remaining),result=oldEnd(u);
    held.forEach((s,i)=>{if(!u.statuses.includes(s))u.statuses.push(s);s.remaining=before[i];});return result;
  };
  const oldApply=applyStatus;
  applyStatus=function(u,type,source,options){const result=oldApply(u,type,source,options);if(active()&&result.applied&&memory(u).pending&&(['stun','sleep'].includes(type)||type==='silence'&&!physical(memory(u).pending.action)))cancel(u,type);return result;};
  const oldComplete=completeBattleAction;
  completeBattleAction=function(log){const scoped=active(),turn=currentTurn(),u=turn?.side==='party'?battle.party.find(p=>p.id===turn.id):battle?.enemies?.[turn?.index];
    const chosen=u?.hallTactics?.chosen;let result=oldComplete(log);
    if(!scoped||!u)return result;
    if(turn.side==='party'&&!u.hallSkipped&&u.hp>0)u.hallResponseCount=(u.hallResponseCount||0)+1;
    else if(turn.side==='enemy'&&!turn.enemyTempo&&chosen?.turn===turn){const d=memory(u),a=chosen.action;
      if(!a.noTempo){d.cooldown=Math.max(0,d.cooldown-1);if(enemyActionDealsDamage(a)){d.regular++;d.support=0;}else d.support++;}
    }
    return result;
  };
  const oldCrit=enemyActionCrit;
  enemyActionCrit=function(u,a,t){return active()&&(a.noCrit||battle.round===1)?false:oldCrit(u,a,t);};
  const oldRoll=enemyDamageRoll;
  enemyDamageRoll=function(u,a,t){
    if(!active())return oldRoll(u,a,t);
    let result=oldRoll(u,a,t),factor=.85;
    if(result.critical)factor*=1.35/((u.levelHint||0)>20?1.5:2);
    if(!a.hallEcho){
      if(identity(u)==='hunter')factor*=1+Math.min(3,negative(t).length)*.1;
      if(a.hallFinisher&&identity(u)==='executioner'&&(statusOf(t,'broken')||statusOf(t,'physicalVulnerability')))factor*=1.25;
      if(a.hallFinisher&&identity(u)==='ritual'&&(statusOf(u,'magicUp')||statusOf(u,'damageUp')))factor*=1.2;
    }
    return {...result,damage:Math.max(1,Math.round(result.damage*factor))};
  };
  const oldTip=statusTooltipHtml;
  statusTooltipHtml=function(u){let html=oldTip(u);if(active()&&battle.enemies.includes(u))html+=`<section><b>${labels[identity(u)]}</b><p>${esc(traitText(u))}</p>${identity(u)==='hunter'?battle.party.filter(t=>t.hp>0).map(t=>`<small>${esc(t.name)}: +${Math.min(3,negative(t).length)*10}% (${negative(t).length} different debuffs)</small>`).join(''):''}</section>`;return html;};
  const oldDisplay=statusDisplayData;
  statusDisplayData=function(u,s){const data=oldDisplay(u,s);if(s.recoveryOpening)return {...data,name:'Recovery Opening',description:"Recovery after "+s.finisherName+": damage received +15%."};if(s.type.startsWith('hallThreat'))return {...data,name:(s.finisherName||'Finisher')+' Target',compact:'!',timing:'Until the announced attack, or cleansed',description:`${s.finisherName||'The announced attack'} targets ${u.name}. Guard, cleanse this mark, or interrupt the attacker.`};if(active()&&s.type==='physicalVulnerability')data.description=`Takes ${Math.round(statusValue(u,s.type)*100)}% more physical damage. Cleanse removes this vulnerability.`;if(active()&&s.type==='magicVulnerability')data.description=`Takes ${Math.round(statusValue(u,s.type)*100)}% more magical damage. Cleanse removes this vulnerability.`;return data;};
  const oldHud=updateBossMechanicDisplay;
  updateBossMechanicDisplay=function(){if(!active())return oldHud();const hud=document.getElementById('bossMechanicHud');if(!hud)return;
    const warnings=battle.enemies.filter(e=>e.hp>0&&memory(e).pending);
    hud.classList.toggle('hidden',!warnings.length);document.querySelector('.game')?.classList.toggle('has-early-mechanics',!!warnings.length);document.querySelector('.game')?.classList.toggle('has-endgame-mechanics',!!warnings.length);
    const html=warnings.map(e=>{const p=memory(e).pending,waiting=p.targets.filter(t=>t.hp>0&&(t.hallResponseCount||0)<=(p.responses[t.id]||0));return `<div class="boss-mechanic-panel is-warning"><strong>${esc(e.name)} → ${esc(p.scope==='all-allies'?'ALL ALLIES':p.target.name)} · ${esc(p.action.name)}</strong><p>${waiting.length?'NEXT ACTION · Waiting for '+waiting.map(t=>esc(t.name)).join(', ')+' to respond':'NEXT ENEMY ACTION · READY'} · Guard / ${p.scope==='single'?'cleanse the target mark / ':''}${physical(p.action)?'Stun':'Silence or Stun'}. ${esc(traitText(e))}</p></div>`;}).join('');
    if(hud.innerHTML!==html)hud.innerHTML=html;
  };
  const oldLexicon=hallLexiconHtml;
  hallLexiconHtml=function(){let html=oldLexicon();if(lexiconStage>=1&&lexiconStage<=50){const template=document.createElement('template');template.innerHTML=html;const info=hallBattleInfo(lexiconStage),units=[info.enemies,...info.waves].flatMap((keys,phase)=>hallEnemiesForStage(lexiconStage,keys,phase));[...template.content.querySelectorAll('.archive-enemy')].forEach((detail,i)=>{const u=units[i];if(!u)return;detail.querySelector('.archive-rule')?.remove();const p=document.createElement('p');p.className='archive-rule';p.textContent=labels[identity(u)]+': '+traitText(u)+' Heavy attacks and Ultimates are announced, allowing a response before impact. Dispel Battle Echo; Echo cannot crit or inherit finisher bonuses.';detail.querySelector('.archive-stats')?.after(p);});html=template.innerHTML;}return html;};
  window.HallTactics={active,identity,traitText,negative,memory,cancel};
})();
