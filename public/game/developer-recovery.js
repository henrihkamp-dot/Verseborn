// Explicit progress recovery controls; no changes occur merely by opening Developer.
(()=>{
 const esc=s=>escapeMarkup(String(s));
 function writable(){return state.gameMode==='hallBattles'&&mode==='menu'&&menuTab==='developer'&&!battle?.resolving;}
 function save(){restoreHallParty();updatePanels();saveGame(hallSaveKey());queueSave();renderMenu();}
 function raise(id,value){const level=Math.floor(Number(value));if(!Number.isFinite(level)||level<1||level>MAX_LEVEL||!state.party.includes(id))return false;const p=progressFor(id);if(level<=p.level)return false;p.level=level;p.xp=0;progressFor(id);return true;}
 function recruit(id){if(!state.party.includes(id))addParty(id);if(id==='Tinus'){const p=TinusRecruitment.progress();p.recruited=true;p.phase='resident';}}
 function unlockAll(){Object.keys(baseJobs).forEach(recruit);hallBattleProgress().pendingRecruit=0;}
 function unlockModes(){['Seerin','Tinus'].forEach(recruit);const hall=hallBattleProgress();hall.unlockedStage=HALL_BATTLE_BLUEPRINTS.length;hall.developerUnlocks={...(hall.developerUnlocks||{}),rift:true,whirlpool:true};EmberRift.progress().unlocked=true;}
 const original=renderMenu;
 renderMenu=function(...args){const result=original(...args);if(menuTab!=='developer'||state.gameMode!=='hallBattles')return result;
  const owned=state.party.length,total=Object.keys(baseJobs).length,hall=hallBattleProgress();
  el.menuBody.insertAdjacentHTML('beforeend',`<section class="developer-controls"><h3>Restore Progress</h3><p>Changes are saved to the current slot. Raising levels restores HP/MP and makes earned talent points available; existing talent choices and gear stay equipped.</p><div class="developer-gold"><strong>Recruited characters</strong><input type="number" min="1" max="${MAX_LEVEL}" value="${Math.max(...state.party.map(id=>progressFor(id).level))}" aria-label="Level for all recruited characters" data-recovery-level><button type="button" data-raise-roster>Raise all to level</button></div>${Object.keys(baseJobs).map(id=>{const owned=state.party.includes(id),level=progressFor(id).level;return `<div class="developer-gold"><strong>${esc(id)} · ${owned?'Level '+level:'Not recruited'}</strong><input type="number" min="${level}" max="${MAX_LEVEL}" value="${level}" aria-label="${esc(id)} level" data-recovery-hero="${esc(id)}" ${owned?'':'disabled'}><button type="button" data-raise-hero="${esc(id)}" ${owned?'':'disabled'}>Raise level</button></div>`}).join('')}<div class="developer-gold"><strong>Flameguard ${owned}/${total}</strong><button type="button" data-recruit-all ${owned===total?'disabled':''}>Unlock all characters</button></div><div class="developer-gold"><strong>Battle modes</strong><button type="button" data-unlock-modes>Unlock all battle modes</button></div><p>Unlocks all 60 Ember Hall stages, Shadow Trials, all Whirlpool fights and all Rift battles. Recruits Seerin and Tinus for their mode options. Does not mark encounters cleared or grant rewards.</p><p role="status">${hall.developerUnlocks?.rift&&hall.developerUnlocks?.whirlpool?'All battle modes unlocked.':'Normal mode unlocks active.'}</p></section>`);
  el.menuBody.querySelector('[data-raise-roster]').onclick=()=>{if(!writable())return;const value=el.menuBody.querySelector('[data-recovery-level]').value;if(state.party.reduce((changed,id)=>raise(id,value)||changed,false))save();};
  el.menuBody.querySelectorAll('[data-raise-hero]').forEach(button=>button.onclick=()=>{if(!writable())return;const id=button.dataset.raiseHero,input=[...el.menuBody.querySelectorAll('[data-recovery-hero]')].find(input=>input.dataset.recoveryHero===id);if(raise(id,input.value))save();});
  el.menuBody.querySelector('[data-recruit-all]').onclick=()=>{if(writable()){unlockAll();save();}};
  el.menuBody.querySelector('[data-unlock-modes]').onclick=()=>{if(writable()){unlockModes();save();}};
  return result;
 };
})();
