(()=>{
 const original=renderMenu;
 renderMenu=function(...args){const result=original(...args);
 if(menuTab==='status'){
  const card=el.menuBody.querySelector('.status-card'),head=card?.querySelector('.status-card-head');if(!card||!head)return result;
  const profile=document.createElement('aside');profile.className='status-profile';const dashboard=document.createElement('section');dashboard.className='status-dashboard';
  const image=head.querySelector('img'),identity=head.querySelector('div');if(image)profile.append(image);if(identity)profile.append(identity);
  for(const selector of ['.status-biography','.xp-progress']){const n=card.querySelector(':scope>'+selector);if(n)profile.append(n);}
  [...card.children].filter(n=>n!==head).forEach(n=>dashboard.append(n));card.replaceChildren(profile,dashboard);card.classList.add('status-revamped');
 }else if(menuTab==='party'){
  el.menuBody.querySelectorAll('[data-party-slot]').forEach(b=>{const i=Number(b.dataset.partySlot);b.setAttribute('aria-label',FormationUI.labels[i]+': '+(state.activeParty[i]||'Empty'));});
  el.menuBody.querySelectorAll('.party-member.is-active>b').forEach(n=>{const b=n.closest('button');n.textContent=FormationUI.labels[Number(b.dataset.partyFocus)];});
 }return result;};
})();
