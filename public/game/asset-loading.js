// Bound background downloads; visible portraits never wait behind world-art preloads.
(()=>{'use strict';
 const native=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src'),entries=new WeakMap(),terminal=new WeakSet(),queue=[];
 const limit=5,deadline=12000;let running=0,peak=0,completed=0,retried=0;const failed=new Set();
 function pump(){queue.sort((a,b)=>b.priority-a.priority);while(running<limit&&queue.length){const j=queue.shift();if(j.cancelled)continue;running++;peak=Math.max(peak,running);j.counted=true;j.run();}}
 function release(j){clearTimeout(j.timer);if(j.counted){j.counted=false;running--;}pump();}
 function cancel(j){if(!j)return;j.cancelled=true;clearTimeout(j.retry);j.cleanup();release(j);}
 function enqueue(j){if(j.cancelled)return;if(j.image.isConnected){j.run();return;}queue.push(j);pump();}
 Object.defineProperty(HTMLImageElement.prototype,'src',{...native,get(){return entries.get(this)?.url||native.get.call(this);},set(value){
  // A data/blob URL is still a source change: cancel its predecessor BEFORE replacing it.
  cancel(entries.get(this));entries.delete(this);terminal.delete(this);
  const url=new URL(String(value),document.baseURI).href;
  if(!/^https?:/.test(url)||!url.includes('/assets/')){native.set.call(this,value);return;}
  const image=this,j={image,url,attempt:0,cancelled:false,counted:false,priority:image.fetchPriority==='high'||/title-|title-screen/.test(url)?10:/flameguard-idle/.test(url)?8:/lost-dimensions/.test(url)?5:0};entries.set(image,j);
  const loaded=()=>{if(j.cancelled)return;j.cleanup();completed++;failed.delete(url);entries.delete(image);release(j);};
  const failure=(event,timeout=false)=>{if(j.cancelled)return;clearTimeout(j.timer);
   if(j.attempt<5){event?.stopImmediatePropagation();event?.preventDefault();retried++;j.retry=setTimeout(()=>enqueue(j),Math.min(4000,350*2**(j.attempt-1)));release(j);}
   else{terminal.add(image);failed.add(url);j.cleanup();entries.delete(image);release(j);console.error('Artwork failed:',url);if(timeout)image.dispatchEvent(new Event('error'));}
  };
  j.cleanup=()=>{clearTimeout(j.timer);clearTimeout(j.retry);image.removeEventListener('load',loaded,true);image.removeEventListener('error',failure,true);};
  j.run=()=>{if(j.cancelled){release(j);return;}j.attempt++;image.addEventListener('load',loaded,true);image.addEventListener('error',failure,true);j.timer=setTimeout(()=>failure(null,true),deadline);native.set.call(image,j.attempt===1?url:url+(url.includes('?')?'&':'?')+'art_retry='+j.attempt);};
  enqueue(j);
 }});
 // Images produced by innerHTML bypass the src property setter. Recover those too.
 document.addEventListener('error',event=>{const image=event.target;if(!(image instanceof HTMLImageElement)||entries.has(image)||terminal.has(image))return;const url=image.getAttribute('src');if(!url||!/assets\//.test(url)||/^(data|blob):/.test(url))return;event.stopImmediatePropagation();image.src=url;},true);
 window.ArtworkLoading={get status(){return{running,queued:queue.filter(j=>!j.cancelled).length,peak,completed,retried,failed:[...failed]};}};
})();
