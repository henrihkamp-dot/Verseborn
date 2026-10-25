// A phase announcement lives above every battle HUD layer; the arena still receives continue input.
(()=>{
 let node,key='',owner;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function update(){
  const phase=mode==='battle'&&battle?.phaseTransition?.step==='incoming'?battle.phaseTransition:null;
  if(!phase){if(node)node.hidden=true;key='';return;}
  if(!node){node=document.createElement('section');node.className='battle-phase-banner';node.setAttribute('role','status');document.querySelector('.game').append(node);}
  node.hidden=false;node.classList.toggle('is-opening',phase.number===1);const next=phase.number+':'+phase.enemies.map(e=>[e.name,e.level,e.hp,e.max,e.mp,e.maxmp,e.resistanceTier].join(',')).join('|');if(next===key&&owner===battle)return;key=next;owner=battle;
  const title=phase.number===1&&phase.total===1?'OPENING FORMATION':window.HallEncounters?.phaseTitle(battle.hallStage,phase.number,phase.enemies)||(phase.number===1?'OPENING FORMATION':'REINFORCEMENTS ARRIVE');
  const fmt=n=>Math.max(0,Number(n)||0).toLocaleString();
  const boss=e=>Boolean(e.sparringId)||e.resistanceTier==='boss'||e.npcBoss||e.endgameBoss||e.boss;
  node.innerHTML=`<div class="phase-ink-panel"><div class="phase-kicker">${phase.number===1?'THE BATTLE STARTS':'THE BATTLE CONTINUES'}</div><div class="phase-number">PHASE <b>${phase.number}</b><span>/ ${phase.total}</span></div><h2>${esc(title)}</h2><div class="phase-cast">${phase.enemies.map(e=>{const portrait=window.EncounterPortraits?.unit(e);return `<article>${portrait?`<img src="${esc(portrait)}" alt="">`:''}<div><strong>${esc(e.name)}</strong><small>${esc(combatRoleKey(e,true))} · LV ${fmt(e.level||1)}${boss(e)?' · BOSS':''}${e.finalState==='enraged'?' · ENRAGED':''}</small><span class="phase-vitals">HP ${fmt(e.hp??e.max)}/${fmt(e.max)}<br>MP ${fmt(e.mp??e.maxmp)}/${fmt(e.maxmp)}</span></div></article>`}).join('')}</div><footer>Click to continue <span>◆</span> Enter</footer></div>`;
 }
 window.BattlePhaseBanner={update};
 const original=draw;draw=function(...args){const result=original(...args);if(mode!=='battle')update();return result;};
})();

