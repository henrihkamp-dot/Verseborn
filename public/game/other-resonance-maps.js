// Illustrated selectors share the Hall layout; native cards own locks, selection and battle entry.
(()=>{
'use strict';
const BASE='assets/mode-maps-322/',esc=escapeMarkup;
const modes={
 shadow:{name:'Shadow Trials',subtitle:'The Unlit Reflections',description:'Seven personal trials beneath a silent eclipse.',points:[[9.5,69],[26.3,56.5],[42,69],[51,38],[65.5,54],[80,45],[90.5,26.5]],offset:0},
 whirlpool:{name:'Whirlpool of Destinies',subtitle:'The Impossible Convergence',description:'Eight encounters adrift in a constellation of possible worlds.',points:[[12,60],[26,34],[46,24],[74,28],[87,52],[73,76],[37.5,79.5],[50,48]],offset:7},
 rift:{name:'Rift Battles',subtitle:'Worlds Beyond the Last Ember',description:'Follow the fragments through the dragon-haunted depths.',points:[[12,83],[25,64],[24,39],[38,77],[45,59],[54,35],[70,50],[69,70],[86,47],[87,28]],offset:15}
};
function mount(path){
 const config=modes[path],host=el.menuBody.querySelector('.trial-screen-'+path);if(!config||!host)return;
 const grid=host.querySelector('.hall-stage-grid,.whirlpool-grid'),panel=host.querySelector('.trial-split-detail');if(!grid||!panel)return;
 const cards=[...grid.querySelectorAll(':scope>button')];if(cards.length!==config.points.length)return;
 const names=path==='shadow'?Object.keys(HallHub.shadowTrials).map(id=>'Shadow '+id):(path==='rift'?EmberRift:TinusWhirlpool).encounters.map(e=>e.name);
 const selected=Math.max(0,cards.findIndex(b=>b.classList.contains('is-selected')));
 host.classList.add('resonance-mode','res-mode-'+path);panel.classList.add('trial-ember-detail');
 // Some native overlays have an introductory paragraph outside their detail panel.
 [...host.children].filter(n=>n.tagName==='P').forEach(n=>n.hidden=true);
 grid.hidden=true;
 host.querySelector('.res-map-area')?.remove();
 const area=document.createElement('section');area.className='res-map-area';area.setAttribute('aria-label',config.name+' map');
 const fixtures=cards.map((card,i)=>{const [x,y]=config.points[i],status=card.disabled?'locked':card.classList.contains('is-cleared')?'cleared':'available';return `<button type="button" class="res-fixture res-boss is-${status} ${i===selected?'is-selected':''}" data-mode-fixture="${i}" style="--x:${x}%;--y:${y}%;--z:${Math.round(y)};--size:10%" ${card.disabled?'disabled':''} aria-label="${esc(names[i])}, boss encounter, ${status}" aria-pressed="${i===selected}"><img src="${BASE}fixture-${config.offset+i+1}.webp" alt="" draggable="false"><span class="res-stage-number">${i+1}</span>${status==='cleared'?'<small class="res-completion">✓</small>':''}<span class="res-fixture-name">${esc(names[i])}</span></button>`}).join('');
 area.innerHTML=`<header class="res-region-title"><div><small>${esc(config.name.toUpperCase())} · ${cards.length} ENCOUNTERS</small><h2>${esc(config.subtitle)}</h2><p>${esc(config.description)}</p></div><button type="button" data-mode-hub>Resonance Machine</button></header><div class="res-viewport"><div class="res-canvas" data-region="${path}"><img class="res-landscape" src="${BASE+path}.webp" alt="${esc(config.description)}" draggable="false"><div class="res-fixtures" role="group" aria-label="Encounter destinations">${fixtures}</div><div class="res-motes" aria-hidden="true"></div></div></div><nav class="res-regions" aria-label="Regions"><button type="button" class="is-selected" aria-current="page"><img src="${BASE+path}.webp" alt=""><strong>1–${cards.length}</strong><span>${esc(config.subtitle)}</span></button></nav><footer class="res-legend"><span>◆ Available</span><span>◇ Selected</span><span>✓ Cleared</span><span>Dim · Locked</span><small>Click / tap a landmark · Arrow keys to explore</small></footer>`;
 host.insertBefore(area,panel);area.querySelector('[data-mode-hub]').onclick=closeHallOverlay;
 area.querySelectorAll('[data-mode-fixture]').forEach(button=>{
  button.onclick=()=>cards[Number(button.dataset.modeFixture)].click();
  button.onkeydown=e=>{const direction={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!direction)return;e.preventDefault();e.stopPropagation();const index=Number(button.dataset.modeFixture),[x,y]=config.points[index],[dx,dy]=direction;
   const next=config.points.map(([a,b],i)=>({i,forward:(a-x)*dx+(b-y)*dy,score:Math.hypot(a-x,b-y)+Math.abs((a-x)*dy-(b-y)*dx)*1.5})).filter(p=>p.forward>1&&!cards[p.i].disabled).sort((a,b)=>a.score-b.score)[0];if(next){cards[next.i].click();el.menuBody.querySelector('[data-mode-fixture="'+next.i+'"]')?.focus();}
  };
 });
 const overview=panel.querySelector('.trial-overview');
 if(overview){
  overview.querySelectorAll('.encounter-wave-tabs button').forEach((button,i)=>{button.textContent='Phase '+(i+1);button.setAttribute('aria-label','View phase '+(i+1));});
  if(path==='shadow'){const id=Object.keys(HallHub.shadowTrials)[selected],names=battleSkills(id,{sparringId:id}).filter(s=>s.anim==='ultimate').map(s=>s.name);if(names.length){const box=document.createElement('p');box.className='res-mode-ultimate';box.textContent='Ultimates · '+names.join(' / ');overview.appendChild(box);}}
  const info=path==='shadow'?null:(path==='rift'?EmberRift:TinusWhirlpool).encounters[selected];
  if(info){const meta=document.createElement('p');meta.className='res-stage-meta';meta.textContent=info.hint||config.description;overview.appendChild(meta);
   const ultimate=path==='rift'?(info.mechanic==='hearth'?'The Hearth Holds':info.strike):info.strike;
   if(ultimate){const box=document.createElement('p');box.className='res-mode-ultimate';box.textContent='Ultimate · '+ultimate;overview.appendChild(box);}
  }
 }
}
const nativeMount=TrialNavigation.mount;TrialNavigation.mount=function(path){const result=nativeMount(path);if(modes[path])mount(path);return result;};
window.OtherResonanceMaps={modes,mount};
})();
