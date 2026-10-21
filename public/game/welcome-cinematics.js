// Recruitment vignettes are transient: guests, poses and camera never enter a save.
(() => {
  'use strict';
  const BASE='assets/hall/welcome-302/',art={},guestIds=['Revus','Nyx','Rava','Jory'],ids=['Mira','Torren','Seerin','Kael','Sparky','Glimmer'],coreIds=['Verseborn','Mira','Torren','Seerin','Kael','Sparky','Marli'];
  let stories,scene=null,loading=false,raf,assetsPromise;
  const game=document.querySelector('.game'),overlay=document.createElement('section');
  overlay.className='welcome-film';overlay.hidden=true;overlay.setAttribute('aria-label','Flameguard introduction');
  overlay.innerHTML='<div class="welcome-location"></div><button type="button" class="welcome-skip">Skip scene</button><div class="welcome-caption"><small></small><h2></h2><p></p></div><div class="welcome-dialogue" aria-live="polite"><div class="welcome-portrait-frame"><img class="welcome-portrait" alt=""></div><div><strong class="welcome-speaker"></strong><p class="welcome-line"></p></div><button type="button" class="welcome-next" aria-label="Continue dialogue">Continue <span>↵</span></button></div><button type="button" class="welcome-auto"></button>';
  game.append(overlay);
  const ui=Object.fromEntries(['location','skip','caption','dialogue','portrait','speaker','line','next','auto'].map(k=>[k,overlay.querySelector('.welcome-'+k)]));
  const oldPlay=playRecruitScene,oldDraw=drawTileMap,oldSave=saveGame,oldControl=handleControl,oldTrack=trackForScene,oldNext=nextTalk,oldSkip=skipTalk;
  const load=(id,url)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[id]=img;resolve();};img.onerror=()=>reject(Error('Welcome image unavailable: '+url));img.src=url;});
  const scripts=fetch('welcome-story.json?v=311').then(r=>{if(!r.ok)throw Error('Welcome scripts unavailable');return r.json();}).then(v=>{stories=v;for(const s of RECRUIT_SCENES)if(ids.includes(s.recruit)&&s.variant==='welcome')s.title=v[s.recruit].title;return v;});
  scripts.catch(console.error);
  function assets(){return assetsPromise??=Promise.all([scripts,HallSpriteRefresh.ready,...WelcomeComicPanels.fresh.map(id=>load(id,'assets/hall/'+(id==='sparky-panic'?'refresh-311/':id==='sparky-angry'?'comic-307/':'comic-306/')+id+'.webp')),...guestIds.flatMap(id=>[load(id,'assets/hall/welcome-304/'+id.toLowerCase()+'.webp'),load('portrait-'+id,id==='Revus'?'assets/hall/revus-normal-315.webp':BASE+id.toLowerCase()+'-portrait.webp')]),load('revusReaction','assets/hall/welcome-303/revus-chibi.webp'),load('revusFront','assets/hall/comic-307/revus-front.webp'),load('glimmerTalk','assets/hall/comic-307/glimmer-talk.webp'),load('hallCook','assets/hall/living-256/torren-kitchen.webp'),...['register','badge','bandages','ribbon','ledger','stew','blanket','provisions',0,1].map(id=>load(id,BASE+(Number.isInteger(id)?'chibi-'+id:id)+'.webp'))]);}
  const HALL_SIZES={Verseborn:36,Mira:36,Torren:32,Seerin:36,Kael:40,Sparky:30,Marli:38,Glimmer:36,Revus:40,Nyx:30,Rava:30,Jory:30};
  const SHOTS={Mira:{x:320,y:235,w:230},Torren:{x:135,y:81,w:244},Seerin:{x:122,y:170,w:270},Kael:{x:510,y:308,w:230},Sparky:{x:160,y:79,w:260},Glimmer:{x:485,y:77,w:230}};
  const EXTRA={}; // Core family/recruitment casts remain; optional drop-ins are omitted.
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const permitted=(id,roster)=>id==='Verseborn'||id==='Marli'||guestIds.includes(id)||roster.has(id);
  const available=(b,roster)=>{const present=id=>permitted(id,roster)&&scene.actors.some(a=>a.id===id);return(b.requires||[]).every(present)&&!(b.unless||[]).some(present)&&(b.comicRequires||[]).every(id=>roster.has(id))&&!(b.comicUnlessAll?.every(id=>roster.has(id)));};
  function actor(id,x,y,size,extra={}){return{id,x,y,size:HALL_SIZES[id]||size||36,pose:0,row:0,alpha:1,...extra};}
  function initial(id){
    if(id==='Glimmer')return[actor('Glimmer',420,188),actor('Verseborn',455,89)];
    if(id==='Mira')return[actor('Revus',320,227),actor('Mira',355,232),actor('Verseborn',270,267)];
    if(id==='Torren')return[actor('Torren',212,88),actor('Verseborn',131,91),actor('Marli',214,88)];
    if(id==='Seerin')return[actor('Seerin',88,180),actor('Rava',48,179,{pose:5}),actor('Nyx',145,180),actor('Jory',120,190),actor('Verseborn',210,190)];
    if(id==='Kael')return[actor('Kael',464,316),actor('Verseborn',510,334)];
    return[actor('Sparky',165,82),actor('Verseborn',126,91),...(scene.full?[actor('Mira',206,92),actor('Seerin',235,76),...(scene.roster.has('Torren')?[actor('Torren',95,55,32,{cooking:true})]:[])]:[])];
  }
  function move(id,x,y,duration=1800){
    const a=scene.actors.find(a=>a.id===id);if(!a)return;
    const here=currentPos(a),path=emberHallWorld.findPath(here,x,y);
    if(!path?.length)return false;
    const points=[[here.x,here.y],...path.map(p=>[p.x,p.y])],length=points.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
    a.x=here.x;a.y=here.y;a.motion={x:here.x,y:here.y,toX:points.at(-1)[0],toY:points.at(-1)[1],points,length,at:scene.clock,duration:Math.max(duration,length/18*1000)};
    scene.holdUntil=Math.max(scene.holdUntil||0,a.motion.at+a.motion.duration+250);return true;
  }
  function add(id,x,y){return scene.actors.find(a=>a.id===id)||null;}
  function currentPos(a){const m=a.motion;if(!m)return a;const t=clamp((scene.clock-m.at)/m.duration,0,1),lengths=m.points.slice(1).map((p,i)=>Math.hypot(p[0]-m.points[i][0],p[1]-m.points[i][1]));let distance=lengths.reduce((v,n)=>v+n,0)*t;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const from=m.points[i],to=m.points[i+1],f=lengths[i]?Math.min(1,distance/lengths[i]):1,dx=to[0]-from[0],dy=to[1]-from[1];return{...a,x:from[0]+dx*f,y:from[1]+dy*f,walking:t<1,row:Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1,facing:Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1,distance:m.length*t};}distance-=lengths[i];}return a;}
  function settleMoves(){for(const a of scene.actors)if(a.motion){const p=currentPos(a);a.x=p.x;a.y=p.y;if(!p.walking)delete a.motion;}}
  function sfx(id,volume=.22){if(!document.hidden)playSfx(id,volume);}
  function setComic(key){if(scene.comic.key===key)return;scene.comic={key,at:scene.clock,serial:scene.comic.serial+1};}
  function fly(x,y,stairs=false){const a=scene.actors.find(a=>a.id==='Glimmer'),p=currentPos(a);if(stairs){if(!move('Glimmer',x,y,2400))return false;}else{const length=Math.hypot(x-p.x,y-p.y),duration=Math.max(2400,length/24*1000);a.motion={x:p.x,y:p.y,toX:x,toY:y,points:[[p.x,p.y],[x,y]],length,at:scene.clock,duration};scene.holdUntil=Math.max(scene.holdUntil||0,scene.clock+duration+250);}a.flying=true;a.labWorking=false;return true;}
  function event(name){
    const s=scene;s.event=name;s.effectAt=s.clock;const get=id=>s.actors.find(a=>a.id===id);
    switch(name){
      case 'verse-enter':move('Verseborn',s.id==='Seerin'?185:277,s.id==='Seerin'?185:237);break;
      case 'glimmer-arrive':fly(438,86,true);break;
      case 'glimmer-bench':move('Verseborn',440,87);move('Glimmer',464,87);get('Glimmer').labWorking=false;break;
      case 'glimmer-boost':fly(496,78);break;
      case 'glimmer-boost-two':fly(477,105);break;
      case 'glimmer-repair':get('Glimmer').labWorking=true;get('Glimmer').flying=false;break;
      case 'glimmer-back':fly(464,87);break;
      case 'glimmer-gadget':s.gadgetAt=s.clock;sfx('magic',.12);break;
      case 'father':get('Revus').pose=2;break;
      case 'register':s.prop='register';get('Revus').pose=1;break;
      case 'revus-chibi':setComic('revusReaction');sfx('magic',.18);break;
      case 'revus-composed':setComic(null);get('Revus').pose=0;break;
      case 'revus-leave':get('Revus').pose=5;move('Revus',320,340);break;
      case 'sign':get('Revus').alpha=0;s.prop='register';break;
      case 'mira-door':break;
      case 'torren-enter':s.prop='provisions';move('Torren',116,85);break;
      case 'shelf':s.prop='provisions';sfx('block');break;
      case 'marli-enter':move('Marli',64,88);break;
      case 'badge':s.prop='badge';break;
      case 'cooking':s.prop=null;get('Torren').cooking=true;move('Torren',95,55);break;
      case 'stew':case 'supper':case 'quiet':s.prop='stew';break;
      case 'mira-enter':break;
      case 'practice':get('Seerin').practice=true;get('Rava').pose=5;break;
      case 'farewell':get('Seerin').practice=false;get('Jory').pose=2;get('Rava').pose=2;get('Nyx').pose=2;break;
      case 'poster':get('Jory').pose=1;get('Nyx').pose=1;break;
      case 'rava-worry':get('Rava').pose=2;get('Nyx').pose=2;break;
      case 'promise':move('Verseborn',160,187);break;
      case 'ribbon':s.prop='ribbon';get('Nyx').pose=5;get('Rava').pose=0;break;
      case 'last-round':get('Seerin').practice=true;get('Rava').pose=5;get('Jory').pose=5;break;
      case 'last-round-end':get('Seerin').practice=false;break;
      case 'supplies':case 'cup':case 'healer':case 'healer-end':case 'wash':s.prop='bandages';break;
      case 'ledger':case 'oath':s.prop='ledger';break;
      case 'bowl':s.prop='blanket';setComic('sparky-bowl');break;
      case 'duo-enter':s.duoMood='cute';s.sparkySeated=true;setComic(null);{const a=get('Sparky'),p=currentPos(a),length=Math.hypot(176-p.x,91-p.y);a.motion={x:p.x,y:p.y,toX:176,toY:91,points:[[p.x,p.y],[176,91]],length,at:s.clock,duration:1600};s.holdUntil=Math.max(s.holdUntil||0,s.clock+1850);}move('Mira',151,91);move('Seerin',201,91);break;
      case 'cute':s.duoMood='cute';setComic('sparky-cute');sfx('magic',.23);break;
      case 'freeze':s.duoMood='angry';s.fright=true;if(get('Torren'))get('Torren').cooking=false;setComic(null);sfx('block',.12);break;
      case 'scold':setComic('sparky-scold');break;
      case 'apology':s.duoMood='stern';setComic(null);break;
      case 'strap':s.sparkySniff=true;break;
      case 'choice':s.duoMood=null;s.fright=false;if(get('Torren'))get('Torren').cooking=true;setComic(null);s.sparkySniff=false;s.prop='blanket';break;
      case 'settle':break;
      case 'torren-cameo':s.prop='stew';break;
      case 'title':setComic(null);break;
    }
  }
  function portrait(id){return art['portrait-'+id]?.src||portraitSources[id==='Marli'?'Marla':id]||'';}
  function dialogueShot(beat){
    const wide=SHOTS[scene.id];if(!['close','prop'].includes(beat.shot))return{...wide};
    const speaker=scene.actors.find(a=>a.id===beat.speaker),lead=scene.actors.find(a=>a.id===scene.id);if(!speaker||!lead)return{...wide};
    const listener=speaker!==lead?lead:scene.actors.find(a=>a.id===(scene.id==='Mira'?'Revus':scene.id==='Seerin'?'Rava':'Verseborn'));
    const cast=[speaker,listener].filter(Boolean).map(a=>({...currentPos(a),size:a.size}));
    const left=Math.min(...cast.map(a=>a.x-a.size*.5)),right=Math.max(...cast.map(a=>a.x+a.size*.5)),top=Math.min(...cast.map(a=>a.y-a.size)),bottom=Math.max(...cast.map(a=>a.y+4));
    const w=clamp(Math.max(right-left+42,(bottom-top+19)*LOGICAL_WIDTH/(LOGICAL_HEIGHT*.76)),165,wide.w);
    return{x:(left+right)/2,y:(top+bottom)/2,w};
  }
  function setBeat(index){
    if(!scene)return false;if(index>=scene.beats.length)return finish();settleMoves();scene.index=index;scene.beatAt=scene.clock;
    const b=scene.beats[index],panelEvents={bowl:'sparky-bowl',cute:'sparky-cute',scold:'sparky-scold','revus-chibi':'revusReaction'};setComic(Object.prototype.hasOwnProperty.call(b,'panel')?b.panel:panelEvents[b.event]||null);if(b.event)event(b.event);scene.beat=b;
    // The cast is staged once. Dialogue never creates or removes an actor.
    ui.location.textContent=scene.story.location;ui.dialogue.hidden=!b.text;ui.caption.hidden=Boolean(b.text)||Boolean(scene.comic.key);
    ui.caption.querySelector('small').textContent=b.event==='title'?'FLAMEGUARD':scene.story.location;
    ui.caption.querySelector('h2').textContent=b.caption||'';ui.caption.querySelector('p').textContent=b.event==='title'?scene.story.role:'';
    ui.caption.classList.toggle('is-title',b.event==='title');
    ui.speaker.textContent=b.speaker==='Revus'?'Baron Revus Veln':b.offscreen?'Marli · from the bar':b.speaker||'';ui.line.textContent=b.text||'';
    const src=portrait(b.speaker);ui.portrait.hidden=!src;ui.portrait.parentElement.hidden=!src;overlay.dataset.speaker=b.speaker||'';if(src)ui.portrait.src=src;
    ui.auto.textContent=window.CutsceneAutoplay?.enabled?'Autoplay on':'Autoplay off';
    scene.cameraFrom={...scene.camera};scene.cameraTo=dialogueShot(b);
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
      scene={id,story,full,original,options,entry,roster,background:story.background,index:0,clock:0,last:performance.now(),beatAt:0,event:'establish',effectAt:0,prop:null,comic:{key:null,at:0,serial:0},cutAt:-1000,camera:{...SHOTS[id]},draws:[]};
      scene.actors=initial(id);for(const [extra,[x,y]]of Object.entries(EXTRA[id]||{}))if(roster.has(extra)&&!scene.actors.some(a=>a.id===extra))scene.actors.push(actor(extra,x,y));scene.beats=(full?story.beats:[story.beats[0],...story.shortBeats,story.beats.at(-1)]).filter(b=>available(b,roster));
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
  function next(force=false){if(!scene)return false;if(!force&&(scene.clock<(scene.holdUntil||0)||scene.clock-scene.beatAt<(scene.beat.minMs||350)))return false;return setBeat(scene.index+1);}
  function drawReactionMarks(p,size,now,cute){
    ctx.save();ctx.lineWidth=.32;ctx.strokeStyle=cute?'#54253f':'#5a1017';ctx.fillStyle=cute?'#ff72a6':'#ef3f43';
    if(cute){for(let i=0;i<3;i++){const phase=(now/1800+i/3)%1,x=p.x+Math.sin(i*2.3+phase)*size*.29,y=p.y-size*.83-phase*8,r=1.7;ctx.globalAlpha=Math.sin(phase*Math.PI);ctx.beginPath();ctx.moveTo(x,y+r);ctx.bezierCurveTo(x-r*2,y,x-r*1.6,y-r*1.5,x,y-r*.4);ctx.bezierCurveTo(x+r*1.6,y-r*1.5,x+r*2,y,x,y+r);ctx.fill();ctx.stroke();}}
    else{ctx.translate(p.x+size*.25,p.y-size*.85);ctx.lineWidth=.7;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(.5,1.5);ctx.quadraticCurveTo(2,1.5,2,3);ctx.stroke();}}
    ctx.restore();
  }
  function drawActor(a){
    if(a.alpha<=0)return;const p=currentPos(a),now=scene.clock,id=a.id==='Marli'?'Marla':a.id,size=a.size;
    const partner=scene.actors.find(other=>other.id===scene.id),idleFacing=(partner?.x??p.x)>p.x?2:3;
    ctx.save();ctx.globalAlpha=a.alpha;const walking=Boolean(p.walking),frame=walking?Math.floor((p.distance||0)/2.5)%8:0;
    ctx.fillStyle='#0a05084a';ctx.beginPath();ctx.ellipse(p.x,p.y-1,size*.15,size*.05,0,0,Math.PI*2);ctx.fill();
    let source;a.gesture=null;a.gesture=null;
    if(['Nyx','Rava','Jory'].includes(a.id)){
      const speaking=scene.beat.speaker===a.id,practice=!!scene.actors.find(a=>a.id==='Seerin')?.practice,index=HallSpriteRefresh.childFrame(a.id,now,speaking,practice);
      HallSpriteRefresh.draw(ctx,a.id,p.x,p.y,size,index,a.id==='Jory');source='hall/refresh-309/'+a.id.toLowerCase()+'.webp';a.gesture={frame:index,whole:true};
    }else if(guestIds.includes(a.id)){
      const walk=walking&&a.id==='Revus',image=art[a.id],cols=3,cell=100,index=a.pose===0&&scene.beat.speaker===a.id?1:a.pose;
      if(walk){const front=art.revusFront,cw=front.width/4,ch=front.height,index=Math.floor(p.distance/2.8)%4;ctx.save();ctx.translate(p.x,p.y);ctx.scale(-1,1);ctx.drawImage(front,index*cw,0,cw,ch,-size*cw/ch/2,-size*.96,size*cw/ch,size);ctx.restore();}else{const toVerse=scene.beat.speaker==='Verseborn'||scene.beat.speaker==='Revus'&&/Baron Revus Veln|Ash Quarter tavern|speaking to my daughter/.test(scene.beat.text||''),addressed=toVerse?scene.actors.find(a=>a.id==='Verseborn'):scene.actors.find(a=>a.id==='Mira'),targetX=addressed?currentPos(addressed).x:p.x-1,direction=targetX<p.x?0:1;HallSpriteRefresh.draw(ctx,'Revus',p.x,p.y,size,direction*2+(scene.beat.speaker==='Revus'?1:0));a.gesture={facing:direction===0?'left':'right',whole:true};}source=walk?'hall/comic-307/revus-front.webp':'hall/refresh-311/revus.webp';
    }else if(scene.fright&&['Torren','Verseborn','Sparky'].includes(id)&&!walking){
      const fearFrame=[0,1,2,1,3,1][Math.floor(now/260)%6];HallSpriteRefresh.draw(ctx,id+'Fear',p.x,p.y,size,fearFrame);source='hall/refresh-311/sparky-fear-reactions.webp';a.gesture={fright:true,frame:fearFrame};
    }else if(id==='Sparky'&&scene.sparkySeated){
      const cute=scene.duoMood==='cute',index=cute?[0,0,1,0,0,3,0,2,0][Math.floor(now/480)%9]:0,hop=walking?-Math.sin(Math.PI*Math.min(1,(scene.clock-a.motion.at)/a.motion.duration))*3:0;HallSpriteRefresh.draw(ctx,'SparkyCute',p.x,p.y+hop,size,index);source='hall/refresh-312/sparky-paws.webp';a.gesture={seated:true,paws:cute,frame:index};
    }else if(id==='Verseborn'){
      emberHallWorld.drawActor({...p,id,size,poseFrame:walking?frame:8},walking?p.facing:idleFacing,0,{x:0,y:0});source='hall/refresh-309/verseborn-walk.webp';
    }else if(walking&&['Mira','Seerin'].includes(id)){
      const right=p.facing===2||![2,3].includes(p.facing)&&a.motion?.toX>a.motion?.x,step=Math.floor((p.distance||0)/3)%4;
      HallSpriteRefresh.draw(ctx,id+'Walk',p.x,p.y,size,(right?4:0)+step);source='hall/refresh-311/'+id.toLowerCase()+'-walk.webp';a.gesture={walking:true,step};
    }else if(scene.duoMood&&['Mira','Seerin'].includes(id)&&!walking){
      const cute=scene.duoMood==='cute',reactionFrame=cute?[0,1,2,1,3,0][Math.floor(now/380)%6]:scene.beat.speaker===id?[0,1,2,1,3][Math.floor(now/260)%5]:0,listener=scene.actors.find(a=>a.id===(cute?'Sparky':'Verseborn'));
      HallSpriteRefresh.draw(ctx,id+(cute?'Cute':'Demon'),p.x,p.y,size,reactionFrame,listener&&currentPos(listener).x>p.x);source='hall/refresh-311/sparky-'+(cute?'cute':'angry')+'-reactions.webp';a.gesture={mood:scene.duoMood,frame:reactionFrame};drawReactionMarks(p,size,now,cute);
    }else if(id==='Mira'&&!walking){
      const age=now-scene.beatAt,talking=scene.beat.speaker==='Mira',gesture=talking&&age%9000>=1200&&age%9000<3000,index=gesture?(age%9000<2400?(Math.floor(age/400)%2?4:5):6):talking?[0,1,2,1][Math.floor(age/320)%4]:now%6000>5800?3:0;
      const listener=scene.actors.find(a=>a.id===(scene.id==='Mira'?'Revus':'Verseborn')),faceRight=listener&&currentPos(listener).x>p.x;
      HallSpriteRefresh.draw(ctx,'MiraTalk',p.x,p.y,size,index,faceRight);source='hall/refresh-311/mira-talk.webp';a.gesture={frame:index,unarmed:true,lip:gesture};
    }else if(id==='Kael'&&walking){
      emberHallWorld.drawActor({...p,id,size,visiting:true,walking:true,facing:p.facing,walkPhase:(p.distance||0)/2.5},0,0,{x:0,y:0});source='hall/kael-walk-v237.webp';
    }else if(id==='Glimmer'&&!a.ambientResident){
      const moving=walking&&a.flying;
      if(moving||a.labWorking){emberHallWorld.drawActor({...p,id,size,labActive:true,labFlying:moving,labDirection:a.motion?.toX>a.motion?.x?1:0,labClock:now,labRow:2,labLift:moving?Math.sin(Math.PI*clamp((now-a.motion.at)/a.motion.duration,0,1))*4:0},4,0,{x:0,y:0});source='hall/glimmer-lab-v244.webp';}
      else{const image=art.glimmerTalk,talking=scene.beat.speaker==='Glimmer',index=talking?[0,1,2,1,3,0][Math.floor((now-scene.beatAt)/260)%6]:0,rects=[[56,44,158,215],[38,44,157,215],[20,44,157,215],[2,44,157,215]],r=rects[index],h=size*.65*.8,w=h*r[2]/r[3];ctx.save();ctx.translate(p.x,p.y);if(p.x<440)ctx.scale(-1,1);ctx.drawImage(image,index*217+r[0],r[1],r[2],r[3],-w/2,-h,w,h);ctx.restore();source='hall/comic-307/glimmer-talk.webp';}
    }else if(walking){
      const image=emberHallWorld.images[id],cell=image.width/8,renderSize=id==='Glimmer'?size*.65:size;ctx.drawImage(image,frame*cell,(id==='Mira'&&p.row>=2?5-p.row:p.row)*cell,cell,cell,p.x-renderSize/2,p.y-renderSize*.94,renderSize,renderSize);source='hall/'+id.toLowerCase()+'-clean-v3.webp';
    }else if(id==='Torren'&&!a.cooking&&!a.ambientResident){
      // Hall's cooking idle includes a pot. Visitors use the existing unarmed
      // Hall walk art in its quietest passing pose instead.
      const image=emberHallWorld.images.Torren,cell=image.width/8;ctx.drawImage(image,2*cell,0,cell,cell,p.x-size/2,p.y-size*.94,size,size);source='hall/torren-clean-v3.webp';
    }else if(id==='Torren'&&(a.cooking||a.ambientResident)){

      const image=art.hallCook,cell=image.width/4,index=[0,1,2,1][Math.floor(now/340)%4];ctx.drawImage(image,index*cell,0,cell,cell,p.x-size/2,p.y-size*.94,size,size);source='hall/living-256/torren-kitchen.webp';
    }else{
      const index=id==='Marla'?scene.beat.speaker==='Marli'?12:emberHallWorld.marlaIdleFrame(now):a.practice?[0,1,2,3,5,6,7,8,9,10,11,12,13,14,15,0][Math.floor(now/180)%16]:id==='Kael'?Math.floor(now/350)%16:id==='Mira'?(scene.beat.speaker==='Mira'?[0,1,2,1][Math.floor((now-scene.beatAt)/320)%4]:now%6000>5800?3:0):0;
      emberHallWorld.drawActor({...p,id,size,kitchenActive:false,labActive:id==='Glimmer',labClock:now,labRow:2,labLift:0},4,index,{x:0,y:0});source=['Mira','Seerin'].includes(id)?'hall/'+(id==='Mira'?'refresh-311/':'refresh-309/')+id.toLowerCase()+'.webp':'hall/'+id.toLowerCase()+'-action-'+(id==='Kael'?'v9':'v8')+'.webp';
    }
    scene.draws.push({id:a.id,source,frame,walking,row:id==='Mira'&&p.row>=2?5-p.row:p.row,facing:id==='Verseborn'&&!walking?idleFacing:p.facing,gesture:a.gesture,labWorking:!!a.labWorking,flying:!!a.flying,x:p.x,y:p.y,size,motion:a.motion?{duration:a.motion.duration,points:a.motion.points}:null});ctx.restore();
  }
  function drawHall(){
    const world=emberHallWorld,now=scene.clock;scene.draws=[];ctx.drawImage(world.hallBackground(),0,0,640,356);
    const machine=world.resonance;if(window.HallOpening&&stageSelectorImage)HallOpening.drawMachine(ctx,stageSelectorImage,machine.x,machine.y,machine.width,machine.height,now);
    const names=new Set(scene.actors.map(a=>a.id==='Marli'?'Marla':a.id));
    const residents=[]; // Cinematic cast only: resident AI positions are not staged cameos.
    const things=[...scene.actors,...residents,...world.foregroundProps.map(prop=>({y:prop.depth,prop}))].sort((a,b)=>(a.prop?a.y:currentPos(a).y)-(b.prop?b.y:currentPos(b).y));
    world.drawCinematicFixtures(now);
    for(const a of things){if(a.prop)world.drawCinematicForeground(a.prop);else drawActor(a);}
  }
  function imageAt(id,x,y,w,alpha=1){const image=art[id];if(!image)return;ctx.save();ctx.globalAlpha=alpha;const h=w*image.height/image.width;ctx.drawImage(image,x-w/2,y-h,w,h);ctx.restore();}
  function paint(){
    if(!scene)return;const s=scene,age=s.clock-s.beatAt,safe=LOGICAL_HEIGHT*.76,blend=ease(age/1100),from=s.cameraFrom||s.camera,to=s.cameraTo||s.camera;
    s.camera={x:from.x+(to.x-from.x)*blend,y:from.y+(to.y-from.y)*blend,w:from.w+(to.w-from.w)*blend};
    let view=s.camera;
    if(s.id==='Glimmer'&&s.beat.event==='glimmer-arrive'){
      const g=s.actors.find(a=>a.id==='Glimmer'),v=s.actors.find(a=>a.id==='Verseborn'),p=currentPos(g);
      if(p.walking&&g.motion){const progress=clamp((s.clock-g.motion.at)/g.motion.duration,0,1),mix=Math.min(1,(1-progress)*4),q=currentPos(v),w=clamp(Math.max(230,Math.abs(p.x-q.x)+85,(Math.abs(p.y-q.y)+62)*LOGICAL_WIDTH/safe),230,420),follow={x:(p.x+q.x)/2,y:(p.y+q.y)/2-13,w};view={x:s.camera.x+(follow.x-s.camera.x)*mix,y:s.camera.y+(follow.y-s.camera.y)*mix,w:s.camera.w+(follow.w-s.camera.w)*mix};}
    }
    const camera=view,scale=LOGICAL_WIDTH/camera.w,viewH=safe/scale,left=clamp(camera.x-camera.w/2,0,640-camera.w),top=clamp(camera.y-viewH/2,0,356-viewH);
    ctx.save();ctx.fillStyle='#100b13';ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);ctx.beginPath();ctx.rect(0,0,LOGICAL_WIDTH,safe);ctx.clip();ctx.scale(scale,scale);ctx.translate(-left,-top);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';drawHall();
    ctx.restore();
    if(s.comic.key){const page=WelcomeComicPanels.pages[s.comic.key];WelcomeComicPanels.draw(ctx,s.comic.key,art[page.asset],s.clock-s.comic.at,LOGICAL_WIDTH,safe);}
    ctx.save();const shade=ctx.createLinearGradient(0,0,0,safe);shade.addColorStop(0,'#07030a65');shade.addColorStop(.25,'#07030a00');shade.addColorStop(.82,'#07030a00');shade.addColorStop(1,'#07030a65');ctx.fillStyle=shade;ctx.fillRect(0,0,LOGICAL_WIDTH,safe);if(s.beat.event==='title'){ctx.fillStyle='#08050d77';ctx.fillRect(0,0,LOGICAL_WIDTH,safe);}if(s.clock-s.cutAt<600){ctx.fillStyle=`rgba(10,5,15,${1-(s.clock-s.cutAt)/600})`;ctx.fillRect(0,0,LOGICAL_WIDTH,safe);}ctx.restore();
  }
  function frame(now){if(!scene)return;scene.clock+=document.hidden?0:clamp(now-scene.last,0,80);scene.last=now;const b=scene.beat,delay=b.text?window.CutsceneAutoplay?.delay(b.text,b.minMs)||4500:b.minMs||2500;if(!scene.previewing&&(!b.text||window.CutsceneAutoplay?.enabled)&&scene.clock-scene.beatAt>=delay&&scene.clock>=(scene.holdUntil||0))next(true);if(scene)raf=requestAnimationFrame(frame);}
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
  window.FlameguardWelcomes={ready:scripts,start,next,finish,get active(){return Boolean(scene)||loading;},get current(){return scene?{id:scene.id,index:scene.index,full:scene.full,cast:scene.actors.map(a=>a.id),beat:scene.beat,length:scene.beats.length,draws:scene.draws,background:'ember-hall',comic:{...scene.comic},holdUntil:scene.holdUntil,clock:scene.clock}:null;},preview(index){if(!scene)return false;scene.previewing=true;const id=scene.id;scene.actors=initial(id);for(const [extra,[x,y]]of Object.entries(EXTRA[id]||{}))if(scene.roster.has(extra)&&!scene.actors.some(a=>a.id===extra))scene.actors.push(actor(extra,x,y));scene.prop=null;scene.duoMood=null;scene.fright=false;scene.sparkySeated=false;scene.comic={key:null,at:0,serial:0};scene.event='establish';scene.background=scene.story.background;for(let i=0;i<=index&&i<scene.beats.length;i++){setBeat(i);scene.clock=Math.max(scene.clock+Math.max(scene.beat.minMs||0,2000),scene.holdUntil||0);settleMoves();}paint();return true;}};
})();
