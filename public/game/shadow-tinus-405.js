// Optional Shadow Trials II: Tinus's nightmare of a system that permits no choices.
(()=>{
 'use strict';
 const BASE='assets/shadow-tinus-405/',ORIGINAL=HallHub.originalShadowTrialIds;
 const SHEETS=['idle','melee','heal','magic','buff','guard','ultimate1','ultimate2','death'];
 const art={},clocks=new WeakMap();let meta,loaded=false,failure=null,assetWork=null;
 const load=(key,file)=>art[key]?Promise.resolve():new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{art[key]=im;resolve();};im.onerror=()=>reject(Error('Shadow Tinus asset unavailable: '+key));im.src=BASE+file+'?v=412';});
 function loadAssets(){
  if(assetWork)return assetWork;
  failure=null;
  assetWork=Promise.all([meta?Promise.resolve():fetch(BASE+'manifest.json?v=412').then(r=>{if(!r.ok)throw Error('Shadow Tinus manifest unavailable');return r.json();}).then(v=>meta=v),...SHEETS.map(k=>load(k,k+'.webp')),load('effects','effects.webp'),load('ultimate-effects','ultimate-effects.webp'),load('arena','arena.webp'),load('ward','ward.webp')]).then(()=>{loaded=true;return true;}).catch(e=>{failure=e.message;console.error(e);return false;}).finally(()=>{assetWork=null;});
  return assetWork;
 }
 let ready=loadAssets();
 function retryAssets(){ready=loadAssets();return ready;}
 function blocker(party){
  const missing=ORIGINAL.filter(id=>!HallHub.progress().shadowDefeated.includes(id));
  if(missing.length)return 'Clear these original Shadow Trials first: '+missing.join(', ')+'.';
  if(!state.party.includes('Tinus'))return 'Speak with Tinus in Ember Hall to recruit him after the seven original trials.';
  if(failure)return 'Shadow Tinus artwork could not load. Use Retry artwork below.';
  if(!loaded)return 'Loading Shadow Tinus artwork… The challenge button will unlock when it is ready.';
  if(!party?.length)return 'Select one to three recruited party members.';
  if(party.length>3||party.some(id=>!baseJobs[id]||!state.party.includes(id)))return 'Select one to three recruited party members.';
  return '';
 }
 function startNotice(message){const node=el.menuBody.querySelector('[data-bonus-status]');if(node){node.hidden=false;node.textContent=message;}}

 const trial={ring:'Ring of the Unsealed Choice',legacy:'Ring of Unsealed Choice',unique:'An Open Ending',effectType:'mpEfficiency',stats:{mag:30,echo:27,stam:21},affixKeys:['resonant','resolute','keen','alchemist','quickstart'],ability:'Skills cost 12% less MP. Grants 15% Siphoning, refunding up to 30% of paid MP after damaging skills.',desc:'The Chaos Agent becomes the system he fears: every choice sealed, every voice overruled. Destroy every clone to break his shield; cleanse Silence and Disrupted, and interrupt his announced ultimates.'};
 HallHub.shadowTrials.Tinus=trial;
 if(!gearDb.ring.some(g=>g.name===trial.ring)){
  const ring=item(trial.ring,'ring',{...trial.stats},'A final signature left blank, so its owner can still choose.',[{type:'mpEfficiency',value:.12,label:'An Open Ending: skills cost 12% less MP'},{type:'siphoning',value:.15,label:'15% Siphoning: refund 30% of paid MP on damaging skills'}]);
  Object.assign(ring,{rarity:'Shadow Personal Artifact',shadowArtifact:true});gearDb.ring.push(ring);gearOwners[ring.name]=['Tinus'];artifactGearNames.add(ring.name);
 }
 const unlocked=()=>ORIGINAL.every(id=>HallHub.progress().shadowDefeated.includes(id))&&state.party.includes('Tinus');
 const active=()=>Boolean(battle?.sparring?.opponent==='Tinus');
 const copies=()=>active()?battle.enemies.filter(u=>u.shadowTinusClone&&u.hp>0):[];
 const boss=()=>active()?battle.enemies.find(u=>u.shadowTinusBoss):null;
 const shielded=u=>Boolean(u?.shadowTinusBoss&&active()&&copies().length);
 function recovery(u){
  if(!u||u.hp<=0||copies().length)return;
  u.shadowRecovery=2;u.shadowWardBrokenAt=performance.now();u.shadowPrepared=false;u.statuses=(u.statuses||[]).filter(s=>s.type!=='barrier');
  for(const type of ['physicalVulnerability','magicVulnerability'])applyStatus(u,type,u,{value:.2,duration:2,force:true});
  addBattleFloater(u,0,{kind:'dispel',text:'CLONES BROKEN · OPENING'});
 }
 function protectHp(u){
  let hp=u.hp;
  Object.defineProperty(u,'hp',{enumerable:true,configurable:true,get:()=>hp,set:value=>{
   value=Number(value);if(!Number.isFinite(value))return;
   if(value>=hp){hp=Math.min(u.max,value);return;}
   if(u.shadowTinusBoss&&shielded(u))return;
   if(u.shadowTinusBoss&&active()&&u.shadowCloneWaves<3){const threshold=u.max*(u.shadowCloneWaves===1?.65:.30);if(hp>threshold&&value<=threshold){hp=threshold;summon(u);return;}}
   const was=hp;hp=Math.max(0,value);
   if(was>0&&hp===0){u.shadowDeathAt=performance.now();u.defeatUntil=tick+78;}
   if(u.shadowTinusClone&&was>0&&hp===0&&!copies().length)recovery(boss());
  }});
 }
 function summon(u){
  if(!active()||copies().length||u.shadowCloneWaves>=3)return false;
  const wave=++u.shadowCloneWaves;delete u.shadowWardBrokenAt;
  u.statuses=ensureStatuses(u).filter(s=>!STATUS_DEFS[s.type]?.negative);u.stagger=0;
  for(let i=0;i<2;i++){
   const source=enemy(i?'Shadow Tinus / Disruption Echo':'Shadow Tinus / Coercion Echo',14000+wave*2000,175,'Holy Fire','#b632a0',1,'Tinus');
   Object.assign(source,{sparringId:'Tinus',shadowTinusClone:true,shadowCloneWave:wave,shadowCloneRole:i?'disruption':'coercion',fixedLevel:true,levelHint:40});
   const clone=prepareEnemyForBattle(source,'emberHallBattles');clone.arrivalTick=tick;
   const slot=battle.enemies.findIndex(e=>e.shadowTinusClone&&e.hp<=0);if(slot<0)battle.enemies.push(clone);else battle.enemies[slot]=clone;
  }
  addBattleFloater(u,0,{kind:'buff',text:'CLONE SHIELD · DESTROY BOTH ECHOES'});return true;
 }
 const nativePrepare=prepareEnemyForBattle;
 prepareEnemyForBattle=function(source,...args){
  const u=nativePrepare(source,...args);if(source.sparringId!=='Tinus')return u;
  const clone=Boolean(source.shadowTinusClone),max=clone?14000+(source.shadowCloneWave||1)*2000:72000;
  Object.assign(u,{name:source.name,hp:developerScale('enemy','hp',max,1),max:developerScale('enemy','hp',max,1),mp:developerScale('enemy','mp',clone?160:320),maxmp:developerScale('enemy','mp',clone?160:320),atk:clone?175:250,stats:{str:clone?175:250,mag:clone?205:285,stam:clone?180:290,agi:clone?90:105,echo:clone?60:110},level:40,levelHint:40,fixedLevel:true,role:clone?'controller':'boss',weak:clone?'Holy Fire':'Sound',crit:clone?.05:.08,xp:0,shadowTinusBoss:!clone,shadowTinusClone:clone,shadowCloneWave:source.shadowCloneWave,shadowCloneRole:source.shadowCloneRole,shadowCloneWaves:0,shadowHeals:0,shadowRecovery:0,shadowUltimates:0,combatPotency:{damage:1,healing:1,ultimate:1}});
  protectHp(u);return u;
 };
 const nativeChoose=chooseEnemyAction;
 const claw=(coefficient=1.1)=>({kind:'melee',name:'Obsidian Rebuttal',element:'Physical',scaling:'str',coefficient,mpCost:0,basicAttack:true,shadowCast:'melee'});
 chooseEnemyAction=function(u){
  if(!u.shadowTinusBoss&&!u.shadowTinusClone)return nativeChoose(u);
  const turn=u.actionsTaken||0,silenced=Boolean(statusOf(u,'silence'));
  if(u.shadowTinusClone){
   if(silenced||u.mp<enemyActionMpCost(u,{mpCost:12})||turn%2===0)return claw(.95);
   return {kind:'magic',name:u.shadowCloneRole==='coercion'?'Counterfeit Injunction':'Echo of Disruption',element:'Shadow',scaling:'mag',coefficient:1,mpCost:12,shadowCast:'magic',status:u.shadowCloneRole==='coercion'?{type:'silence',chance:.65,duration:1}:{type:'disrupted',chance:.8,duration:2,value:.15}};
  }
  if(u.shadowRecovery>0)return {...claw(.7),name:'The Ledger Lies Open'};
  if(u.shadowPrepared){
   if(silenced||(battle.enemyResonance||0)<100){u.shadowPrepared=false;return {...claw(.8),name:'Interrupted Final Clause'};}
   const second=u.hp<u.max*.5||u.shadowUltimates%2===1;
   return {kind:'ultimate',name:second?'LAST CALL':'THE FINAL CLAUSE',element:'Shadow',scaling:'mag',coefficient:second?2.55:2.35,allTargets:true,mpCost:0,shadowCast:second?'ultimate2':'ultimate1',status:{type:second?'magicVulnerability':'disrupted',chance:1,duration:2,value:second?.15:.2}};
  }
  if(silenced)return claw(1.2);
  if((battle.enemyResonance||0)>=100)return {kind:'buff',name:'Preparing '+(u.hp<u.max*.5?'Last Call':'The Final Clause')+' — Silence to interrupt',target:u,buffs:[{type:'barrier',value:.08,duration:1}],mpCost:0,shadowCast:'guard',shadowCharge:true};
  if(u.mp<enemyActionMpCost(u,{mpCost:24}))return {kind:'buff',name:'Black Coffee Break',target:u,buffs:[],mpCost:0,shadowCast:'heal',shadowRestoreMp:85};
  if(!shielded(u)&&u.hp<u.max*.48&&u.shadowHeals<2&&turn%3!==1)return {kind:'magic',name:'Coffee Beyond the Last Page',target:u,healing:true,healCoefficient:1,mpCost:28,shadowCast:'heal',shadowHealFraction:.1};
  if(turn%6===2)return {kind:'magic',name:'No Further Objections',element:'Shadow',scaling:'mag',coefficient:.8,allTargets:true,mpCost:20,shadowCast:'magic',status:{type:'silence',chance:.75,duration:1}};
  if(turn%6===4)return {kind:'magic',name:'System Without Consent',element:'Tech',scaling:'mag',coefficient:.9,allTargets:true,mpCost:20,shadowCast:'magic',status:{type:'disrupted',chance:.9,duration:2,value:.2}};
  if(turn%6===3&&!statusOf(u,'magicUp'))return {kind:'buff',name:'Infernal Amendment',target:u,buffs:[{type:'magicUp',value:.18,duration:3}],mpCost:14,shadowCast:'buff'};
  if(turn%6===5)return {kind:'buff',name:'Clause of Refusal',target:u,buffs:[{type:'defenseUp',value:.18,duration:2}],mpCost:10,shadowCast:'guard'};
  return turn%2?{kind:'magic',name:'Unwritten Hex',element:'Shadow',scaling:'mag',coefficient:1.3,mpCost:14,shadowCast:'magic',status:{type:'magicVulnerability',chance:.75,duration:2,value:.15}}:claw(1.25);
 };
 const nativeWin=winBattle;
 winBattle=function(log){
  if(active()&&battle.enemies.every(u=>u.hp<=0)){const remaining=Math.max(...battle.enemies.map(u=>(u.shadowDeathAt||0)+1250-performance.now()));if(remaining>0){if(!battle.shadowVictoryPending){const current=battle;battle.shadowVictoryPending=true;setTimeout(()=>{if(battle===current){battle.shadowVictoryPending=false;winBattle(log);}},remaining);}return;}}
  return nativeWin(log);
 };
 const nativeHealing=enemyHealingBase;
 enemyHealingBase=function(u,action,target){return u.shadowTinusBoss&&action.shadowHealFraction?Math.round(target.max*action.shadowHealFraction):nativeHealing(u,action,target);};
 const nativeFx=makeEnemyBattleEffect;
 makeEnemyBattleEffect=function(u,target,action){
  const fx=nativeFx(u,target,action);if(!u.shadowTinusBoss&&!u.shadowTinusClone)return fx;
  const now=performance.now();u.shadowCast=action.shadowCast||'magic';u.shadowCastAt=now;u.shadowCastDuration=fx.timing?.totalMs||1400;u.shadowImpactMs=fx.timing?.impactMs||500;u.shadowMeleeTarget=action.kind==='melee'?target:null;
  if(action.shadowCharge)u.shadowPrepared=true;
  if(action.kind==='ultimate'){u.shadowPrepared=false;u.shadowUltimates++;}
  if(action.shadowHealFraction)u.shadowHeals++;
  if(action.shadowRestoreMp){u.mp=Math.min(u.maxmp,u.mp+action.shadowRestoreMp);addBattleFloater(u,0,{kind:'mp',text:'+'+action.shadowRestoreMp+' MP'});}
  if(u.shadowRecovery>0)u.shadowRecovery--;
  Object.assign(fx,{shadowTinusFx:true,shadowCast:u.shadowCast,shadowSource:u,shadowTarget:target,shadowAllTargets:action.allTargets,shadowSupport:action.healing||['buff','cleanse'].includes(action.kind)});
  return fx;
 };
 function sequence(u,now){
  if(u.hp<=0||u.anim==='death'){u.shadowDeathAt??=now;return {key:'death',position:Math.min(7,(now-u.shadowDeathAt)/150),loop:false};}
  if(u.anim==='attack'&&now-(u.shadowCastAt||0)<(u.shadowCastDuration||1400))return {key:u.shadowCast||'magic',position:Math.min(7,(now-u.shadowCastAt)/Math.max(1,u.shadowCastDuration)*8),loop:false};
  if(!clocks.has(u))clocks.set(u,now-(u.shadowTinusClone?(u.shadowCloneRole==='disruption'?2279:1171):0));
  const period=meta?.idleCycleMs||4800,phase=((now-clocks.get(u))%period)/(period/8);return {key:'idle',position:phase,loop:true};
 }
 const bossHeight=()=>Math.min(82,Math.max(58,LOGICAL_WIDTH*.18)),cloneHeight=()=>Math.min(40,Math.max(28,LOGICAL_WIDTH*.09));
 const nativePosition=enemyBattlePosition;
 enemyBattlePosition=function(index,count){if(!active())return nativePosition(index,count);const u=battle.enemies[index];if(!u?.shadowTinusBoss&&!u?.shadowTinusClone)return nativePosition(index,count);const cloneIndex=battle.enemies.slice(0,index).filter(e=>e.shadowTinusClone).length;return u.shadowTinusBoss?[LOGICAL_WIDTH*.82,152]:[LOGICAL_WIDTH*(cloneIndex?.60:.62),cloneIndex?168:103];};
 const nativeDraw=drawEnemy;
 drawEnemy=function(u,x,y,...rest){
  if(!u.shadowTinusBoss&&!u.shadowTinusClone)return nativeDraw(u,x,y,...rest);
  if(!loaded)return nativeDraw(u,x,y,...rest);
  const [dx,dy]=meleeMotion(u,x+8,y+31);return BattleCommandUI.captureSprite(u,x+8+dx,y+31+dy,()=>drawBoss(u,x+dx,y+dy));
 };
 function meleeMotion(u,x,y,now=performance.now()){
  if(u.anim!=='attack'||u.shadowCast!=='melee'||!u.shadowMeleeTarget)return [0,0];
  const age=now-u.shadowCastAt,total=u.shadowCastDuration,impact=u.shadowImpactMs,index=battle.party.indexOf(u.shadowMeleeTarget);
  if(index<0||age<0||age>=total)return [0,0];
  const [tx,ty]=partyBattlePosition(index,battle.party.length),arrive=Math.max(1,impact*.75),leave=impact+Math.min(180,(total-impact)*.25);
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const amount=age<arrive?ease(age/arrive):age<=leave?1:1-ease((age-leave)/Math.max(1,total-leave));
  return [(tx+25-x)*amount,(ty-y)*amount];
 }
 function wardState(u,now=performance.now()){
  if(!u?.shadowTinusBoss||!active()||u.hp<=0)return null;
  const count=copies().length;
  if(count)return {kind:'immune',count,frame:Math.floor(now/180)%8};
  if(u.shadowWardBrokenAt!==undefined){const age=now-u.shadowWardBrokenAt;if(age>=0&&age<720)return {kind:'breaking',count:0,frame:8+Math.min(7,Math.floor(age/90)),alpha:1-age/850};}
  return null;
 }
 function shieldHud(u){
  if(!u?.shadowTinusBoss||!active()||u.hp<=0)return null;
  const count=copies().length;
  if(count)return {kind:'immune',label:'IMMUNE',detail:'Destroy '+count+' echo'+(count===1?'':'es'),description:'Tinus cannot lose HP while an echo survives. Destroy every echo to break the clone ward.'};
  if(u.shadowRecovery>0)return {kind:'exposed',label:'EXPOSED',detail:'Clone ward broken',description:'Both echoes are destroyed. Tinus is vulnerable and weakened for two actions.'};
  return null;
 }
 function wardPoint(x,y){return [x,y-bossHeight()-20];}
 function drawWard(u,x,y,now){
  const state=wardState(u,now);if(!state||!art.ward)return;
  const [cx,cy]=wardPoint(x,y),size=state.kind==='breaking'?35:30,cell=256;
  ctx.save();ctx.globalAlpha*=state.alpha??.92;ctx.imageSmoothingEnabled=true;
  ctx.drawImage(art.ward,(state.frame%4)*cell,Math.floor(state.frame/4)*cell,cell,cell,cx-size/2,cy-size*.62+Math.sin(now/420)*.35,size,size*1.24);ctx.restore();
 }
 function animateCup(u,g,layer,position,mix,now){
  if(!meta.cupFlames)return;
  const f=Math.floor(position),a=meta.cupFlames[f],b=meta.cupFlames[(f+1)%8];
  const rect=a.map((value,i)=>value+(b[i]-value)*mix),[x,y]=rect,w=Math.ceil(rect[2]),h=Math.ceil(rect[3]);
  const cup=u.shadowCup||(u.shadowCup=document.createElement('canvas'));if(cup.width!==w||cup.height!==h){cup.width=w;cup.height=h;}
  const paint=cup.getContext('2d');paint.clearRect(0,0,w,h);paint.drawImage(layer,x,y,w,h,0,0,w,h);
  paint.globalCompositeOperation='destination-in';paint.save();paint.translate(w/2,h/2);paint.scale(w/2,h/2);const mask=paint.createRadialGradient(0,0,.55,0,0,1);mask.addColorStop(0,'#fff');mask.addColorStop(1,'#fff0');paint.fillStyle=mask;paint.fillRect(-1,-1,2,2);paint.restore();paint.globalCompositeOperation='source-over';
  g.save();g.globalCompositeOperation='source-over';g.globalAlpha=1;
  const t=now/1000,step=u.shadowTinusClone?5:3;
  for(let row=0;row<h;row+=step){const strength=Math.max(0,1-(row+step/2)/h),dx=(Math.sin(t*2.7+strength*6.2)+.4*Math.sin(t*4.1-strength*5))*12*strength,dy=Math.cos(t*2.1+strength*4)*3*strength;g.drawImage(cup,0,row,w,Math.min(step,h-row),x+dx,y+row+dy,w,Math.min(step+1,h-row));}
  g.restore();
 }
 function drawBoss(u,x,y){
  const now=performance.now(),s=sequence(u,now),c=meta.sheets[s.key],im=art[s.key],scale=(u.shadowTinusClone?cloneHeight():bossHeight())/meta.referenceHeight;
  let f=Math.floor(s.position),n=s.loop?(f+1)%8:Math.min(7,f+1),mix=s.position-f;mix=mix*mix*(3-2*mix);
  const cell=meta.cell,ox=meta.anchor[0],oy=meta.anchor[1],layer=u.shadowBlend||(u.shadowBlend=document.createElement('canvas'));
  if(layer.width!==cell){layer.width=cell;layer.height=cell;}
  const g=layer.getContext('2d');g.clearRect(0,0,cell,cell);g.globalCompositeOperation='lighter';
  for(const [frame,weight]of [[f,1-mix],[n,mix]]){g.globalAlpha=weight;g.drawImage(im,(frame%4)*cell,Math.floor(frame/4)*cell,cell,cell,0,0,cell,cell);}
  g.globalAlpha=1;g.globalCompositeOperation='source-over';if(s.loop)animateCup(u,g,layer,s.position,mix,now);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(u.shadowTinusClone){ctx.globalAlpha*=.70;ctx.filter='saturate(.45)';}
  if(s.loop){const phase=s.position/8*Math.PI*2;ctx.translate(x+8,y+31);ctx.rotate(Math.sin(phase)*.010);ctx.scale(1,1+Math.sin(phase)*.008);ctx.translate(-x-8,-y-31);}
  ctx.drawImage(layer,x+8-ox*scale,y+31-oy*scale,cell*scale,cell*scale);
  ctx.restore();drawWard(u,x+8,y+31,now);if(u.anim==='attack'&&u.lastAnimDrawTick!==tick){u.animTick=(u.animTick||0)+1;u.lastAnimDrawTick=tick;}return true;
 };
 const nativeSheet=enemyAnimationSheetFor;
 enemyAnimationSheetFor=function(u){return (u.shadowTinusBoss||u.shadowTinusClone)&&loaded?{image:art.idle,cols:4,rows:2,cellWidth:meta.cell,cellHeight:meta.cell}:nativeSheet(u);};
 const nativeStature=EnemyStature.profile;
 EnemyStature.profile=function(u){return u.shadowTinusBoss||u.shadowTinusClone?{kind:u.shadowTinusBoss?'large':'adult',targetHeight:u.shadowTinusBoss?bossHeight():cloneHeight(),nativeHeight:u.encounterNativeHeight||(u.shadowTinusBoss?bossHeight():cloneHeight())}:nativeStature(u);};
 const nativeBackdrop=drawBattleBackground;
 drawBattleBackground=function(image,arena){const result=nativeBackdrop(active()&&loaded?art.arena:image,active()?'shadow-tinus':arena);const main=boss();if(!main||!shielded(main))return result;
  const [bx,by]=enemyBattlePosition(battle.enemies.indexOf(main)),[wx,wy]=wardPoint(bx+battleOffset(main),by);ctx.save();ctx.strokeStyle='#b09bce';ctx.globalAlpha=.20+.025*Math.sin(performance.now()/440);ctx.lineWidth=.45;ctx.setLineDash([1.3,2.8]);
  for(const echo of copies()){const [x,y]=enemyBattlePosition(battle.enemies.indexOf(echo)),cy=y-cloneHeight()*.56;ctx.beginPath();ctx.moveTo(x+battleOffset(echo),cy);ctx.quadraticCurveTo((x+wx)/2,Math.min(cy,wy)-7,wx,wy);ctx.stroke();}ctx.restore();return result;
 };
 function paintEffect(key,index,x,y,w,h=w){const image=key.startsWith('ultimate')?art['ultimate-effects']:art.effects;const group=({projectile:0,impact:1,heal:2,ward:3,ultimate1:0,ultimate2:1})[key],cell=256;const row=group*2+Math.floor(index/4);ctx.drawImage(image,(index%4)*cell,row*cell,cell,cell,x-w/2,y-h/2,w,h);}
 const nativeDrawFx=drawEffect;
 drawEffect=function(){
  const fx=effect;if(!fx?.shadowTinusFx||!loaded)return nativeDrawFx();
  const age=performance.now()-fx.startedAt,timing=fx.timing||battleActionTiming(fx.kind),impact=timing.impactMs,total=timing.totalMs||1400;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(fx.shadowSupport){const index=Math.min(7,Math.floor(age/total*8)),i=battle.enemies.indexOf(fx.shadowSource),[x,y]=enemyBattlePosition(Math.max(0,i),battle.enemies.length);paintEffect(fx.shadowCast==='heal'?'heal':'ward',index,x+8,y-23,90);}
  else if(age<impact&&fx.shadowCast!=='melee'){
   const p=Math.max(0,Math.min(1,age/impact)),x=fx.fromX+(fx.toX-fx.fromX)*p,y=fx.fromY+(fx.toY-fx.fromY)*p-Math.sin(p*Math.PI)*8;
   ctx.save();ctx.translate(x,y);if(fx.toX>fx.fromX)ctx.scale(-1,1);paintEffect('projectile',Math.min(7,Math.floor(p*8)),0,0,fx.kind==='ultimate'?70:38);ctx.restore();
  }else if(age>=impact){const p=Math.min(.999,(age-impact)/Math.max(1,total-impact)),index=Math.min(7,Math.floor(p*8)),targets=fx.shadowAllTargets?battle.party.filter(u=>u.hp>0):[fx.shadowTarget];for(const u of targets){const i=battle.party.indexOf(u);if(i<0)continue;const [x,y]=partyBattlePosition(i,battle.party.length);paintEffect(fx.kind==='ultimate'?fx.shadowCast:'impact',index,x,y-24,fx.kind==='ultimate'?90:55);}}
  ctx.restore();if(age>=total&&effect===fx)effect=null;
 };

 function previewEnemies(){
  return [0,1,2].map(index=>{const clone=index>0,source=enemy(clone?'Shadow Tinus / '+(index===1?'Coercion Echo':'Disruption Echo'):'Shadow Tinus',clone?16000:72000,clone?175:250,clone?'Holy Fire':'Sound','#b632a0',1,'Tinus');Object.assign(source,{sparringId:'Tinus',shadowTinusClone:clone,shadowCloneWave:1,shadowCloneRole:index===1?'coercion':'disruption',levelHint:40,fixedLevel:true});return prepareEnemyForBattle(source,'emberHallBattles');});
 }
 function open(){
  if(state.gameMode!=='hallBattles'||!state.party.includes('Seerin'))return false;
  mode='hallMap';heldDirection=null;fieldDestination=null;el.menu.classList.remove('hidden','is-shop');el.menu.dataset.menuView='hall-hub';document.querySelector('.menu-tabs').classList.add('hidden');
  if(!HallHub.shadowFormation.length)HallHub.setShadowFormation(state.activeParty.filter(id=>baseJobs[id]&&state.party.includes(id)).slice(0,3),false);
  const won=HallHub.progress().shadowDefeated.includes('Tinus'),available=unlocked(),party=HallHub.shadowFormation,reason=blocker(party);
  const cards=Array.from({length:7},(_,i)=>`<button type="button" class="hall-stage shadow-stage ${i?'is-locked':(won?'is-cleared ':'')+'is-selected'}" ${i?'disabled':`data-shadow="Tinus" data-shadow-bonus-select ${!available?'disabled':''}`} aria-label="${i?'TBD encounter '+(i+8):'Shadow Tinus bonus boss'}"><span>SHADOW TRIAL II · ${i+8} / ${i?'LOCKED':won?'DEFEATED':'BONUS'}</span>${i?'<strong>TBD</strong><small>Future encounter</small>':`<img src="${BASE}portrait.webp" alt="Shadow Tinus"><strong>Shadow Tinus</strong><small>Level 40 · Optional final boss</small><em>${trial.ring}</em>`}</button>`).join('');
  el.menuBody.innerHTML=`<section class="hub-screen shadow-bonus-screen"><header class="hub-header"><h2>Ember Hall / Shadow Trials II</h2><button type="button" data-hub-back aria-label="Close">×</button></header><div class="hall-stage-grid shadow-grid">${cards}</div><section class="shadow-detail shadow-bonus-detail" aria-label="Shadow Tinus encounter preview"><div class="shadow-preview"><img src="${BASE}portrait.webp" alt="Shadow Tinus enemy preview"><div><h3>Shadow Tinus — No Choice Remains</h3><p>${trial.desc}</p></div></div><h3>Your party (${party.length}/3)</h3><p>Choose up to three members. Items and vitals are restored afterward.</p><div class="shadow-party">${state.party.filter(id=>baseJobs[id]).map(id=>`<button type="button" data-shadow-party="${id}" data-bonus-member="${id}" aria-pressed="${party.includes(id)}" ${!party.includes(id)&&party.length>=3?'disabled':''}><strong>${id}</strong><small>Level ${progressFor(id).level}</small></button>`).join('')}</div>${HallHub.encounterSupportHtml()}<footer class="hub-footer"><p data-bonus-status role="status" aria-live="polite" ${!reason?'hidden':''}>${escapeMarkup(reason)}</p>${failure?'<button type="button" data-bonus-retry>Retry artwork</button>':''}<button type="button" data-bonus-start data-shadow-start ${reason?'disabled':''}>Start battle</button></footer></section></section>`;
  el.menuBody.querySelector('[data-hub-back]').onclick=()=>closeHallOverlay();
  el.menuBody.querySelector('[data-shadow-bonus-select]').onclick=()=>{el.menuBody.querySelector('.trial-party-setup,.shadow-bonus-detail .hub-footer')?.scrollIntoView({behavior:'smooth',block:'nearest'});const button=el.menuBody.querySelector('[data-bonus-start]');if(button&&!button.disabled)button.focus({preventScroll:true});};
  el.menuBody.querySelectorAll('[data-bonus-member]').forEach(button=>button.onclick=()=>{const next=[...party],i=next.indexOf(button.dataset.bonusMember);if(i>=0)next.splice(i,1);else if(next.length<3)next.push(button.dataset.bonusMember);HallHub.setShadowFormation(next);});
  HallHub.bindEncounterSupport(open);
  window.TrialNavigation?.mount('shadow');
  const overview=el.menuBody.querySelector('.trial-overview');if(overview){const note=document.createElement('p');note.className='shadow-bonus-strategy';note.textContent='72,000 HP · Three clone waves at the opening, 65% and 30% HP. Destroy both echoes to break the shield. Two limited self-heals. Silence or drain Resonance to interrupt charged ultimates.';overview.appendChild(note);const reward=document.createElement('details');reward.className='shadow-bonus-reward';reward.innerHTML=`<summary>First-clear reward · ${trial.ring}</summary><p>Tinus only · +30 MAG / +27 ECHO / +21 STAM · five premium affixes.</p><p>${trial.ability}</p>`;overview.appendChild(reward);}
  const status=el.menuBody.querySelector('[data-bonus-status]'),content=el.menuBody.querySelector('.formation-content');if(status&&content)content.appendChild(status);
  const retry=el.menuBody.querySelector('[data-bonus-retry]');if(retry)retry.onclick=async()=>{retry.disabled=true;startNotice('Retrying Shadow Tinus artwork…');await retryAssets();if(mode==='hallMap'&&el.menuBody.querySelector('.shadow-bonus-screen'))open();};
  el.menuBody.querySelector('[data-bonus-start]').onclick=()=>start(HallHub.shadowFormation);
  if(!loaded&&!failure)ready.then(()=>{if(mode==='hallMap'&&el.menuBody.querySelector('.shadow-bonus-screen'))open();});return true;
 }
 function start(party){
  if(mode!=='hallMap')return false;
  const reason=blocker(party);if(reason){startNotice(reason);return false;}
  const ok=HallHub.startSparring(party,'Tinus');if(!ok){startNotice('The battle could not begin. Check your party and preparation, then try again.');return false;}
  battle.shadowBonus=true;const u=boss();if(u&&summon(u)){buildTurnOrder();renderBattle('The battle starts. Review the opening formation.');}return true;
 }
 window.ShadowBonus={get ready(){return ready;},retryAssets,blocker,previewEnemies,wardState,shieldHud,meleeMotion,open,start,onTurnStart(u){if(u?.shadowTinusBoss&&u.shadowPrepared&&['silence','stun','sleep'].some(k=>statusOf(u,k)))u.shadowPrepared=false;},unlocked,active,shielded,copies,summon,sequence,trial,get loaded(){return loaded;},get failure(){return failure;}};
})();
