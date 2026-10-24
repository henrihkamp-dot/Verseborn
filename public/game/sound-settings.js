// One saved sound preference controls music and sound effects together.
(()=>{
 const key='verseborn-sound-enabled';
 function sync(){
  Object.values(music).forEach(track=>{track.muted=musicMuted;if(musicMuted)track.pause();});
  if(musicMuted&&audioContext?.state==='running')audioContext.suspend().catch(()=>{});
  el.musicToggle?.classList.toggle('is-muted',musicMuted);
  el.musicToggle?.setAttribute('aria-pressed',String(musicMuted));
  el.musicToggle?.setAttribute('aria-label',musicMuted?'Turn sound on':'Turn sound off');
  document.querySelectorAll('[data-sound-toggle]').forEach(button=>{button.textContent=musicMuted?'Sound: Off':'Sound: On';button.setAttribute('aria-checked',String(!musicMuted));});
 }
 try{const saved=localStorage.getItem(key);if(saved!==null)musicMuted=saved==='off';}catch{}
 sync();
 const originalToggle=toggleMusic;
 toggleMusic=function(){originalToggle();sync();try{localStorage.setItem(key,musicMuted?'off':'on');}catch{}if(!musicMuted){ensureAudioContext();updateMusic();}};
 const originalMenu=renderMenu;
 renderMenu=function(...args){const result=originalMenu(...args);if(menuTab==='system'){
  const settings=[...el.menuBody.querySelectorAll('section')].find(section=>section.querySelector('h3')?.textContent==='Settings');
  const row='<div><span><strong>Sound</strong><small>Music and sound effects</small></span><button type="button" role="switch" data-sound-toggle aria-label="Game sound"></button></div>';
  if(settings)settings.insertAdjacentHTML('beforeend',row);else el.menuBody.insertAdjacentHTML('afterbegin','<section class="hall-save-exports"><h3>Settings</h3>'+row+'</section>');
  el.menuBody.querySelector('[data-sound-toggle]').onclick=()=>toggleMusic();sync();
 }return result;};
})();
