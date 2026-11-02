// Illustrated selectors share the Hall layout; native cards own locks, selection and battle entry.
(()=>{
'use strict';
const BASE='assets/mode-maps-322/',esc=escapeMarkup;
const modes={
 shadow:{name:'Shadow Trials',subtitle:'The Unlit Reflections',description:'Seven personal trials beneath a silent eclipse.',points:[[9.5,69],[26.3,56.5],[42,69],[51,38],[65.5,54],[80,45],[90.5,26.5]],offset:0},
 whirlpool:{name:'Whirlpool of Destinies',subtitle:'The Impossible Convergence',description:'Eight encounters adrift in a constellation of possible worlds.',points:[[12,60],[26,34],[46,24],[74,28],[87,52],[73,76],[37.5,79.5],[50,48]],offset:7},
 rift:{name:'Rift Battles',subtitle:'Worlds Beyond the Last Ember',description:'Follow the fragments through the dragon-haunted depths.',points:[[12,83],[25,64],[24,39],[38,77],[45,59],[54,35],[70,50],[69,70],[86,47],[87,28]],offset:15}
};
const bonusShadow={name:'Shadow Trials II',subtitle:'The Closed Ledger',description:'One final trial beyond the seven reflections. Six future encounters remain sealed.',firstStage:8,sizes:[16,10,10,10,10,10,10],points:[[15,73],[36,55],[51,48],[62,42],[72,37],[82,33],[92,29]],offset:0,landscape:'assets/shadow-tinus-405/map.webp',names:['Shadow Tinus','TBD','TBD','TBD','TBD','TBD','TBD'],fixtureFiles:['assets/shadow-tinus-405/landmark.webp?v=412',...Array(6).fill(BASE+'fixture-1.webp')]};
function mount(path){
 const host=el.menuBody.querySelector('.trial-screen-'+path);if(!host)return;const bonus=path==='shadow'&&host.classList.contains('shadow-bonus-screen'),config=path==='shadow'&&host.classList.contains('shadow-court-screen')?window.ShadowCourt?.region:bonus?bonusShadow:modes[path];if(!config)return;const landscape=config.landscape||BASE+path+'.webp';
 const grid=host.querySelector('.hall-stage-grid,.whirlpool-grid'),panel=host.querySelector('.trial-split-detail');if(!grid||!panel)return;
 const cards=[...grid.querySelectorAll(':scope>button')];if(cards.length!==config.points.length)return;
 const names=config.names||(path==='shadow'?[...HallHub.originalShadowTrialIds].map(id=>'Shadow '+id):(path==='rift'?EmberRift:TinusWhirlpool).encounters.map(e=>e.name));
 const selected=Math.max(0,cards.findIndex(b=>b.classList.contains('is-selected')));
 host.classList.add('resonance-mode','res-mode-'+path);panel.classList.add('trial-ember-detail');
 // Some native overlays have an introductory paragraph outside their detail panel.
 [...host.children].filter(n=>n.tagName==='P').forEach(n=>n.hidden=true);
 grid.hidden=true;
 host.querySelector('.res-map-area')?.remove();
 const area=document.createElement('section');area.className='res-map-area';area.setAttribute('aria-label',config.name+' map');
 const fixtures=cards.map((card,i)=>{const [x,y]=config.points[i],status=card.disabled?'locked':card.classList.contains('is-cleared')?'cleared':'available';return `<button type="button" class="res-fixture res-boss is-${status} ${i===selected?'is-selected':''}" data-mode-fixture="${i}" style="--x:${x}%;--y:${y}%;--z:${Math.round(y)};--size:${config.sizes?.[i]||10}%" ${card.disabled?'disabled':''} aria-label="${esc(names[i])}, boss encounter, ${status}" aria-pressed="${i===selected}">${config.integratedLandmarks?'<span class="court-map-marker" aria-hidden="true"></span>':`<img src="${config.fixtureFiles?.[i]||BASE+'fixture-'+(config.offset+i+1)+'.webp'}" alt="" draggable="false">`}<span class="res-stage-number">${i+(config.firstStage||1)}</span>${status==='cleared'?'<small class="res-completion">✓</small>':''}<span class="res-fixture-name">${esc(names[i])}</span></button>`}).join('');
 const regionTabs=path==='shadow'?[modes.shadow,bonusShadow,...(window.ShadowCourt?[ShadowCourt.region]:[])].map((region,i)=>{const current=host.classList.contains('shadow-court-screen')?i===2:bonus?i===1:i===0;return `<button type="button" data-shadow-region="${i}" class="${current?'is-selected':''}" ${current?'aria-current="page"':''} aria-label="Shadow Trials ${i===2?'III, stages 15 to 21':i?'II, stages 8 to 14':'I, stages 1 to 7'}"><img src="${region.landscape||BASE+'shadow.webp'}" alt=""><strong>${i===2?'15–21':i?'8–14':'1–7'}</strong><span>${esc(region.subtitle)}</span></button>`;}).join(''):`<button type="button" class="is-selected" aria-current="page"><img src="${landscape}" alt=""><strong>${config.firstStage||1}–${(config.firstStage||1)+cards.length-1}</strong><span>${esc(config.subtitle)}</span></button>`;
 area.innerHTML=`<header class="res-region-title"><div><small>${esc(config.name.toUpperCase())} · ${cards.length} ENCOUNTERS</small><h2>${esc(config.subtitle)}</h2><p>${esc(config.description)}</p></div><button type="button" data-mode-hub>Resonance Machine</button></header><div class="res-viewport"><div class="res-canvas" data-region="${path}"><img class="res-landscape" src="${landscape}" alt="${esc(config.description)}" draggable="false"><div class="res-fixtures" role="group" aria-label="Encounter destinations">${fixtures}</div><div class="res-motes" aria-hidden="true"></div></div></div><nav class="res-regions" aria-label="Regions">${regionTabs}</nav><footer class="res-legend"><span>◆ Available</span><span>◇ Selected</span><span>✓ Cleared</span><span>Dim · Locked</span><small>Click / tap a landmark · Arrow keys to explore</small></footer>`;
 host.insertBefore(area,panel);area.querySelectorAll('[data-shadow-region]').forEach(button=>{button.onclick=()=>{if(Number(button.dataset.shadowRegion)===2)window.ShadowCourt.open();else if(Number(button.dataset.shadowRegion)===1)window.ShadowBonus.open();else HallHub.renderSparring();};});area.querySelector('[data-mode-hub]').onclick=closeHallOverlay;
 area.querySelectorAll('[data-mode-fixture]').forEach(button=>{
  button.onclick=()=>cards[Number(button.dataset.modeFixture)].click();
  button.onkeydown=e=>{const direction={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!direction)return;e.preventDefault();e.stopPropagation();const index=Number(button.dataset.modeFixture),[x,y]=config.points[index],[dx,dy]=direction;
   const next=config.points.map(([a,b],i)=>({i,forward:(a-x)*dx+(b-y)*dy,score:Math.hypot(a-x,b-y)+Math.abs((a-x)*dy-(b-y)*dx)*1.5})).filter(p=>p.forward>1&&!cards[p.i].disabled).sort((a,b)=>a.score-b.score)[0];if(next){cards[next.i].click();el.menuBody.querySelector('[data-mode-fixture="'+next.i+'"]')?.focus();}
  };
 });
 const overview=panel.querySelector('.trial-overview');
 if(overview){
  overview.querySelectorAll('.encounter-wave-tabs button').forEach((button,i)=>{button.textContent='Phase '+(i+1);button.setAttribute('aria-label','View phase '+(i+1));});
  if(path==='shadow'&&!bonus){const id=[...HallHub.originalShadowTrialIds][selected],names=battleSkills(id,{sparringId:id}).filter(s=>s.anim==='ultimate').map(s=>s.name);if(names.length){const box=document.createElement('p');box.className='res-mode-ultimate';box.textContent='Ultimates · '+names.join(' / ');overview.appendChild(box);}}
  const info=path==='shadow'?null:(path==='rift'?EmberRift:TinusWhirlpool).encounters[selected];
  if(info){const meta=document.createElement('p');meta.className='res-stage-meta';meta.textContent=info.hint||config.description;overview.appendChild(meta);
   const ultimate=path==='rift'?(info.mechanic==='hearth'?'The Hearth Holds':info.strike):info.strike;
   if(ultimate){const box=document.createElement('p');box.className='res-mode-ultimate';box.textContent='Ultimate · '+ultimate;overview.appendChild(box);}
  }
 }
}
const nativeMount=TrialNavigation.mount;TrialNavigation.mount=function(path){const result=nativeMount(path);if(modes[path])mount(path);return result;};
window.OtherResonanceMaps={modes,bonusShadow,mount};
})();
