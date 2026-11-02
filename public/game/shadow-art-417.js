// These optional battle atlases never join the title screen artwork gate.
(()=>{
 'use strict';
 const BASE='assets/shadow-trials-417/',keys=['brindle','vetch','pelligrin','nacre','orra','custodian'];
 const sets=new Map(),jobs=new Map(),errors=new Map(),deathClocks=new WeakMap();
 const frames=new Map(),MAX_FRAME_PIXELS=4*1024*1024;let cachedPixels=0;
 const smooth=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
 const supportIndex=u=>u.shadowArtSupport??u.shadowSupport;
 const isSupport=u=>supportIndex(u)===0||supportIndex(u)===1;
 const height=u=>Number(u.shadowHeight)||(isSupport(u)?39:({brindle:66,vetch:65,pelligrin:72,nacre:64,orra:73,custodian:68})[u.shadowTrialKey]||68);
 function image(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Encounter artwork unavailable: '+url.split('/').slice(-2).join('/')));im.src=url;});}
 function load(key){
  if(!keys.includes(key))return Promise.resolve(false);if(sets.has(key))return Promise.resolve(true);if(jobs.has(key))return jobs.get(key);errors.delete(key);
  const job=fetch(BASE+key+'/manifest.json?v=417').then(r=>{if(!r.ok)throw Error('Encounter manifest unavailable: '+key);return r.json();}).then(async manifest=>{
   if(manifest.sheets?.idle?.frames!==12)throw Error('Encounter idle requires twelve frames: '+key);
   const entries=await Promise.all(Object.entries(manifest.sheets).map(async([name,sheet])=>[name,await image(BASE+key+'/'+sheet.file+'?v=417')]));
   sets.set(key,{manifest,art:Object.fromEntries(entries)});return true;
  }).catch(error=>{errors.set(key,error.message);console.error(error);return false;}).finally(()=>jobs.delete(key));jobs.set(key,job);return job;
 }
 function retry(key){errors.delete(key);return load(key);}
 function actionPose(age,duration,impact,count){
  const hit=Math.max(1,Math.min(duration-1,impact)),recover=hit+(duration-hit)*.3;
  if(count===2)return age<hit?0:1;
  return age<hit*.55?0:age<hit?1:age<recover?2:3;
 }
 function sequence(u,now=performance.now()){
  const support=isSupport(u),index=supportIndex(u),phase=u.shadowPhaseOffset??((u.name||'').length*173);
  if(u.hp<=0||u.anim==='death'){
   if(!deathClocks.has(u))deathClocks.set(u,now);const age=now-(u.shadowDeathAt??deathClocks.get(u)),count=support?2:4;
   return {sheet:support?'support':'actions',start:support?index*8+6:20,count,position:Math.min(count-1,Math.max(0,age/1100)*count),loop:false};
  }
  deathClocks.delete(u);
  if(u.anim==='attack'){
   const action=u.shadowAction||'melee',duration=Math.max(1,u.shadowActionDuration||1400),age=now-(u.shadowActionAt??now),count=support?2:4,row=({melee:0,magic:1,heal:2,buff:2,guard:3,ultimate:4})[action]??1;
   return {sheet:support?'support':'actions',start:support?index*8+4:row*4,count,position:actionPose(age,duration,u.shadowImpactMs||duration*.5,count),loop:false};
  }
  const count=support?4:12,duration=support?3600:4800;
  return {sheet:support?'support':'idle',start:support?index*8:0,count,position:((now+phase)%duration)/duration*count,loop:true};
 }
 function offset(u,x,y,now=performance.now()){
  if(u.anim!=='attack'||u.shadowAction!=='melee'||!u.shadowTarget||!battle?.party)return [0,0];
  const index=battle.party.indexOf(u.shadowTarget);if(index<0)return [0,0];
  const age=now-u.shadowActionAt,total=u.shadowActionDuration||1400,impact=u.shadowImpactMs||battleActionTiming('melee').impactMs;if(age<0||age>=total)return [0,0];
  const [tx,ty]=partyBattlePosition(index,battle.party.length),arrive=Math.max(1,impact*.74),leave=impact+Math.min(170,(total-impact)*.25);
  const forward=age<arrive,held=age>=arrive&&age<=leave,p=forward?age/arrive:held?1:(age-leave)/Math.max(1,total-leave),arch=Math.sin(Math.PI*p)**2;
  let approach=smooth(p),arc=0;
  switch(u.shadowTrialKey){
   case 'brindle':arc=-Math.sin(p*Math.PI*2)*arch*.5;break;
   case 'vetch':arc=-Math.sin(p*Math.PI*4)*arch*.65;break;
   case 'pelligrin':approach=smooth((p-.12)/.76);arc=-3*arch;break;
   case 'nacre':approach=forward&&p<.28?-.07*Math.sin(Math.PI*p/.28)**2:smooth(forward?(p-.28)/.72:p);arc=-4*arch;break;
   case 'orra':arc=-(forward?17:10)*arch;break;
   case 'custodian':arc=-8*arch;break;
  }
  const weight=held?1:forward?approach:1-approach;return [(tx+23-x)*weight,(ty-y)*weight+(held?0:arc)];
 }
 function paint(set,row,frame,x,y,size){
  const sheet=set.manifest.sheets.fx,im=set.art.fx;if(!im)return;const cell=sheet.cell,index=row*4+Math.max(0,Math.min(3,frame));
  ctx.drawImage(im,index%sheet.columns*cell,Math.floor(index/sheet.columns)*cell,cell,cell,x-size/2,y-size/2,size,size);
 }
 function shadowWisps(u,x,y,now){
  const h=height(u),cx=x+8,base=y+31,phase=now/1400+(u.shadowPhaseOffset||0)/700;
  ctx.save();ctx.globalAlpha*=isSupport(u)?.13:.2;ctx.strokeStyle='#bb99e3';ctx.lineWidth=.42;
  for(let side=-1;side<=1;side+=2){
   const drift=Math.sin(phase+side)*h*.035,edge=cx+side*h*.24;
   ctx.beginPath();ctx.moveTo(edge+drift,base-h*.22);ctx.bezierCurveTo(edge-side*h*.1,base-h*.42,edge+side*h*.13+drift,base-h*.55,edge+drift*.4,base-h*.78);ctx.stroke();
  }
  ctx.restore();
 }
 // Cache immutable, tightly cropped poses. Sharing these across identical adds and
 // outline passes avoids rebuilding a 384px blend surface on every render call.
 function pose(set,key,sheetName,index,tint=''){
  const cacheKey=[key,sheetName,index,tint].join(':');let frame=frames.get(cacheKey);
  if(frame){frames.delete(cacheKey);frames.set(cacheKey,frame);return frame;}
  const sheet=set.manifest.sheets[sheetName],cell=sheet.cell,b=sheet.bounds?.[index]||[0,0,cell,cell];
  const left=Math.max(0,Math.floor(b[0])-2),top=Math.max(0,Math.floor(b[1])-2),width=Math.min(cell-left,Math.ceil(b[0]+b[2])-left+2),height=Math.min(cell-top,Math.ceil(b[1]+b[3])-top+2);
  const layer=document.createElement('canvas');layer.width=width;layer.height=height;const g=layer.getContext('2d');
  g.imageSmoothingEnabled=true;g.filter=tint||'none';g.drawImage(set.art[sheetName],index%sheet.columns*cell+left,Math.floor(index/sheet.columns)*cell+top,width,height,0,0,width,height);g.filter='none';
  g.globalCompositeOperation='source-atop';const shade=g.createLinearGradient(0,0,width,height);shade.addColorStop(0,'rgba(48,23,77,.04)');shade.addColorStop(.5,'rgba(32,12,56,.05)');shade.addColorStop(1,'rgba(17,5,35,.13)');g.fillStyle=shade;g.fillRect(0,0,width,height);g.globalCompositeOperation='source-over';
  frame={image:layer,left,top,width,height};const pixels=width*height;
  while(cachedPixels+pixels>MAX_FRAME_PIXELS&&frames.size){const first=frames.keys().next().value,old=frames.get(first);cachedPixels-=old.width*old.height;frames.delete(first);}
  frames.set(cacheKey,frame);cachedPixels+=pixels;return frame;
 }
 function draw(u,x,y,now=performance.now()){
  const set=sets.get(u.shadowTrialKey);if(!set)return false;const seq=sequence(u,now),sheet=set.manifest.sheets[seq.sheet];if(!sheet||!set.art[seq.sheet])return false;
  const reference=isSupport(u)?sheet.referenceHeights?.[supportIndex(u)]||sheet.referenceHeight:sheet.referenceHeight,scale=height(u)/Math.max(1,reference),[ox,oy]=sheet.anchor;
  const index=seq.start+Math.min(seq.count-1,Math.floor(seq.position)),tint=u.shadowArtFilter||(u.shadowTint==='violet'?'hue-rotate(38deg) saturate(1.2)':'');
  const frame=pose(set,u.shadowTrialKey,seq.sheet,index,tint),left=x+8+(frame.left-ox)*scale,top=y+31+(frame.top-oy)*scale;
  if(seq.loop)shadowWisps(u,x,y,now);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.shadowBlur=0;ctx.filter='none';
  if(u.shadowArtAlpha!==undefined)ctx.globalAlpha*=u.shadowArtAlpha;
  if(seq.loop){const phase=seq.position/seq.count*Math.PI*2;ctx.translate(x+8,y+31);ctx.scale(1,1+Math.sin(phase)*.003);ctx.translate(-x-8,-y-31);}
  ctx.drawImage(frame.image,left,top,frame.width*scale,frame.height*scale);ctx.restore();
  if(window.ShadowTrialsII?.protectedUnit(u)){
   const cx=x+8,cy=y+31-height(u)-14;ctx.save();ctx.globalAlpha*=.8+.12*Math.sin(now/390);paint(set,2,Math.floor(now/230)%4,cx,cy,25);ctx.strokeStyle=u.shadowTrialKey==='pelligrin'?'#a2edff':'#ffe2a0';ctx.lineWidth=.65;ctx.fillStyle='#11172699';
   ctx.beginPath();ctx.moveTo(cx-5,cy-5);ctx.lineTo(cx+5,cy-5);ctx.lineTo(cx+5,cy+1);ctx.lineTo(cx,cy+7);ctx.lineTo(cx-5,cy+1);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy-2);ctx.lineTo(cx,cy+3);ctx.moveTo(cx-2,cy+.5);ctx.lineTo(cx+2,cy+.5);ctx.stroke();ctx.restore();
  }
  if(u.anim==='attack'&&u.lastAnimDrawTick!==tick){u.animTick=(u.animTick||0)+1;u.lastAnimDrawTick=tick;}return true;
 }
 function effectSprite(fx,now=performance.now()){
  const key=fx?.shadowTrialKey||fx?.shadowSource?.shadowTrialKey,set=sets.get(key);if(!set)return false;
  const timing=fx.timing||battleActionTiming(fx.kind),age=Math.max(0,now-fx.startedAt),impact=timing.impactMs,total=timing.totalMs||1400,action=fx.shadowAction||fx.shadowSource?.shadowAction||fx.kind,support=fx.shadowSupportAction||['heal','buff','guard'].includes(action);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(support){const source=fx.shadowTarget&&battle.enemies.includes(fx.shadowTarget)?fx.shadowTarget:fx.shadowSource,index=battle.enemies.indexOf(source),[x,y]=enemyBattlePosition(Math.max(0,index),battle.enemies.length);paint(set,2,Math.min(3,Math.floor(age/total*4)),x,y-height(source)*.45,62);}
  else if(age<impact&&action!=='melee'){
   const p=Math.min(1,age/Math.max(1,impact)),x=fx.fromX+(fx.toX-fx.fromX)*p,y=fx.fromY+(fx.toY-fx.fromY)*p-Math.sin(p*Math.PI)*7;ctx.save();ctx.translate(x,y);if(fx.toX>fx.fromX)ctx.scale(-1,1);paint(set,action==='ultimate'?3:0,Math.min(3,Math.floor(p*4)),0,0,action==='ultimate'?65:35);ctx.restore();
  }else if(age>=impact){const p=Math.min(.999,(age-impact)/Math.max(1,total-impact)),targets=fx.shadowAllTargets?battle.party.filter(u=>u.hp>0):[fx.shadowTarget];for(const target of targets){const i=battle.party.indexOf(target);if(i<0)continue;const [x,y]=partyBattlePosition(i,battle.party.length);paint(set,action==='ultimate'?3:1,Math.floor(p*4),x,y-25,action==='ultimate'?90:49);}}
  ctx.restore();if(age>=total&&effect===fx)effect=null;return true;
 }
 window.ShadowTrialArt={keys,get cacheInfo(){return {frames:frames.size,pixels:cachedPixels,maxPixels:MAX_FRAME_PIXELS};},load,retry,draw,offset,height,sequence,effect:effectSprite,loaded:key=>sets.has(key),failure:key=>errors.get(key)||null,get ready(){return Promise.all([...jobs.values()]);},manifest:key=>sets.get(key)?.manifest,portrait:key=>BASE+key+'/portrait.webp',landmark:key=>BASE+key+'/landmark.webp'};
})();
