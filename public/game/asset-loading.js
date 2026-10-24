// Limit parallel artwork downloads and retry temporary network failures before callers see an error.
(()=>{'use strict';
 const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src'),entries=new WeakMap(),queue=[];
 const limit=5;let running=0,peak=0,completed=0,retried=0;const failed=new Set();
 function pump(){queue.sort((a,b)=>b.priority-a.priority);while(running<limit&&queue.length){const job=queue.shift();if(job.cancelled)continue;running++;peak=Math.max(peak,running);job.run();}}
 function release(job){if(!job.active)return;job.active=false;running--;pump();}
 function enqueue(job){job.active=false;queue.push({priority:job.priority,get cancelled(){return job.cancelled;},run(){if(job.cancelled){running--;pump();return;}job.active=true;job.attempt++;descriptor.set.call(job.image,job.attempt===1?job.url:job.url+(job.url.includes('?')?'&':'?')+'art_retry='+job.attempt);}});pump();}
 Object.defineProperty(HTMLImageElement.prototype,'src',{...descriptor,get(){return entries.get(this)?.url||descriptor.get.call(this);},set(value){const url=new URL(String(value),document.baseURI).href;if(!/^https?:/.test(url)||!url.includes('/assets/')){descriptor.set.call(this,value);return;}const old=entries.get(this);if(old){old.cancelled=true;old.cleanup();release(old);}const job={image:this,url,attempt:0,active:false,cancelled:false,priority:this.fetchPriority==='high'||/title-|title-screen/.test(url)?10:/flameguard-idle/.test(url)?8:/lost-dimensions/.test(url)?5:0};entries.set(this,job);
 const loaded=()=>{if(job.cancelled)return;job.cleanup();completed++;failed.delete(url);release(job);};
 const error=event=>{if(job.cancelled)return;release(job);if(job.attempt<5){event.stopImmediatePropagation();event.preventDefault();retried++;setTimeout(()=>{if(!job.cancelled)enqueue(job);},Math.min(4000,350*2**(job.attempt-1)));}else{failed.add(url);job.cleanup();console.error('Artwork could not load after five attempts:',url);}};
 job.cleanup=()=>{this.removeEventListener('load',loaded,true);this.removeEventListener('error',error,true);};this.addEventListener('load',loaded,true);this.addEventListener('error',error,true);enqueue(job);
 }});
 window.ArtworkLoading={get status(){return{running,queued:queue.length,peak,completed,retried,failed:[...failed]};}};
})();

