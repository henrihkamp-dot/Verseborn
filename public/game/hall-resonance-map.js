// Ember Hall presentation only. Existing battle definitions and Hall save data remain authoritative.
(()=>{
'use strict';
const BASE='assets/hall/resonance-321/',esc=escapeMarkup;
const definitions=[
 ['ashenMarch','The Ashen March','ashen-march','A passage through the volcanic ruins.','horizontal',[[12,54],[25.5,58],[32.6,61.5],[45,62.5],[55.5,54.5],[65.5,49.5],[75,54.5],[82.8,47],[87,43],[90.5,39]],[5.5,51]],
 ['crownspire','The Crownspire','crownspire','Climb the terraces toward the dragon rooftop.','ascent',[[29.5,77],[45.5,66],[56,58],[65.5,59],[72,50.5],[66,43],[61.5,35.5],[69,28],[77,21],[87,16]],[14,85]],
 ['falseDawnCircuit','The False Dawn Circuit','false-dawn-circuit','Wake the outer circuit. Reach the machine at its heart.','circuit',[[50,85],[20,67],[10,49],[13,31],[30,17],[50,12],[70,18],[85,31],[83,65],[50,50]],[48,96]],
 ['hallOfEchoes','The Hall of Echoes','hall-of-echoes','Cross the galleries. Follow the memories inward.','inward',[[50,86],[18,65],[83,64],[35,49],[50,58],[65,49],[30,30],[78,28],[35,20],[50,25]],[49,98]],
 ['brokenAscension','The Broken Ascension','broken-ascension','Broken worlds joined by threads of resonance.','fragments',[[8.5,78],[20,57],[35,26],[44,22],[53,18],[62,40],[48,60],[70,68],[77,46],[89,39]],[3,89]],
 ['resonanceDepths','The Resonance Depths','resonance-depths','Descend through the archives to the First Record.','descent',[[33.5,19],[53,29],[69,36],[77,46],[68,52],[57,55],[43,61],[28.5,70],[35.5,80],[54.5,87]],[8,12]]
];
const landmarkNames=['Ruined Archive Altar','Dragon Rooftop Perch','Central Machine Core','Echo Cathedral Throne','Shattered Solar Pedestal','Deep Resonance Core'];
const HALL_MAP_REGIONS=Object.fromEntries(definitions.map(([id,name,file,description,layout,points,arrival],regionIndex)=>{
 const first=regionIndex*10+1,stages=points.map((p,i)=>first+i);
 const fixtures=points.map(([x,y],i)=>({stage:first+i,x,y,fixtureType:i===9?'landmark':hallBattleInfo(first+i)?.boss?'elite':'standard',fixtureAsset:BASE+'fixture-available.webp',selectedAsset:BASE+'fixture-selected.webp',bossLandmark:i===9?landmarkNames[regionIndex]:null,interactiveBounds:i===9?[17,32]:hallBattleInfo(first+i)?.boss?[7,16]:[6,13],scale:1,zOrder:Math.round(y),labelOffset:i===9?[0,5]:[0,3],routeConnections:i<9?[first+i+1]:[],navigation:{}}));
 // Directional neighbors are explicit per authored layout; coordinates never come from stage distribution.
 fixtures.forEach(f=>{for(const [direction,dx,dy]of [['right',1,0],['left',-1,0],['up',0,-1],['down',0,1]]){const n=fixtures.filter(g=>g!==f&&(g.x-f.x)*dx+(g.y-f.y)*dy>1).sort((a,b)=>{const score=g=>Math.hypot(g.x-f.x,g.y-f.y)+Math.abs((g.x-f.x)*dy-(g.y-f.y)*dx)*1.5;return score(a)-score(b)});f.navigation[direction]=n.map(g=>g.stage);}});
 const routes=fixtures.slice(0,-1).map((f,i)=>({from:f.stage,to:fixtures[i+1].stage,kind:layout==='fragments'?'beam':'rail',points:[[f.x,f.y],[fixtures[i+1].x,fixtures[i+1].y]]}));
 if(id==='hallOfEchoes'){
 const waypoints=[[[50,86],[37,82],[26,73],[18,65]],[[18,65],[18,51],[24,40],[38,35],[60,34],[76,42],[83,54],[83,64]],[[83,64],[77,69],[64,71],[50,72],[39,66],[35,57],[35,49]],[[35,49],[40,54],[50,58]],[[50,58],[59,55],[65,49]],[[65,49],[68,39],[61,32],[46,29],[30,30]],[[30,30],[44,25],[60,24],[78,28]],[[78,28],[65,18],[50,15],[35,20]],[[35,20],[43,22],[50,25]]];routes.forEach((r,i)=>r.points=waypoints[i]);
 }
 if(id==='falseDawnCircuit'){
 const waypoints=[[[50,85],[33,80],[20,67]],[[20,67],[12,60],[10,49]],[[10,49],[10,40],[13,31]],[[13,31],[20,22],[30,17]],[[30,17],[40,12],[50,10]],[[50,10],[60,12],[70,18]],[[70,18],[80,23],[85,31]],[[85,31],[89,46],[83,65]],[[83,65],[66,59],[50,50]]];routes.forEach((r,i)=>r.points=waypoints[i]);
 }
 return [id,{id,name,first,last:first+9,stages,background:BASE+file+'.webp',description,layout,fixtures,routes,arrival,landmark:landmarkNames[regionIndex]}];
}));
const phases={};
const regions=Object.values(HALL_MAP_REGIONS);let selectedStage=null,regionId=null,lastUnlocked=null,unlockStage=null,unlockRegion=null,returnStage=null,unlockTimer=null;
const regionFor=stage=>regions.find(r=>r.stages.includes(Number(stage)))||regions[0];
const unlocked=stage=>stage<=hallBattleProgress().unlockedStage||hallBattleProgress().clearedStages.includes(stage);
function preferredStage(fallback){if(selectedStage&&unlocked(selectedStage))return selectedStage;return Number(fallback)||1;}
function stateFor(stage){return hallBattleProgress().clearedStages.includes(stage)?'cleared':unlocked(stage)?'available':'locked';}
function select(stage){if(!unlocked(stage))return false;selectedStage=Number(stage);regionId=regionFor(stage).id;const b=el.menuBody.querySelector('.hall-stage-grid [data-hall-stage="'+stage+'"]');if(b)b.click();else HallHub.openPreparation(stage);return true;}
function renderCanvas(r){
 const fi=r.fixtures.map(f=>{
  const state=stateFor(f.stage),chosen=f.stage===selectedStage,major=f.fixtureType==='landmark',type=chosen?'selected':state,info=hallBattleInfo(f.stage);
  const image=major?BASE+'boss-'+f.stage+'-'+(state==='locked'?'dormant':'awake')+'.webp':BASE+'fixture-'+(f.fixtureType==='elite'&&state!=='locked'&&!chosen?'elite':type)+'.webp';
  return `<button type="button" class="res-fixture ${major?'res-landmark':''} ${f.fixtureType==='elite'?'res-elite':''} is-${state} ${chosen?'is-selected':''} ${f.stage===unlockStage?'is-awakening':''}" data-res-stage="${f.stage}" aria-label="Stage ${f.stage}: ${esc(info.name)}. ${major?esc(f.bossLandmark)+'. ':''}${state}${chosen?', selected':''}" aria-pressed="${chosen}" ${state==='locked'?'disabled':''} style="--x:${f.x}%;--y:${f.y}%;--z:${f.zOrder};--size:${f.interactiveBounds[0]}%;--fixture-height:${f.interactiveBounds[1]}%;--art-scale:${f.scale}"><img src="${image}" alt="" draggable="false"><span class="res-stage-number">${f.stage}</span>${state==='cleared'?'<small class="res-completion" aria-hidden="true">✓</small>':''}<span class="res-fixture-name">${esc(info.name)}</span></button>`;
 }).join('');
 const routes=r.routes.map(route=>{const state=stateFor(route.to),active=route.to===selectedStage||route.to===unlockStage;return `<polyline class="res-route ${route.kind} is-${state} ${active?'is-selected':''}" points="${route.points.map(p=>p.join(',')).join(' ')}"/>`;}).join('');
 return `<div class="res-canvas" data-region="${r.id}" style="--region-art:url('${r.background}')"><img class="res-landscape" src="${r.background}" alt="${esc(r.name)}: ${esc(r.description)}" draggable="false"><svg class="res-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${routes}</svg><img class="res-arrival" style="left:${r.arrival[0]}%;top:${r.arrival[1]}%" src="${BASE}gate.webp" alt="Arrival Resonance Gate"><div class="res-fixtures" role="group" aria-label="${esc(r.name)} battle locations">${fi}</div><div class="res-motes" aria-hidden="true"></div></div>`;
}
function mount(host){
 if(!host?.querySelector('.hall-stage-grid'))return;
 const nativeSelected=host.querySelector('.hall-stage.is-selected');if(nativeSelected){selectedStage=Number(nativeSelected.dataset.hallStage);regionId=regionFor(selectedStage).id;}
 const progress=hallBattleProgress();
 if(lastUnlocked!==null&&progress.unlockedStage<lastUnlocked){clearTimeout(unlockTimer);unlockStage=null;unlockRegion=null;}
 if(lastUnlocked!==null&&progress.unlockedStage>lastUnlocked){clearTimeout(unlockTimer);unlockStage=progress.unlockedStage;const r=regionFor(unlockStage);if(r.first===unlockStage)unlockRegion=r.name;unlockTimer=setTimeout(()=>{unlockStage=null;unlockRegion=null;el.menuBody.querySelectorAll('.is-awakening').forEach(n=>n.classList.remove('is-awakening'));el.menuBody.querySelector('.res-unlock')?.remove();},1800);}
 lastUnlocked=progress.unlockedStage;
 const r=regions.find(v=>v.id===regionId)||regionFor(selectedStage||progress.unlockedStage);
 host.classList.add('resonance-mode');host.dataset.resonanceRegion=r.id;
 const header=host.querySelector(':scope>header>div');if(header)header.innerHTML=`<strong>Ember Hall · Resonance Regions</strong><p>${progress.clearedStages.length}/60 records cleared · ${esc(r.name)} · Stages ${r.first}–${r.last}</p>`;
 host.querySelector('.res-map-area')?.remove();
 const area=document.createElement('section');area.className='res-map-area';area.setAttribute('aria-label','Ember Hall region map');
 area.innerHTML=`<header class="res-region-title"><div><small>RESONANCE COORDINATES · ${r.first}–${r.last}</small><h2>${esc(r.name)}</h2><p>${esc(r.description)}</p></div><button type="button" data-res-hub title="Return to the Resonance Machine in Ember Hall">Resonance Machine</button></header><div class="res-viewport">${renderCanvas(r)}</div><nav class="res-regions" aria-label="Resonance regions">${regions.map(v=>`<button type="button" data-res-region="${v.id}" class="${v.id===r.id?'is-selected':''} ${v.name===unlockRegion?'is-awakening':''}" ${!unlocked(v.first)?'disabled':''} aria-label="${esc(v.name)}, stages ${v.first} to ${v.last}${!unlocked(v.first)?', locked':''}" ${v.id===r.id?'aria-current="page"':''}><img src="${v.background}" alt=""><strong>${v.first}–${v.last}</strong><span>${esc(v.name)}</span></button>`).join('')}</nav><footer class="res-legend"><span>◆ Available</span><span>◇ Selected</span><span>✓ Cleared</span><span>Dim · Locked</span><small>Click / tap a fixture · Arrow keys to explore</small></footer>${unlockStage?`<p class="res-unlock" role="status">${unlockRegion?'New Resonance coordinates acquired · '+esc(unlockRegion):'Stage '+unlockStage+' · Resonance awakened'}</p>`:''}`;
 host.insertBefore(area,host.querySelector('.trial-ember-detail'));
 area.querySelector('[data-res-hub]').onclick=closeHallOverlay;
 area.querySelectorAll('[data-res-stage]').forEach(b=>{b.onclick=()=>select(Number(b.dataset.resStage));b.onkeydown=e=>{
  const direction={ArrowRight:'right',ArrowLeft:'left',ArrowUp:'up',ArrowDown:'down'}[e.key];if(!direction)return;e.preventDefault();e.stopPropagation();
  const f=r.fixtures.find(f=>f.stage===Number(b.dataset.resStage)),next=f.navigation[direction].find(unlocked);if(next){select(next);el.menuBody.querySelector('[data-res-stage="'+next+'"]')?.focus();}
 };});
 area.querySelectorAll('[data-res-region]').forEach(b=>b.onclick=()=>{const next=HALL_MAP_REGIONS[b.dataset.resRegion],stage=next.stages.includes(selectedStage)?selectedStage:next.stages.filter(unlocked).at(-1);select(stage);});
 const overview=host.querySelector('.trial-overview'),info=hallBattleInfo(selectedStage);
 if(overview&&info){const headings=overview.querySelectorAll(':scope>h3');if(headings.length>1)headings[0].remove();overview.querySelector('.res-stage-meta')?.remove();const meta=document.createElement('div');meta.className='res-stage-meta';meta.innerHTML=`<strong>Stage ${info.stage} · ${stateFor(info.stage)==='cleared'?'Cleared / replay':info.boss?'Boss encounter':'Battle encounter'}</strong><span>Rewards · ${esc(rollHallGearRarity(info.stage))} gear · Gold · EXP${info.boss?' · Boss bonus':''}</span>`;overview.prepend(meta);
 const waves=[info.enemies,...info.waves].map((keys,i)=>hallEnemiesForStage(info.stage,keys,i).map(u=>prepareEnemyForBattle(u,info.stage>50?'emberHallBattles':info.mapId)));
 overview.querySelectorAll('.encounter-enemies>section').forEach((section,index)=>{
  const title=section.querySelector('h4');if(title)title.textContent=waves.length>1?'Phase '+(index+1)+' / '+waves.length:'Enemies';
  section.querySelectorAll('.encounter-enemy').forEach((row,i)=>{
   const u=waves[index]?.[i];if(!u)return;const move=enemyActionForKind(u,'ultimate');
   const status=[move.status,...(move.extraStatuses||[])].filter(Boolean).map(v=>(STATUS_DEFS[v.type]?.label||v.type)+(v.duration?' · '+v.duration+' actions':''));
   const effects=[move.healing?'Restores allies':(move.allTargets?'All opponents':'Single opponent')+' · '+move.element,...status];
   if(move.partyResonanceDrain)effects.push('Drains '+move.partyResonanceDrain+' party Resonance');
   if(move.teamBuffs?.length)effects.push('Allies: '+move.teamBuffs.map(v=>STATUS_DEFS[v.type]?.label||v.type).join(', '));
   const ult=document.createElement('p');ult.className='res-enemy-ultimate';ult.innerHTML='<b>Ultimate · '+esc(move.name)+'</b><small>'+esc(effects.join(' · '))+'</small>';row.appendChild(ult);
  });
 });
 const tabs=[...overview.querySelectorAll('.encounter-wave-tabs button')];tabs.forEach((button,i)=>{button.textContent='Phase '+(i+1);button.setAttribute('aria-label','View phase '+(i+1)+' of '+waves.length);const original=button.onclick;button.onclick=()=>{phases[info.stage]=i;original?.();button.setAttribute('aria-pressed','true');tabs.filter(b=>b!==button).forEach(b=>b.setAttribute('aria-pressed','false'));};});
 if(tabs.length)tabs[Math.min(phases[info.stage]||0,tabs.length-1)].click();

 }
}
const nativeMount=TrialNavigation.mount;
TrialNavigation.mount=function(path){const result=nativeMount(path);if(path==='ember')mount(el.menuBody.querySelector('.hall-map'));return result;};
// Continue preserves the native rewards/recruitment callback, then returns Hall battles to their region.
const nativeResult=showBattleResult;
showBattleResult=function(kind,entries,after){const stage=state.gameMode==='hallBattles'?battle?.hallStage:null;if(stage){returnStage=stage;selectedStage=kind==='victory'&&stage%10!==0?Math.min(stage+1,regionFor(stage).last):stage;regionId=regionFor(stage).id;}
 return nativeResult(kind,entries,stage?()=>{after?.();if(state.gameMode==='hallBattles'&&!hallBattleProgress().pendingRecruit&&mode!=='dialogue'&&mode!=='cutscene')openHallBattleMap();}:after);
};
window.HALL_MAP_REGIONS=HALL_MAP_REGIONS;window.HallResonanceMap={mount,select,preferredStage,stateFor,regionFor,get selectedStage(){return selectedStage;},get returnStage(){return returnStage;}};
})();
