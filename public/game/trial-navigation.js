// Shared navigation only: each path keeps its native progression and battle entry.
(() => {
  let originMap=null;
  let emberBrowser=null,emberSelection=null;
  const paths=[['ember','Ember Battles'],['shadow','Shadow Trials'],['whirlpool','Whirlpool'],['rift','Rift Battles']];
  function requirement(id){
    if(id==='shadow'&&!HallHub.recruited('Seerin'))return 'Recruit Seerin to unlock Shadow Trials.';
    if(id==='whirlpool'&&(!state.party.includes('Tinus')||!TinusRecruitment.progress().recruited))return 'Recruit Tinus to unlock Whirlpool battles.';
    if(id==='rift'&&!EmberRift.progress().unlocked)return 'Unlock the Ember Rift to enter Rift Battles.';
    return '';
  }
  function switchTo(id){
    if(mode!=='hallMap'||requirement(id))return false;
    if(originMap===null)originMap=state.map;
    // Only the menu's battle context changes; exploration positions stay intact.
    state.map=id==='rift'?'emberRiftVault':'emberHallBattles';
    heldDirection=null;fieldDestination=null;window.emberHallWorld?.clearNavigation();
    if(id==='rift')EmberRift.openSelection();
    else if(id==='whirlpool')TinusWhirlpool.open();
    else if(id==='shadow')HallHub.renderSparring();
    else openHallBattleMap();
    el.menuBody.scrollTop=0;
    return true;
  }
  function simplifyPreparation(host,current){
    if(current==='ember')host.querySelectorAll('[data-hall-stage]').forEach(card=>{
      const info=hallBattleInfo(Number(card.dataset.hallStage));if(!info||card.querySelector('img'))return;
      const main=[info.enemies,...info.waves].flat().map(key=>HALL_ENEMY_LIBRARY[key]).filter(Boolean).sort((a,b)=>b.hp-a.hp)[0];
      if(main){const img=document.createElement('img');img.src=enemyPortraitDataUrl(main.sprite||main.name);img.alt=main.name;card.prepend(img);}
    });
    host.querySelectorAll('.is-cleared').forEach(card=>{if(card.querySelector('.trial-clear-badge'))return;const badge=document.createElement('b');badge.className='trial-clear-badge';badge.textContent='✓ Cleared';card.appendChild(badge);});
    const panel=host.querySelector('.trial-ember-detail,.rift-preparation,.whirlpool-detail,.shadow-detail');if(!panel||panel.querySelector('.trial-overview'))return;
    const party=panel.querySelector('.hub-party,.rift-party,.whirlpool-party,.shadow-party');if(!party)return;
    const start=party.matches('.hub-party')?party:party.previousElementSibling;
    const setup=document.createElement('section');setup.className='trial-party-setup';setup.setAttribute('aria-label','Party and battle support');
    let node=start;while(node){const next=node.nextElementSibling;setup.appendChild(node);node=next;}
    const overview=document.createElement('section');overview.className='trial-overview';overview.setAttribute('aria-label','Enemy overview');
    const title=document.createElement('h3');title.textContent='Encounter';overview.appendChild(title);
    if(current==='ember'){
      const info=hallBattleInfo(emberSelection);if(info){const card=host.querySelector('[data-hall-stage="'+emberSelection+'"]'),face=card?.querySelector('img');if(face)overview.appendChild(face.cloneNode(true));const heading=document.createElement('h3');heading.textContent=info.name;overview.appendChild(heading);
      const list=document.createElement('ol');[info.enemies,...info.waves].forEach((wave,i)=>{const row=document.createElement('li');row.textContent=(info.waves.length?'Wave '+(i+1)+': ':'')+wave.map(k=>HALL_ENEMY_LIBRARY[k]?.name||k).join(' + ');list.appendChild(row);});overview.appendChild(list);}
    }else{
      const preview=panel.querySelector('.rift-preview,.whirlpool-preview,.shadow-preview'),face=preview?.querySelector('img'),heading=preview?.querySelector('h3');
      if(face)overview.appendChild(face.cloneNode(true));if(heading)overview.appendChild(heading.cloneNode(true));
      const waves=preview?.querySelector('ul');if(waves){const list=waves.cloneNode(true);list.querySelectorAll('small').forEach(n=>n.remove());overview.appendChild(list);}else{const enemy=document.createElement('p');enemy.textContent=(face?.alt||heading?.textContent||'One enemy').replace(' enemy preview','')+' · 1 wave';overview.appendChild(enemy);}
    }
    if(current==='ember'){
      party.replaceChildren();const heading=document.createElement('h3');heading.textContent='Choose your party · '+state.activeParty.length+'/3';party.appendChild(heading);
      const grid=document.createElement('div');grid.className='rift-party';party.appendChild(grid);
      state.party.forEach(id=>{const button=document.createElement('button');button.type='button';button.className='rift-member';button.dataset.emberMember=id;const selected=state.activeParty.includes(id);button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));const image=document.createElement('img');image.src=menuPortraitSource(id);image.alt='';const label=document.createElement('strong');label.textContent=id;const level=document.createElement('small');level.textContent='Lv '+progressFor(id).level;button.append(image,label,level);button.onclick=()=>{if(selected){if(state.activeParty.length<=1)return;state.activeParty=state.activeParty.filter(n=>n!==id);}else{if(state.activeParty.length>=3)return;state.activeParty.push(id);}queueSave();HallHub.openPreparation(emberSelection);};grid.appendChild(button);});
    }
    panel.replaceChildren(overview,setup);panel.classList.add('trial-split-detail');
  }
  function mount(current){
    let host=el.menuBody.querySelector('.hall-map,.hub-screen');if(!host)return;
    if(current==='ember'&&host.querySelector('.hub-stage-info')&&emberBrowser){
      const panel=emberBrowser.querySelector('.trial-ember-detail');panel.replaceChildren();
      const title=document.createElement('h3');title.textContent=host.querySelector('header h2')?.textContent||'Stage preparation';panel.appendChild(title);
      [...host.children].filter(n=>!n.matches('header,.trial-path-nav')).forEach(n=>panel.appendChild(n));
      el.menuBody.replaceChildren(emberBrowser);host=emberBrowser;
      host.querySelectorAll('[data-hall-stage]').forEach(b=>{const active=Number(b.dataset.hallStage)===emberSelection;b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));});
    }else if(current==='ember'&&host.querySelector('[data-hall-stage]')){
      emberBrowser=host;
      const panel=document.createElement('aside');panel.className='trial-ember-detail';panel.innerHTML='<p>Select a stage to prepare your party.</p>';host.appendChild(panel);
      host.addEventListener('click',event=>{const button=event.target.closest('[data-hall-stage]');if(button)emberSelection=Number(button.dataset.hallStage);},true);
      const stage=window.HallResonanceMap?.preferredStage(hallBattleProgress().unlockedStage)||hallBattleProgress().unlockedStage||1;emberSelection=stage;
      queueMicrotask(()=>{if(host.isConnected&&mode==='hallMap'&&el.menuBody.contains(host))HallHub.openPreparation(stage);});
    }
    if(host.querySelector('.hall-stage-grid,.whirlpool-grid')){
      host.classList.add('trial-screen','trial-screen-'+current);el.menu.classList.add('compact-trials');
    }
    el.menuBody.querySelectorAll('.trial-path-nav,.shadow-path-nav,[data-open-shadows]').forEach(n=>n.remove());
    const nav=document.createElement('nav');nav.className='shadow-path-nav trial-path-nav';nav.setAttribute('aria-label','Battle modes');
    for(const [id,label]of paths){
      const button=document.createElement('button'),locked=requirement(id);button.type='button';button.textContent=label;button.dataset.trialPath=id;button.title=locked||label;
      button.disabled=Boolean(locked)||id===current;if(id===current)button.setAttribute('aria-current','page');if(locked)button.setAttribute('aria-label',label+'. '+locked);
      button.onclick=()=>switchTo(id);nav.appendChild(button);
    }
    const header=host.querySelector(':scope>header');if(header)header.after(nav);else host.prepend(nav);
    simplifyPreparation(host,current);
    window.FormationUI?.mount(host,current);
    window.EncounterOverview?.mount(host,current);
    window.EncounterPortraits?.mount(host,current);
  }
  const close=closeHallOverlay;
  closeHallOverlay=function(...args){const restore=mode==='hallMap'?originMap:null;const result=close(...args);emberBrowser=null;if(restore){state.map=restore;originMap=null;updateMusic();}return result;};
  new MutationObserver(()=>{if(document.body.dataset.playMode==='battle'){originMap=null;emberBrowser=null;}}).observe(document.body,{attributes:true,attributeFilter:['data-play-mode']});
  new MutationObserver(()=>{if(!el.menuBody.querySelector('.trial-screen'))el.menu.classList.remove('compact-trials');}).observe(el.menuBody,{childList:true,subtree:true});
  window.TrialNavigation={mount,switchTo,requirement};
})();

