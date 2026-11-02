// Equipment-granted Shadow Trials II actions preserve each wearer's native kit.
(()=>{
'use strict';
const RARITY='Shadow Twist',BASE='assets/shadow-trials-417/gear/';
// Borrow canonical skill definitions without borrowing the donor's talent tree.
const sources={quietRite:['Kael','Quiet Rite'],voidthorn:['Mira','Voidthorn Mark'],comfort:['Sparky','Prrrp'],stoneguard:['Torren','Earthen Guard'],chorus:['Verseborn','Rallying Chorus'],purge:['Seerin','Radiant Purge'],drone:['Glimmer','Combat Drone'],tithe:['Kael','Quiet Tithe']};
function originalHeroAction(id,name){
 const original=[...baseJobs[id].skills,...talentTrees[id].filter(t=>t.type==='newSkill').map(t=>t.value),...(rank0Choices[id]||[])].find(s=>s.name===name);
 if(!original)throw new Error('Missing original gear ability: '+id+' / '+name);
 const granted={...structuredClone(original),iconHero:id},upgrades=talentTrees[id];
 const hitsAll=upgrades.some(t=>t.type==='aoeSkill'&&t.value===name),healsAll=upgrades.some(t=>t.type==='partyHeal'&&t.value===name);
 if(hitsAll)granted.allEnemies=true;
 if(healsAll){granted.partyWide=true;const buff=HEAL_CONVERSION_BUFFS[id]?.[name];if(buff)granted.buffs=[...(granted.buffs||[]),structuredClone(buff)];}
 if(hitsAll||healsAll)granted.desc+=` Upgraded area version: affects every living ${hitsAll?'enemy':'ally'}.`;
 return granted;
}
// Shared by equipment and the enemies that use these actions.
const enemyActions={
 choir:{kind:'magic',name:'The Last Wedding Song',element:'Shadow',scaling:'mag',coefficient:.75,allTargets:true,mpCost:0,status:{type:'silence',chance:1,value:0,duration:1}},
 fetch:{kind:'melee',name:'FETCH',element:'Physical',scaling:'str',coefficient:2,mpCost:0},
 departure:{kind:'magic',name:'You Were Supposed to Arrive',element:'Shadow',scaling:'mag',coefficient:.8,allTargets:true,mpCost:0,status:{type:'agilityDown',chance:1,value:.15,duration:2}},
 inconvenience:{kind:'magic',name:'A Quiet Purchase',element:'Shadow',scaling:'mag',coefficient:.9,allTargets:true,mpCost:0,status:{type:'silence',chance:1,value:0,duration:1}},
 holdFast:{kind:'ultimate',name:'Hold Fast',element:'Physical',scaling:'str',coefficient:2.35,allTargets:true,mpCost:0},
 sunrise:{kind:'ultimate',name:'A Sunrise, Nearly Finished',element:'Shadow',scaling:'mag',coefficient:2.2,allTargets:true,mpCost:0,status:{type:'magicVulnerability',chance:1,value:.15,duration:2}}
};
function originalEnemyAction(key){return structuredClone(enemyActions[key]);}
function enemySkill(key){const original=originalEnemyAction(key);return skill(original.name,original.kind,original.element,0,original.mpCost,
 `${original.coefficient}× ${original.scaling.toUpperCase()} ${original.element} damage to ${original.allTargets?'all enemies':'one enemy'}.`+(original.status?` Inflicts ${original.status.type} for ${original.status.duration} action${original.status.duration===1?'':'s'} (${Math.round(original.status.chance*100)}% base chance).`:'')+(original.kind==='ultimate'?' Requires 100 Resonance.':''),
 {icon:'assets/shadow-trials-417/abilities/'+key+'.webp?v=423',scaling:original.scaling,coefficient:original.coefficient,allEnemies:Boolean(original.allTargets),...(original.status?{status:original.status}:{}),fixedBaseCost:true});}
const actions=Object.fromEntries([...Object.entries(sources).map(([key,[id,name]])=>[key,{...originalHeroAction(id,name),relicAction:key}]),...Object.keys(enemyActions).map(key=>[key,{...enemySkill(key),relicAction:key}])]);
const profiles={sage:{str:10,mag:44,stam:24,agi:20,echo:28},fighter:{str:44,mag:16,stam:28,agi:24,echo:14},guardian:{str:24,mag:20,stam:46,agi:14,echo:22},support:{str:12,mag:38,stam:28,agi:20,echo:28},swift:{str:26,mag:26,stam:22,agi:36,echo:16}};
const fx=(type,value,label,extra={})=>({type,value,label,artifactUnique:true,...extra});
const specs=[
 ['brindle','brindle-bell','Bell of the Unclaimed Guest','necklace','support','quietRite','A guest may leave whenever another voice remembers the way.',[]],
 ['brindle','brindle-hood',"Choirmaster's Unclaimed Hood",'helmet','sage','choir','The pipes carry a wedding chorus nobody remembers booking.',[]],
 ['brindle','brindle-collar',"Executioner's Listening Collar",'necklace','fighter','voidthorn','An executioner put down his axe. The collar still knows where the openings are.',[fx('physicalDamage',.15,'Listening Edge: +15% physical damage'),fx('allStatusResistance',.12,'Patient Guest: +12% resistance to all statuses')]],
 ['vetch','vetch-bonnet',"Hearth-Nurse's Bonnet",'helmet','guardian','stoneguard','Knitted over copper vents, with room for unexpected horns.',[]],
 ['vetch','vetch-tag',"Good Boy's Copper Tag",'necklace','fighter','fetch','The reverse reads: If found, apologise to him first.',[]],
 ['vetch','vetch-crown',"Graftkeeper's Crown",'helmet','support','comfort','Every ampoule contains a seed that has declined to die.',[fx('healPower',.15,'Careful Grafting: +15% healing potency'),fx('statusDuration',1,'Deep Roots: inflicted negative statuses last +1 action')]],
 ['pelligrin','pelligrin-watch',"Conductor's Borrowed Beat",'necklace','support','chorus','Its three hands disagree; the passengers somehow keep time.',[]],
 ['pelligrin','pelligrin-clock','Clockface of the Missed Arrival','helmet','swift','departure','The feather points along a railway that has not been built.',[]],
 ['pelligrin','pelligrin-ticket','Ticket for an Unspent Minute','necklace','swift',null,'Valid yesterday, tomorrow, and the first moment you need it.',[fx('openingTurnProgress',.25,'Unspent Minute: +25% initiative in round 1 only'),fx('statusResistance',.3,'Platform Announcement: +30% Silence resistance',{status:'silence'})]],
 ['nacre','nacre-halo','Polished Borrowed Halo','helmet','sage','purge','The polishing arms think holiness is an issue of maintenance.',[]],
 ['nacre','nacre-pearl','Pearl of Hostile Hospitality','necklace','sage','inconvenience','A polite welcome trapped behind seven particularly small locks.',[]],
 ['nacre','nacre-mask',"Shopkeeper's Second Face",'helmet','swift',null,'The smile is adjustable. The fine print is not.',[fx('afflictedDamage',.16,'An Opening in the Contract: +16% damage against afflicted enemies'),fx('statusChance',.12,'Perfect Pitch: +12% status application chance')]],
 ['orra','orra-goggles',"Flint's Field Goggles",'helmet','sage','drone','The rangefinder follows things that swim beneath solid rock.',[]],
 ['orra','orra-teeth',"Whaler's Teeth",'necklace','fighter','holdFast','Three teeth, one gauge, and a promise not to let go.',[]],
 ['orra','orra-sallet',"Pressure-Warden's Sallet",'helmet','guardian',null,'The valve opens before the wearer does.',[fx('blockPower',.25,'Pressure Discipline: 25% stronger personal Guard'),fx('physicalDamage',.12,'Harpoon Temper: +12% physical damage')]],
 ['custodian','custodian-lantern','Lantern of the Next Attempt','necklace','support','tithe','A sunrise small enough to hold, unfinished enough to change.',[]],
 ['custodian','custodian-mask','Mask of the Unfinished Dawn','helmet','sage','sunrise','Wood and porcelain meet at a seam that has learned to glow.',[]],
 ['custodian','custodian-thread','Thread of the Returning Hand','necklace','support',null,'Someone kept enough thread to come back.',[fx('siphoning',.15,'Returning Thread: refund 30% of paid MP after a damaging skill; no Ultimate refund'),fx('healPower',.12,'A Hand Left Open: +12% healing potency')]]
];
const byName=new Map(),tables={},items=[];
specs.forEach(([key,slug,name,slot,profile,ability,flavour,effects])=>{
 const command=ability?actions[ability]:null;
 const desc=flavour+' '+(command?'Grants '+command.name+': '+command.desc:'')+' All heroes. Highest-tier Artifact stat budget; five premium affixes.';
 const unique=command?[fx('shadowTwistAction',1,'GRANTED ACTION: '+command.name+' — '+command.desc,{ability}),...effects]:effects;
 let gear=gearDb[slot].find(g=>g.name===name);
 if(!gear){gear=item(name,slot,{...profiles[profile]},desc,unique);Object.assign(gear,{rarity:RARITY,shadowTwist:true,shadowTwistKey:key,shadowTwistAbility:ability,shadowTwistIcon:slug,statBudget:126});gearDb[slot].push(gear);}
 artifactGearNames.add(name);byName.set(name,gear);items.push(gear);
 (tables[key]??=[]).push({gear,weight:[45,35,20][tables[key]?.length||0]});
});
const oldDefault=defaultGearRarity,oldRarity=gearRarity,oldRank=gearRarityRank;
defaultGearRarity=function(name){return byName.has(gearBaseName(name))?RARITY:oldDefault(name);};
gearRarity=function(name){return byName.has(gearBaseName(name))?RARITY:oldRarity(name);};
gearRarityRank=function(rarity){return rarity===RARITY?oldRank('Artifact'):oldRank(rarity);};
if(!GEAR_DISPLAY_RARITIES.includes(RARITY))GEAR_DISPLAY_RARITIES.push(RARITY);
const oldIcon=gearIconHtml;
gearIconHtml=function(gear,heroId,fallbackIndex,className='',ref=null){
 const entry=byName.get(gear?.name||gearBaseName(ref));
 return entry?`<span class="pixel-icon ${escapeMarkup(className)} gear-art-icon gear-art-${entry.slot}" aria-hidden="true" style="background-image:url('${BASE+entry.shadowTwistIcon}.webp');background-size:contain;background-position:center;background-repeat:no-repeat"></span>`:oldIcon(gear,heroId,fallbackIndex,className,ref);
};
function ownedActions(id,unit=null){
 if(unit?.sparringId||!baseJobs[id])return [];
 const seen=new Set();return ['helmet','necklace'].flatMap(slot=>{const gear=gearByName(baseJobs[id].gear[slot]),key=gear?.shadowTwistAbility;if(!key||seen.has(key))return [];seen.add(key);const granted={...structuredClone(actions[key]),relicGear:gear.name,talentSkill:true};return [window.BattleActionModel?BattleActionModel.metadata(id,granted):granted];});
}
const oldSkills=battleSkills;
battleSkills=function(id,unit){const list=oldSkills(id,unit),enemyTurn=!unit&&mode==='battle'&&battle?.turnQueue?.[battle.turnIndex]?.side==='enemy';if(enemyTurn||unit?.sparringId)return list;const granted=ownedActions(id,unit);return [...list.map(sk=>{const gearSkill=granted.find(g=>g.name===sk.name);return gearSkill?{...sk,...gearSkill}:sk;}),...granted.filter(sk=>!list.some(native=>native.name===sk.name))];};
function progress(){
 state.flags??={};const p=state.flags.shadowRelics417;
 if(!p||typeof p!=='object'||Array.isArray(p))state.flags.shadowRelics417={first:[],wins:{}};
 const result=state.flags.shadowRelics417;result.first=Array.isArray(result.first)?result.first.filter(key=>tables[key]):[];
 if(!result.wins||typeof result.wins!=='object'||Array.isArray(result.wins))result.wins={};return result;
}
function premiumAffixes(gear){const keys=gear.stats.str>gear.stats.mag?['keen','resolute','fleet','leeching','quickstart']:['resonant','resolute','alchemist','siphoning','prolonging'];return keys.map(key=>{const t=affixPools.accessory.find(e=>e.key===key);return t?{...t,value:t.max,statusRulesVersion:2}:null;}).filter(Boolean);}
function own(gear){return Boolean(state.ownedGear?.includes(gear.name)||echoGearInstanceRefs(gear.name).length||Object.values(baseJobs).some(hero=>Object.values(hero.gear).some(ref=>ref&&gearBaseName(ref)===gear.name)));}
function grant(gear,reason){const refs=addOwnedGear(gear.name,1,{rarity:RARITY,stats:{...gear.stats},affixes:premiumAffixes(gear),separateCopy:true,rollAffixes:false});return {kind:'gear',icon:'E',label:gear.name,detail:`${reason} / ${RARITY} / ${gear.slot} / All heroes / ${gear.desc}`,value:'×1',ref:refs[0]};}
function duplicateCopy(name){
 const gear=byName.get(gearBaseName(name));if(!gear)return null;
 const copy=grant(gear,'DEVELOPER COPY');queueSave();return copy.ref;
}
function reward(key,firstClear=false){
 const table=tables[key];if(!table)return [];const p=progress(),entries=[];
 if(firstClear&&!p.first.includes(key)){p.first.push(key);if(!own(table[0].gear))entries.push(grant(table[0].gear,'FIRST CLEAR'));else entries.push({kind:'record',icon:'✓',label:'Signature already owned',detail:table[0].gear.name,value:'RECORDED'});}
 p.wins[key]=(Number(p.wins[key])||0)+1;
 let roll=Math.random()*100,pick=table[table.length-1];for(const e of table){roll-=e.weight;if(roll<0){pick=e;break;}}
 if(!own(pick.gear))entries.push(grant(pick.gear,'ENCOUNTER TABLE DROP'));
 else{state.gold=(Number(state.gold)||0)+650;addInventoryItem('Clockwork Tonic',2);entries.push({kind:'item',icon:'+',label:'Recovered components',detail:`Duplicate ${pick.gear.name} converted to 650 G and 2 Clockwork Tonics.`,value:'SALVAGED'});}
 return entries;
}
const esc=escapeMarkup;
function preview(key){const table=tables[key];if(!table)return '';return `<section class="shadow-twist-loot"><h3>Encounter loot · <span class="shadow-twist-rarity">Shadow Twist</span></h3><p>First clear guarantees <b>${esc(table[0].gear.name)}</b>. Every victory also rolls this encounter's table. Duplicate rolls convert to 650 G + 2 Clockwork Tonics.</p>${table.map(({gear,weight},i)=>`<article>${gearIconHtml(gear,null,gear.slot==='helmet'?4:3,'shadow-twist-loot-icon')}<div><strong>${esc(gear.name)}</strong><small><span class="shadow-twist-rarity">Shadow Twist</span> · ${esc(gear.slot)} · ${weight}%${i===0?' · First-clear signature':''}</small><p>${esc(gear.desc)}</p>${gearEffects(gear).map(e=>`<small>${esc(e.label)}</small>`).join('')}</div></article>`).join('')}<p>Granted actions do not replace native skills or transformations. Once-per-battle actions share their lock across wearers.</p></section>`;}
const rarityCss='.gear-rarity.rarity-shadow-twist,.shadow-twist-rarity{color:#ff9b36!important;font-weight:700}.shadow-twist-loot>article{display:flex;gap:10px;margin:9px 0;padding:8px;border:1px solid #765a35;background:#17111d}.shadow-twist-loot-icon{width:44px;height:44px;flex:0 0 44px}.shadow-twist-loot small{display:block}.shadow-twist-loot p{font-size:11px;line-height:1.4}';
if(document.head){const style=document.createElement('style');style.textContent=rarityCss;document.head.appendChild(style);}
function decorateRarity(root){
 if(!root||!document.createTreeWalker||!document.createTextNode)return;
 const walker=document.createTreeWalker(root,4),nodes=[];let n;
 while(n=walker.nextNode())if(/Shadow Twist|SHADOW TWIST/.test(n.nodeValue||'')&&!n.parentElement?.closest('.shadow-twist-rarity,script,style'))nodes.push(n);
 for(const node of nodes){const fragment=document.createDocumentFragment();for(const part of node.nodeValue.split(/(Shadow Twist|SHADOW TWIST)/g)){if(/^(Shadow Twist|SHADOW TWIST)$/.test(part)){const span=document.createElement('span');span.className='shadow-twist-rarity';span.textContent=part;fragment.appendChild(span);}else fragment.appendChild(document.createTextNode(part));}node.replaceWith(fragment);}
}
if(typeof MutationObserver!=='undefined'&&document.body&&document.createTreeWalker){const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)decorateRarity(node);});observer.observe(document.body,{subtree:true,childList:true});decorateRarity(document.body);}
window.ShadowRelics={RARITY,BASE,actions,sources,originalHeroAction,enemyActions,originalEnemyAction,items,tables,ownedActions,progress,reward,preview,premiumAffixes,duplicateCopy,rarityCss,decorateRarity};
})();
