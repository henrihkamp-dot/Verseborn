// A phase announcement lives above every battle HUD layer; the arena still receives continue input.
(()=>{
 let node,key='',owner;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function update(){
  const phase=mode==='battle'&&battle?.phaseTransition?.step==='incoming'?battle.phaseTransition:null;
  if(!phase){if(node)node.hidden=true;key='';return;}
  if(!node){node=document.createElement('section');node.className='battle-phase-banner';node.setAttribute('role','status');document.querySelector('.game').append(node);}
  node.hidden=false;const next=phase.number+':'+phase.enemies.map(e=>e.name).join('|');if(next===key&&owner===battle)return;key=next;owner=battle;
  const title=window.HallEncounters?.phaseTitle(battle.hallStage,phase.number,phase.enemies)||'REINFORCEMENTS ARRIVE';
  node.innerHTML=`<div class="phase-ink-panel"><div class="phase-kicker">THE BATTLE CONTINUES</div><div class="phase-number">PHASE <b>${phase.number}</b><span>/ ${phase.total}</span></div><h2>${esc(title)}</h2><div class="phase-cast">${phase.enemies.map(e=>{const portrait=window.EncounterPortraits?.unit(e);return `<article>${portrait?`<img src="${esc(portrait)}" alt="">`:''}<div><strong>${esc(e.name)}</strong><small>${esc(combatRoleKey(e,true))}${e.finalState==='enraged'?' · ENRAGED':''}</small></div></article>`}).join('')}</div><footer>Click to continue <span>◆</span> Enter</footer></div>`;
 }
 window.BattlePhaseBanner={update};
 const original=draw;draw=function(...args){const result=original(...args);if(mode!=='battle')update();return result;};
})();
