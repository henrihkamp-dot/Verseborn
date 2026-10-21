// Install before game input handlers so portrait input cannot reach the game.
(()=>{
 const portrait=()=>matchMedia('(orientation:portrait)').matches;
 for(const event of ['keydown','keyup','pointerdown','pointerup','click','dblclick','touchstart','touchmove'])window.addEventListener(event,e=>{if(portrait()){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
 function mount(){const notice=document.createElement('aside');notice.id='landscapeNotice';notice.setAttribute('role','status');notice.setAttribute('aria-label','Landscape orientation required');notice.innerHTML='<svg viewBox="0 0 120 85" aria-hidden="true"><rect x="18" y="22" width="84" height="45" rx="6"/><path d="M29 31v27m63-27v27M40 12C59-2 85 6 92 19m0 0-1-12m1 12-12-1"/></svg><strong>Turn to landscape</strong><p>Verseborn is played in landscape orientation.<br>Rotate your screen to continue.</p>';document.body.appendChild(notice);const query=matchMedia('(orientation:portrait)');const update=()=>notice.setAttribute('aria-hidden',String(!query.matches));query.addEventListener('change',update);update();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
