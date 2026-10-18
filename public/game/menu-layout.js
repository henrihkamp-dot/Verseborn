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
 }else if(menuTab==='skills'){
  el.menuBody.querySelectorAll('.talent-choice').forEach(card=>{
   const details=[card.querySelector('strong')?.textContent,card.querySelector('p')?.textContent,...[...card.querySelectorAll('small')].slice(0,-1).map(n=>n.textContent)].filter(Boolean).join(' — ');
   card.title=details;card.setAttribute('aria-label',details);card.querySelectorAll('small').forEach(n=>n.remove());
   const indicator=card.querySelector(':scope>b');if(indicator){indicator.textContent=card.classList.contains('is-active')?String.fromCharCode(10003):'';indicator.setAttribute('aria-hidden','true');}
  });
 }return result;};
})();
