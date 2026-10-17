// Heart of the Vortex epilogue. Cinematic staging never changes party loadouts,
// coordinates, recruitment, rewards or progression during a Memories replay.
(() => {
  'use strict';
  const BASE='assets/rift/awakening-250/',MAP='emberRiftVault',memoryId='rift-stone-sleeper-awakening';
  let details,settingTalk=false;
  let story,art,scene=null,loaded=false,opening=false,overlay,film,g,speaker,text,nextButton,raf,rumble;
  const images={},masks=[];
  const load=(key,file)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[key]=image;resolve(image);};image.onerror=()=>reject(Error('Awakening asset missing: '+file));image.src=file;});
  const ready=Promise.all([fetch('rift-awakening-story.json?v=250').then(r=>{if(!r.ok)throw Error('Awakening script unavailable');return r.json();}).then(data=>story=data),fetch(BASE+'manifest.json').then(r=>{if(!r.ok)throw Error('Awakening art unavailable');return r.json();}).then(async data=>{art=data;await Promise.all([load('dragon',BASE+data.file),load('room','assets/rift/dungeon-room.webp'),load('sleep','assets/rift/sleeping-rock-dragon.webp'),load('portal','assets/rift/portal-sheet.webp'),...data.visions.map((file,i)=>load('vision'+i,BASE+file))]);}),fetch('assets/rift/awakening-251/manifest.json').then(r=>r.json()).then(async data=>{details=data;await Promise.all(Object.entries(data).map(([key,value])=>load(key,'assets/rift/awakening-251/'+value.file)));}),EmberRift.ready,emberHallWorld.ready]).then(()=>{
    for(let i=0;i<4;i++){const image=images['vision'+i],c=document.createElement('canvas');c.width=image.width;c.height=image.height;const p=c.getContext('2d');p.drawImage(image,0,0);p.globalCompositeOperation='source-atop';p.fillStyle='#6b38aa20';p.fillRect(0,0,c.width,c.height);p.globalCompositeOperation='destination-in';p.save();p.translate(c.width/2,c.height/2);p.scale(c.width/2,c.height/2);const fade=p.createRadialGradient(0,0,.70,0,0,1);fade.addColorStop(0,'#fff');fade.addColorStop(.86,'#fffffff0');fade.addColorStop(1,'#fff0');p.fillStyle=fade;p.fillRect(-1,-1,2,2);p.restore();masks.push(c);}
    loaded=true;maybeStart();
  });ready.catch(error=>console.error(error));
  const eligible=()=>state.gameMode==='hallBattles'&&EmberRift.progress().cleared.includes(10);
  function makeOverlay(){
    if(film)return;
    film=document.createElement('canvas');film.width=1280;film.height=712;g=film.getContext('2d');
    const style=document.createElement('style');style.textContent='.game.rift-cinematic .hud{display:none}.rift-lore-topics{display:flex;flex-wrap:wrap;gap:8px}.rift-lore-topics button{font:inherit;color:#ffe2af;background:#302535;border:1px solid #b58b4e;border-radius:5px;padding:7px 12px}';document.head.append(style);
    nextButton={focus(){},set disabled(value){const hint=document.querySelector('.dialogue-continue');if(hint)hint.style.visibility=value?'hidden':'';}};
  }
  function startAudio(){
    if(musicMuted||!musicUnlocked)return;
    const ac=ensureAudioContext();if(!ac)return;const buffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),channel=buffer.getChannelData(0);let low=0;for(let i=0;i<channel.length;i++){low=(low+(Math.random()*2-1)*.025)/1.025;channel[i]=low*4;}
    const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=110;gain.gain.value=.001;source.connect(filter).connect(gain).connect(ac.destination);source.start();rumble={source,gain,ac};
  }
  function stopAudio(){if(rumble){rumble.source.stop();rumble.source.disconnect();rumble.gain.disconnect();rumble=null;}}
  function setBeat(index){
    if(!scene)return;if(index>=story.beats.length)return finish();scene.index=index;scene.beatAt=scene.clock;const beat=story.beats[index];
    if(scene.phase!==beat.phase){scene.phase=beat.phase;scene.phaseAt=scene.clock;if(beat.phase==='calm'&&scene.calmAt===undefined)scene.calmAt=scene.clock;if(beat.phase==='arrival')playSfx('magic',.3);if(beat.phase==='warning')playSfx('boss',.35);}
    if(beat.vision!==undefined&&beat.vision!==scene.vision){scene.previousVision=scene.vision;scene.vision=beat.vision;scene.visionAt=scene.clock;playSfx('magic',.18);}
    settingTalk=true;try{if(beat.text)showTalk([[beat.speaker,beat.text]],{portraits:[],skippable:true});else{mode='riftScene';el.dialogue.classList.add('hidden');}}finally{settingTalk=false;}nextButton.disabled=true;
  }
  async function start({replay=false}={}){
    if(scene||opening||!eligible()||mode==='battle'||mode==='battleResult')return false;opening=true;
    try{await ready;if(!loaded||scene||!eligible())return false;makeOverlay();
      const original={mode,menuTab,activePoint,menuHidden:el.menu.classList.contains('hidden'),dialogueHidden:el.dialogue.classList.contains('hidden'),focus:document.activeElement};
      clearTimeout(saveTimer);heldDirection=null;fieldDestination=null;emberHallWorld.clearNavigation();emberHallWorld.hideAmbientChat();
      scene={index:0,replay,original,phase:null,clock:0,last:performance.now(),beatAt:0,phaseAt:0,vision:-1,previousVision:-1,visionAt:0,impactAt:0};
      mode='riftScene';el.menu.classList.add('hidden');el.dialogue.classList.add('hidden');activePoint=null;document.querySelector('.game').classList.add('rift-cinematic');setBeat(0);updateMusic();startAudio();nextButton.focus();raf=requestAnimationFrame(frame);return true;
    }catch(error){console.error(error);showHudNotice('The memory could not load. It will be available when you return to the cavern.');return false;}finally{opening=false;}
  }
  function maybeStart(){if(loaded&&!scene&&!opening&&eligible()&&!EmberRift.progress().awakeningSeen&&state.map===MAP&&mode==='walk')return start();return false;}
  function next(force=false){if(!scene)return false;const beat=story.beats[scene.index];if(!force&&scene.clock-scene.beatAt<(beat.minMs||0))return false;setBeat(scene.index+1);return true;}
  function finish(){
    if(!scene)return false;const current=scene,original=current.original;cancelAnimationFrame(raf);stopAudio();scene=null;document.querySelector('.game').classList.remove('rift-cinematic');talkQueue=[];talkAfter=null;talkPortraits=[];talkSkippable=false;el.dialogueSkip.classList.add('hidden');renderDialoguePortraits();
    if(!current.replay){const p=EmberRift.progress();p.awakeningSeen=true;p.awakeningPending=false;}
    activePoint=original.activePoint;mode=original.mode;menuTab=original.menuTab;el.menu.classList.toggle('hidden',original.menuHidden);el.dialogue.classList.toggle('hidden',original.dialogueHidden);heldDirection=null;
    if(mode==='menu')renderMenu();updatePanels();updateMusic();if(!current.replay){saveGame(hallSaveKey());showHudNotice('Memory unlocked: The Flame That Remembers.');}else queueSave();original.focus?.focus?.();return true;
  }
  function dragonPose(context,pose,x,baseline,width,now,life=false){
    if(!loaded)return;const scale=width/art.referenceWidth;
    if(life&&pose===3&&details){const speaking=scene?story.beats[scene.index].speaker==='Stone Sleeper':mode==='talk'&&el.speaker.textContent==='Stone Sleeper',cycle=now%7400,frame=cycle<120?4:cycle<240?5:speaking?[0,1,2,1,3,0][Math.floor(now/180)%6]:cycle>5400&&cycle<5750?6:0;const cell=details.face.cell;context.save();context.imageSmoothingEnabled=true;context.drawImage(images.face,frame*cell,0,cell,cell,x-6,baseline-width*1.014,width*1.04,width*1.04);context.restore();return;}
    // All poses retain their neck anchor and fixed scale; breathing changes
    // highlights, never the size of the head or its stone plates.
    context.save();context.imageSmoothingEnabled=true;context.drawImage(images.dragon,pose*art.cellWidth,0,art.cellWidth,art.cellHeight,x-art.left*scale,baseline-art.baseline*scale,art.cellWidth*scale,art.cellHeight*scale);
    if(life){const eyeX=x+width*.69,eyeY=baseline-width*.31,glow=context.createRadialGradient(eyeX,eyeY,1,eyeX,eyeY,width*.12);glow.addColorStop(0,`rgba(205,146,255,${.10+Math.sin(now/1100)*.025})`);glow.addColorStop(1,'#a87aff00');context.fillStyle=glow;context.fillRect(eyeX-width*.12,eyeY-width*.12,width*.24,width*.24);}
    context.restore();
  }
  function drawDragon(now,camera){if(!loaded||!EmberRift.progress().awakeningSeen)return false;dragonPose(ctx,3,-30-camera.x,192-camera.y,198,now,true);for(let j=0;j<9;j++){const a=(now/14000+j/9)%1;particle(ctx,80+j*31-camera.x,220-a*115-camera.y,1.6,'#dbb975',Math.sin(a*Math.PI)*.14);}return true;}
  function particle(context,x,y,r,color,alpha){context.save();context.globalAlpha=alpha;const light=context.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,color);light.addColorStop(1,'#a879ff00');context.fillStyle=light;context.fillRect(x-r,y-r,r*2,r*2);context.restore();}
  function quakeLevel(){const phase=scene.phase,t=(scene.clock-scene.phaseAt)/1000;if(phase==='tremor')return Math.min(1,t/2)*.45;if(phase==='stir')return .7;if(phase==='warning'||phase==='arrival')return 1;if(phase==='essence')return Math.max(.15,1-t/5);if(phase==='calm')return Math.max(0,.4-(scene.clock-scene.calmAt)/2000);return 0;}
  function actor(id,x,y,size,now,alert=false){const image=emberHallWorld.images[id];if(!image)return;const cols=id==='Verseborn'?4:8,rows=id==='Verseborn'?4:5,col=alert&&id!=='Verseborn'?Math.floor(now/260)%3:0,row=id==='Verseborn'?0:alert?3:0;g.drawImage(image,col*image.width/cols,row*image.height/rows,image.width/cols,image.height/rows,x-size/2,y-size*.94,size,size);}
  function brother(key,x,y,now,alarm){const s=EmberRift.npcSheets[key];if(!s)return;const i=alarm?8+Math.floor(now/200)%4:0,cell=s.cells[i],a=s.frameAnchors[i],size=key==='guide'?43:39,scale=size/s.referenceHeight;g.drawImage(s.image,...cell,x-a[0]*scale,y-a[1]*scale,cell[2]*scale,cell[3]*scale);}
  function vision(index,x,y,w,h,alpha,now){
    if(index<0)return;g.save();g.globalAlpha=alpha;g.globalCompositeOperation='source-over';g.translate(x,y+Math.sin(now/2300+index)*1.3);g.drawImage(masks[index],-w/2,-h/2,w,h);g.restore();
    for(let j=0;j<9;j++){const t=(now/9000+j/9)%1;particle(g,x-w*.45+t*w*.9,y+Math.sin(t*7+index)*h*.45,2+j%3,'#d3b2ff',alpha*.23);}
  }
  function paint(now){
    const phase=scene.phase,t=scene.clock,phaseT=(t-scene.phaseAt)/1000,quake=quakeLevel();g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,640,356);g.fillStyle='#100d17';g.fillRect(0,0,640,356);g.save();g.translate(Math.sin(t*.041)*quake*1.7,Math.sin(t*.057)*quake*1.1);g.drawImage(images.room,0,0,640,356);
    if(phase==='memory'){g.fillStyle='#21132938';g.fillRect(0,0,640,356);const v=scene.vision,fade=Math.min(1,(t-scene.visionAt)/1100);if(scene.previousVision>=0)vision(scene.previousVision,314,67,184,75,.25,now);vision(v,455,119,335,140,.97*fade,now);if(v>=2)vision(0,270,249,180,74,.20,now);if(v===3)vision(2,484,248,206,82,.32,now);}
    const portal=images.portal,cw=portal.width/4;g.globalAlpha=.65;g.drawImage(portal,Math.floor(t/220)%4*cw,0,cw,portal.height,281,87,78,111);g.globalAlpha=1;
    const pose=phase==='tremor'?0:phase==='stir'?1:['warning','arrival','essence'].includes(phase)?2:3;
    const lift=phase==='stir'?Math.min(3,phaseT*1.4):['warning','arrival','essence'].includes(phase)?3:0;
    dragonPose(g,pose,-15,192-lift,211,now,pose>0);
    const alarm=quake>.15;brother('merchant',alarm?270+Math.sin(t/450)*2:269,197,now,alarm);brother('guide',alarm?376:373,194,now,alarm);
    actor('Verseborn',319,276,43,now,false);
    if(['arrival','landing','burp','essence','calm','memory','restored'].includes(phase)){
      const flying=phase==='arrival',p=flying?Math.min(1,phaseT/4):1,e=p*p*(3-2*p),x=320-27*e,ground=348-126*e,y=ground-(flying?Math.sin(p*Math.PI)*45+6:0),image=emberHallWorld.images.Sparky;
      if(flying){const cell=details.flight.cell,frame=[0,1,0,2,3,2][Math.floor(t/135)%6];g.save();g.translate(x,y);g.scale(-1,1);g.drawImage(images.flight,frame*cell,0,cell,cell,-29,-49,58,58);g.restore();}
      else if(image){const burp=phase==='burp',row=burp?4:0,col=burp?2:0,settle=phase==='landing'?Math.sin(Math.min(1,phaseT/.7)*Math.PI)*2:0;g.drawImage(image,col*image.width/8,row*image.height/5,image.width/8,image.height/5,x-19,y-38+settle,38,38);}
      if(phase==='burp'){g.save();g.globalAlpha=Math.sin(Math.min(1,phaseT/1.2)*Math.PI)*.6;g.fillStyle='#ceb1ed';g.font='bold 8px Georgia';g.fillText('brrup!',x-38,y-36-phaseT*5);g.restore();}
      if(!flying&&phase!=='landing'&&phase!=='burp')for(let j=0;j<16;j++){const a=(now/2400+j/16)%1;particle(g,x-20-a*69,y-22-Math.sin(a*Math.PI)*30,3+(j%3),'#c696ff',.32);}
    }
    // Falling stones use individual deterministic paths, distinct impacts and
    // dust plumes; no bouncing sprites or changing body scale sells the quake.
    if(quake>.01){for(let j=0;j<24;j++){const cycle=2300+(j%5)*270,age=(t+j*337)%cycle/cycle,x=38+(j*73)%558,end=176+(j*29)%140,size=7+(j%5)*2.5,fall=Math.min(1,age/.78),y=-22+fall*fall*(end+22),cell=details.debris.cell;
      g.save();g.globalAlpha=quake;g.translate(x,y);g.rotate(fall*(j%2?2:-2));g.drawImage(images.debris,(j%12)*cell,0,cell,cell,-size/2,-size/2,size,size);g.restore();
      if(age>.78){const impact=(age-.78)/.22;for(let k=0;k<5;k++){g.save();g.globalAlpha=(1-impact)*quake*.28;g.fillStyle=k%2?'#b9a18a':'#807567';g.beginPath();g.ellipse(x+(k-2)*impact*16,end-3-impact*(5+k),3+impact*8,2+impact*3,.2*k,0,Math.PI*2);g.fill();g.restore();}}
    }if(t-scene.impactAt>950&&!document.hidden){scene.impactAt=t;playSfx('hit',.17*quake);}}
    if(['calm','memory','restored'].includes(phase))for(let j=0;j<22;j++){const a=(now/15000+j/22)%1;particle(g,70+(j*97)%520,310-a*225,2.5,'#e3c781',Math.sin(a*Math.PI)*.24);}
    g.restore();if(rumble)rumble.gain.gain.setTargetAtTime(musicMuted||document.hidden?0:quake*.13,rumble.ac.currentTime,.15);
  }
  function frame(now){if(!scene)return;const dt=document.hidden?0:Math.min(100,Math.max(0,now-scene.last));scene.last=now;scene.clock+=dt;paint(now);const beat=story.beats[scene.index],elapsed=scene.clock-scene.beatAt;nextButton.disabled=elapsed<(beat.minMs||0);if(beat.auto&&elapsed>=beat.minMs)next();if(scene)raf=requestAnimationFrame(frame);}
  const oldDraw=drawTileMap,oldNext=nextTalk,oldSkip=skipTalk;
  drawTileMap=function(...args){if(!scene)return oldDraw(...args);ctx.fillStyle='#100d17';ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);const scale=Math.min(LOGICAL_WIDTH/640,LOGICAL_HEIGHT/356);ctx.drawImage(film,0,0,640*scale,356*scale);};
  nextTalk=function(...args){return scene&&!settingTalk?next():oldNext(...args);};
  skipTalk=function(...args){return scene?finish():oldSkip(...args);};
  const oldSave=saveGame,oldTrack=trackForScene,oldMemories=sceneMemoriesHtml,oldReplay=replayRecruitScene,oldControl=handleControl;
  saveGame=function(...args){return scene?false:oldSave(...args);};
  trackForScene=function(){return scene?'cutscene':oldTrack();};
  sceneMemoriesHtml=function(){const html=oldMemories();if(!eligible())return html;const card=`<div class="scene-memory-grid"><section class="scene-memory-group scene-memory-hall"><strong>Ember Rift</strong><div><button type="button" data-replay-scene="${memoryId}">The Flame That Remembers</button></div></section></div>`;return html.replace(/<\/section>$/,card+'</section>');};
  replayRecruitScene=function(id){return id===memoryId?start({replay:Boolean(EmberRift.progress().awakeningSeen)}):oldReplay(id);};
  handleControl=function(control){if(scene){if(control==='confirm')next();else if(control==='cancel')finish();else if(['music','fullscreen'].includes(control))oldControl(control);return;}return oldControl(control);};
  document.addEventListener('keydown',event=>{if(!scene||event.key==='Tab')return;event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;if(event.target?.closest?.('#dialogueSkip')&&['Enter',' '].includes(event.key))finish();else if(['Enter',' ','ArrowRight','e'].includes(event.key))next();else if(event.key==='Escape')finish();},true);
  const lore={
    'Before Solinar':[['Verseborn','What was it like before Solinar?'],['Stone Sleeper','A shared sky. Dragons carried news between cities. Humans kept our stories in ink, and we kept theirs in flame. We disagreed often. We did not need one voice to belong together.']],
    'The Elder Ember':[['Verseborn','What does Sparky carry?'],['Stone Sleeper','Memory that refused to kneel. Not simply fire, but lives and names Solinar wanted erased. It survived in someone small enough to be overlooked.'],['Stone Sleeper','Do not mistake the little one for a vessel alone. His choices are his own. Care for him, not merely what you hope he can do.']],
    'The Heir':[['Verseborn','The brothers keep speaking of an Heir. What is expected of him?'],['Stone Sleeper','They have fragments, and a great enthusiasm for arranging them. A title is not an answer.'],['Stone Sleeper','If an heir is to bring those voices together, he must first listen. Human and dragon. Living and remembered. Inheritance is a responsibility, not permission to command.']],
    'What comes next':[['Verseborn','What should we do now?'],['Stone Sleeper','Keep the memories alive. Learn what was erased before deciding what must be rebuilt. And when someone offers a perfect world, ask whose voice it costs.'],['Stone Sleeper','Return when you have questions. There is time for a conversation now.']]
  };
  function converse(){if(scene||!EmberRift.progress().awakeningSeen)return false;const topics=()=>{showTalk([['Stone Sleeper',{html:'What would you remember?<div class="rift-lore-topics">'+[...Object.keys(lore),'Rest'].map((name,i)=>'<button type="button" data-dragon-topic="'+i+'">'+name+'</button>').join('')+'</div>'}]],{portraits:[]});el.line.querySelectorAll('[data-dragon-topic]').forEach(button=>button.onclick=event=>{event.stopPropagation();const key=Object.keys(lore)[Number(button.dataset.dragonTopic)];if(key)showTalk(lore[key],{portraits:[],after:topics});else{talkAfter=null;finishTalk();}});};topics();return true;}
  window.RiftAwakening={ready,start,maybeStart,next,finish,drawDragon,converse,get active(){return Boolean(scene);},get phase(){return scene?.phase||null;},get script(){return story;},get beat(){return scene?.index??-1;},previewBeat(index){if(scene&&Number.isInteger(index)&&index>=0&&index<story.beats.length){setBeat(index);scene.clock+=2000;paint(performance.now());return true;}return false;}};
})();

