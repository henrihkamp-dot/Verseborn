// Recruitment vignettes are transient: guests, poses and camera never enter a save.
(() => {
  'use strict';
  const BASE='assets/hall/welcome-302/',art={},guestIds=['Revus','Nyx','Rava','Jory'],ids=['Mira','Torren','Seerin','Kael','Sparky'],coreIds=['Verseborn','Mira','Torren','Seerin','Kael','Sparky','Marli'];
  let stories,scene=null,loading=false,raf,assetsPromise;
  const game=document.querySelector('.game'),overlay=document.createElement('section');
  overlay.className='welcome-film';overlay.hidden=true;overlay.setAttribute('aria-label','Flameguard introduction');
  overlay.innerHTML='<div class="welcome-location"></div><button type="button" class="welcome-skip">Skip scene</button><div class="welcome-caption"><small></small><h2></h2><p></p></div><div class="welcome-dialogue" aria-live="polite"><img class="welcome-portrait" alt=""><div><strong class="welcome-speaker"></strong><p class="welcome-line"></p></div><button type="button" class="welcome-next" aria-label="Continue dialogue">Continue <span>↵</span></button></div><button type="button" class="welcome-auto"></button>';
  game.append(overlay);
  const ui=Object.fromEntries(['location','skip','caption','dialogue','portrait','speaker','line','next','auto'].map(k=>[k,overlay.querySelector('.welcome-'+k)]));
  const oldPlay=playRecruitScene,oldDraw=drawTileMap,oldSave=saveGame,oldControl=handleControl,oldTrack=trackForScene,oldNext=nextTalk,oldSkip=skipTalk;
  const load=(id,url)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[id]=img;resolve();};img.onerror=()=>reject(Error('Welcome image unavailable: '+url));img.src=url;});
  const scripts=fetch('welcome-story.json?v=302').then(r=>{if(!r.ok)throw Error('Welcome scripts unavailable');return r.json();}).then(v=>{stories=v;for(const s of RECRUIT_SCENES)if(ids.includes(s.recruit)&&s.variant==='welcome')s.title=v[s.recruit].title;return v;});
  scripts.catch(console.error);
  function assets(){return assetsPromise??=Promise.all([scripts,...guestIds.flatMap(id=>[load(id,BASE+id.toLowerCase()+'.webp'),load('portrait-'+id,BASE+id.toLowerCase()+'-portrait.webp')]),...coreIds.map(id=>load(id,BASE+id.toLowerCase()+'.webp')),...['central-hall','torren-kitchen','kael-library','sparky-coop'].map(id=>load(id,'assets/scenes/'+id+'.webp')),load('gym',BASE+'gym.webp'),...['register','badge','bandages','ribbon','ledger','stew','blanket','provisions',0,1,2].map(id=>load(id,BASE+(Number.isInteger(id)?'chibi-'+id:id)+'.webp'))]);}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const permitted=(id,roster)=>id==='Verseborn'||id==='Marli'||guestIds.includes(id)||roster.has(id);
  const available=(b,roster)=>(b.requires||[]).every(id=>permitted(id,roster))&&!(b.unless||[]).some(id=>permitted(id,roster));
  function actor(id,x,y,size=86,extra={}){return{id,x,y,size,pose:0,row:0,alpha:1,...extra};}
  function initial(id){
    const verse=(x,y)=>actor('Verseborn',x,y,90,{row:3});
    if(id==='Mira')return[actor('Revus',410,260,90),actor('Mira',320,265,90),verse(185,310)];
    if(id==='Torren')return[actor('Torren',500,282,96),verse(395,285),actor('Marli',175,267,88,{alpha:0})];
    if(id==='Seerin')return[actor('Seerin',330,240,104),actor('Rava',235,273,76,{pose:5}),actor('Nyx',410,270,76),actor('Jory',295,312,72,{pose:5}),verse(515,310)];
    if(id==='Kael')return[actor('Kael',355,264,94),verse(272,280)];
    return[actor('Sparky',340,275,62),verse(282,276),...(scene.full?[actor('Mira',440,283,90,{alpha:0}),actor('Seerin',481,283,104,{alpha:0})]:[])];
  }
  function move(id,x,y,duration=1800,extra={}){const a=scene.actors.find(a=>a.id===id);if(!a)return;a.motion={x:a.x,y:a.y,toX:x,toY:y,points:[[a.x,a.y],...(extra.via||[]),[x,y]],at:scene.clock,duration};Object.assign(a,extra);}
  function add(id,x=435,y=240){if(!permitted(id,scene.roster))return null;let a=scene.actors.find(a=>a.id===id);if(!a){a=actor(id,x,y,id==='Seerin'?104:id==='Glimmer'?68:90);scene.actors.push(a);}return a;}
  function currentPos(a){const m=a.motion;if(!m)return a;const t=clamp((scene.clock-m.at)/m.duration,0,1),lengths=m.points.slice(1).map((p,i)=>Math.hypot(p[0]-m.points[i][0],p[1]-m.points[i][1]));let distance=lengths.reduce((v,n)=>v+n,0)*t;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const from=m.points[i],to=m.points[i+1],f=lengths[i]?Math.min(1,distance/lengths[i]):1,dx=to[0]-from[0],dy=to[1]-from[1];return{...a,x:from[0]+dx*f,y:from[1]+dy*f,walking:t<1,row:Math.abs(dx)>Math.abs(dy)?dx>0?3:2:dy>0?0:1};}distance-=lengths[i];}return a;}
  function settleMoves(){for(const a of scene.actors)if(a.motion){const p=currentPos(a);a.x=p.x;a.y=p.y;if(!p.walking)delete a.motion;}}
  function sfx(id,volume=.22){if(!document.hidden)playSfx(id,volume);}
  function event(name){
    const s=scene;s.event=name;s.effectAt=s.clock;
    const get=id=>s.actors.find(a=>a.id===id);
    switch(name){
      case 'verse-enter': move('Verseborn',s.id==='Seerin'?480:240,s.id==='Seerin'?310:288,2000);break;
      case 'father':get('Revus').pose=2;break;
      case 'register':s.prop='register';get('Revus').pose=1;break;
      case 'revus-leave':get('Revus').pose=5;move('Revus',566,190,3200,{via:[[430,240],[440,200],[520,190]]});sfx('step');break;
      case 'sign':get('Revus').alpha=0;s.prop='register';get('Mira').holdPose=2;break;
      case 'mira-door':get('Mira').holdPose=0;break;
      case 'torren-enter':s.prop='provisions';move('Torren',290,258,2300);sfx('step');break;
      case 'shelf':s.prop='provisions';sfx('block');break;
      case 'marli-enter':get('Marli').alpha=1;move('Marli',235,280,1800);break;
      case 'badge':s.prop='badge';get('Torren').holdPose=1;break;
      case 'cooking':s.prop=null;get('Torren').cooking=true;get('Torren').holdPose=5;move('Torren',310,242,1100);sfx('magic',.12);break;
      case 'stew':get('Torren').cooking=false;get('Torren').holdPose=2;s.prop='stew';break;
      case 'supper':case 'quiet':s.prop='stew';get('Torren').holdPose=2;break;
      case 'mira-enter':add('Mira',493,285);move('Mira',428,285,1800);break;
      case 'practice':get('Seerin').practice=true;get('Seerin').holdPose=5;break;
      case 'farewell':get('Seerin').practice=false;get('Seerin').holdPose=0;get('Jory').pose=2;get('Rava').pose=2;get('Nyx').pose=2;break;
      case 'poster':get('Jory').pose=1;get('Nyx').pose=1;break;
      case 'rava-worry':get('Rava').pose=2;get('Nyx').pose=2;break;
      case 'promise':move('Verseborn',384,295,1300);break;
      case 'ribbon':s.prop='ribbon';get('Seerin').holdPose=0;get('Nyx').pose=5;get('Rava').pose=0;break;
      case 'last-round':get('Seerin').practice=true;get('Seerin').holdPose=5;get('Rava').pose=5;get('Jory').pose=5;move('Seerin',337,245,900);move('Rava',243,277,900);move('Jory',303,316,900);break;
      case 'arrival':s.background='central-hall';s.actors=[actor('Seerin',360,285,104),actor('Verseborn',290,285,90)];s.prop=null;s.cutAt=s.clock;break;
      case 'supplies':s.prop='bandages';break;
      case 'cup':s.prop='bandages';break;
      case 'ledger':case 'oath':s.prop='ledger';get('Kael').holdPose=5;break;
      case 'jory-enter':add('Jory',500,290).pose=2;move('Jory',408,283,1800);break;
      case 'heal':s.prop='bandages';get('Kael').healing=true;get('Kael').holdPose=2;sfx('heal',.17);break;
      case 'jory-leave':get('Kael').healing=false;move('Jory',565,302,1900);break;
      case 'wash':s.prop='bandages';get('Kael').holdPose=0;get('Verseborn').holdPose=5;move('Verseborn',315,282,1000);break;
      case 'bowl':s.prop='blanket';s.cutaway=1;break;
      case 'duo-enter':s.cutaway=null;get('Mira').alpha=get('Seerin').alpha=1;move('Mira',401,275,1800);move('Seerin',460,279,1800);break;
      case 'cute':s.cutaway=0;sfx('magic',.23);break;
      case 'freeze':s.cutaway=null;sfx('block',.12);break;
      case 'scold':s.cutaway=2;break;
      case 'apology':s.cutaway=null;get('Verseborn').holdPose=2;get('Mira').holdPose=5;move('Verseborn',300,280,1000);break;
      case 'strap':s.sparkySniff=true;break;
      case 'choice':s.cutaway=null;s.sparkySniff=false;s.prop='blanket';get('Verseborn').holdPose=2;break;
      case 'settle':get('Sparky').holdPose=2;move('Sparky',318,287,1800);break;
      case 'torren-cameo':add('Torren',510,295);move('Torren',475,295,1600);s.prop='stew';break;
      case 'title':s.cutaway=null;break;
    }
  }
  function portrait(id){return art['portrait-'+id]?.src||portraitSources[id==='Marli'?'Marla':id]||'';}
  function setBeat(index){
    if(!scene)return false;if(index>=scene.beats.length)return finish();settleMoves();scene.index=index;scene.beatAt=scene.clock;
    const b=scene.beats[index];if(b.event)event(b.event);scene.beat=b;
    scene.actors=scene.actors.filter(a=>!a.cameo||a.id===b.speaker);
    if(b.speaker&&!scene.actors.some(a=>a.id===b.speaker)){const a=add(b.speaker,scene.id==='Seerin'?155:195,scene.id==='Mira'?235:280);if(a){a.row=0;a.cameo=true;}}
    ui.location.textContent=scene.story.location;ui.dialogue.hidden=!b.text;ui.caption.hidden=Boolean(b.text);
    ui.caption.querySelector('small').textContent=b.event==='title'?'FLAMEGUARD':scene.story.location;
    ui.caption.querySelector('h2').textContent=b.caption||'';ui.caption.querySelector('p').textContent=b.event==='title'?scene.story.role:'';
    ui.caption.classList.toggle('is-title',b.event==='title');
    ui.speaker.textContent=b.speaker==='Revus'?'Baron Revus Veln':b.speaker||'';ui.line.textContent=b.text||'';
    const src=portrait(b.speaker);ui.portrait.hidden=!src;if(src)ui.portrait.src=src;
    ui.auto.textContent=window.CutsceneAutoplay?.enabled?'Autoplay on':'Autoplay off';
    const targets=scene.actors.map(currentPos).filter(a=>a.alpha>0&&a.id!=='Revus'||a.alpha>0&&scene.event!=='sign');
    const speaking=targets.find(a=>a.id===b.speaker),center=speaking?(speaking.x+320)/2:320;
    const close=b.shot==='close',prop=b.shot==='prop';scene.cameraFrom={...scene.camera};scene.cameraTo={x:clamp(center,260,380),y:scene.id==='Seerin'?230:240,w:close?450:prop?480:600};
    return true;
  }
  async function start(id,options={},entry=null){
    if(scene||loading||mode==='battle'||mode==='battleResult'||!state.party.includes(id))return false;
    loading=true;const original={mode,menuTab,activePoint,menuHidden:el.menu.classList.contains('hidden'),tabsHidden:document.querySelector('.menu-tabs').classList.contains('hidden'),dialogueHidden:el.dialogue.classList.contains('hidden'),focus:document.activeElement};
    mode='welcomeLoading';heldDirection=null;fieldDestination=null;el.menu.classList.add('hidden');el.dialogue.classList.add('hidden');
    try{
      await assets();const until=performance.now()+15000;while(!emberHallWorld.ready){if(performance.now()>until)throw Error('Hall actors unavailable');await new Promise(r=>setTimeout(r,60));}
      clearTimeout(saveTimer);emberHallWorld.clearNavigation();emberHallWorld.hideAmbientChat();activePoint=null;
      const roster=new Set(state.party),full=id!=='Sparky'||roster.has('Mira')&&roster.has('Seerin'),story=stories[id];
      scene={id,story,full,original,options,entry,roster,background:story.background,index:0,clock:0,last:performance.now(),beatAt:0,event:'establish',effectAt:0,prop:null,cutaway:null,cutAt:-1000,camera:{x:320,y:226,w:640}};
      scene.actors=initial(id);scene.beats=(full?story.beats:[story.beats[0],...story.shortBeats,story.beats.at(-1)]).filter(b=>available(b,roster));
      mode='welcomeCinematic';overlay.hidden=false;game.classList.add('welcome-cinematic-active');setBeat(0);updateMusic();raf=requestAnimationFrame(frame);return true;
    }catch(error){console.error(error);mode=original.mode;el.menu.classList.toggle('hidden',original.menuHidden);el.dialogue.classList.toggle('hidden',original.dialogueHidden);if(entry)return oldPlay(entry,options);showHudNotice('The welcome scene could not load. It remains in Memories.');return false;}finally{loading=false;}
  }
  function finish(){
    if(!scene)return false;const s=scene;scene=null;cancelAnimationFrame(raf);overlay.hidden=true;game.classList.remove('welcome-cinematic-active');
    const live=!s.options.replay||s.entry?.id.startsWith('ember-hall-start-');
    const o=s.original;mode=live?'walk':o.mode;menuTab=o.menuTab;activePoint=live?null:o.activePoint;el.menu.classList.toggle('hidden',live?true:o.menuHidden);el.dialogue.classList.toggle('hidden',live?true:o.dialogueHidden);document.querySelector('.menu-tabs').classList.toggle('hidden',live?false:o.tabsHidden);
    if(live){const entry=RECRUIT_SCENES.find(e=>e.recruit===s.id&&e.variant==='welcome'),h=loadRecruitSceneHistory();if(entry&&!h.seen.includes(entry.id))h.seen.push(entry.id);if(entry)h.lastByRecruit[s.id]=entry.id;saveRecruitSceneHistory(h);if(s.id==='Sparky'&&s.full)hallBattleProgress().sparkyDuoWelcome=true;saveGame(hallSaveKey());}
    if(mode==='menu')renderMenu();updatePanels();updateMusic();o.focus?.focus?.();
    const duo=live&&s.id!=='Sparky'&&['Mira','Seerin'].includes(s.id)&&['Mira','Seerin','Sparky'].every(id=>state.party.includes(id))&&!hallBattleProgress().sparkyDuoWelcome;
    if(duo)start('Sparky',{after:s.options.after});else s.options.after?.();return true;
  }
  function next(force=false){if(!scene)return false;if(!force&&scene.clock-scene.beatAt<(scene.beat.minMs||350))return false;return setBeat(scene.index+1);}
  function drawActor(a){
    if(a.alpha<=0)return;const p=currentPos(a),now=scene.clock;ctx.save();ctx.globalAlpha=a.alpha;
    ctx.fillStyle='#0a05084a';ctx.beginPath();ctx.ellipse(p.x,p.y-2,a.size*.23,a.size*.065,0,0,Math.PI*2);ctx.fill();
    const id=a.id==='Marli'?'Marla':a.id,size=a.size;
    if(art[a.id]){
      const speaking=scene.beat.speaker===a.id,pose=a.holdPose??(guestIds.includes(a.id)?a.pose:a.id==='Sparky'?scene.sparkySniff?5:speaking&&scene.beat.text==='Rrr!'?1:0:speaking?1:0),index=p.walking?3+Math.floor(now/240)%2:pose,image=art[a.id];ctx.save();ctx.translate(p.x,p.y);if(p.walking?a.motion.toX<a.motion.x:p.x>350)ctx.scale(-1,1);ctx.drawImage(image,index%3*256,Math.floor(index/3)*256,256,256,-size/2,-size*244/256,size,size);ctx.restore();
    }else{
      const images=emberHallWorld.images,walking=Boolean(p.walking),frame=walking?Math.floor(now/140)%8:0;
      if(id==='Verseborn'&&images.VersebornWalk){const row=p.row??a.row,sheetRow=[0,1,2,2,3,3,4,4][row];ctx.save();ctx.translate(p.x,p.y-size*.94);if([2,4,6].includes(row))ctx.scale(-1,1);ctx.drawImage(images.VersebornWalk,(walking?frame:8)*128,sheetRow*128,128,128,-size/2,0,size,size);ctx.restore();}
      else if(a.cooking||a.practice){const image=images[id+'Action'],index=a.cooking?Math.floor(now/240)%16:4+Math.floor(now/350)%5;ctx.drawImage(image,index%4*100,Math.floor(index/4)*100,100,100,p.x-size/2,p.y-size*.94,size,size);}
      else{const image=images[id],cw=image.width/8,ch=image.height/5,row=walking?p.row:a.row;ctx.drawImage(image,frame*cw,row*ch,cw,ch,p.x-size/2,p.y-size*.94,size,size);}
    }
    if(a.healing){const pulse=.12+.06*Math.sin(now/450);ctx.globalCompositeOperation='screen';ctx.fillStyle=`rgba(130,233,189,${pulse})`;ctx.beginPath();ctx.ellipse(p.x+20,p.y-32,27,24,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function imageAt(id,x,y,w,alpha=1){const image=art[id];if(!image)return;ctx.save();ctx.globalAlpha=alpha;const h=w*image.height/image.width;ctx.drawImage(image,x-w/2,y-h,w,h);ctx.restore();}
  function paint(){
    if(!scene)return;const s=scene,age=s.clock-s.beatAt,safe=LOGICAL_HEIGHT*.80,blend=ease(age/1100),from=s.cameraFrom||s.camera,to=s.cameraTo||s.camera;
    s.camera={x:from.x+(to.x-from.x)*blend,y:from.y+(to.y-from.y)*blend,w:from.w+(to.w-from.w)*blend};
    const camera=s.camera,scale=LOGICAL_WIDTH/camera.w,viewH=safe/scale,left=clamp(camera.x-camera.w/2,0,640-camera.w),top=clamp(camera.y-viewH/2,0,356-viewH);
    ctx.save();ctx.fillStyle='#100b13';ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);ctx.beginPath();ctx.rect(0,0,LOGICAL_WIDTH,safe);ctx.clip();ctx.scale(scale,scale);ctx.translate(-left,-top);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(art[s.background],0,0,640,356);
    if(s.prop==='blanket')imageAt('blanket',337,295,45);
    const ordered=s.actors.slice().sort((a,b)=>currentPos(a).y-currentPos(b).y);for(const a of ordered)drawActor(a);
    const p=s.prop;
    if(p==='provisions'&&s.event!=='torren-enter')imageAt(p,256,269,40);
    if(s.id==='Torren'&&s.event==='cooking')for(let i=0;i<3;i++){const t=(s.clock/3200+i/3)%1;ctx.globalAlpha=Math.sin(t*Math.PI)*.22;ctx.strokeStyle='#fff2d1';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(310+i*5,211-t*30);ctx.bezierCurveTo(304+i*5,204-t*30,320+i*5,195-t*30,310+i*5,189-t*30);ctx.stroke();}ctx.globalAlpha=1;
    ctx.restore();
    if(p&&s.beat.shot==='prop'){
      ctx.save();const w=LOGICAL_WIDTH*.19,h=safe*.29,x=LOGICAL_WIDTH*.76,y=safe*.12;ctx.fillStyle='#1d1223eb';ctx.strokeStyle='#a4844c';ctx.lineWidth=1;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);const im=art[p],fit=Math.min(w*.8/im.width,h*.82/im.height);ctx.drawImage(im,x+(w-im.width*fit)/2,y+(h-im.height*fit)/2,im.width*fit,im.height*fit);ctx.restore();
    }
    // Cutaways use their own stage, rather than stretching a field sprite.
    if(s.cutaway!==null){ctx.save();const a=Math.min(1,age/450);ctx.globalAlpha=a;ctx.fillStyle=s.cutaway===2?'#170b20dd':'#28142be6';const w=LOGICAL_WIDTH*.47,h=safe*.78,x=(LOGICAL_WIDTH-w)/2,y=(safe-h)/2;ctx.fillRect(x-12,y-10,w+24,h+20);const im=art[s.cutaway],fit=Math.min(w/im.width,h/im.height);ctx.drawImage(im,(LOGICAL_WIDTH-im.width*fit)/2,(safe-im.height*fit)/2,im.width*fit,im.height*fit);ctx.restore();}
    ctx.save();const shade=ctx.createLinearGradient(0,0,0,safe);shade.addColorStop(0,'#07030a65');shade.addColorStop(.25,'#07030a00');shade.addColorStop(.82,'#07030a00');shade.addColorStop(1,'#07030a65');ctx.fillStyle=shade;ctx.fillRect(0,0,LOGICAL_WIDTH,safe);if(s.beat.event==='title'){ctx.fillStyle='#08050d77';ctx.fillRect(0,0,LOGICAL_WIDTH,safe);}if(s.clock-s.cutAt<600){ctx.fillStyle=`rgba(10,5,15,${1-(s.clock-s.cutAt)/600})`;ctx.fillRect(0,0,LOGICAL_WIDTH,safe);}ctx.restore();
  }
  function frame(now){if(!scene)return;scene.clock+=document.hidden?0:clamp(now-scene.last,0,80);scene.last=now;const b=scene.beat,delay=b.text?window.CutsceneAutoplay?.delay(b.text,b.minMs)||4500:b.minMs||2500;if(!scene.previewing&&(!b.text||window.CutsceneAutoplay?.enabled)&&scene.clock-scene.beatAt>=delay)next(true);if(scene)raf=requestAnimationFrame(frame);}
  ui.skip.onclick=finish;ui.next.onclick=()=>next();ui.auto.onclick=()=>{window.CutsceneAutoplay?.set(!CutsceneAutoplay.enabled);ui.auto.textContent=CutsceneAutoplay.enabled?'Autoplay on':'Autoplay off';};
  overlay.addEventListener('click',e=>{if(!e.target.closest('button'))next();});
  document.addEventListener('keydown',e=>{if(!scene&&!loading)return;if(e.ctrlKey||e.altKey||e.metaKey||e.key==='F11')return;if(['Escape','Enter',' ','ArrowRight','ArrowLeft','ArrowUp','ArrowDown','e','E','z','Z','w','a','s','d'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.repeat||loading)return;const button=e.target.closest?.('.welcome-film button');if(button&&['Enter',' '].includes(e.key)){button.click();return;}e.key==='Escape'?finish():['Enter',' ','ArrowRight','e','E','z','Z'].includes(e.key)&&next();}},true);
  drawTileMap=function(...args){return scene?paint():oldDraw(...args);};
  saveGame=function(...args){return scene||loading?false:oldSave(...args);};
  trackForScene=function(...args){return scene?'cutscene':oldTrack(...args);};
  handleControl=function(control){if(scene||loading){if(!loading){if(control==='confirm')next();else if(control==='cancel')finish();else if(['music','fullscreen'].includes(control))oldControl(control);}return;}return oldControl(control);};
  nextTalk=function(...args){if(scene)return next();const r=oldNext(...args);if(el.speaker.textContent==='Marla')el.speaker.textContent='Marli';for(const name of [el.portraitLeftName,el.portraitRightName])if(name?.textContent==='Marla')name.textContent='Marli';return r;};
  skipTalk=function(...args){return scene?finish():oldSkip(...args);};
  playRecruitScene=function(entry,options={}){return ids.includes(entry?.recruit)&&(entry.variant==='welcome'||entry.id.startsWith('ember-hall-start-'))?start(entry.recruit,options,entry):oldPlay(entry,options);};
  window.FlameguardWelcomes={ready:scripts,start,next,finish,get active(){return Boolean(scene)||loading;},get current(){return scene?{id:scene.id,index:scene.index,full:scene.full,cast:scene.actors.map(a=>a.id),beat:scene.beat,length:scene.beats.length}:null;},preview(index){if(!scene)return false;scene.previewing=true;const id=scene.id;scene.actors=initial(id);scene.prop=null;scene.cutaway=null;scene.event='establish';scene.background=scene.story.background;for(let i=0;i<=index&&i<scene.beats.length;i++){setBeat(i);scene.clock+=Math.max(scene.beat.minMs||0,2000);settleMoves();}paint();return true;}};
})();
