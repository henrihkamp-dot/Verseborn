// Ember Rift is a separate path. Normal Hall records and Shadow Trials keep their own progression.
(() => {
  const BASE = 'assets/rift/', MAP = 'emberRiftVault';
  const roster = {
    stalker: {name:'Ash Quarter Stalker',hp:5400,str:170,mag:125,agi:110,stam:170,weak:'Holy Fire',family:'physical',role:'fighter'},
    brute: {name:'Ash Quarter Brute',hp:7800,str:205,mag:90,agi:75,stam:230,weak:'Earth',family:'physical',role:'tank'},
    hunter: {name:'Ashblade Hunter',hp:9200,str:225,mag:145,agi:140,stam:180,weak:'Ancient Fire',family:'physical',role:'assassin',elite:true},
    warden: {name:'Bronze-bound Warden',hp:16000,str:230,mag:110,agi:85,stam:290,weak:'Sound',family:'mechanical',role:'tank',boss:true},
    engine: {name:'Debt Engine / Rift Echo',hp:25000,str:145,mag:245,agi:90,stam:240,weak:'Tech',family:'mechanical',role:'controller',boss:true},
    velourne: {name:'Lord Velourne / Rift Echo',hp:22500,str:120,mag:250,agi:120,stam:195,weak:'Holy Fire',family:'occult',role:'controller',boss:true},
    dragon: {name:'Ash Quarter Dragon',hp:32000,str:220,mag:260,agi:105,stam:250,weak:'Sound',family:'dragon',role:'caster',boss:true},
    pursuer: {name:'Reverie Pursuer',hp:5200,str:190,mag:95,agi:125,stam:150,weak:'Holy Fire',family:'physical',role:'assassin'},
    collector: {name:'Debt Collector',hp:7200,str:185,mag:125,agi:85,stam:225,weak:'Tech',family:'mechanical',role:'tank'},
    fae: {name:'Thornlight Fae',hp:5000,str:85,mag:205,agi:135,stam:130,weak:'Tech',family:'nature',role:'healer'},
    elf: {name:'Thornmoon Duelist',hp:7400,str:225,mag:140,agi:135,stam:165,weak:'Tech',family:'nature',role:'fighter'},
    mushroom: {name:'Sporecap Keeper',hp:8000,str:135,mag:195,agi:75,stam:200,weak:'Ancient Fire',family:'nature',role:'controller'},
    bear: {name:'Maulback Bear',hp:10000,str:245,mag:100,agi:75,stam:240,weak:'Sound',family:'physical',role:'bruiser'},
    raccoon: {name:'Ragmask Bandit',hp:5600,str:200,mag:125,agi:145,stam:145,weak:'Earth',family:'physical',role:'assassin'},
    rabbit: {name:'Warren Lancer',hp:6200,str:215,mag:120,agi:150,stam:150,weak:'Earth',family:'physical',role:'assassin'},
    squirrel: {name:'Acorn Sharpshot',hp:5400,str:185,mag:180,agi:135,stam:140,weak:'Ancient Fire',family:'nature',role:'ranger'},
    benji: {name:'Benji / Hearthbound Echo',hp:26000,str:115,mag:245,agi:85,stam:275,weak:'Sound',family:'hearth',role:'healer',boss:true,cameo:true},
    pippa: {name:'Pippa / Hearthbound Echo',hp:19500,str:175,mag:230,agi:135,stam:190,weak:'Earth',family:'mechanical',role:'caster',boss:true,cameo:true},
    mina: {name:'Mina / Hearthbound Echo',hp:12000,str:90,mag:210,agi:115,stam:160,weak:'Tech',family:'hearth',role:'controller',cameo:true},
    sella: {name:'Sella / Hearthbound Echo',hp:11500,str:75,mag:215,agi:90,stam:185,weak:'Sound',family:'hearth',role:'healer',cameo:true}
  };
  const encounters = [
    {id:1,name:'Beyond the Last Ember',difficulty:'Endgame I',preview:'pursuer',waves:[['pursuer','stalker'],['brute','stalker']],mechanic:'hunt',strike:'Coordinated Ambush',hint:'The leader marks a target before the ambush. Cleanse the mark, Break the leader, or Guard. Bleed makes sustained healing important.'},
    {id:2,name:'The Mycelial Choir',difficulty:'Endgame II',preview:'mushroom',waves:[['mushroom','fae','elf'],['mushroom','fae']],mechanic:'spores',strike:'Spore Bloom',hint:'Sporecap Keepers prepare a group Poison bloom. Silence interrupts it. Remove healers and cleanse Poison before it compounds.'},
    {id:3,name:'Thornmoon Vanguard',difficulty:'Endgame III',preview:'bear',waves:[['rabbit','elf','fae'],['bear','elf']],mechanic:'armor',strike:'Rampart Shatter',hint:'The leader has a removable armour blessing. Fresh Break opens a vulnerable recovery window; Sound and Tech weaknesses reward a mixed party.'},
    {id:4,name:'The Ragmask Road',difficulty:'Endgame IV',preview:'raccoon',waves:[['raccoon','squirrel','pursuer'],['rabbit','raccoon','squirrel']],mechanic:'crossfire',strike:'Marked Crossfire',hint:'Cleanse the announced mark or prepare Guard. Ranged attackers pressure MP and the bandit adds Bleed; protect your healer.'},
    {id:5,name:'The Obedience Knot',difficulty:'Endgame V / Elite',preview:'warden',waves:[['hunter','brute'],['warden','hunter','stalker']],mechanic:'knot',strike:'Bound Judgment',hint:'Living escorts reinforce the Warden. Defeat them, dispel its armour and build Break. Silence does not stop the physical Judgment.'},
    {id:6,name:'The Overdue Engine',difficulty:'Endgame VI / Boss',preview:'engine',waves:[['collector','collector','pursuer'],['engine','collector']],mechanic:'debt',strike:'Debt Collection',hint:'MP-spending actions build cleansable Debt. The Engine collects it with a delayed strike. Silence the charge, cleanse Debt and exploit its exposed machinery.'},
    {id:7,name:'Ash Quarter Reborn',difficulty:'Endgame VII / Boss',preview:'dragon',waves:[['hunter','brute'],['dragon'],['dragon','stalker']],mechanic:'breath',strike:'Vortex Breath',hint:'The dragon announces group breath. Break or Silence cancels it; Guard and barriers soften it. Its weakness changes in the final phase.'},
    {id:8,name:'The Broken Contract',difficulty:'Endgame VIII / Boss',preview:'velourne',waves:[['collector','hunter'],['velourne','collector'],['velourne']],mechanic:'contract',strike:'Contract Collapse',hint:'Velourne steals a valuable blessing and binds a marked target. Cleanse the mark, dispel stolen buffs and interrupt the magical collapse.'},
    {id:9,name:'Hearthbound Visitors',difficulty:'Endgame IX / Easter Egg',preview:'benji',waves:[['pippa','mina','sella'],['benji','pippa']],mechanic:'hearth',strike:'The Hearth Holds',hint:'Four noncanonical Hearthbound Hero echoes test your party. Benji and Sella sustain their team; Silence, dispels and focused damage counter their prepared shelter.'},
    {id:10,name:'Heart of the Vortex',difficulty:'Endgame X / Finale',preview:'dragon',waves:[['warden','hunter'],['engine','collector'],['velourne','hunter'],['dragon']],mechanic:'finale',strike:'Rift Cataclysm',hint:'Four phases combine escort shields, Debt, stolen blessings and vortex breath. Keep MP, healing and cleansing available. Fresh Break creates the best damage windows.'}
  ];
  const rewardSpecs = [
    ['Ashwake Signet','ring','weaknessDamage',.24,'+24% weakness damage'],
    ['Mycelial Heart','necklace','healPower',.25,'+25% healing potency'],
    ['Thornmoon Bastion','armour','blockPower',.22,'Stronger personal Guard'],
    ['Ragmask True-Sight','helmet','allStatusResistance',.2,'20% all-status application resistance'],
    ['Obedience Breaker','weapon','physicalDamage',.25,'+25% physical damage'],
    ['Debtless Gearheart','ring','mpEfficiency',.2,'20% lower skill MP cost'],
    ['Ash Quarter Heartfire','necklace','ultimateDamage',.25,'+25% ultimate damage'],
    ['Unbound Pact Mantle','armour','allStatusResistance',.25,'25% all-status application resistance'],
    ['Hearthbound Covenant','helmet','healPower',.3,'+30% healing potency'],
    ['Last Verse of the Rift','weapon','weaknessDamage',.35,'+35% weakness damage']
  ];
  const rewards = rewardSpecs.map(([name,slot,type,value,label],i) => {
    // A fixed Rift tier: every base stat exceeds the 51–60 Hall Artifact base-stat ceiling.
    const floor=48+i*3,stats={str:floor,mag:floor,stam:floor+8,agi:floor,echo:floor+4};
    const gear=item(name,slot,stats,'An exclusive Rift Artifact. First-clear reward; tempered only at the Rift Forge.',[{type,value,label},{type:'weaknessDamage',value:.12,label:'+12% weakness damage'}]);
    gear.riftArtifact=true;gearDb[slot].push(gear);return gear;
  });
  const oldNormalize=normalizeHallBattleProgress;
  const oldHealing=healingAmount,oldMpCost=skillMpCost,oldUltimate=ultimatePotencyMultiplier;
  healingAmount=function(id,...args){return Math.round(oldHealing(id,...args)*(1+effectValue(id,'healPower')));};
  skillMpCost=function(id,skill,...args){const cost=oldMpCost(id,skill,...args);return Math.max(cost>0?1:0,Math.round(cost*(1-Math.min(.4,effectValue(id,'mpEfficiency')))));};
  ultimatePotencyMultiplier=function(id,...args){return oldUltimate(id,...args)*(1+effectValue(id,'ultimateDamage'));};
  normalizeHallBattleProgress=function(data){
    const hall=oldNormalize(data),old=hall.rift&&typeof hall.rift==='object'&&!Array.isArray(hall.rift)?hall.rift:{};
    hall.rift={...old,unlocked:Boolean(old.unlocked)||HALL_BATTLE_BLUEPRINTS.every(info=>hall.clearedStages.includes(info.stage)),cleared:[...new Set((Array.isArray(old.cleared)?old.cleared:[]).filter(id=>Number.isInteger(id)&&id>=1&&id<=10))].sort((a,b)=>a-b),shards:Math.max(0,Math.floor(Number(old.shards)||0)),forged:old.forged&&typeof old.forged==='object'?old.forged:{}};
    return hall;
  };
  const progress=()=>hallBattleProgress().rift;
  const available=id=>progress().unlocked&&(progress().cleared.includes(id)||Array.from({length:id-1},(_,i)=>i+1).every(n=>progress().cleared.includes(n)));
  const oldRecord=recordHallBattleClear;
  recordHallBattleClear=function(stage){const was=progress().unlocked,result=oldRecord(stage);if(!was&&progress().unlocked)showHudNotice('The rear flame shield is unsealed. Return to the back of Ember Hall.');return result;};
  maps[MAP]={...maps.emberHallBattles,name:'Ember Rift — The Revealed Vault',chapter:'Ember Rift',points:[],spawns:[],exits:[]};
  const images={},sheets={},effects={},portraits={};let assetsReady=false,assetFailure=null,selected=1,doorStart=null,manifest;
  const loadImage=(key,file)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[key]=image;resolve(image);};image.onerror=()=>reject(Error('Rift asset missing: '+file));image.src=BASE+file;});
  const ready=fetch(BASE+'manifest.json?v=ember-rift-1').then(r=>{if(!r.ok)throw Error('Rift asset manifest unavailable');return r.json();}).then(async data=>{
    manifest=data;await Promise.all([...Object.entries(data.characters).map(async([key,config])=>{sheets[key]={...config,image:await loadImage(key,config.file)};}),...Object.entries(data.effects).map(async([key,config])=>{effects[key]={...config,image:await loadImage('vfx:'+key,config.file)};}),...Object.entries(data.environment).map(([key,file])=>loadImage(key,file))]);
    assetsReady=true;for(const key of Object.keys(roster)){const sheet=sheets[key],cell=sheet.cells[0],c=document.createElement('canvas');c.width=180;c.height=180;const dc=c.getContext('2d');dc.imageSmoothingEnabled=false;dc.drawImage(sheet.image,...cell,0,0,180,180);portraits[key]=c.toDataURL('image/png');}
    if(mode==='hallMap'&&el.menu.dataset.menuView==='rift-path')renderSelection();
  }).catch(error=>{assetFailure=error;console.error(error);});
  const oldPortrait=enemyPortraitDataUrl;
  enemyPortraitDataUrl=function(name){const key=Object.keys(roster).find(k=>roster[k].name===name);return key&&portraits[key]?portraits[key]:oldPortrait(name);};
  const picture=key=>portraits[key]||'';
  function close(){closeHallOverlay();saveGame(hallSaveKey());}
  function openSelection(){if(state.map!==MAP||!progress().unlocked)return false;mode='hallMap';heldDirection=null;fieldDestination=null;el.menu.classList.remove('hidden','is-shop');document.querySelector('.menu-tabs').classList.add('hidden');renderSelection();return true;}
  function renderSelection(){
    el.menu.dataset.menuView='rift-path';const p=progress(),info=encounters[selected-1];
    const cards=encounters.map(e=>`<button type="button" class="hall-stage rift-stage ${e.id===selected?'is-selected':''} ${p.cleared.includes(e.id)?'is-cleared':''}" data-rift-select="${e.id}" ${available(e.id)?'':'disabled'}><img src="${picture(e.preview)}" alt="${escapeMarkup(roster[e.preview].name)}"><span>RIFT ${String(e.id).padStart(2,'0')} · ${available(e.id)?p.cleared.includes(e.id)?'CLEARED / REPLAY':'AVAILABLE':'LOCKED'}</span><strong>${e.name}</strong><small>${e.difficulty} · ${e.waves.length} phases</small><i>First clear: ${rewards[e.id-1].name}</i></button>`).join('');
    const party=state.party.map(id=>`<button type="button" class="rift-member ${state.activeParty.includes(id)?'is-selected':''}" data-rift-member="${id}" aria-pressed="${state.activeParty.includes(id)}"><img src="${menuPortraitSource(id)}" alt="${id}"><strong>${id}</strong><small>Lv ${progressFor(id).level}</small></button>`).join('');
    const waves=info.waves.map((wave,i)=>`<li><b>Phase ${i+1}:</b> ${wave.map(key=>roster[key].name).join(' + ')}<small>Weak: ${[...new Set(wave.map(key=>roster[key].weak))].join(' / ')}${info.id===7&&i===2?' / Dragon shifts to Holy Fire':info.id===10&&i===3?' / Dragon shifts to Earth':''}</small></li>`).join('');
    el.menuBody.innerHTML=`<section class="hall-map rift-path"><header><div><strong>Ember Rift — Battle Path</strong><p>${p.cleared.length}/10 cleared · ${p.shards} Rift Shards</p></div><button type="button" data-rift-close aria-label="Return to the vortex room">X</button></header><div class="hall-stage-grid">${cards}</div><section class="rift-preparation"><div class="rift-preview"><img src="${picture(info.preview)}" alt="${escapeMarkup(roster[info.preview].name)}"><div><h3>${info.name}</h3><b>${info.difficulty} · Recommended Lv 40</b><p>${info.hint}</p><ul>${waves}</ul></div></div><section class="rift-reward"><b>Exclusive first-clear reward: ${rewards[selected-1].name}</b><p>Rift Artifact · ${Object.entries(rewards[selected-1].stats).map(([k,v])=>k.toUpperCase()+' +'+v).join(' / ')}<br>${gearEffects(rewards[selected-1]).map(e=>e.label).join(' / ')}<br>${20+selected*4} Rift Shards on first clear; ${4+selected} on replay. Temper Artifacts at the Rift Forge.</p></section><h3>Choose your party · ${state.activeParty.length}/3</h3><div class="rift-party">${party}</div><footer><span>${assetFailure?'Art could not load. Reload to retry.':assetsReady?'Prepare healing, defense and cleansing.':'Loading the finished art…'}</span><button type="button" data-rift-start ${available(selected)&&assetsReady&&state.activeParty.length?'':'disabled'}>Begin ${info.waves.length}-phase encounter →</button></footer></section></section>`;
    el.menuBody.querySelector('[data-rift-close]')?.addEventListener('click',close);
    el.menuBody.querySelectorAll('[data-rift-select]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.riftSelect);renderSelection();}));
    el.menuBody.querySelectorAll('[data-rift-member]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.riftMember;if(state.activeParty.includes(id)){if(state.activeParty.length>1)state.activeParty=state.activeParty.filter(n=>n!==id);}else if(state.activeParty.length<3)state.activeParty.push(id);else showHudNotice('Choose up to three party members.');renderSelection();}));
    el.menuBody.querySelector('[data-rift-start]')?.addEventListener('click',()=>startEncounter(selected));
  }
  function makeEnemy(key,id,phase=0,index=0){
    const profile=roster[key],health=1+(id-1)*.16+phase*.1,power=1+(id-1)*.055+phase*.02;
    return {...enemy(profile.name,profile.hp/3.15,profile.str,profile.weak,'#aa956e',profile.boss?3:profile.elite?2:1),riftKey:key,riftEncounter:id,riftPhase:phase,riftLeader:index===0,riftBoss:Boolean(profile.boss),riftBase:{hp:Math.round(profile.hp*health),str:Math.round(profile.str*power),mag:Math.round(profile.mag*power),agi:profile.agi,stam:Math.round(profile.stam*(1+(id-1)*.04))},levelHint:MAX_LEVEL,fixedLevel:true,resistanceTier:profile.boss?'boss':profile.elite?'elite':'normal',npcBoss:Boolean(profile.boss),weak:key==='dragon'&&id===7&&phase===2?'Holy Fire':key==='dragon'&&id===10?'Earth':profile.weak};
  }
  const oldPrepare=prepareEnemyForBattle;
  prepareEnemyForBattle=function(source,...args){const unit=oldPrepare(source,...args);if(source.riftKey){unit.hp=unit.max=developerScale('enemy','hp',source.riftBase.hp,1);unit.stats={str:source.riftBase.str,mag:source.riftBase.mag,agi:source.riftBase.agi,stam:source.riftBase.stam};unit.atk=unit.stats.str;unit.mp=unit.maxmp=240;unit.crit=.06;unit.baseEvasion=.035;unit.role=roster[source.riftKey].role;unit.xp=360;unit.breakThreshold=BREAK_THRESHOLD*(source.riftBoss?2:1);unit.combatPotency={damage:1,healing:1,ultimate:1};unit.riftState={pending:null,recovery:0};}return unit;};
  function startEncounter(id){
    if(!assetsReady||!available(id)||state.map!==MAP||!['hallMap','walk'].includes(mode)||!state.activeParty.length)return false;
    const info=encounters[id-1];if(!info)return false;saveGame(hallSaveKey());keys.clear();target=null;el.menu.classList.add('hidden');document.querySelector('.menu-tabs').classList.remove('hidden');
    const formations=info.waves.map((wave,phase)=>wave.map((key,index)=>makeEnemy(key,id,phase,index)));
    startBattle(`Rift ${id}/10 — ${info.name}`,formations[0],undefined,null,formations.slice(1).map((enemies,index)=>({name:`${info.name} — Phase ${index+2}/${formations.length}`,enemies})),{hallBoss:true,combatMapId:MAP,roundCap:100,riftEncounter:id});
    battle.riftEncounter=id;battle.phaseTotal=formations.length;renderBattle(info.hint);return true;
  }
  // New profiles are registered under their own names; existing enemy identities are untouched.
  for(const profile of Object.values(roster))enemyAbilityProfiles[profile.name]={role:profile.role,element:['mechanical'].includes(profile.family)?'Tech':profile.family==='nature'?'Earth':profile.family==='hearth'?'Sound':profile.family==='physical'?'Physical':'Shadow',maxMp:240,identity:{str:100,mag:100,agi:100,stam:100},moves:{},pattern:['melee','magic']};
  STATUS_DEFS.riftMark={label:'RIFT MARK',short:'RM',negative:true,duration:3,color:'#e1b55b',desc:'A delayed Rift strike targets this mark. Cleanse it to cancel the marked attack.'};
  STATUS_DEFS.riftDebt={label:'RIFT DEBT',short:'RD',negative:true,duration:3,color:'#b8a582',desc:'MP-spending actions accumulate Debt, increasing incoming Debt Collection damage. Cleanse removes it.'};
  statusIconAliases.riftMark='marked';statusIconAliases.riftDebt='disrupted';CLEANSE_PRIORITY.riftMark=94;CLEANSE_PRIORITY.riftDebt=93;
  function announce(title,text){battle.riftNotice={title,text};}
  function interrupt(unit,reason='interrupted'){
    const data=unit.riftState;if(!data?.pending)return false;const pending=data.pending;data.pending=null;data.recovery=2;
    if(pending.target)pending.target.statuses=ensureStatuses(pending.target).filter(s=>s.type!=='riftMark');
    applyStatus(unit,'physicalVulnerability',unit,{force:true,value:.25,duration:2});applyStatus(unit,'magicVulnerability',unit,{force:true,value:.25,duration:2});
    announce('Recovery window',`${unit.name}: ${reason}. The prepared attack is cancelled; incoming damage is increased for two own actions.`);return true;
  }
  const oldApply=applyStatus;
  applyStatus=function(unit,type,source,options){const result=oldApply(unit,type,source,options);if(result.applied&&unit?.riftKey&&unit.riftState?.pending&&(['stun','sleep'].includes(type)||type==='silence'&&unit.riftState.pending.kind==='magic'))interrupt(unit,type);return result;};
  const oldBreak=addBreakProgress;
  addBreakProgress=function(source,unit,amount){const result=oldBreak(source,unit,amount);if(unit?.riftKey&&result.breaks){interrupt(unit,'fresh Break');unit.riftState.recovery=2;unit.statuses=ensureStatuses(unit).filter(s=>s.type!=='defenseUp');}return result;};
  const oldIncoming=incomingDamageMultiplier;
  incomingDamageMultiplier=function(unit){let value=oldIncoming(unit);if(unit?.riftKey==='warden'&&!statusOf(unit,'broken')&&!unit.riftState.recovery){const escorts=battle?.enemies?.filter(e=>e!==unit&&e.hp>0).length||0;value*=Math.max(.5,1-escorts*.2);}return value;};
  const oldPlayerSkill=useSkill;
  useSkill=function(unit,skill,...args){const before=unit.mp,result=oldPlayerSkill(unit,skill,...args);if(battle?.riftEncounter&&[6,10].includes(battle.riftEncounter)&&battle.enemies.some(e=>e.riftKey==='engine'&&e.hp>0)&&before>unit.mp){const count=Math.min(4,1+(statusOf(unit,'riftDebt')?.value||0));applyStatus(unit,'riftDebt',battle.enemies.find(e=>e.riftKey==='engine'),{force:true,value:count,duration:3});}return result;};
  function basic(unit){const p=roster[unit.riftKey],magic=['caster','controller','ranger'].includes(p.role);return {kind:magic?'magic':'melee',name:unit.riftKey==='squirrel'?'Acorn Bolt':unit.riftKey==='raccoon'?'Ragmask Cut':unit.riftKey==='rabbit'?'Warren Thrust':unit.riftKey==='pursuer'?'Reverie Blade':magic?'Rift Pulse':'Heavy Strike',element:enemyAbilityProfile(unit).element,coefficient:magic?.62:.72,mpCost:magic?8:0,status:unit.riftKey==='mushroom'?{type:'poison',chance:.65,duration:3}:['raccoon','pursuer'].includes(unit.riftKey)?{type:'bleed',chance:.45,duration:3}:unit.riftKey==='mina'?{type:'disrupted',chance:.6,duration:2}:null};}
  function prepare(unit,info){
    const data=unit.riftState,physical=['hunt','armor','crossfire','knot'].includes(info.mechanic),marked=['hunt','crossfire','contract'].includes(info.mechanic)||info.mechanic==='finale'&&unit.riftKey==='velourne';
    const live=battle.party.filter(u=>u.hp>0),chosen=live.find(u=>u.holdTheLine)||live.slice().sort((a,b)=>b.hp-a.hp)[0];
    data.pending={kind:physical?'melee':'magic',target:marked?chosen:null,marked,heal:info.mechanic==='hearth'};
    if(marked)applyStatus(chosen,'riftMark',unit,{force:true,duration:3});
    const count=battle.enemies.filter(e=>e!==unit&&e.hp>0).length;
    const instruction=marked?'Cleanse the mark, Break the caster or Guard the marked target.':physical?'Fresh Break, Stun or Sleep interrupts; Silence does not stop a physical attack.':'Silence, Stun, Sleep or fresh Break interrupts. Guard or barriers soften the impact.';
    announce(`${unit.name} prepares ${info.strike}`,`${data.pending.heal?'A large enemy healing/barrier ritual is coming. ':marked?'Marked: '+chosen.name+'. ':'Group impact on its next own action. '}${instruction}${count?' Living escorts strengthen the impact.':''}`);
    return {kind:'buff',name:'Preparing '+info.strike,target:unit,targetSide:'self',buffs:[],mpCost:0};
  }
  const oldChoose=chooseEnemyAction;
  chooseEnemyAction=function(unit){
    if(!unit.riftKey||!battle?.riftEncounter)return oldChoose(unit);
    const data=unit.riftState,info=encounters[battle.riftEncounter-1],p=roster[unit.riftKey];
    if(data.pending){
      const pending=data.pending;
      if(statusOf(unit,'broken')||statusOf(unit,'stun')||statusOf(unit,'sleep')||pending.kind==='magic'&&statusOf(unit,'silence')){interrupt(unit,'control');return basic(unit);}
      if(pending.marked&&(!pending.target||pending.target.hp<=0||!statusOf(pending.target,'riftMark'))){interrupt(unit,'mark cleansed');return basic(unit);}
      data.pending=null;data.recovery=2;
      if(pending.heal)return {kind:'magic',name:'The Hearth Holds',element:'Sound',healing:true,allAllies:true,healCoefficient:4.2,buffs:[{type:'barrier',value:.25,duration:2}],mpCost:24};
      const helpers=battle.enemies.filter(e=>e!==unit&&e.hp>0).length;
      const action={kind:'ultimate',name:unit.riftKey==='dragon'?'Vortex Breath':info.strike,element:pending.kind==='melee'?'Physical':enemyAbilityProfile(unit).element,scaling:pending.kind==='melee'?'str':'mag',coefficient:1.04+helpers*.12,allTargets:!pending.marked,target:pending.target,mpCost:0,riftCollection:unit.riftKey==='engine',status:info.mechanic==='spores'?{type:'poison',chance:.9,duration:3}:unit.riftKey==='dragon'?{type:'scorched',chance:.65,duration:2}:['hunt','crossfire'].includes(info.mechanic)?{type:'bleed',chance:.65,duration:3}:{type:'disrupted',chance:.6,duration:2}};
      if(pending.target)pending.target.statuses=ensureStatuses(pending.target).filter(s=>s.type!=='riftMark');announce('Impact / recovery',`${action.name} resolves. The leader then recovers; use healing and exploit weaknesses.`);return action;
    }
    if(data.recovery>0){data.recovery--;return {...basic(unit),name:'Recovering Strike',coefficient:.36};}
    const actions=unit.actionsTaken||0;
    if(statusOf(unit,'silence'))return {...basic(unit),kind:'melee',element:'Physical',mpCost:0,coefficient:.55};
    if(info.mechanic==='armor'&&unit.riftLeader&&actions===0)return {kind:'buff',name:'Rampart Armour',target:unit,buffs:[{type:'defenseUp',value:.35,duration:4}],mpCost:0};
    if(unit.riftKey==='velourne'&&actions%4===0){const holder=battle.party.find(h=>h.hp>0&&enemyDispelStatus(h));if(holder){const stolen={...enemyDispelStatus(holder)};enemyDispelOne(holder);applyStatus(unit,stolen.type,unit,{force:true,value:stolen.value,duration:2});announce('Stolen blessing',`Velourne steals ${STATUS_DEFS[stolen.type]?.label||stolen.type}. Dispel it or interrupt his next ritual.`);return {kind:'buff',name:'Borrowed Nobility',target:unit,buffs:[],mpCost:0};}}
    const wounded=battle.enemies.filter(e=>e.hp>0&&e.hp/e.max<.65).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
    if(['fae','sella','benji','mushroom'].includes(unit.riftKey)&&wounded&&actions%3!==2&&unit.mp>=16)return {kind:'magic',name:unit.riftKey==='benji'?'Feed First':unit.riftKey==='sella'?'Water and Warmth':unit.riftKey==='fae'?'Thornlight Renewal':'Mycelial Mending',element:'Earth',healing:true,target:wounded,healCoefficient:2.1,mpCost:16};
    if(unit.riftLeader&&actions%3===1)return prepare(unit,info);
    if(!unit.riftLeader&&actions%3===2)return {...basic(unit),name:p.family==='nature'?'Thicket Pressure':p.family==='mechanical'?'Chain Sweep':p.cameo?'Hearthbound Teamwork':'Ash Formation',allTargets:true,coefficient:.35,mpCost:8};
    const action=basic(unit);return (unit.mp||0)>=(action.mpCost||0)?action:{...action,kind:'melee',element:'Physical',mpCost:0,coefficient:.55};
  };
  const oldRoll=enemyDamageRoll;
  enemyDamageRoll=function(unit,action,hero){const result=oldRoll(unit,action,hero);if(unit.riftKey){if(action.riftCollection)result.damage=Math.round(result.damage*(1+(statusOf(hero,'riftDebt')?.value||0)*.12));result.damage=Math.min(result.damage,Math.max(1,Math.round(hero.max*(action.kind==='ultimate'?.47:.34))));}return result;};
  const oldAnimated=drawAnimatedEnemy,oldSheetFor=enemyAnimationSheetFor;
  enemyAnimationSheetFor=function(unit){return unit.riftKey?sheets[unit.riftKey]||null:oldSheetFor(unit);};
  drawAnimatedEnemy=function(unit,px,py){
    if(!unit.riftKey)return oldAnimated(unit,px,py);const sheet=sheets[unit.riftKey];if(!sheet)return false;
    const animation=unit.hp<=0||unit.anim==='death'?'death':unit.anim==='attack'?(unit.attackStyle==='ultimate'?'ultimate':unit.attackStyle==='melee'?'melee':'magic'):'idle';
    const frame=animation==='death'?Math.min(3,Math.floor(Math.max(0,tick-(unit.deathTick??tick))/7)):animation==='idle'?Math.floor(tick/20)%4:Math.min(3,Math.floor((unit.animTick||0)/6));
    const cell=sheet.cells[sheet.rowMap[animation]*4+frame],size=unit.riftKey==='dragon'?78:unit.riftKey==='engine'?70:unit.riftBoss?56:['warden','bear','brute'].includes(unit.riftKey)?49:['fae','mina','sella'].includes(unit.riftKey)?36:43;
    const scale=Math.min(size/sheet.referenceHeight,105/cell[2]);const x=Math.max(2,Math.min(LOGICAL_WIDTH-cell[2]*scale-2,px+8-cell[2]*scale/2)),y=py+31-sheet.baseline*scale;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet.image,...cell,Math.round(x),Math.round(y),Math.round(cell[2]*scale),Math.round(cell[3]*scale));ctx.restore();
    if(unit.anim==='attack'&&unit.lastAnimDrawTick!==tick){unit.animTick=(unit.animTick||0)+1;unit.lastAnimDrawTick=tick;}return true;
  };
  const oldEffect=makeEnemyBattleEffect,oldDrawEffect=drawEffect;
  makeEnemyBattleEffect=function(unit,hero,action){const fx=oldEffect(unit,hero,action);if(unit.riftKey){fx.riftVfx=true;fx.bossSheetVfx=false;fx.family=roster[unit.riftKey].family;fx.riftRow=action.kind==='melee'?0:action.healing||['buff','cleanse','utility'].includes(action.kind)?3:action.kind==='ultimate'?2:1;fx.riftPoints=(action.allTargets?battle.party.filter(u=>u.hp>0):action.allAllies?battle.enemies.filter(u=>u.hp>0):[hero||unit]).map(u=>{const own=battle.party.includes(u),[x,y]=own?partyBattlePosition(battle.party.indexOf(u),battle.party.length):enemyBattlePosition(Math.max(0,battle.enemies.indexOf(u)),battle.enemies.length);return {x,y:y-24};});fx.toX=fx.riftPoints[0].x;fx.toY=fx.riftPoints[0].y;}return fx;};
  drawEffect=function(){if(!effect?.riftVfx)return oldDrawEffect();const fx=effect,sheet=effects[fx.family],elapsed=Math.max(0,performance.now()-fx.startedAt);if(!sheet)return;const impact=fx.timing.impactMs,col=elapsed<impact?Math.min(1,Math.floor(elapsed/impact*2)):Math.min(3,2+Math.floor((elapsed-impact)/Math.max(1,fx.timing.totalMs-impact)*2));const cell=sheet.cells[fx.riftRow*4+col];let points=fx.riftPoints;if(fx.riftRow===1&&elapsed<impact){const t=Math.min(1,elapsed/impact);points=[{x:fx.fromX+(fx.toX-fx.fromX)*t,y:fx.fromY+(fx.toY-fx.fromY)*t}];}const size=fx.riftRow===2?96:fx.riftRow===3?59:51;ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();for(const point of points)ctx.drawImage(sheet.image,...cell,Math.round(point.x-size/2),Math.round(point.y-size/2),size,size);ctx.restore();fx.t++;if(elapsed>=fx.timing.totalMs)effect=null;};
  const oldArena=battleArenaFor,oldBackdrop=drawBattleBackground;
  battleArenaFor=function(map){return battle?.riftEncounter?'ember-hall':oldArena(map);};
  drawBattleBackground=function(image,arena){if(battle?.riftEncounter&&images.room){ctx.drawImage(images.room,0,0,images.room.width,images.room.height,0,0,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT);return;}oldBackdrop(image,arena);};
  const hud=document.createElement('div');hud.id='riftMechanicHud';hud.className='rift-mechanic hidden';el.battle.insertAdjacentElement('beforebegin',hud);
  const oldRender=renderBattle;
  renderBattle=function(...args){const result=oldRender(...args);hud.classList.toggle('hidden',!battle?.riftEncounter||mode!=='battle');if(battle?.riftEncounter){const info=encounters[battle.riftEncounter-1],notice=battle.riftNotice;hud.innerHTML=`<strong>${escapeMarkup(notice?.title||info.name)}</strong><span>${escapeMarkup(notice?.text||info.hint)}</span>`;}return result;};
  function awardRewards(id){
    const p=progress(),first=!p.cleared.includes(id),drops=[],shards=first?20+id*4:4+id;p.shards+=shards;
    if(first){p.cleared.push(id);p.cleared.sort((a,b)=>a-b);awardGearDrop(rewards[id-1].name,'Artifact',drops,{separateCopy:true,affixes:[],stats:rewards[id-1].stats});drops.push({kind:'record',name:id===10?'Ember Rift path completed':`Rift ${id+1} unlocked`,type:'Rift record',amount:1,stored:true});}
    drops.push({kind:'item',name:'Rift Shards',type:'Rare upgrade material / Rift Forge wallet',amount:shards,stored:true});return {gold:0,drops,gearDrops:[]};
  }
  const oldResult=showBattleResult;
  showBattleResult=function(kind,entries,after){const rift=Boolean(battle?.riftEncounter);hud.classList.add('hidden');oldResult(kind,entries,rift?returnToRoom:after);if(rift){el.battleResultContinue.setAttribute('aria-label','Return to the vortex room');el.battleResultArt.alt=kind==='victory'?'Rift encounter cleared':'The party returns to the vortex room';}if(state.gameMode==='hallBattles')saveGame(hallSaveKey());};
  function forge(){
    if(state.map!==MAP)return;mode='hallMap';el.menu.dataset.menuView='rift-forge';el.menu.classList.remove('hidden','is-shop');document.querySelector('.menu-tabs').classList.add('hidden');const p=progress();
    const rows=rewards.map((g,i)=>{const level=Math.min(3,Number(p.forged[g.name])||0),owned=echoGearInstanceRefs(g.name).length>0,cost=20*(level+1);return `<article><div><strong>${g.name}</strong><small>${owned?'Rift Artifact · Temper '+level+'/3':'Defeat Rift '+(i+1)+' to obtain this Artifact'}</small></div><button type="button" data-rift-temper="${i+1}" ${owned&&level<3&&p.shards>=cost?'':'disabled'}>${level===3?'Fully tempered':`+5% base stats · ${cost} Shards`}</button></article>`;}).join('');
    el.menuBody.innerHTML=`<section class="rift-forge"><header><h3>Rift Forge</h3><button type="button" data-rift-close>X</button></header><p>${p.shards} Rift Shards · Only exclusive Rift Artifacts can be tempered. Each rank adds 5% to their base stats; maximum three ranks.</p>${rows}</section>`;el.menuBody.querySelector('[data-rift-close]')?.addEventListener('click',close);el.menuBody.querySelectorAll('[data-rift-temper]').forEach(b=>b.addEventListener('click',()=>{temper(Number(b.dataset.riftTemper));forge();}));
  }
  function temper(id){const g=rewards[id-1],p=progress();if(!g)return false;const refs=echoGearInstanceRefs(g.name),rank=Math.min(3,Number(p.forged[g.name])||0),cost=20*(rank+1);if(!refs.length||rank>=3||p.shards<cost||state.map!==MAP||mode!=='hallMap')return false;p.shards-=cost;p.forged[g.name]=rank+1;refs.forEach(ref=>{gearInstance(ref).stats=Object.fromEntries(Object.entries(g.stats).map(([k,v])=>[k,Math.round(v*(1+(rank+1)*.05))]));});refreshHeroVitals();saveGame(hallSaveKey());return true;}
  const door={id:'Rear Flame Shield',x:315,y:36,approach:{x:315,y:52}};
  function nearbyHallDoor(player){return Math.hypot(player.x-315,player.y-52)<22?door:null;}
  function triggerHall(actor){if(actor.id!==door.id)return false;if(!progress().unlocked){showHudNotice(`The flame shield is sealed. Clear every normal Hall stage (${hallBattleProgress().clearedStages.length}/${HALL_BATTLE_BLUEPRINTS.length}).`);return true;}if(!assetsReady){showHudNotice(assetFailure?'Rift art could not load. Reload to retry.':'Loading the finished Rift art…');return true;}enterRoom();return true;}
  function drawHallDoor(camera,now){const p=progress();if(!p.unlocked||!images.entrance)return;if(doorStart===null)doorStart=p.doorSeen?now-1800:now;const t=Math.min(1,(now-doorStart)/1800);ctx.save();ctx.beginPath();ctx.rect(299-camera.x,-camera.y,38,47);ctx.clip();ctx.drawImage(images.entrance,-camera.x,-camera.y,640,356);if(t<1){const original=window.emberHallWorld?.images.hall;if(original)ctx.drawImage(original,299/640*original.width,0,38/640*original.width,38/356*original.height,299-camera.x,-camera.y-t*44,38,38);}ctx.restore();if(t===1&&!p.doorSeen){p.doorSeen=true;queueSave();}}
  const player={x:320,y:310,facing:0,phase:0,walking:false},camera={x:0,y:0},keys=new Set();let target=null,roomLast=0,pending=null;
  const floor=[[230,345],[410,345],[410,282],[533,257],[535,92],[473,69],[167,69],[104,92],[107,260],[230,282]],obstacles=[{x:214,y:123,rx:22,ry:13},{x:421,y:121,rx:22,ry:13},{x:219,y:205,rx:23,ry:13},{x:423,y:205,rx:24,ry:13},{x:320,y:162,rx:31,ry:18}];
  const portal={id:'Vortex',x:320,y:198,approach:{x:320,y:230}},anvil={id:'Rift Forge',x:219,y:205,approach:{x:240,y:238}},exit={id:'Ember Hall',x:320,y:332,approach:{x:320,y:330}};
  function polygon(x,y){let inside=false;for(let i=0,j=floor.length-1;i<floor.length;j=i++){const[a,b]=floor[i],[c,d]=floor[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
  function collision(x,y){return ![[0,0],[-5,0],[5,0],[0,-3],[0,3]].every(([a,b])=>polygon(x+a,y+b))||obstacles.some(o=>((x-o.x)/(o.rx+5))**2+((y-o.y)/(o.ry+3))**2<1);}
  function roomPoint(){return [portal,anvil,exit].find(a=>Math.hypot(player.x-a.approach.x,player.y-a.approach.y)<25);}
  function activate(point){keys.clear();target=null;pending=null;if(point===portal)openSelection();else if(point===anvil)forge();else if(point===exit)leaveRoom();}
  let roomNodes=null;
  function navigate(x,y,point=null){
    if(!roomNodes){roomNodes=new Map();for(let y=70;y<342;y+=6)for(let x=108;x<532;x+=6)if(!collision(x,y))roomNodes.set(`${x},${y}`,{x,y});}
    const nodes=[...roomNodes.values()],start=nodes.reduce((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)<Math.hypot(a.x-player.x,a.y-player.y)?b:a),goal=nodes.reduce((a,b)=>Math.hypot(b.x-x,b.y-y)<Math.hypot(a.x-x,a.y-y)?b:a);if(Math.hypot(goal.x-x,goal.y-y)>16)return false;
    const queue=[start],previous=new Map([[`${start.x},${start.y}`,null]]);let found=false;
    for(let i=0;i<queue.length;i++){const node=queue[i],key=`${node.x},${node.y}`;if(node===goal){found=true;break;}for(const[dx,dy]of [[6,0],[-6,0],[0,6],[0,-6],[6,6],[6,-6],[-6,6],[-6,-6]]){const nk=`${node.x+dx},${node.y+dy}`,next=roomNodes.get(nk);if(!next||previous.has(nk)||collision(node.x+dx/2,node.y+dy/2))continue;previous.set(nk,key);queue.push(next);}}
    if(!found)return false;const path=[];for(let key=`${goal.x},${goal.y}`;key;key=previous.get(key))path.unshift(roomNodes.get(key));target={path,index:0};pending=point;return true;
  }
  function enterRoom(position){if(!progress().unlocked||!assetsReady)return false;window.emberHallWorld?.clearNavigation();keys.clear();target=null;pending=null;state.map=MAP;mode='walk';heldDirection=null;fieldDestination=null;const saved=position||progress().position;Object.assign(player,saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&!collision(saved.x,saved.y)?saved:{x:320,y:310,facing:1});roomLast=performance.now();updatePanels();saveGame(hallSaveKey());return true;}
  function leaveRoom(){state.map='emberHallBattles';keys.clear();target=null;pending=null;window.emberHallWorld?.resetNavigation({x:315,y:56,facing:0});mode='walk';updatePanels();saveGame(hallSaveKey());}
  function returnToRoom(){restoreHallParty();state.map=MAP;mode='walk';el.battle.classList.add('hidden');hud.classList.add('hidden');enterRoom({x:320,y:234,facing:0});}
  function updateRoom(now){const dt=Math.min(.05,Math.max(0,(now-roomLast)/1000));roomLast=now;if(mode!=='walk'){keys.clear();player.walking=false;return;}let dx=Number(keys.has('ArrowRight')||keys.has('d')||heldDirection==='right')-Number(keys.has('ArrowLeft')||keys.has('a')||heldDirection==='left'),dy=Number(keys.has('ArrowDown')||keys.has('s')||heldDirection==='down')-Number(keys.has('ArrowUp')||keys.has('w')||heldDirection==='up'),distance=Infinity;if(dx||dy){target=null;pending=null;}else if(target){let next=target.path[target.index];while(next&&Math.hypot(next.x-player.x,next.y-player.y)<.7)next=target.path[++target.index];if(next){dx=next.x-player.x;dy=next.y-player.y;distance=Math.hypot(dx,dy);}else target=null;}const length=Math.hypot(dx,dy)||1,step=Math.min(65*dt,distance),oldX=player.x,oldY=player.y;for(let i=0;i<Math.ceil(step);i++){const sx=player.x+dx/length*step/Math.ceil(step),sy=player.y+dy/length*step/Math.ceil(step);if(!collision(sx,sy)){player.x=sx;player.y=sy;}else if(!target){if(!collision(sx,player.y))player.x=sx;if(!collision(player.x,sy))player.y=sy;}}player.walking=Math.hypot(player.x-oldX,player.y-oldY)>.01;if(player.walking){player.phase+=Math.hypot(player.x-oldX,player.y-oldY)/9;player.facing=Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1;progress().position={x:player.x,y:player.y,facing:player.facing};}else if(dx||dy){target=null;queueSave();}if(!target&&pending){const point=pending;pending=null;activate(point);}}
  function drawRoom(){const now=performance.now();updateRoom(now);camera.x=Math.max(0,Math.min(640-LOGICAL_WIDTH,player.x-LOGICAL_WIDTH/2));camera.y=Math.max(0,Math.min(356-LOGICAL_HEIGHT,player.y-LOGICAL_HEIGHT*.6));ctx.drawImage(images.room,-camera.x,-camera.y,640,356);const image=images.rift,frame=Math.floor(now/180)%4,cw=image.width/4;ctx.drawImage(image,frame*cw,0,cw,image.height,320-camera.x-39,198-camera.y-111,78,111);drawFieldShadow(player.x-camera.x,player.y-camera.y,5);window.emberHallWorld?.drawActor({...player,id:'Verseborn',size:36,poseFrame:player.walking?Math.floor(player.phase)%8:8},player.facing,0,camera);const near=roomPoint();if(near&&mode==='walk')drawText(`${near.id}  [E]`,near.x-camera.x,near.y-camera.y-32,'#efd3a3',6,'center');drawText('EMBER RIFT',7,11,'#efd3a3',7);}
  const oldDraw=drawTileMap;
  drawTileMap=function(){if(state.map===MAP&&state.gameMode==='hallBattles'&&assetsReady){drawRoom();return;}oldDraw();if(state.map===MAP&&assetsReady)drawRoom();};
  const oldPanels=updatePanels;
  updatePanels=function(...args){const value=oldPanels(...args);if(state.map===MAP){el.chapter.textContent='Ember Rift';el.place.textContent='The Revealed Vault';el.questTitle.textContent=`Rift Path ${progress().cleared.length}/10`;el.questText.textContent='Interact with the vortex. Return to Ember Hall through the entry corridor.';}return value;};
  document.addEventListener('keydown',event=>{if(state.map!==MAP||mode!=='walk'||editableKeyboardTarget(event))return;const key=event.key.length===1?event.key.toLowerCase():event.key;if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','e'].includes(key))return;event.preventDefault();event.stopImmediatePropagation();if(key==='e'){if(!event.repeat&&roomPoint())activate(roomPoint());}else keys.add(key);},true);
  document.addEventListener('keyup',event=>keys.delete(event.key.length===1?event.key.toLowerCase():event.key),true);window.addEventListener('blur',()=>keys.clear());
  canvas.addEventListener('pointerdown',event=>{if(state.map!==MAP||mode!=='walk')return;event.preventDefault();event.stopImmediatePropagation();const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*LOGICAL_WIDTH+camera.x,y=(event.clientY-rect.top)/rect.height*LOGICAL_HEIGHT+camera.y,point=[portal,anvil,exit].find(p=>Math.abs(x-p.x)<(p===portal?44:25)&&y<p.y+15&&y>p.y-(p===portal?110:40));if(point){if(roomPoint()===point)activate(point);else navigate(point.approach.x,point.approach.y,point);}else navigate(x,y);},true);
  canvas.addEventListener('click',event=>{if(state.map===MAP){event.preventDefault();event.stopImmediatePropagation();}},true);
  const oldControl=handleControl;
  handleControl=function(control){if(state.map===MAP&&mode==='walk'&&['up','down','left','right','confirm'].includes(control)){if(control==='confirm'&&roomPoint())activate(roomPoint());return;}return oldControl(control);};
  const oldLoad=loadGame;
  loadGame=function(key){const result=oldLoad(key);doorStart=null;if(result&&state.gameMode==='hallBattles'&&state.map===MAP){const position=progress().position;ready.then(()=>enterRoom(position));}return result;};
  const oldStart=startHallBattles;
  startHallBattles=function(continuing){let restoreRoom=false;try{restoreRoom=continuing&&JSON.parse(localStorage.getItem(hallSaveKey())||'null')?.state?.map===MAP;}catch{}oldStart(continuing);doorStart=null;if(restoreRoom&&progress().unlocked)ready.then(()=>enterRoom(progress().position));};
  const oldClose=closeHallOverlay;
  closeHallOverlay=function(){const ours=['rift-path','rift-forge'].includes(el.menu.dataset.menuView);oldClose();if(ours)saveGame(hallSaveKey());};
  window.EmberRift={ready,progress,available,roster,encounters,rewards,makeEnemy,startEncounter,awardRewards,openSelection,forge,temper,enterRoom,leaveRoom,returnToRoom,nearbyHallDoor,triggerHall,drawHallDoor,collision,navigate,player,portal,anvil,exit,interrupt,sheets,effects,get assetsReady(){return assetsReady;},get assetFailure(){return assetFailure;},get camera(){return camera;},hallDoorHit:(x,y)=>Math.abs(x-315)<22&&y>=0&&y<50?door:null,tickHallDoor:hallPlayer=>{if(progress().unlocked&&progress().doorSeen&&Math.abs(hallPlayer.x-315)<14&&hallPlayer.y<48&&mode==='walk')enterRoom();}};
})();
