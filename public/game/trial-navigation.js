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
      const stage=hallBattleProgress().unlockedStage||1;emberSelection=stage;
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
  }
  const close=closeHallOverlay;
  closeHallOverlay=function(...args){const restore=mode==='hallMap'?originMap:null;const result=close(...args);emberBrowser=null;if(restore){state.map=restore;originMap=null;updateMusic();}return result;};
  new MutationObserver(()=>{if(document.body.dataset.playMode==='battle'){originMap=null;emberBrowser=null;}}).observe(document.body,{attributes:true,attributeFilter:['data-play-mode']});
  new MutationObserver(()=>{if(!el.menuBody.querySelector('.trial-screen'))el.menu.classList.remove('compact-trials');}).observe(el.menuBody,{childList:true,subtree:true});
  window.TrialNavigation={mount,switchTo,requirement};
})();

