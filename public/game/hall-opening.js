// Historical Hall opening: transient staging never recruits its guest or moves saved actors.
(() => {
  'use strict';
  const ID='ember-hall-welcome',BASE='assets/hall/opening-254/',art={};
  let story,manifest,scene=null,opening=false,settingLine=false,raf;
  const load=(name,url)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{art[name]=image;resolve();};image.onerror=()=>reject(Error('Opening asset missing: '+url));image.src=url;});
  const ready=Promise.all([fetch('hall-opening-story.json?v=254').then(r=>{if(!r.ok)throw Error('Opening script unavailable');return r.json();}).then(data=>story=data),fetch(BASE+'manifest.json').then(r=>r.json()).then(data=>manifest=data),load('construction',BASE+'construction.webp'),load('tools',BASE+'tools.webp'),load('seated',BASE+'glimmer-seated.webp'),load('verseSeat','assets/hall/opening-288/bar-seating.webp'),load('barStool','assets/hall/opening-288/bar-stool.webp'),load('stoolClean','assets/hall/opening-288/stool-clean-plate.webp'),load('assemblies','assets/hall/glimmer-repair-props-v244.webp'),load('lab','assets/hall/glimmer-lab-v244.webp'),load('hover','assets/hall/glimmer-hover-v244.webp'),load('door','assets/rift/hall-closed-door-crop.webp'),...['Verseborn','Marla','Glimmer'].map(id=>load('portrait-'+id,portraitSources[id]))]);
  ready.catch(error=>console.error(error));
  function drawMachine(context,image,x,baseline,width,height,now=performance.now()){
    if(window.ResonanceMachine?.ready)return ResonanceMachine.draw(context,image,x,baseline,width,height,now);
    if(!image)return;
    const cell=image.width/4;
    // The housing never swaps between differently drawn or differently sized frames.
    context.drawImage(image,0,0,cell,image.height,x-width/2,baseline-height,width,height);
    context.save();context.globalCompositeOperation='screen';
    const pulse=.10+.035*Math.sin(now/570)+.018*Math.sin(now/173),fx=x-width*.03,fy=baseline-height*.25;
    const light=context.createRadialGradient(fx,fy,0,fx,fy,width*.14);light.addColorStop(0,`rgba(255,154,37,${pulse})`);light.addColorStop(1,'#ff9a2500');context.fillStyle=light;context.fillRect(fx-width*.14,fy-width*.14,width*.28,width*.28);
    context.restore();
    context.save();context.textAlign='center';context.font=`bold ${Math.max(5,width*.075)}px Georgia`;
    for(let j=0;j<3;j++){const age=(now/6400+j/3)%1;context.globalAlpha=Math.sin(age*Math.PI)*.65;context.fillStyle=j%2?'#dc9bff':'#c782ef';context.fillText(j%2?'♫':'♪',x+width*.02+Math.sin(age*5+j)*width*.11,baseline-height*.91-age*height*.14);}
    for(let j=0;j<3;j++){const age=(now/5200+j/3)%1;context.globalAlpha=Math.sin(age*Math.PI)*.13;context.strokeStyle='#ddd1be';context.lineWidth=width*.025;context.beginPath();const sx=x+width*.24,sy=baseline-height*.71-age*height*.17;context.moveTo(sx,sy);context.bezierCurveTo(sx+width*.07,sy-height*.04,sx-width*.04,sy-height*.08,sx+width*.025,sy-height*.12);context.stroke();}
    context.restore();
  }
  function sound(kind,volume=.3){if(!document.hidden)playSfx(kind,volume);}
  function setBeat(index){
    if(!scene)return;if(index>=story.beats.length)return finish();
    scene.index=index;scene.beatAt=scene.clock;scene.soundKey=-1;const beat=story.beats[index];
    if(beat.stage>scene.stage){scene.stage=beat.stage;scene.buildAt=scene.clock;}
    if(beat.departBar){scene.departAt=scene.clock;scene.verseSitAt=scene.clock;}
    if(beat.stage===5&&beat.shot==='wide'&&scene.verseSitAt!==null&&scene.verseRiseAt===null)scene.verseRiseAt=scene.clock;
    if(beat.shot==='snap'){sound('block',.65);sound('hit',.55);}
    if(beat.shot==='listen')sound('magic',.4);
    settingLine=true;try{if(beat.text)showTalk([[beat.speaker,beat.text]],{portraits:[beat.speaker],skippable:true});else{mode='hallOpening';el.dialogue.classList.add('hidden');}}finally{settingLine=false;}
    paint(performance.now());
  }
  async function start({replay=false,after=null}={}){
    if(scene||opening||state.gameMode!=='hallBattles'||mode==='battle'||mode==='battleResult')return false;
    opening=true;const original={mode,menuTab,activePoint,menuHidden:el.menu.classList.contains('hidden'),tabsHidden:document.querySelector('.menu-tabs').classList.contains('hidden'),dialogueHidden:el.dialogue.classList.contains('hidden'),focus:document.activeElement};
    heldDirection=null;fieldDestination=null;mode='hallOpening';el.menu.classList.add('hidden');el.dialogue.classList.add('hidden');
    try{
      await ready;await new Promise((resolve,reject)=>{const until=performance.now()+15000;const poll=()=>emberHallWorld.ready&&window.HallLiveliness?.ready?resolve():performance.now()>until?reject(Error('Hall actors not ready')):setTimeout(poll,50);poll();});
      clearTimeout(saveTimer);emberHallWorld.clearNavigation();emberHallWorld.hideAmbientChat();activePoint=null;
      scene={replay,after,original,index:0,stage:0,clock:0,last:performance.now(),beatAt:0,buildAt:0,soundKey:-1,departAt:null,verseSitAt:null,verseRiseAt:null};document.querySelector('.game').classList.add('hall-opening-active');setBeat(0);updateMusic();raf=requestAnimationFrame(frame);return true;
    }catch(error){console.error(error);mode=original.mode;el.menu.classList.toggle('hidden',original.menuHidden);showHudNotice('The opening could not load. It remains available in Memories.');if(after)after();return false;}finally{opening=false;}
  }
  function next(force=false){if(!scene)return false;const beat=story.beats[scene.index];if(!force&&scene.clock-scene.beatAt<(beat.minMs||450))return false;setBeat(scene.index+1);return true;}
  function finish(){
    if(!scene)return false;const current=scene;scene=null;cancelAnimationFrame(raf);document.querySelector('.game').classList.remove('hall-opening-active');
    talkQueue=[];talkAfter=null;talkPortraits=[];talkSkippable=false;el.dialogueSkip.classList.add('hidden');renderDialoguePortraits();
    if(!current.replay){hallBattleProgress().openingComplete=true;const history=loadRecruitSceneHistory();if(!history.seen.includes(ID))history.seen.push(ID);history.lastByRecruit.Verseborn=ID;saveRecruitSceneHistory(history);}
    const o=current.original;mode=current.replay||o.mode==='menu'?o.mode:'walk';menuTab=o.menuTab;activePoint=o.activePoint;el.menu.classList.toggle('hidden',o.menuHidden);document.querySelector('.menu-tabs').classList.toggle('hidden',o.tabsHidden);el.dialogue.classList.toggle('hidden',current.replay?o.dialogueHidden:true);
    const hint=document.querySelector('.dialogue-continue');if(hint)hint.style.visibility='';
    if(mode==='menu')renderMenu();updatePanels();updateMusic();if(!current.replay)saveGame(hallSaveKey());o.focus?.focus?.();if(current.after)current.after();return true;
  }
  function drawGlimmer(x,y,pose,now,direction=1){
    const size=30;
    if(pose==='sit'){const frame=story.beats[scene.index].speaker==='Glimmer'?2:now%7300>7100?3:Math.floor(now/2600)%2;ctx.drawImage(art.seated,frame*100,0,100,100,x-size/2,y-size*.94,size,size);return;}
    const hovering=['fly','eureka','ponder','hover-wrench','hover-tinker'].includes(pose),thinking=['eureka','ponder'].includes(pose),image=thinking?art.hover:art.lab,cell=image.width/4,row=pose==='fly'?direction:thinking?(direction?5:2):pose.includes('wrench')?3:2,frame=pose==='eureka'?2:pose==='ponder'?(Math.floor(now/950)%5===4?1:0):Math.floor(now/(pose==='fly'?145:190))%4;
    ctx.save();ctx.translate(x,y);if(!thinking&&pose!=='fly'&&direction===0)ctx.scale(-1,1);ctx.drawImage(image,frame*cell,row*cell,cell,cell,-size/2,-size*.94,size,size);
    if(hovering){const pulse=.6+.2*Math.sin(now*.043)+.15*Math.sin(now*.079),heel=pose.startsWith('hover-')?-size*.03:-size*.18;ctx.globalCompositeOperation='screen';ctx.globalAlpha=.5;ctx.fillStyle='#a8eaff';for(const bx of [-size*.10,size*.08]){ctx.beginPath();ctx.moveTo(bx-1,heel);ctx.lineTo(bx+1,heel);ctx.lineTo(bx,heel+3+pulse*4);ctx.closePath();ctx.fill();}}ctx.restore();
  }
  // Every destination is a machine fitting or a visible temporary workbench.
  const workStops=[{x:283,y:144,pose:'hover-wrench'},{x:348,y:141,pose:'hover-wrench'},{x:313,y:163,pose:'hover-tinker'},{x:291,y:105,pose:'hover-wrench'},{x:343,y:102,pose:'hover-tinker'},{x:390,y:177,pose:'hover-wrench'},{x:285,y:144,pose:'hover-wrench'},{x:349,y:139,pose:'hover-tinker'}];
  function glimmerPosition(now){
    const beat=story.beats[scene.index];if(scene.departAt===null&&scene.stage===0)return{x:501,y:183,pose:'sit',direction:0};
    if(beat.shot==='leave'){const t=Math.min(1,(scene.clock-scene.beatAt)/4300),e=t*t*(3-2*t);return{x:357+(400-357)*e,y:154-135*e-Math.sin(t*Math.PI)*10,pose:'fly',direction:1,alpha:Math.min(1,(1-t)*4)};}
    if(scene.stage===5&&beat.shot!=='build')return{x:357,y:154,pose:'eureka',direction:0};
    const time=Math.max(0,scene.clock-(scene.departAt||0)),duration=6500,turn=Math.floor(time/duration),leg=turn%workStops.length,phase=time%duration,to=workStops[leg],from=turn===0?{x:491,y:181}:workStops[(leg+workStops.length-1)%workStops.length],flying=phase<1250,t=Math.min(1,phase/1250),ease=t*t*(3-2*t),pondering=phase>=1250&&phase<2300,eureka=phase>=2300&&phase<2700;
    return{x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease-(flying?Math.sin(t*Math.PI)*10:7+Math.sin(time/600)*.5),pose:flying?'fly':pondering?'ponder':eureka?'eureka':to.pose,direction:flying?(to.x>from.x?1:0):(to.x<315?1:0),working:!flying&&!pondering&&!eureka};
  }
  function versebornPose(){
    const seated=scene.verseSitAt!==null,age=seated?scene.clock-scene.verseSitAt:0,ease=t=>t*t*(3-2*t);
    if(scene.verseRiseAt!==null){const rise=scene.clock-scene.verseRiseAt;if(rise<600)return{x:501,y:rise<300?183:197,frame:rise<300?1:0,pose:'standing-up'};const t=Math.min(1,(rise-600)/1100),e=ease(t);return{x:501-50*e,y:197-7*e,walking:t<1,pose:t<1?'returning':'standing',row:3};}
    if(!seated)return{x:451,y:190,pose:'standing'};
    if(age<1100){const t=ease(Math.min(1,age/1100));return{x:451+50*t,y:190+7*t,walking:true,row:7,pose:'walking-to-stool'};}
    if(age<1800)return{x:501,y:age<1350?197:183,frame:age<1350?0:1,pose:'sitting-down'};
    const talking=story.beats[scene.index].speaker==='Verseborn',frame=talking&&Math.floor((age-1800)/330)%5===0?3:2;
    return{x:501,y:183,frame,pose:'seated'};
  }
  function drawVerseborn(now,singing){
    const v=versebornPose(),size=36;
    if(v.frame>0){const age=scene.clock-scene.verseSitAt,lift=v.pose==='sitting-down'?6*(1-Math.min(1,Math.max(0,(age-1350)/450))):0;ctx.drawImage(art.verseSeat,v.frame*128,0,128,128,477,148+lift,48,48);return;}
    const frame=v.walking?Math.floor(scene.clock/135)%8:8;
    emberHallWorld.drawActor({id:'Verseborn',x:v.x,y:v.y,size,poseFrame:frame},singing?8:v.row??2,singing?Math.floor(now/180)%16:0,{x:0,y:0});
  }
  function drawClutter(stage,now){
    if(!stage)return;const count=stage===5?7:stage*13,workSpots=[[280,174],[365,165],[246,224],[420,211],[340,264],[470,201],[510,88],[140,181],[104,312],[470,326],[325,86],[105,81]];
    for(let j=0;j<count;j++){
      const spot=workSpots[j%workSpots.length],x=spot[0]+((j*17)%37)-18,y=spot[1]+((j*11)%19)-9,index=(j*5+Math.floor(j/12))%manifest.tools,size=[6,9,13,18,25,11,7,30][j%8];ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(j*7)*.8);ctx.drawImage(art.tools,index*64,0,64,64,-size/2,-size/2,size,size);ctx.restore();
      if(j%5===0){ctx.strokeStyle='#966840a0';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x-6,y);ctx.bezierCurveTo(x+10,y-8,x+18,y+13,x+30,y+1);ctx.stroke();}
    }
    // Real illustrated assemblies and winding coils sit where Glimmer stops.
    if(stage<5&&art.assemblies)for(const [i,x,y,size]of [[0,390,177,38],[1,275,163,26],[2,357,161,31],[0,416,207,21]]){const cell=art.assemblies.width/3;ctx.drawImage(art.assemblies,i*cell,0,cell,art.assemblies.height,x-size/2,y-size*.82,size,size);}
  }
  function paint(now){
    if(!scene)return;const beat=story.beats[scene.index],age=scene.clock-scene.beatAt;
    const shot=beat.shot,bar=shot==='bar',safeHeight=LOGICAL_HEIGHT*.74;
    const viewWidth=Math.max(bar?209:390,(bar?116:216)*LOGICAL_WIDTH/safeHeight);
    const view={x:Math.max(0,Math.min(640-viewWidth,(bar?523:430)-viewWidth/2)),y:bar?90:-2,w:viewWidth},scale=LOGICAL_WIDTH/view.w;
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#171018';ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);
    const background=emberHallWorld.images['hall-uninhabited-v239']||emberHallWorld.hallBackground();ctx.drawImage(background,0,0,640,356);ctx.drawImage(art.door,299,0,38,47);ctx.drawImage(art.stoolClean,475,140,65,75);const stoolPose=versebornPose();if(!(stoolPose.frame>0))ctx.drawImage(art.barStool,477,148,48,48);
    if(scene.stage){ctx.fillStyle=`rgba(15,16,35,${scene.stage*.018})`;ctx.fillRect(0,0,640,356);}
    drawClutter(scene.stage,now);
    if(scene.stage>0&&scene.stage<5){const cell=manifest.cell;ctx.drawImage(art.construction,(scene.stage-1)*cell,0,cell,cell,315-64,139-128,128,128);}else if(scene.stage===5)drawMachine(ctx,stageSelectorImage,315,139,92,86,now);
    const speaking=beat.speaker==='Marla',marlaFrame=emberHallWorld.marlaIdleFrame(now);ctx.save();ctx.beginPath();ctx.rect(0,0,640,155);ctx.clip();emberHallWorld.drawActor({id:'Marla',x:529,y:160,size:38},4,speaking?12:marlaFrame,{x:0,y:0});ctx.restore();
    drawVerseborn(now,beat.sing||shot==='listen');
    const g=glimmerPosition(now);ctx.save();ctx.globalAlpha=g.alpha??1;drawGlimmer(g.x,g.y,g.pose,now,g.direction);ctx.restore();
    if(shot==='snap'){
      ctx.fillStyle=age<120?'#cfe9ffba':`rgba(4,4,15,${age<1050?.82:Math.max(0,.82-(age-1050)/650)})`;ctx.fillRect(view.x,view.y,view.w,LOGICAL_HEIGHT/scale);
      if(age<700){ctx.save();ctx.translate(321,83);ctx.rotate(-.12);ctx.font='italic bold 15px Georgia';ctx.textAlign='center';ctx.lineWidth=2;ctx.strokeStyle='#22132c';ctx.strokeText('KRRZZT—POP!',0,0);ctx.fillStyle='#fff1b5';ctx.fillText('KRRZZT—POP!',0,0);ctx.restore();}
    }
    if(shot==='build'){
      const beatKey=Math.floor(age/780),words=['KLANG!','THUD-THUD','KLIK-KLIK','ZZZT!','CLANK!','WHOOOSH!'],word=words[(beatKey+scene.stage)%words.length];
      if(beatKey!==scene.soundKey){scene.soundKey=beatKey;sound(g.pose==='fly'?'magic':g.working?['block','hit','item','magic','block','hit'][(beatKey+scene.stage)%6]:'item',g.working?.22+scene.stage*.025:.10);}
      const fx=age%780/780,caption=g.pose==='fly'?'FSSSH!':g.pose==='ponder'?'Hmm…':g.pose==='eureka'?'AHA!':word;ctx.save();ctx.translate(g.x+16,g.y-29-fx*5);ctx.rotate(beatKey%2?.10:-.12);ctx.globalAlpha=Math.sin(fx*Math.PI);ctx.font='italic bold 9px Georgia';ctx.textAlign='center';ctx.lineWidth=1.5;ctx.strokeStyle='#352137';ctx.strokeText(caption,0,0);ctx.fillStyle='#ffe08f';ctx.fillText(caption,0,0);ctx.restore();
      if(g.working)for(let j=0;j<5;j++){const t=(age/900+j/5)%1;ctx.fillStyle=`rgba(255,205,110,${(1-t)*.7})`;ctx.fillRect(g.x+(j-2)*t*8,g.y-12-t*12+t*t*17,1,1);}
    }
    ctx.restore();
    if(beat.time){ctx.save();ctx.font='bold 8px Georgia';const fontSize=Math.min(8,8*(LOGICAL_WIDTH-30)/ctx.measureText(beat.time).width);ctx.font=`bold ${fontSize}px Georgia`;ctx.textAlign='center';ctx.fillStyle='#17101be8';ctx.fillRect(7,7,LOGICAL_WIDTH-14,22);ctx.strokeStyle='#c9a464';ctx.strokeRect(7,7,LOGICAL_WIDTH-14,22);ctx.fillStyle='#ffe5a9';ctx.fillText(beat.time,LOGICAL_WIDTH/2,21);ctx.restore();}
  }
  function frame(now){if(!scene)return;scene.clock+=document.hidden?0:Math.min(80,Math.max(0,now-scene.last));scene.last=now;const beat=story.beats[scene.index];if(((beat.auto&&!beat.text)||window.CutsceneAutoplay?.enabled)&&scene.clock-scene.beatAt>=(window.CutsceneAutoplay?.delay(beat.text,beat.minMs)||beat.minMs||3200))next(true);if(scene)raf=requestAnimationFrame(frame);}
  const oldDraw=drawTileMap,oldNext=nextTalk,oldSkip=skipTalk,oldSave=saveGame,oldTrack=trackForScene,oldPlay=playRecruitScene,oldControl=handleControl,oldStarting=hallStartingWelcomeScenes;
  drawTileMap=function(...args){return scene?paint(performance.now()):oldDraw(...args);};
  nextTalk=function(...args){return scene&&!settingLine?next():oldNext(...args);};
  skipTalk=function(...args){return scene?finish():oldSkip(...args);};
  saveGame=function(...args){return scene||opening?false:oldSave(...args);};
  trackForScene=function(){return scene?'cutscene':oldTrack();};
  playRecruitScene=function(entry,options={}){return entry?.id===ID?start({replay:Boolean(options.replay),after:options.after}):oldPlay(entry,options);};
  hallStartingWelcomeScenes=function(companions){const scenes=oldStarting(companions);return hallBattleProgress().openingComplete?scenes.filter(entry=>entry.recruit!=='Verseborn'):scenes;};
  handleControl=function(control){if(scene){if(control==='confirm')next();else if(control==='cancel')finish();else if(['music','fullscreen'].includes(control))oldControl(control);return;}return oldControl(control);};
  document.addEventListener('keydown',event=>{if(!scene||event.ctrlKey||event.altKey||event.metaKey||!['Escape','Enter',' ','ArrowRight','e','z','Z'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;if(event.key==='Escape'||event.target?.closest?.('#dialogueSkip')&&['Enter',' '].includes(event.key))finish();else if(['Enter',' ','e','z','Z','ArrowRight'].includes(event.key))next();},true);
  const style=document.createElement('style');style.textContent='.game.hall-opening-active .hud{display:none}';document.head.append(style);
  window.HallOpening={ready,start,next,finish,drawMachine,workStops,get verseborn(){return scene?versebornPose():null;},get glimmer(){return scene?glimmerPosition(performance.now()):null;},get active(){return Boolean(scene);},get beat(){return scene?.index??-1;},get script(){return story;},get stage(){return scene?.stage??-1;},previewBeat(index){if(!scene||!Number.isInteger(index)||!story.beats[index])return false;scene.stage=story.beats[index].stage;if(scene.stage>0){scene.departAt=0;scene.verseSitAt=0;}setBeat(index);scene.clock+=1500;paint(performance.now());return true;}};
})();
