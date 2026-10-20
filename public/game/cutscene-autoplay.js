(() => {
  'use strict';
  const key='verseborn-cutscene-autoplay';
  let enabled=true;
  try { enabled=localStorage.getItem(key)!=='off'; } catch {}
  const delay=(text,minimum=0)=>Math.max(minimum||0,3200,1400+String(text||'').trim().split(/\s+/).filter(Boolean).length*290);
  let revision=0,seen='',elapsed=0,last=performance.now();
  const toggle=document.createElement('button');toggle.type='button';toggle.className='cutscene-auto-toggle';toggle.hidden=true;document.querySelector('.game').append(toggle);
  toggle.style.cssText='position:absolute;z-index:46;right:3%;bottom:23%;padding:7px 12px;border:1px solid #b89554;background:#1e1527ed;color:#f4d497;font:clamp(11px,.9vw,15px) Arial;cursor:pointer;border-radius:2px';
  toggle.onclick=event=>{event.preventDefault();event.stopPropagation();CutsceneAutoplay.set(!enabled);};
  const oldNext=nextTalk;
  nextTalk=function(...args){revision++;return oldNext(...args);};
  window.CutsceneAutoplay={get enabled(){return enabled;},delay,set(value){enabled=Boolean(value);elapsed=0;try{localStorage.setItem(key,enabled?'on':'off');}catch{}}};
  const oldMenu=renderMenu;
  renderMenu=function(...args){const result=oldMenu(...args);if(menuTab==='system'){
    el.menuBody.insertAdjacentHTML('afterbegin','<section class="hall-save-exports"><h3>Settings</h3><div><span><strong>Cutscene autoplay</strong><small>Advance dialogue automatically after reading time</small></span><label><input type="checkbox" data-cutscene-autoplay '+(enabled?'checked':'')+'> On</label></div></section>');
    el.menuBody.querySelector('[data-cutscene-autoplay]').onchange=event=>CutsceneAutoplay.set(event.target.checked);
  }return result;};
  function frame(now){
    const dt=Math.min(100,Math.max(0,now-last));last=now;
    const signature=revision+':'+el.speaker.textContent+':'+el.line.textContent+':'+talkQueue.length;
    if(signature!==seen){seen=signature;elapsed=0;}
    const active=mode==='talk'&&!el.dialogue.classList.contains('hidden')&&!window.HallOpening?.active&&!document.querySelector('.game.rift-cinematic')&&!el.line.querySelector('button,input,select,a');
    const cinematic=window.HallOpening?.active||document.querySelector('.game.rift-cinematic')||window.TinusRecruitment?.replaying||activeRecruitScene||active&&talkSkippable;
    toggle.hidden=!cinematic||Boolean(window.FlameguardWelcomes?.active);toggle.textContent=enabled?'Autoplay on':'Autoplay off';toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label','Toggle cinematic autoplay');
    if(!active||!enabled)elapsed=0;
    else if(!document.hidden){elapsed+=dt;if(elapsed>=delay(el.line.textContent)){elapsed=0;nextTalk();}}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
