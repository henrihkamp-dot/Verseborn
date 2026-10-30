// Whirlpool-only formations, authored minion poses and attack effects.
(()=>{
 const BASE='assets/whirlpool-minions-397/',images={},support={},specs={
  bulwark:{name:'Riftbound Bulwark',role:'tank',element:'Shadow',weak:'Holy Fire',height:48,hp:.18,power:.34},
  gloamknife:{name:'Gloamknife Stalker',role:'assassin',element:'Shadow',weak:'Holy Fire',height:43,hp:.12,power:.40},
  riftcaller:{name:'Veilcaller',role:'caster',element:'Sigil',weak:'Tech',height:46,hp:.13,power:.32},
  sentry:{name:'Clockwork Marauder',role:'fighter',element:'Tech',weak:'Earth',height:43,hp:.15,power:.36}
 };
 const pairs=[['bulwark','gloamknife'],['gloamknife','riftcaller'],['bulwark','sentry'],['gloamknife','riftcaller'],['sentry','riftcaller'],['bulwark','riftcaller'],['sentry','gloamknife'],['bulwark','riftcaller']];
 let meta,loaded=false,failure=null;
 const load=(key,url,into=images)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{into[key]=im;resolve();};im.onerror=()=>reject(Error('Whirlpool art unavailable: '+key));im.src=url;});
 const ready=Promise.all([fetch(BASE+'frames.json').then(r=>{if(!r.ok)throw Error('Minion anchors unavailable');return r.json();}).then(v=>meta=v),...Object.keys(specs).map(k=>load(k,BASE+k+'.webp')),...['slash','projectile','magic'].map(k=>load(k,BASE+k+'.webp')),load('buff','assets/effects/recipient-buff-392.webp',support),load('heal','assets/effects/recipient-heal-396.webp',support)]).then(()=>loaded=true).catch(e=>{failure=e.message;console.error(e);return false;});
 for(const s of Object.values(specs))enemyAbilityProfiles[s.name]={role:s.role,element:s.element,maxMp:90,identity:{str:100,mag:100,agi:100,stam:100},moves:{},pattern:['melee','magic']};
 function makeMinion(key,id){const s=specs[key],e=TinusWhirlpool.encounters[id-1];return {...enemy(s.name,Math.round(e.hp*s.hp),Math.round(e.power*s.power),s.weak,'#a8a1cb',1),whirlpoolMinion:key,whirlpoolStage:id,levelHint:40,fixedLevel:true,xp:0};}
 function formation(id){return [TinusWhirlpool.makeEnemy(id),...pairs[id-1].map(k=>makeMinion(k,id))];}
 const originalPrepare=prepareEnemyForBattle;
 prepareEnemyForBattle=function(source,...args){const u=originalPrepare.apply(this,arguments);if(!source.whirlpoolMinion)return u;const s=specs[source.whirlpoolMinion],e=TinusWhirlpool.encounters[source.whirlpoolStage-1],power=Math.round(e.power*s.power);return Object.assign(u,{hp:enemyBalanceValue('hp',Math.round(e.hp*s.hp)),max:enemyBalanceValue('hp',Math.round(e.hp*s.hp)),atk:power,stats:{str:power,mag:power,agi:s.role==='assassin'?125:85,stam:s.role==='tank'?180:100},mp:90,maxmp:90,crit:.04,baseEvasion:.025,xp:0,resistanceTier:'normal',role:s.role,combatPotency:{damage:1,healing:1,ultimate:1}});};
 const originalProfile=EnemyStature.profile;
 EnemyStature.profile=function(u){return u.whirlpoolMinion?{kind:'adult',targetHeight:specs[u.whirlpoolMinion].height,nativeHeight:u.encounterNativeHeight||48}:originalProfile(u);};
 const originalPortrait=enemyPortraitDataUrl;
 enemyPortraitDataUrl=function(name){const key=Object.keys(specs).find(k=>specs[k].name===name);return key?BASE+key+'-portrait.webp':originalPortrait(name);};
 const originalRole=combatRoleKey;
 combatRoleKey=function(u,enemySide=false){if(enemySide&&(u?.whirlpoolKey||u?.whirlpoolMinion)&&u.role==='caster')return 'utility';return originalRole(u,enemySide);};
 const originalSheet=enemyAnimationSheetFor;
 enemyAnimationSheetFor=function(u){if(u.whirlpoolMinion&&loaded)return {image:images[u.whirlpoolMinion],cols:4,rows:4,cellWidth:meta.sheets[u.whirlpoolMinion].cell,cellHeight:meta.sheets[u.whirlpoolMinion].cell};return originalSheet(u);};
 const originalChoose=chooseEnemyAction;
 function melee(u,name){return {kind:'melee',name,element:'Physical',coefficient:u.whirlpoolMinion?.85:1.05,mpCost:0,basicAttack:true};}
 chooseEnemyAction=function(u){
  if(u.whirlpoolMinion){const key=u.whirlpoolMinion,n=u.actionsTaken||0,allies=battle.enemies.filter(e=>e.hp>0),weakest=allies.slice().sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
   if(u.mp<12||statusOf(u,'silence')||n%3===0)return melee(u,key==='bulwark'?'Rift Mace':key==='gloamknife'?'Gloamknife Cut':key==='sentry'?'Iron Claw':'Crescent Staff');
   if(key==='bulwark')return {kind:'buff',name:'Voidsteel Shelter',target:weakest||u,buffs:[{type:'barrier',value:.16,duration:2}],mpCost:12};
   if(key==='riftcaller'&&weakest?.hp<weakest.max*.55)return {kind:'magic',name:'Mending the Veil',element:'Sigil',healing:true,target:weakest,healCoefficient:1.1,mpCost:18};
   return {kind:'magic',name:key==='sentry'?'Clockwork Bolt':key==='gloamknife'?'Spectral Knife':'Veil Fracture',element:specs[key].element,coefficient:1.05,mpCost:12,status:key==='riftcaller'?{type:'magicVulnerability',value:.1,chance:.4,duration:2}:null};
  }
  if(!u.whirlpoolKey)return originalChoose(u);
  if(!u.whirlpoolState?.pending&&!u.whirlpoolState?.recovery&&u.mp<24)return melee(u,'Dimensional Reprisal');
  const action=originalChoose(u);
  if(action.healing){const allies=battle.enemies.filter(e=>e.hp>0);action.target=allies.slice().sort((a,b)=>a.hp/a.max-b.hp/b.max)[0]||u;}
  if(!action.finisherToken&&!action.healing&&action.kind==='magic'&&!u.whirlpoolState?.pending&&!u.whirlpoolState?.recovery&&(u.actionsTaken||0)%4===1)return melee(u,'Dimensional Reprisal');
  return action;
 };
 const originalEffect=makeEnemyBattleEffect;
 makeEnemyBattleEffect=function(u,target,action){const fx=originalEffect.apply(this,arguments);if(!fx||!u.whirlpoolKey&&!u.whirlpoolMinion)return fx;
  fx.whirlpoolSource=u;fx.whirlpoolAction=action;fx.whirlpoolTarget=target;
  if(action.healing||action.kind==='buff'||action.kind==='cleanse'){fx.whirlpoolSupport=action.healing?'heal':'buff';fx.whirlpoolRecipients=action.allAllies?battle.enemies.filter(e=>e.hp>0):[battle.enemies.includes(action.target)?action.target:u];}
  else if(action.kind==='melee'&&battle.party.includes(target))fx.whirlpoolMelee={from:enemyBattlePosition(battle.enemies.indexOf(u),battle.enemies.length),to:partyBattlePosition(battle.party.indexOf(target),battle.party.length)};
  else if(u.whirlpoolMinion)fx.whirlpoolMinionVfx=u.whirlpoolMinion;
  return fx;
 };
 function motion(u,fx=effect,now=performance.now()){
  if(!fx?.whirlpoolMelee||fx.whirlpoolSource!==u)return null;
  const m=fx.whirlpoolMelee,t=fx.timing||battleActionTiming('melee'),age=now-fx.startedAt,impact=t.impactMs,total=t.totalMs||impact+560;
  if(age<0||age>=total)return null;
  let p;if(age<impact*.80){const v=Math.min(1,age/(impact*.80));p=v*v*(3-2*v);}else if(age<impact+100)p=1;else{const v=Math.min(1,(age-impact-100)/Math.max(1,total-impact-100));p=1-v*v*(3-2*v);}
  const endX=m.to[0]+24,endY=m.to[1],jump=u.whirlpoolMinion==='gloamknife'||u.whirlpoolKey==='felinus';
  return {dx:(endX-m.from[0])*p,dy:(endY-m.from[1])*p-(jump?Math.sin(Math.PI*p)*8:0)};
 }
 const originalDraw=drawAnimatedEnemy;
 drawAnimatedEnemy=function(u,x,y){
  const move=motion(u);if(move){x+=move.dx;y+=move.dy;}
  if(!u.whirlpoolMinion)return originalDraw(u,x,y);
  const s=meta?.sheets[u.whirlpoolMinion],im=images[u.whirlpoolMinion];if(!loaded||!s||!im)return false;
  const dying=u.hp<=0||u.anim==='death',attacking=u.anim==='attack',row=dying?3:attacking?(u.attackStyle==='melee'?1:2):0;
  let frame;if(!dying&&!attacking){const times=[600,280,430,280,680,330],order=[0,1,2,1,0,3];let t=(performance.now()+u.name.length*91)%2600,i=0;while(i<5&&t>=times[i])t-=times[i++];frame=order[i];}else frame=Math.min(3,Math.floor((dying?Math.max(0,tick-(u.deathTick??tick)):u.animTick||0)/7));
  const index=row*4+frame,a=s.anchors[index],scale=specs[u.whirlpoolMinion].height/s.referenceHeight;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(im,frame*s.cell,row*s.cell,s.cell,s.cell,x+8-a[0]*scale,y+31-a[1]*scale,s.cell*scale,s.cell*scale);ctx.restore();
  if(attacking&&u.lastAnimDrawTick!==tick){u.animTick=(u.animTick||0)+1;u.lastAnimDrawTick=tick;}return true;
 };
 const recovered=new WeakSet();
 function onMeleeHit(u,action,damage){
  if(!u?.whirlpoolKey&&!u?.whirlpoolMinion||action?.kind!=='melee'||!(damage>0)||u.hp<=0||recovered.has(action))return '';
  recovered.add(action);const hp=Math.min(u.max-u.hp,Math.max(1,Math.round(u.max*.03))),mp=Math.min(u.maxmp-u.mp,Math.max(1,Math.round(u.maxmp*.06)));u.hp+=hp;u.mp+=mp;
  if(hp)addBattleFloater(u,hp,{kind:'heal'});if(mp)addBattleFloater(u,mp,{kind:'mp',text:'+'+mp+' MP'});
  return hp||mp?` ${u.name}: melee recovery +${hp} HP / +${mp} MP.`:'';
 }
 const oldDrawEffect=drawEffect;
 drawEffect=function(){const fx=effect;if(!loaded||!fx||!fx.whirlpoolSupport&&!fx.whirlpoolMelee&&!fx.whirlpoolMinionVfx)return oldDrawEffect();
  const age=performance.now()-fx.startedAt,t=fx.timing||battleActionTiming(fx.kind),impact=t.impactMs,total=t.totalMs||impact+560;
  ctx.save();ctx.beginPath();ctx.rect(0,20,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT-20);ctx.clip();ctx.imageSmoothingEnabled=true;
  const paint=(key,frame,x,y,w,h=w)=>{const s=meta.sheets[key];ctx.drawImage(images[key],frame*s.cell,0,s.cell,s.cell,x-w/2,y-h/2,w,h);};
  if(fx.whirlpoolSupport){const start=impact-260,duration=Math.min(800,total-start),p=(age-start)/duration;if(p>=0&&p<1){ctx.globalAlpha=Math.min(1,p*8,(1-p)*7)*.98;for(const u of fx.whirlpoolRecipients||[]){const i=battle.enemies.indexOf(u);if(i<0||u.hp<=0)continue;const [x,y]=enemyBattlePosition(i,battle.enemies.length),b=BattleCommandUI.boundsFor(u),h=Math.min(125,Math.max(50,(b?.height||48)*1.5)),w=Math.min(115,Math.max(45,(b?.width||32)*1.9));ctx.drawImage(support[fx.whirlpoolSupport],Math.min(7,Math.floor(p*8))*256,0,256,256,x-w/2,y-h*.83,w,h);}}}
  else if(fx.whirlpoolMelee){const p=(age-impact+100)/420;if(p>=0&&p<1){const target=fx.whirlpoolTarget,i=battle.party.indexOf(target);if(i>=0){const [x,y]=partyBattlePosition(i,battle.party.length);ctx.globalAlpha=Math.min(1,p*7,(1-p)*5);paint('slash',Math.min(3,Math.floor(p*4)),x,y-23,52);}}}
  else{const key=fx.whirlpoolMinionVfx;if(key==='riftcaller'){const p=(age-impact+120)/500;if(p>=0&&p<1){ctx.globalAlpha=Math.min(1,p*6,(1-p)*5);paint('magic',Math.min(3,Math.floor(p*4)),fx.toX,fx.toY,62);}}
   else if(age<impact){const p=Math.min(1,age/impact),x=fx.fromX+(fx.toX-fx.fromX)*p,y=fx.fromY+(fx.toY-fx.fromY)*p-Math.sin(p*Math.PI)*10;paint('projectile',Math.min(1,Math.floor(p*2)),x,y,35);}
   else{const p=(age-impact)/400;if(p<1){ctx.globalAlpha=1-p;paint('projectile',2+Math.min(1,Math.floor(p*2)),fx.toX,fx.toY,42);}}
  }
  ctx.restore();if(age>=total&&effect===fx)effect=null;
 };
 TinusWhirlpool.ready=Promise.all([TinusWhirlpool.ready,ready]);
 ready.then(()=>{const button=el.menuBody.querySelector('[data-whirlpool-start]'),id=Number(el.menuBody.querySelector('[data-whirlpool-select].is-selected')?.dataset.whirlpoolSelect);if(button&&loaded&&TinusWhirlpool.available(id)&&state.activeParty.length)button.disabled=false;});
 window.WhirlpoolMinions={ready,formation,makeMinion,specs,pairs,motion,onMeleeHit,get loaded(){return loaded;},get failure(){return failure;}};
})();
