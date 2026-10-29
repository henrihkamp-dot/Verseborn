(()=>{
 const labels=['Rear / Ranged','Middle','Front / Tank'],selected={};
 function mount(host,path){
  const grid=host.querySelector('.rift-party,.whirlpool-party,.shadow-party');if(!grid)return;
  const list=path==='shadow'?HallHub.shadowFormation:[...state.activeParty];
  const heading=host.querySelector('.trial-party-setup .hub-party h3,.trial-party-setup>h3');if(heading)heading.textContent='Party formation · '+list.length+'/3';host.querySelectorAll('.trial-party-setup>p').forEach(n=>n.remove());
  const target=selected[path]??0;host.querySelector('.formation-slots')?.remove();host.querySelector('.formation-heading')?.remove();
  const title=document.createElement('h3');title.className='formation-heading';title.textContent='Party formation · '+list.length+'/3';grid.before(title);
  host.querySelectorAll('.trial-party-setup>h3:not(.formation-heading),.hub-party>h3:not(.formation-heading)').forEach(n=>n.hidden=true);
  const support=host.querySelector('.trial-party-setup .hub-loadout');if(support&&!support.closest('.formation-support')){const details=document.createElement('details');details.className='formation-support';details.open=true;const summary=document.createElement('summary');const picks=[...support.querySelectorAll('.hub-slot>strong')].map(n=>n.textContent).filter(s=>s!=='None selected');summary.textContent='Battle support'+(picks.length?' · '+picks.join(' / '):' · Optional');details.appendChild(summary);support.before(details);details.appendChild(support);}

  host.querySelectorAll('.hub-slot').forEach(slot=>{const name=slot.querySelector(':scope>strong'),description=slot.querySelector(':scope>p');if(name&&description&&name.textContent!=='None selected'&&!name.querySelector('.support-selected-effect')){const effect=document.createElement('span');effect.className='support-selected-effect';effect.textContent=' — '+description.textContent;name.appendChild(effect);}});
  const slots=document.createElement('nav');slots.className='formation-slots';slots.setAttribute('aria-label','Assign battlefield positions');grid.before(slots);
  labels.forEach((label,index)=>{const b=document.createElement('button');b.type='button';b.dataset.formationSlot=index;b.className=index===target?'is-selected':'';const title=document.createElement('small');title.textContent=label;const name=document.createElement('strong');name.textContent=list[index]||'Choose member';b.title=FORMATION_SLOT_EFFECTS[index].lines.join(" · ");if(list[index]){const face=document.createElement('img');EncounterPortraits.assign(face,EncounterPortraits.party(list[index]));face.alt='';b.appendChild(face);}b.append(title,name);b.onclick=()=>{selected[path]=index;mount(host,path);};slots.appendChild(b);});
  const apply=next=>{if(path==='shadow')HallHub.setShadowFormation(next);else{state.activeParty=next;queueSave();if(path==='ember')HallHub.openPreparation(Number(host.querySelector('[data-hall-stage].is-selected')?.dataset.hallStage)||hallBattleProgress().unlockedStage);else if(path==='rift')EmberRift.openSelection();else TinusWhirlpool.open();}};
  [...grid.querySelectorAll('button')].forEach(old=>{const id=old.dataset.riftMember||old.dataset.whirlpoolMember||old.dataset.shadowParty||old.dataset.emberMember;if(!id)return;
   const button=old.cloneNode(true);old.replaceWith(button);if(!button.querySelector('img')){const face=document.createElement('img');face.src=menuPortraitSource(id);face.alt='';button.prepend(face);}button.querySelector('img').src=EncounterPortraits.party(id);button.disabled=false;const index=list.indexOf(id);let small=button.querySelector('small');if(!small){small=document.createElement('small');button.appendChild(small);}small.textContent='Lv '+progressFor(id).level+(index>=0?' · '+labels[index]:'');button.title=index>=0?labels[index]+' — '+id:'Assign '+id+' to '+labels[target];
   button.onclick=()=>{const next=[...list],slot=Math.min(selected[path]??0,next.length),existing=next.indexOf(id);if(existing===slot)return;if(existing>=0){[next[existing],next[slot]]=[next[slot],next[existing]];next.splice(0,next.length,...next.filter(Boolean));}else next[slot]=id;apply(next.slice(0,3));};
  });
  const start=host.querySelector('[data-begin],[data-rift-start],[data-shadow-start],[data-whirlpool-start]');if(start)start.textContent='Start battle';
  const setup=host.querySelector('.trial-party-setup');if(setup&&!setup.querySelector('.formation-content')){const content=document.createElement('div');content.className='formation-content';[...setup.children].filter(n=>n.tagName!=='FOOTER').forEach(n=>content.appendChild(n));setup.prepend(content);}
 }
 window.FormationUI={mount,labels};
})();
