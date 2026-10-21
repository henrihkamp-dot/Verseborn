// The first click selects immediately. A second click survives native selector DOM replacement.
(()=>{
 let last=null;
 const startSelector='[data-begin],[data-shadow-start],[data-whirlpool-start],[data-rift-start]';
 document.addEventListener('click',event=>{
  const fixture=event.target.closest?.('[data-res-stage],[data-mode-fixture]');if(!fixture||fixture.disabled||mode!=='hallMap'||event.detail===0)return;
  const root=fixture.closest('.trial-screen'),path=root.classList.contains('trial-screen-ember')?'ember':root.classList.contains('trial-screen-shadow')?'shadow':root.classList.contains('trial-screen-whirlpool')?'whirlpool':'rift',id=fixture.dataset.resStage??fixture.dataset.modeFixture,key=path+':'+id,now=performance.now();
  if(last?.key===key&&now-last.at<450){last=null;const start=root.querySelector(startSelector);if(start&&!start.disabled){event.preventDefault();event.stopImmediatePropagation();start.click();}}
  else last={key,at:now};
 },true);
 const mount=TrialNavigation.mount;TrialNavigation.mount=function(path){const result=mount(path),host=el.menuBody.querySelector('.trial-screen');if(host){const start=host.querySelector(startSelector),back=host.querySelector('[data-res-hub],[data-mode-hub]');if(start&&back){back.className=start.className;back.classList.add('res-standard-action');start.classList.add('res-standard-action');}host.querySelectorAll('[data-res-stage],[data-mode-fixture]').forEach(b=>{if(!b.disabled)b.title='Click to prepare · Double-click to start battle';});}return result;};
})();
