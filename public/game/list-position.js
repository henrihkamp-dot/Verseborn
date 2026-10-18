// Preserve browsing position across native re-renders; details can still open at their start.
(()=>{
 const selectors=['.hall-stage-grid','.whirlpool-grid','.selection-list','.shop-scroll-region'],positions=new Map();
 const context=()=>el.menu.dataset.menuView+':'+(mode==='shop'?activeVendor+':'+vendorTab:menuTab);
 function record(){const key=context();for(const selector of selectors)el.menuBody.querySelectorAll(selector).forEach((n,i)=>positions.set(key+selector+i,{top:n.scrollTop,left:n.scrollLeft}));}
 el.menuBody.addEventListener('scroll',event=>{if(selectors.some(s=>event.target.matches?.(s)))record();},true);
 el.menuBody.addEventListener('pointerdown',record,true);
 el.menuBody.addEventListener('keydown',record,true);
 new MutationObserver(()=>{const key=context();for(const selector of selectors)el.menuBody.querySelectorAll(selector).forEach((n,i)=>{const saved=positions.get(key+selector+i);if(saved){n.scrollTop=saved.top;n.scrollLeft=saved.left;}});}).observe(el.menuBody,{childList:true,subtree:true});
})();
