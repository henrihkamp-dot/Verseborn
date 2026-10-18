// Presentation metadata only. Native skill objects, formulas and execution remain authoritative.
(() => {
  'use strict';
  const categories = [
    {id:'attack',label:'Attack',kind:'Weapon action',color:'#f4c878'},
    {id:'defend',label:'Defend',kind:'Guard',color:'#e8bf6c'},
    {id:'spell',label:'Spell',kind:'DPS Spell',color:'#c18aff'},
    {id:'heal',label:'Heal',kind:'Healing',color:'#7ae1bb'},
    {id:'buffDebuff',label:'Buff / Debuff',kind:'Buff / Debuff',color:'#e8bf6c'},
    {id:'utility',label:'Utility',kind:'Utility',color:'#81d5f3'},
    {id:'ultimate',label:'Ultimate',kind:'Ultimate',color:'#ef937f'}
  ];
  const scopes = {'self':'Self','single-ally':'Single Ally','all-allies':'All Allies','single-enemy':'Single Enemy','all-enemies':'All Enemies','all-combatants':'All Combatants','any-ally':'Any Ally','any-enemy':'Any Enemy'};
  const controlStatuses = new Set(['sleep','stun','silence']);
  // These established skills primarily manipulate turns, control or Resonance.
  // Assign once at definition time, never classify by display text during drawing.
  const primaryIntent = {'Hushed Refrain':'utility','Dreamdust':'utility','Silent Step':'utility','Oathbreak':'utility','Quiet Tithe':'utility'};
  function category(sk){
    if(sk.category && categories.some(c=>c.id===sk.category))return sk.category;
    if(sk.anim==='ultimate')return 'ultimate';
    if(sk.basicAttack)return 'attack';
    if(sk.power<0)return 'heal';
    if(sk.manaRecovery||sk.dispel||sk.cleanse||sk.encore||sk.immediateTurn)return 'utility';
    if(sk.statusOnly)return controlStatuses.has(sk.status?.type)?'utility':'buffDebuff';
    if(sk.anim==='block'||!skillTargetsEnemies(sk))return 'buffDebuff';
    return sk.anim==='melee'||skillScaling(sk)==='str'?'attack':'spell';
  }
  function scope(id,sk){
    if(sk.targetScope==='all-combatants')return 'all-combatants';
    // Native healing auto-selects the lowest-HP ally, except explicit Rift heals.
    if(sk.power<0){
      if(sk.partyWide||sk.targetSide==='party'||talentValue(id,'partyHeal',sk.name)>0)return 'all-allies';
      return sk.targetSide==='self'?'self':'single-ally';
    }
    if(skillTargetsEnemies(sk))return skillHitsAll(id,sk)?'all-enemies':'single-enemy';
    if(sk.partyWide||sk.targetSide==='party')return 'all-allies';
    return sk.targetSide==='ally'?'single-ally':'self';
  }
  function metadata(id,sk){
    const primary=category(sk),memberships=new Set([primary]);
    if(sk.anim==='ultimate')return {...sk,category:'ultimate',categories:['ultimate'],targetScope:scope(id,sk),targetPolicy:sk.power<0&&!sk.partyWide&&sk.targetSide!=='self'?'lowest-hp':null};
    const damaging=skillTargetsEnemies(sk)&&!sk.dispel&&!sk.statusOnly&&!sk.manaRecovery;
    if(damaging)memberships.add(sk.basicAttack||skillScaling(sk)==='str'?'attack':'spell');
    if(sk.power<0)memberships.add('heal');
    const statuses=[...(sk.status?[sk.status]:[]),...(sk.extraStatuses||[])];
    if(sk.buffs?.length||sk.grantsWard||sk.anim==='block'||statuses.some(s=>!controlStatuses.has(s.type)))memberships.add('buffDebuff');
    if(sk.cleanse||sk.dispel||sk.manaRecovery||sk.immediateTurn||sk.encore||sk.enemyResonanceClear||sk.enemyResonanceDrainRatio||sk.enemyResonanceLock||statuses.some(s=>controlStatuses.has(s.type)))memberships.add('utility');
    return {...sk,category:primary,categories:[...memberships],targetScope:scope(id,sk),
      targetPolicy:sk.power<0&&!sk.partyWide&&sk.targetSide!=='self'&&!(sk.riftSecret&&sk.targetSide==='ally')?'lowest-hp':null};
  }
  function annotate(sk){if(sk&&typeof sk==='object'&&sk.name&&sk.anim){if(primaryIntent[sk.name])sk.category=primaryIntent[sk.name];else sk.category=category(sk);}}
  Object.values(baseJobs).forEach(h=>h.skills.forEach(annotate));
  Object.values(talentTrees).flat().forEach(n=>annotate(n.value));
  Object.values(rank0Choices).flat().forEach(annotate);
  Object.values(TRANSFORMED_SKILLS).flat().forEach(annotate);
  const nativeSkills=battleSkills;
  battleSkills=function(id,unit){return nativeSkills(id,unit).map(sk=>metadata(id,sk));};
  function loadout(unit){
    const known=battleSkills(unit.id,unit),saved=progressFor(unit.id).battleLoadout;
    // Optional future per-category slots. Absent legacy field means every learned
    // action remains equipped. No migration, deletion or implicit one-skill limit.
    const equipped=!saved||unit.form?known:known.filter(sk=>sk.basicAttack||!Object.prototype.hasOwnProperty.call(saved,sk.category)||
      (Array.isArray(saved[sk.category])?saved[sk.category]:[saved[sk.category]]).includes(sk.actionId||sk.name));
    return {known,equipped,available:equipped};
  }
  function reason(unit,sk){
    if(!unit||unit.hp<=0)return 'Fallen';
    if(sk.oncePerBattle&&battle.usedOnce?.[sk.oncePerBattle])return 'Already used';
    if(sk.encore&&!battle.lastSupport)return 'No support to repeat';
    if((sk.immediateTurn||sk.encore&&battle.lastSupport?.immediateTurn)&&!canGrantImmediateTurn())return 'No extra action available';
    if(endgameSilenceBlocks(unit,sk))return 'Silenced';
    if(statusOf(unit,'skillRecord')?.skillName===sk.name)return 'Skill sealed';
    if(sk.otherAllyOnly&&!battle.party.some(a=>a!==unit&&a.hp>0))return 'Needs another ally';
    if(sk.anim==='ultimate'&&state.resonance<100)return 'Needs 100 Resonance';
    if(sk.anim!=='ultimate'&&skillMpCost(unit.id,sk,unit)>unit.mp)return 'Not enough MP';
    return '';
  }
  function groups(unit){const skills=loadout(unit).available;return categories.map(c=>({...c,actions:skills.filter(sk=>sk.categories.includes(c.id))})).filter(c=>c.actions.length);}
  function targets(unit,sk){
    if(sk.targetScope==='all-combatants')return [...battle.party,...battle.enemies].filter(a=>a.hp>0);
    if(sk.targetScope.endsWith('enemy')||sk.targetScope==='all-enemies')return battle.enemies.filter(a=>a.hp>0);
    if(sk.targetScope==='self')return [unit];
    const allies=battle.party.filter(a=>(a.hp>0||sk.revive)&&(!sk.otherAllyOnly||a!==unit));
    return sk.targetPolicy==='lowest-hp'?allies.filter(a=>a.hp>0).sort((a,b)=>a.hp/a.max-b.hp/b.max).slice(0,1):allies;
  }
  window.BattleActionModel={categories,scopes,metadata,loadout,groups,reason,targets};
})();
