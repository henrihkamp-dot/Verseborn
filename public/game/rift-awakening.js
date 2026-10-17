// Heart of the Vortex epilogue. Cinematic staging never changes party loadouts,
// coordinates, recruitment, rewards or progression during a Memories replay.
(() => {
  'use strict';
  const BASE='assets/rift/awakening-250/',MAP='emberRiftVault',memoryId='rift-stone-sleeper-awakening';
  let story,art,scene=null,loaded=false,opening=false,overlay,film,g,speaker,text,nextButton,raf,rumble;
  const images={},masks=[];
  const load=(key,file)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[key]=image;resolve(image);};image.onerror=()=>reject(Error('Awakening asset missing: '+file));image.src=file;});
  const ready=Promise.all([fetch('rift-awakening-story.json?v=250').then(r=>{if(!r.ok)throw Error('Awakening script unavailable');return r.json();}).then(data=>story=data),fetch(BASE+'manifest.json').then(r=>{if(!r.ok)throw Error('Awakening art unavailable');return r.json();}).then(async data=>{art=data;await Promise.all([load('dragon',BASE+data.file),load('room','assets/rift/dungeon-room.webp'),load('sleep','assets/rift/sleeping-rock-dragon.webp'),load('portal','assets/rift/portal-sheet.webp'),...data.visions.map((file,i)=>load('vision'+i,BASE+file))]);}),EmberRift.ready,emberHallWorld.ready]).then(()=>{
    for(let i=0;i<4;i++){const image=images['vision'+i],c=document.createElement('canvas');c.width=image.width;c.height=image.height;const p=c.getContext('2d');p.drawImage(image,0,0);p.globalCompositeOperation='source-atop';p.fillStyle='#6b38aa20';p.fillRect(0,0,c.width,c.height);p.globalCompositeOperation='destination-in';p.save();p.translate(c.width/2,c.height/2);p.scale(c.width/2,c.height/2);const fade=p.createRadialGradient(0,0,.48,0,0,1);fade.addColorStop(0,'#fff');fade.addColorStop(.78,'#ffffffb0');fade.addColorStop(1,'#fff0');p.fillStyle=fade;p.fillRect(-1,-1,2,2);p.restore();masks.push(c);}
    loaded=true;maybeStart();
  });ready.catch(error=>console.error(error));
  const eligible=()=>state.gameMode==='hallBattles'&&EmberRift.progress().cleared.includes(10);
  function makeOverlay(){
    if(overlay)return;
    const style=document.createElement('style');style.textContent=`
      .rift-story{position:absolute;inset:0;z-index:95;display:flex;flex-direction:column;justify-content:center;background:#100d17;color:#f6e2bc;font-family:Georgia,serif;padding:10px;gap:8px;box-sizing:border-box}
      .rift-story[hidden]{display:none}.rift-story-stage{position:relative;min-height:0;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#100d17}
      .rift-story canvas{width:100%;height:100%;max-height:100%;object-fit:contain;aspect-ratio:640/356}
      .rift-story-title{position:absolute;top:10px;left:12px;font-size:clamp(12px,1.5vw,20px);letter-spacing:.05em;color:#ffe0a3;text-shadow:0 2px 5px #000}
      .rift-story-dialogue{flex:0 0 auto;min-height:130px;border:1px solid #b58b4e;border-radius:7px;background:linear-gradient(125deg,#241b27,#15121d);padding:14px 18px;box-shadow:inset 0 0 20px #8b62331c;display:grid;grid-template-columns:1fr auto;gap:8px 16px}
      .rift-story-speaker{color:#f2bd69;font-weight:bold;font-size:clamp(15px,1.6vw,22px)}.rift-story-line{grid-column:1/-1;margin:0;font-size:clamp(15px,1.6vw,22px);line-height:1.45;min-height:2.9em}
      .rift-story-controls{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:16px}.rift-story button{font:inherit;color:#f5d49b;background:linear-gradient(#42303b,#211924);border:1px solid #b88a4a;border-radius:4px;padding:7px 15px;cursor:pointer}.rift-story button:disabled{opacity:.45;cursor:default}.rift-story .rift-story-skip{font-size:13px;background:transparent;color:#c5b59f;border-color:#67513e}
      @media(max-width:600px){.rift-story{padding:5px;gap:4px}.rift-story-dialogue{padding:9px 11px;min-height:145px}.rift-story-title{font-size:12px}.rift-story-line{font-size:15px}}
    `;document.head.append(style);
    overlay=document.createElement('section');overlay.className='rift-story';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','The Flame That Remembers');
    overlay.innerHTML=`<div class="rift-story-stage"><canvas width="1280" height="712" aria-label="The Stone Sleeper awakens in the Ember Rift"></canvas><span class="rift-story-title">The Flame That Remembers</span></div><div class="rift-story-dialogue"><strong class="rift-story-speaker"></strong><p class="rift-story-line" aria-live="polite"></p><div class="rift-story-controls"><button class="rift-story-skip" type="button">Skip scene</button><button class="rift-story-next" type="button">Continue ›</button></div></div>`;
    document.querySelector('.game').append(overlay);film=overlay.querySelector('canvas');g=film.getContext('2d');speaker=overlay.querySelector('.rift-story-speaker');text=overlay.querySelector('.rift-story-line');nextButton=overlay.querySelector('.rift-story-next');nextButton.onclick=()=>next();overlay.querySelector('.rift-story-skip').onclick=()=>finish();
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
    speaker.textContent=beat.speaker;text.textContent=beat.text||'The cavern stirs…';nextButton.textContent=index===story.beats.length-1?'Return to the cavern':'Continue ›';nextButton.disabled=true;
  }
  async function start({replay=false}={}){
    if(scene||opening||!eligible()||mode==='battle'||mode==='battleResult')return false;opening=true;
    try{await ready;if(!loaded||scene||!eligible())return false;makeOverlay();
      const original={mode,menuTab,menuHidden:el.menu.classList.contains('hidden'),dialogueHidden:el.dialogue.classList.contains('hidden'),focus:document.activeElement};
      clearTimeout(saveTimer);heldDirection=null;fieldDestination=null;emberHallWorld.clearNavigation();emberHallWorld.hideAmbientChat();
      scene={index:0,replay,original,phase:null,clock:0,last:performance.now(),beatAt:0,phaseAt:0,vision:-1,previousVision:-1,visionAt:0,impactAt:0};
      mode='riftScene';el.menu.classList.add('hidden');el.dialogue.classList.add('hidden');overlay.hidden=false;setBeat(0);updateMusic();startAudio();nextButton.focus();raf=requestAnimationFrame(frame);return true;
    }catch(error){console.error(error);showHudNotice('The memory could not load. It will be available when you return to the cavern.');return false;}finally{opening=false;}
  }
  function maybeStart(){if(loaded&&!scene&&!opening&&eligible()&&!EmberRift.progress().awakeningSeen&&state.map===MAP&&mode==='walk')return start();return false;}
  function next(force=false){if(!scene)return false;const beat=story.beats[scene.index];if(!force&&scene.clock-scene.beatAt<(beat.minMs||0))return false;setBeat(scene.index+1);return true;}
  function finish(){
    if(!scene)return false;const current=scene,original=current.original;cancelAnimationFrame(raf);stopAudio();scene=null;overlay.hidden=true;
    if(!current.replay){const p=EmberRift.progress();p.awakeningSeen=true;p.awakeningPending=false;}
    mode=original.mode;menuTab=original.menuTab;el.menu.classList.toggle('hidden',original.menuHidden);el.dialogue.classList.toggle('hidden',original.dialogueHidden);heldDirection=null;
    if(mode==='menu')renderMenu();updatePanels();updateMusic();if(!current.replay){saveGame(hallSaveKey());showHudNotice('Memory unlocked: The Flame That Remembers.');}else queueSave();original.focus?.focus?.();return true;
  }
  function dragonPose(context,pose,x,baseline,width,now,life=false){
    if(!loaded)return;const scale=width/art.referenceWidth;
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
    if(index<0)return;g.save();g.globalAlpha=alpha;g.globalCompositeOperation='screen';g.translate(x,y+Math.sin(now/2300+index)*1.3);g.drawImage(masks[index],-w/2,-h/2,w,h);g.restore();
    for(let j=0;j<9;j++){const t=(now/9000+j/9)%1;particle(g,x-w*.45+t*w*.9,y+Math.sin(t*7+index)*h*.45,2+j%3,'#d3b2ff',alpha*.23);}
  }
  function paint(now){
    const phase=scene.phase,t=scene.clock,phaseT=(t-scene.phaseAt)/1000,quake=quakeLevel();g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,640,356);g.fillStyle='#100d17';g.fillRect(0,0,640,356);g.save();g.translate(Math.sin(t*.041)*quake*1.7,Math.sin(t*.057)*quake*1.1);g.drawImage(images.room,0,0,640,356);
    if(phase==='memory'){g.fillStyle='#21132938';g.fillRect(0,0,640,356);const v=scene.vision,fade=Math.min(1,(t-scene.visionAt)/1100);if(scene.previousVision>=0)vision(scene.previousVision,314,67,184,75,.25,now);vision(v,479,133,262,111,.78*fade,now);if(v>=2)vision(0,270,249,180,74,.20,now);if(v===3)vision(2,484,248,206,82,.32,now);}
    const portal=images.portal,cw=portal.width/4;g.globalAlpha=.65;g.drawImage(portal,Math.floor(t/220)%4*cw,0,cw,portal.height,281,87,78,111);g.globalAlpha=1;
    const pose=phase==='tremor'?0:phase==='stir'?1:['warning','arrival','essence'].includes(phase)?2:3;
    const lift=phase==='stir'?Math.min(3,phaseT*1.4):['warning','arrival','essence'].includes(phase)?3:0;
    dragonPose(g,pose,-15,192-lift,211,now,pose>0);
    const alarm=quake>.15;brother('merchant',alarm?270+Math.sin(t/450)*2:269,197,now,alarm);brother('guide',alarm?376:373,194,now,alarm);
    actor('Torren',243,252,43,now,alarm);actor('Seerin',211,227,44,now,alarm);actor('Mira',294,249,35,now,alarm);actor('Kael',370,254,40,now,alarm);actor('Glimmer',405,238,32,now,alarm);actor('Verseborn',319,276,41,now,false);
    if(phase==='warning'&&state.party.includes('Kael')){g.strokeStyle='#dac0ff66';g.lineWidth=1.2;g.beginPath();g.ellipse(301,234,112,35,0,Math.PI,Math.PI*2);g.stroke();}
    if(['arrival','essence','calm','memory','restored'].includes(phase)){
      const p=phase==='arrival'?Math.min(1,phaseT/4):1,e=p*p*(3-2*p),x=320-109*e,y=335-136*e-Math.sin(p*Math.PI)*42+(p===1?Math.sin(now/850)*1.4:0),image=emberHallWorld.images.Sparky,col=phase==='arrival'?[2,3,4,3][Math.floor(now/160)%4]:0;
      // The exact Ember Hall sprite and proportions, travelling from its doorway.
      if(image)g.drawImage(image,col*image.width/8,3*image.height/5,image.width/8,image.height/5,x-18,y-36,36,36);
      const essence=phase==='arrival'?Math.max(0,(p-.65)/.35):1;for(let j=0;j<16;j++){const a=(now/2400+j/16)%1;particle(g,x-20-a*69,y-22-Math.sin(a*Math.PI)*30,3+(j%3),'#c696ff',essence*.32);}
      if(phase!=='arrival'){g.strokeStyle='#c7a0ff66';g.lineWidth=1;g.beginPath();g.moveTo(x-8,y-18);g.bezierCurveTo(x-42,y-53,138,143,130,126);g.stroke();}
    }
    // Falling stones use individual deterministic paths, distinct impacts and
    // dust plumes; no bouncing sprites or changing body scale sells the quake.
    if(quake>.01){for(let j=0;j<20;j++){const cycle=2100+(j%5)*210,age=(t+j*337)%cycle/cycle,x=42+(j*73)%554,end=170+(j*29)%145,y=-22+age*age*(end+22);g.save();g.translate(x,y);g.rotate(age*(j%2?2:-2));g.fillStyle=j%2?'#726451':'#9a8768';g.beginPath();g.moveTo(-3,-3);g.lineTo(2,-4);g.lineTo(4,1);g.lineTo(0,4);g.lineTo(-4,1);g.closePath();g.globalAlpha=quake;g.fill();g.restore();if(age>.82){g.fillStyle=`rgba(173,151,119,${(1-age)*quake*.7})`;g.beginPath();g.ellipse(x,end,(age-.82)*72,3,0,0,Math.PI*2);g.fill();}}
      for(let j=0;j<12;j++){const age=(t/4800+j/12)%1;g.fillStyle=`rgba(207,184,143,${Math.sin(age*Math.PI)*.10*quake})`;g.beginPath();g.ellipse(35+j*51,65+age*250,7+age*7,2+age*2,0,0,Math.PI*2);g.fill();}
      if(t-scene.impactAt>1100&&!document.hidden){scene.impactAt=t;playSfx('hit',.12*quake);}
    }
    if(['calm','memory','restored'].includes(phase))for(let j=0;j<22;j++){const a=(now/15000+j/22)%1;particle(g,70+(j*97)%520,310-a*225,2.5,'#e3c781',Math.sin(a*Math.PI)*.24);}
    g.restore();if(rumble)rumble.gain.gain.setTargetAtTime(musicMuted||document.hidden?0:quake*.13,rumble.ac.currentTime,.15);
  }
  function frame(now){if(!scene)return;const dt=document.hidden?0:Math.min(100,Math.max(0,now-scene.last));scene.last=now;scene.clock+=dt;paint(now);const beat=story.beats[scene.index],elapsed=scene.clock-scene.beatAt;nextButton.disabled=elapsed<(beat.minMs||0);if(beat.auto&&elapsed>=beat.minMs)next();if(scene)raf=requestAnimationFrame(frame);}
  const oldSave=saveGame,oldTrack=trackForScene,oldMemories=sceneMemoriesHtml,oldReplay=replayRecruitScene,oldControl=handleControl;
  saveGame=function(...args){return scene?false:oldSave(...args);};
  trackForScene=function(){return scene?'cutscene':oldTrack();};
  sceneMemoriesHtml=function(){const html=oldMemories();if(!eligible())return html;const card=`<div class="scene-memory-grid"><section class="scene-memory-group scene-memory-hall"><strong>Ember Rift</strong><div><button type="button" data-replay-scene="${memoryId}">The Flame That Remembers</button></div></section></div>`;return html.replace(/<\/section>$/,card+'</section>');};
  replayRecruitScene=function(id){return id===memoryId?start({replay:Boolean(EmberRift.progress().awakeningSeen)}):oldReplay(id);};
  handleControl=function(control){if(scene){if(control==='confirm')next();else if(control==='cancel')finish();else if(['music','fullscreen'].includes(control))oldControl(control);return;}return oldControl(control);};
  document.addEventListener('keydown',event=>{if(!scene||event.key==='Tab')return;event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;if(['Enter',' ','ArrowRight','e'].includes(event.key))next();else if(event.key==='Escape')finish();},true);
  window.RiftAwakening={ready,start,maybeStart,next,finish,drawDragon,get active(){return Boolean(scene);},get phase(){return scene?.phase||null;},get script(){return story;},get beat(){return scene?.index??-1;},previewBeat(index){if(scene&&Number.isInteger(index)&&index>=0&&index<story.beats.length){setBeat(index);scene.clock+=2000;paint(performance.now());return true;}return false;}};
})();

