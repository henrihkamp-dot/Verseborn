// Dimensional sparring has its own records and never advances the Hall or Rift.
(() => {
  'use strict';
  const BASE = 'assets/tinus-gauntlet/';
  const ringSpecs = [
    ['Verseborn', 'Ring of the Listening World', 'Resonant Verse', 'Resonant Verse also applies 15% Magic Vulnerability for 2 actions.'],
    ['Mira', 'Ring of the Unseen Margin', 'Voidthorn Mark', 'Voidthorn Mark also inflicts Shadow Exposed for 2 actions, setting up the next mark.'],
    ['Torren', 'Ring of the Moving Mountain', 'Foundation Break', 'Foundation Break gains one additional base Break buildup and applies 15% Physical Vulnerability for 2 actions.'],
    ['Glimmer', 'Ring of the Open Circuit', 'Klik-Wrench 7', 'Klik-Wrench 7 also drains 20% of enemy Resonance and applies 15% Disrupted for 2 actions.'],
    ['Kael', 'Ring of the Quiet Exception', 'Quiet Rite', 'Quiet Rite also cleanses one negative effect from each healed ally.'],
    ['Sparky', 'Ring of the Remembered Dawn', 'Memory Flare', 'Memory Flare also applies Burn for 3 actions.'],
    ['Seerin', 'Ring of the Unbroken Choice', 'Starflame Cut', 'Starflame Cut also applies 15% Holy Vulnerability for 2 actions.'],
    ['Tinus', 'Ring of the Unscheduled Tomorrow', 'Form 17.2-B', 'Form 17.2-B also applies 15% Disrupted for 2 actions and costs 2 less base MP.']
  ];
  gearDb.ring2 ??= [];
  const rings = ringSpecs.map(([owner, name, ability, description]) => {
    const gear = item(name, 'ring2', {}, description + ' Personal Destiny Ring II; no base stats or random affixes.', [
      { type: 'destinySkill', value: 1, label: description, artifactUnique: true }
    ]);
    Object.assign(gear, { rarity: 'Personal Artifact', destinyRing: true, owner, ability });
    gearOwners[name] = [owner]; gearDb.ring2.push(gear);
    return gear;
  });
  for (const hero of Object.values(baseJobs)) if (!Object.hasOwn(hero.gear, 'ring2')) hero.gear.ring2 = null;

  const oldScore = autoEquipGearScore;
  autoEquipGearScore = function(id, slot, ref) {
    if (slot !== 'ring2') return oldScore(id, slot, ref);
    const gear = gearByName(ref);
    return !ref ? 0 : gear?.destinyRing && canEquip(id, gear) ? 100 : -1e9;
  };
  const oldSkills = battleSkills;
  battleSkills = function(id, unit) {
    const skills = oldSkills(id, unit), ring = gearByName(baseJobs[id]?.gear.ring2);
    const enemyTurn = !unit && mode === 'battle' && battle?.turnQueue?.[battle.turnIndex]?.side === 'enemy';
    if (!ring?.destinyRing || ring.owner !== id || unit?.sparringId || enemyTurn) return skills;
    return skills.map(original => {
      if (original.name !== ring.ability) return original;
      const sk = structuredClone(original), add = (type, value, duration) => {
        sk.extraStatuses = [...(sk.extraStatuses || []), { type, ...(value == null ? {} : {value}), duration, chance: 1 }];
      };
      if (id === 'Verseborn') add('magicVulnerability', .15, 2);
      if (id === 'Mira') add('shadowExposed', null, 2);
      if (id === 'Torren') { sk.staggerPower = (sk.staggerPower || 1) + 1; add('physicalVulnerability', .15, 2); }
      if (id === 'Glimmer') { sk.enemyResonanceDrainRatio = Math.max(.2, sk.enemyResonanceDrainRatio || 0); add('disrupted', .15, 2); }
      if (id === 'Kael') sk.cleanse = true;
      if (id === 'Sparky') add('burn', null, 3);
      if (id === 'Seerin') add('holyVulnerability', .15, 2);
      if (id === 'Tinus') { sk.cost = Math.max(0, sk.cost - 2); add('disrupted', .15, 2); }
      sk.desc += ' Destiny Ring II: ' + ring.desc.split(' Personal Destiny')[0];
      sk.destinyRing = ring.name;
      return sk;
    });
  };

  // These are dimensional counterparts. Combat adaptations are not new comic canon.
  const encounters = [
    {key:'benji',name:'Benji',title:'The Geometry of Welcome',element:'Sigil',weak:'Sound',hp:16500,power:150,agi:88,role:'healer',size:67,arena:1,spell:'Golden Mandala',strike:'A World in Balance',status:'magicVulnerability',hint:'Benji shelters behind a removable barrier. Dispel it, then use Sound and Break. Silence or fresh Break interrupts the announced mandala.'},
    {key:'demonlord',name:'DemonLord',title:'The Uncrowned Inferno',element:'Shadow',weak:'Holy Fire',hp:18000,power:160,agi:92,role:'bruiser',size:75,arena:5,spell:'Crimson Rupture',strike:'Crown of the Abyss',status:'bleed',hint:'His blade applies Bleed. Cleanse and keep Guard ready. His ultimate is magical: Silence or fresh Break cancels the charged crown.'},
    {key:'klaas-de-klemmer',name:'Dr. Klaas de Klemmer',title:'The Perfectly Incorrect Form',element:'Tech',weak:'Earth',hp:19000,power:165,agi:95,role:'controller',size:62,arena:6,spell:'Compliance Notice',strike:'The Golden Cage',status:'disrupted',hint:'Disrupted weakens damage. Cleanse before committing an ultimate. Break or Silence the announced cage; the cancelled ritual leaves him vulnerable.'},
    {key:'revisor-9',name:'Revisor9',title:'The Last Redaction',element:'Shadow',weak:'Holy Fire',hp:20500,power:170,agi:99,role:'controller',size:67,arena:8,spell:'Ink of Erasure',strike:'The Unwritten Verdict',status:'silence',hint:'Ink can Silence your caster. Carry cleansing support and a physical attacker. Fresh Break remains an answer when your own spells are sealed.'},
    {key:'bill',name:'B.I.L.L.',title:'A Heart Outside the Ledger',element:'Tech',weak:'Sound',hp:22000,power:175,agi:90,role:'tank',size:62,arena:6,spell:'Induction Spark',strike:'Open Circuit Cascade',status:'magicVulnerability',hint:'The ledger builds a barrier every fourth action. Dispel it and exploit Sound. Interrupt the circuit cascade, then attack during its two-action recovery.'},
    {key:'felinus',name:'Felinus von Pendrak',title:'The Book That Breathes',element:'Ancient Fire',weak:'Tech',hp:23500,power:180,agi:102,role:'caster',size:80,arena:7,spell:'Codex Ember',strike:'The Burning Index',status:'burn',hint:'The codex spreads Burn. Heal and cleanse between firestorms. Its page-turn announces the ultimate one own action in advance: Silence or Break it.'},
    {key:'liza-flux',name:'Liza Flux',title:'An Unfinished Tomorrow',element:'Tech',weak:'Earth',hp:25000,power:185,agi:112,role:'caster',size:65,arena:3,spell:'Timeline Needle',strike:'All the Roads Not Taken',status:'agilityDown',hint:'Timeline needles slow the party. Cleanse to recover initiative. Guard the converging timelines or interrupt them, then exploit her exposed recovery.'},
    {key:'satyr',name:'De Schrijnende Satyr',title:'The Choir Beyond the Door',element:'Sound',weak:'Sigil',hp:27000,power:190,agi:105,role:'bruiser',size:73,arena:10,spell:'Bronze Dissonance',strike:'The Impossible Chorus',status:'disrupted',hint:'The final echo combines Disrupted with group pressure. Keep healing in reserve. Break or Silence the announced chorus; victory closes this loop of destinies.'}
  ].map((entry, i) => ({...entry, id:i + 1, reward:rings[i]}));
  const curioSpecs = [
    ['Wayfarer’s Measure','weapon',{str:30,mag:26,agi:21},'weaknessDamage',.16,'+16% weakness damage'],
    ['Mantle of Unwritten Roads','armour',{stam:30,echo:27,agi:21},'blockPower',.15,'15% stronger personal Guard'],
    ['Betweenworld Lens','helmet',{mag:30,agi:27,echo:21},'allStatusResistance',.15,'15% all-status application resistance'],
    ['Small Promise of Tomorrow','necklace',{mag:30,echo:27,stam:21},'healPower',.16,'+16% healing potency'],
    ['Ring of the Returning Path','ring',{str:27,mag:27,echo:24},'mpEfficiency',.12,'12% lower skill MP cost']
  ];
  const curios = curioSpecs.map(([name,slot,stats,type,value,label]) => {
    const g = item(name,slot,stats,'Whirlpool rematch gear at Shadow Duel tier; five varied affixes.',{type,value,label});
    g.shadowArtifact = true; g.rarity = 'Shadow Artifact'; gearDb[slot].push(g); return g;
  });
  WEAPON_BASIC_ATTACK_EFFECTS[curios[0].name]={type:'status',status:'magicVulnerability',value:.15,duration:2,label:'BASIC ATTACK: applies 15% Magic Vulnerability for 2 actions'};
  const oldNormalize = normalizeHallBattleProgress;
  normalizeHallBattleProgress = function(data) {
    const hall = oldNormalize(data), prior = hall.whirlpool && typeof hall.whirlpool === 'object' && !Array.isArray(hall.whirlpool) ? hall.whirlpool : {};
    hall.whirlpool = {...prior, cleared:[...new Set((Array.isArray(prior.cleared) ? prior.cleared : []).filter(id => Number.isInteger(id) && id >= 1 && id <= 8))].sort((a,b)=>a-b)};
    return hall;
  };
  const progress = () => hallBattleProgress().whirlpool;
  const unlocked = () => state.gameMode === 'hallBattles' && state.party.includes('Tinus') && TinusRecruitment.progress().recruited;
  const available = id => unlocked() && Number.isInteger(id) && id >= 1 && id <= 8 && Array.from({length:id-1},(_,i)=>i+1).every(n=>progress().cleared.includes(n));
  const sheets = {}, images = {};
  let assetFailure = null, assetsReady = false, selected = 1, snapshot = null;
  const load = file => new Promise((resolve,reject) => {const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(Error('Whirlpool asset unavailable: '+file)); image.src=BASE+file;});
  const ready = fetch(BASE+'manifest.json?v=212').then(response=>{if(!response.ok)throw Error('Whirlpool manifest unavailable');return response.json();}).then(async data=>{
    await Promise.all(data.characters.map(async config=>{const [image,fx]=await Promise.all([load(config.sheet),load(config.effects.sheet)]); sheets[config.id]={...config,image,fx}; images[config.id]=BASE+config.id+'-portrait.webp';}));
    assetsReady = true;
    if (el.menu.dataset.menuView === 'tinus-whirlpool' && mode === 'hallMap') render();
  }).catch(error=>{assetFailure=error.message; console.error(error);});
  function stopNavigation() { heldDirection=null; fieldDestination=null; activePoint=null; emberHallWorld.clearNavigation(); }
  function open() {
    if (!unlocked() || state.map !== 'emberHallBattles' || !['walk','hallMap'].includes(mode)) return false;
    stopNavigation(); mode='hallMap'; el.menu.classList.remove('hidden','is-shop'); document.querySelector('.menu-tabs').classList.add('hidden'); render(); return true;
  }
  function render() {
    el.menu.dataset.menuView='tinus-whirlpool';
    const p=progress(), info=encounters[selected-1];
    const cards=encounters.map(e=>`<button type="button" class="whirlpool-card ${selected===e.id?'is-selected':''}" data-whirlpool-select="${e.id}" ${available(e.id)?'':'disabled'}><img src="${BASE+e.key}-portrait.webp" alt="${escapeMarkup(e.name)}"><small>${String(e.id).padStart(2,'0')} · ${p.cleared.includes(e.id)?'CLEARED / REMATCH':available(e.id)?'AVAILABLE':'LOCKED'}</small><strong>${escapeMarkup(e.name)}</strong><span>${escapeMarkup(e.title)}</span><em>${e.reward.owner} · Destiny Ring II</em></button>`).join('');
    const party=state.party.map(id=>`<button type="button" class="whirlpool-member ${state.activeParty.includes(id)?'is-selected':''}" data-whirlpool-member="${id}" aria-pressed="${state.activeParty.includes(id)}"><img src="${menuPortraitSource(id)}" alt=""><strong>${id}</strong><small>Lv ${progressFor(id).level}</small></button>`).join('');
    el.menuBody.innerHTML=`<section class="hall-map whirlpool-menu"><header><div><small>TINUS · CHAOS AGENT</small><h2>Whirlpool of Destinies</h2><p>${p.cleared.length}/8 destinies met · Beyond Shadow Duels / before Ember Rift</p></div><button type="button" data-whirlpool-close aria-label="Return to Ember Hall">×</button></header><p class="whirlpool-intro">“A few acquaintances from my dimensional travels. The paperwork calls this a friendly visit.”<br>Dimensional counterparts inspired by Tinus’s comics. Recommended level 40; one opponent, up to three Flameguard members, 60 rounds. Trial items and vitals are restored afterward.</p><div class="whirlpool-grid">${cards}</div><section class="whirlpool-detail"><div class="whirlpool-preview"><img src="${BASE+info.key}-portrait.webp" alt="${escapeMarkup(info.name)}"><div><small>DESTINY ${selected}/8 · WEAKNESS: ${info.weak}</small><h3>${info.title}</h3><p>${info.hint}</p><p><b>Announced ultimate:</b> ${info.strike}<br>Interrupted rituals expose the enemy for two own actions.</p></div></div><article class="whirlpool-reward"><small>${p.cleared.includes(selected)?'FIRST-CLEAR REWARD EARNED':'GUARANTEED FIRST-CLEAR REWARD'} · ${info.reward.owner.toUpperCase()} ONLY</small><h3>${info.reward.name}</h3><p>${info.reward.desc}</p><p>Personal Artifact · fits only the new <b>Destiny Ring II</b> slot, alongside your existing ring. No base stats or random affixes. Every victory also grants one Shadow-tier gear drop with five affixes.</p></article><h3>Choose your party · ${state.activeParty.length}/3</h3><div class="whirlpool-party">${party}</div>${HallHub.encounterSupportHtml()}<footer><p>${assetFailure?'The art could not load. Reload to retry.':assetsReady?'Healing, cleansing and interruption reward a balanced party.':'Loading dimensional echoes…'}</p><button type="button" data-whirlpool-start ${assetsReady&&available(selected)&&state.activeParty.length?'':'disabled'}>${p.cleared.includes(selected)?'Begin rematch':'Enter this destiny'} →</button></footer></section></section>`;
    el.menuBody.querySelector('[data-whirlpool-close]').onclick=closeHallOverlay;
    el.menuBody.querySelectorAll('[data-whirlpool-select]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.whirlpoolSelect);render();});
    el.menuBody.querySelectorAll('[data-whirlpool-member]').forEach(b=>b.onclick=()=>{const id=b.dataset.whirlpoolMember;if(state.activeParty.includes(id)){if(state.activeParty.length>1)state.activeParty=state.activeParty.filter(n=>n!==id);}else if(state.activeParty.length<3)state.activeParty.push(id);else showHudNotice('Choose up to three party members.');render();});
    HallHub.bindEncounterSupport(render);
    el.menuBody.querySelector('[data-whirlpool-start]').onclick=()=>start(selected);
  }
  const oldInteract=TinusRecruitment.interact;
  function tinusMenu() {
    if (!unlocked()) return oldInteract();
    if (state.map!=='emberHallBattles' || !['walk','hallMap'].includes(mode)) return false;
    stopNavigation(); mode='hallMap'; el.menu.classList.remove('hidden','is-shop'); document.querySelector('.menu-tabs').classList.add('hidden'); el.menu.dataset.menuView='tinus-whirlpool';
    el.menuBody.innerHTML=`<section class="whirlpool-welcome"><img src="${menuPortraitSource('Tinus')}" alt="Tinus"><div><small>CHAOS AGENT</small><h2>Tinus · Between worlds, between coffees</h2><p>“I brought a few people over. Well… versions of people. Marla said I had to stop calling them bar tabs.”</p><p>Eight dimensional encounters. Eight personal skill rings. One very questionable invitation.</p><button type="button" data-whirlpool-open>Whirlpool of Destinies · ${progress().cleared.length}/8</button><button type="button" data-tinus-talk>Talk with Tinus</button><button type="button" data-whirlpool-close>Back to the Hall</button></div></section>`;
    el.menuBody.querySelector('[data-whirlpool-open]').onclick=open;
    el.menuBody.querySelector('[data-tinus-talk]').onclick=()=>{closeHallOverlay();oldInteract();};
    el.menuBody.querySelector('[data-whirlpool-close]').onclick=closeHallOverlay;
    return true;
  }
  TinusRecruitment.interact=tinusMenu;

  for (const e of encounters) enemyAbilityProfiles[e.name]={role:e.role,element:e.element,maxMp:200,identity:{str:100,mag:100,agi:100,stam:100},moves:{},pattern:['melee','magic']};
  function makeEnemy(id) {
    const info=encounters[id-1];
    return {...enemy(info.name,info.hp,info.power,info.weak,'#bfa270',3),whirlpoolKey:info.key,whirlpoolId:id,levelHint:40,fixedLevel:true,npcBoss:true,resistanceTier:'boss'};
  }
  const oldPrepare=prepareEnemyForBattle;
  prepareEnemyForBattle=function(source,...args) {
    const unit=oldPrepare(source,...args); if(!source.whirlpoolKey)return unit;
    const e=encounters[source.whirlpoolId-1];
    Object.assign(unit,{hp:e.hp,max:e.hp,atk:e.power,stats:{str:e.power,mag:e.power,agi:e.agi,stam:180+e.id*6},mp:200,maxmp:200,crit:.06,baseEvasion:.025,xp:0,breakThreshold:BREAK_THRESHOLD*1.5,combatPotency:{damage:1,healing:1,ultimate:1},whirlpoolState:{pending:false,recovery:0}});
    return unit;
  };
  function start(id) {
    if (!assetsReady || !available(id) || state.map!=='emberHallBattles' || !['walk','hallMap'].includes(mode) || !state.activeParty.length || state.activeParty.length>3) return false;
    if (!state.activeParty.every(hero=>state.party.includes(hero)))return false;
    selected=id;
    snapshot={activeParty:[...state.activeParty],resonance:state.resonance,fieldWard:state.fieldWard,inventory:{...state.inventory},stash:{...state.stash},heroes:Object.fromEntries(Object.entries(baseJobs).map(([key,hero])=>[key,{hp:hero.hp,mp:hero.mp}])),player:{...emberHallWorld.player},hallPosition:state.hallPosition?{...state.hallPosition}:null};
    const began=HallHub.beginSupportedBattle(()=>{
      stopNavigation(); el.menu.classList.add('hidden'); document.querySelector('.menu-tabs').classList.remove('hidden');
      startBattle(`Whirlpool ${id}/8 — ${encounters[id-1].title}`,[makeEnemy(id)],undefined,null,[],{hallBoss:true,combatMapId:'emberHallBattles',roundCap:60});
      battle.whirlpoolEncounter=id; renderBattle(encounters[id-1].hint); return true;
    });
    if(!began){restore();snapshot=null;}
    return began;
  }
  const current = () => battle?.whirlpoolEncounter || battle?.enemies?.find(e=>e.whirlpoolKey)?.whirlpoolId || null;
  function interrupt(unit,reason) {
    if(!unit.whirlpoolState?.pending)return false;
    unit.whirlpoolState.pending=false;unit.whirlpoolState.recovery=2;
    applyStatus(unit,'physicalVulnerability',unit,{force:true,value:.2,duration:2});
    applyStatus(unit,'magicVulnerability',unit,{force:true,value:.2,duration:2});
    battle.whirlpoolNotice=`${unit.name}: ${reason}. Ritual cancelled; vulnerability and two recovery actions.`;
    return true;
  }
  const oldApply=applyStatus, oldBreak=addBreakProgress;
  applyStatus=function(unit,type,source,options){const result=oldApply(unit,type,source,options);if(unit?.whirlpoolKey&&result.applied&&['silence','sleep','stun'].includes(type))interrupt(unit,type);return result;};
  addBreakProgress=function(source,unit,amount){const result=oldBreak(source,unit,amount);if(unit?.whirlpoolKey&&result.breaks)interrupt(unit,'fresh Break');return result;};
  const oldChoose=chooseEnemyAction;
  chooseEnemyAction=function(unit) {
    if(!unit.whirlpoolKey)return oldChoose(unit);
    const e=encounters[unit.whirlpoolId-1],data=unit.whirlpoolState;
    const base={kind:'magic',name:e.spell,element:e.element,coefficient:.88,mpCost:0,status:{type:e.status,chance:.6,duration:2,...(['magicVulnerability','disrupted','agilityDown'].includes(e.status)?{value:.15}:{})}};
    if(data.pending){
      if(['broken','silence','sleep','stun'].some(s=>statusOf(unit,s))){interrupt(unit,'control');return {...base,kind:'melee',element:'Physical',name:'Interrupted Strike',status:null,coefficient:.38};}
      data.pending=false;data.recovery=2;battle.whirlpoolNotice=e.strike+' resolves. Recover, then exploit the opening.';
      return {...base,kind:'ultimate',name:e.strike,coefficient:1.32+e.id*.025,allTargets:true,mpCost:0};
    }
    if(data.recovery>0){data.recovery--;return {...base,name:'Recovering Strike',coefficient:.38,status:null};}
    if(statusOf(unit,'silence'))return {...base,kind:'melee',name:'Measured Strike',element:'Physical',coefficient:.7,status:null};
    const actions=unit.actionsTaken||0;
    if(actions%4===2){data.pending=true;battle.whirlpoolNotice=`${e.name} prepares ${e.strike}. On its next own action: group impact. Silence or fresh Break cancels it; Guard and barriers soften it.`;return {kind:'buff',name:'Preparing '+e.strike,target:unit,buffs:[],mpCost:0};}
    if(['benji','bill'].includes(e.key)&&actions%4===0)return {kind:'buff',name:e.key==='bill'?'Ledger Shelter':'Geometric Shelter',target:unit,buffs:[{type:'barrier',value:.18,duration:2}],mpCost:0};
    if(e.role==='bruiser'&&actions%3===0)return {...base,kind:'melee',name:e.key==='demonlord'?'Uncrowned Greatblade':'Bronze Knuckle',element:'Physical'};
    return actions%3===1?{...base,allTargets:true,coefficient:.48}:base;
  };
  const oldRoll=enemyDamageRoll;
  enemyDamageRoll=function(unit,action,hero){const result=oldRoll(unit,action,hero);if(unit.whirlpoolKey)result.damage=Math.min(result.damage,Math.max(1,Math.round(hero.max*(action.kind==='ultimate'?.42:.3))));return result;};

  function restore() {
    if(!snapshot)return;
    state.activeParty=snapshot.activeParty;state.resonance=snapshot.resonance;state.fieldWard=snapshot.fieldWard;
    state.inventory=snapshot.inventory;state.stash=snapshot.stash;
    for(const [id,vitals]of Object.entries(snapshot.heroes))Object.assign(baseJobs[id],vitals);
  }
  function finish(result) {
    const id=current();if(!id||battle.ended||!snapshot)return false;
    battle.ended=true;battle.resolving=true;archiveDamageMeter(result);restore();
    const info=encounters[id-1],entries=[];
    if(result==='victory'){
      const p=progress(),first=!p.cleared.includes(id);
      if(first){p.cleared.push(id);p.cleared.sort((a,b)=>a-b);addOwnedGear(info.reward.name,1,{rarity:'Personal Artifact',stats:{},affixes:[],separateCopy:true,rollAffixes:false});entries.push({kind:'gear',icon:'E',label:info.reward.name,detail:`FIRST CLEAR / Destiny Ring II / ${info.reward.owner} only / ${info.reward.desc}`,value:'×1'});}
      const gear=curios[Math.floor(Math.random()*curios.length)];
      addOwnedGear(gear.name,1,{rarity:'Shadow Artifact',stats:{...gear.stats},affixes:rollGearAffixes(gear,'Shadow Artifact','dragon',5),separateCopy:true,rollAffixes:false});
      entries.push({kind:'gear',icon:'E',label:gear.name,detail:'Shadow Artifact / five affixes / Shadow Duel stat tier',value:'×1'});
      entries.push({kind:'record',icon:'#',label:first?(id===8?'Whirlpool of Destinies complete':`Destiny ${id+1} unlocked`):'Dimensional rematch complete',detail:'Trial items and vitals restored. No EXP or Hall/Rift stage progress.',value:`${p.cleared.length}/8`});
    }else entries.push({kind:'record',icon:'#',label:result==='draw'?'The loop closes for now':'The Hall calls you home',detail:'Items and vitals restored; no reward or progress lost.',value:'RETRY'});
    updatePanels();
    showBattleResult(result==='victory'?'victory':'defeat',entries,()=>{
      state.map='emberHallBattles';state.hallPosition=snapshot.hallPosition;Object.assign(emberHallWorld.player,snapshot.player);snapshot=null;mode='walk';effect=null;updatePanels();open();queueSave();
    });
    saveGame(hallSaveKey());return true;
  }
  const oldWin=winBattle,oldDefeat=triggerPartyDefeat,oldDraw=endBattleDraw;
  winBattle=log=>current()?finish('victory'):oldWin(log);
  triggerPartyDefeat=log=>current()?finish('defeat'):oldDefeat(log);
  endBattleDraw=log=>current()?finish('draw'):oldDraw(log);

  const oldAnimated=drawAnimatedEnemy;
  drawAnimatedEnemy=function(unit,px,py){
    if(!unit.whirlpoolKey)return oldAnimated(unit,px,py);
    const sheet=sheets[unit.whirlpoolKey];if(!sheet)return false;
    const e=encounters[unit.whirlpoolId-1],animation=unit.hp<=0||unit.anim==='death'?'defeat':unit.anim==='attack'?(unit.attackStyle==='ultimate'?'ultimate':unit.attackStyle==='melee'?'attack':'magic'):'idle';
    const indices=sheet.animations[animation]?.frames||({idle:[0,1,2,3,4,5,6,7],attack:[8,9,10,11],magic:[12,13,14,15],ultimate:[16,17,18,19],defeat:[20,21,22,23]})[animation];
    let phase=0;
    if(animation==='idle'){const timing=[500,280,280,320,280,280,280,340];let elapsed=performance.now()%2560;while(phase<7&&elapsed>=timing[phase])elapsed-=timing[phase++];}
    else phase=Math.min(3,Math.floor((animation==='defeat'?Math.max(0,tick-(unit.deathTick??tick)):unit.animTick||0)/7));
    const frame=sheet.frames[indices[phase]],scale=e.size/sheet.referenceHeight;
    const gx=Math.max(384*scale*.5+2,Math.min(LOGICAL_WIDTH-384*scale*.5-2,px+8));
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(sheet.image,...frame.cell,gx-frame.anchor[0]*scale,py+31-frame.anchor[1]*scale,384*scale,384*scale);ctx.restore();
    if(unit.anim==='attack'&&unit.lastAnimDrawTick!==tick){unit.animTick=(unit.animTick||0)+1;unit.lastAnimDrawTick=tick;}return true;
  };
  const oldPortrait=enemyPortraitDataUrl;
  enemyPortraitDataUrl=function(name){const e=encounters.find(e=>e.name===name);return e?BASE+e.key+'-portrait.webp':oldPortrait(name);};
  const oldArena=battleArenaFor,oldBackdrop=drawBattleBackground;
  battleArenaFor=function(map){const id=current();return id?'rift-'+encounters[id-1].arena:oldArena(map);};
  drawBattleBackground=function(image,arena){if(!current())return oldBackdrop(image,arena);const ratio=LOGICAL_WIDTH/BATTLE_ARENA_HEIGHT,sw=Math.min(image.width,image.height*ratio),sh=sw/ratio;ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,0,0,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT);drawRect(0,BATTLE_ARENA_HEIGHT,LOGICAL_WIDTH,LOGICAL_HEIGHT-BATTLE_ARENA_HEIGHT,'#11101a');};
  const oldEffect=makeEnemyBattleEffect,oldDrawEffect=drawEffect;
  makeEnemyBattleEffect=function(unit,hero,action){
    const fx=oldEffect(unit,hero,action);if(!unit.whirlpoolKey)return fx;
    fx.whirlpoolKey=unit.whirlpoolKey;fx.bossSheetVfx=false;
    fx.whirlpoolKind=action.kind==='ultimate'?'ultimate':['buff','cleanse','utility'].includes(action.kind)||action.healing?'magic':'projectile';
    const targets=fx.whirlpoolKind==='magic'?[unit]:action.allTargets?battle.party.filter(u=>u.hp>0):[hero||unit];
    fx.whirlpoolPoints=targets.map(u=>{const own=battle.party.includes(u),[x,y]=own?partyBattlePosition(battle.party.indexOf(u),battle.party.length):enemyBattlePosition(battle.enemies.indexOf(u),battle.enemies.length);return{x:x+8,y:y+6};});
    return fx;
  };
  drawEffect=function(){
    if(!effect?.whirlpoolKey)return oldDrawEffect();
    const fx=effect,sheet=sheets[fx.whirlpoolKey];if(!sheet)return;
    const elapsed=performance.now()-fx.startedAt,total=fx.timing?.totalMs||1200,impact=fx.timing?.impactMs||total*.65,phase=Math.max(0,Math.min(.999,elapsed/total));
    ctx.save();ctx.beginPath();ctx.rect(0,0,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT);ctx.clip();ctx.imageSmoothingEnabled=true;
    const paint=(index,x,y,size,alpha=1)=>{ctx.globalAlpha=alpha;ctx.drawImage(sheet.fx,(index%4)*384,Math.floor(index/4)*384,384,384,x-size/2,y-size/2,size,size);};
    if(fx.whirlpoolKind==='ultimate'){
      ctx.fillStyle='rgba(6,3,18,.27)';ctx.fillRect(0,0,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT);
      const center={x:fx.whirlpoolPoints.reduce((s,p)=>s+p.x,0)/fx.whirlpoolPoints.length,y:fx.whirlpoolPoints.reduce((s,p)=>s+p.y,0)/fx.whirlpoolPoints.length};
      const size=Math.min(150,BATTLE_ARENA_HEIGHT-8),half=size/2+2;
      paint(8+Math.min(3,Math.floor(phase*4)),Math.max(half,Math.min(LOGICAL_WIDTH-half,center.x)),Math.max(half,Math.min(BATTLE_ARENA_HEIGHT-half,center.y-10)),size,phase>.88?(1-phase)/.12:1);
    }else if(fx.whirlpoolKind==='magic')for(const p of fx.whirlpoolPoints)paint(4+Math.floor(phase*4),p.x,p.y-10,76);
    else if(elapsed<impact){const progress=Math.min(1,elapsed/impact),end=fx.whirlpoolPoints[0],x=fx.fromX+(end.x-fx.fromX)*progress,y=fx.fromY+(end.y-fx.fromY)*progress;paint(Math.min(3,Math.floor(progress*4)),x,y,54);}
    else for(const p of fx.whirlpoolPoints)paint(12+Math.min(3,Math.floor((elapsed-impact)/Math.max(1,total-impact)*4)),p.x,p.y-8,72);
    ctx.restore();
  };
  const hud=document.getElementById('bossMechanicHud'),oldDisplay=updateBossMechanicDisplay;
  updateBossMechanicDisplay=function(){
    const id=current();document.querySelector('.game')?.classList.toggle('has-whirlpool-mechanics',Boolean(id&&mode==='battle'&&!battle.ended));if(!id||mode!=='battle'||battle.ended)return oldDisplay();
    const e=encounters[id-1],unit=battle.enemies[0];document.querySelector('.game')?.classList.add('has-endgame-mechanics');
    hud.classList.remove('hidden');hud.innerHTML=`<div class="whirlpool-battle-heading"><b>Whirlpool ${id}/8 · ${escapeMarkup(e.name)}</b><span>${unit?.whirlpoolState?.pending?'PREPARING '+e.strike:unit?.whirlpoolState?.recovery?'RECOVERY WINDOW':'DIMENSIONAL DUEL'}</span></div><p>${escapeMarkup(battle.whirlpoolNotice||e.hint)}</p>`;
  };
  window.TinusWhirlpool={ready,encounters,rings,curios,progress,available,open,start,finish,makeEnemy,interrupt,get assetsReady(){return assetsReady;},get assetFailure(){return assetFailure;}};
})();
