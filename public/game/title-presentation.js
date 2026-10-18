// User-supplied title illustration, with live gold/violet menus and original save keys.
(() => {
  'use strict';
  const W=1448,H=1086,art=new Image(),clean=new Image(),lute=new Image(),banners=[];
  const bannerReady=fetch('assets/ui/title-263/banners.json').then(r=>r.json()).then(async configs=>{await Promise.all(configs.map(async (c,i)=>{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=`assets/ui/title-263/banner-${i}.webp`;});banners[i]={...c,image};}));});let loaded=false,intent='continue',hits=[];
  const ready=Promise.all([new Promise((resolve,reject)=>{lute.onload=resolve;lute.onerror=reject;lute.src="assets/ui/title-276/lute.webp";}),bannerReady,new Promise((resolve,reject)=>{art.onload=resolve;art.onerror=()=>reject(Error('Title illustration unavailable'));art.src='assets/ui/title-263/title.webp';}),new Promise((resolve,reject)=>{clean.onload=resolve;clean.onerror=()=>reject(Error('Title menu plate unavailable'));clean.src='assets/ui/title-259/menu-clean.webp';})]).then(()=>{window.TitleCharacterLife?.prepare(art);loaded=true;});
  ready.catch(error=>console.error(error));
  titleMenuState='press';titleMenuIndex=1;titleSubmenuIndex=0;
  function layout(){const scale=Math.min(canvas.width/W,canvas.height/H);return{x:(canvas.width-W*scale)/2,y:(canvas.height-H*scale)/2,width:W*scale,height:H*scale,scale};}
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function diamond(x,y,r=12,selected=false){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=selected?'#ffdfa4':'#ccb389';ctx.lineWidth=1.2;
    if(selected){ctx.shadowColor='#d878ff';ctx.shadowBlur=15;ctx.fillStyle='#b045ef';}
    else ctx.fillStyle='#26203d';
    ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.16,-r*.16);ctx.lineTo(r*.8,0);ctx.lineTo(r*.16,r*.16);ctx.lineTo(0,r);ctx.lineTo(-r*.16,r*.16);ctx.lineTo(-r*.8,0);ctx.lineTo(-r*.16,-r*.16);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=selected?'#fff4ff':'#f0d8af';ctx.beginPath();ctx.moveTo(0,-r*.62);ctx.lineTo(r*.24,0);ctx.lineTo(0,r*.62);ctx.lineTo(-r*.24,0);ctx.closePath();ctx.fill();ctx.restore();
  }
  function line(y,left=486,right=965,selected=false){
    ctx.save();const g=ctx.createLinearGradient(left,0,right,0);g.addColorStop(0,'#c8a46b00');g.addColorStop(.2,selected?'#e5b96b':'#a89062');g.addColorStop(.5,selected?'#fff3b9':'#e5cda5');g.addColorStop(.8,selected?'#e5b96b':'#a89062');g.addColorStop(1,'#c8a46b00');ctx.strokeStyle=g;ctx.lineWidth=selected?1.6:1;if(selected){ctx.shadowColor='#b048ed';ctx.shadowBlur=10;}ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.restore();
  }
  function text(label,x,y,size=29,spacing=4,color='#f1e4c6',bold=false){
    ctx.save();ctx.font=`${bold?'bold ':''}${size}px Georgia,serif`;ctx.fillStyle=color;ctx.textBaseline='middle';
    const chars=[...String(label)],width=chars.reduce((n,c)=>n+ctx.measureText(c).width,0)+Math.max(0,chars.length-1)*spacing;let cursor=x-width/2;
    for(const c of chars){ctx.fillText(c,cursor,y);cursor+=ctx.measureText(c).width+spacing;}ctx.restore();
  }
  function panel(top,bottom,left=430,right=1020){
    const shade=ctx.createLinearGradient(0,top,0,bottom);shade.addColorStop(0,'#08072000');shade.addColorStop(.15,'#080720b0');shade.addColorStop(.8,'#080720c9');shade.addColorStop(1,'#08072000');ctx.fillStyle=shade;ctx.fillRect(left,top,right-left,bottom-top);
  }
  function cleanedBackground(){
    ctx.save();ctx.beginPath();ctx.rect(330,915,790,155);ctx.clip();
    // Only the prompt region comes from the edited plate; all heroes, logo,
    // city and sky remain the exact pixels of the supplied illustration.
    ctx.drawImage(clean,330,915,790,155);ctx.restore();
  }
  function saveData(slot){
    const summary=saveSlotSummary(titleMenuIndex,slot);let data;
    try{data=JSON.parse(localStorage.getItem(titleSaveKey(titleMenuIndex,slot))||'null');}catch{}
    const location=titleMenuIndex===1?'EXISTING RUN':(maps[data?.state?.map]?.name||'SAVED JOURNEY');
    const stamp=data?.savedAt,parsed=typeof stamp==='number'?stamp:Date.parse(stamp||'');
    const date=Number.isFinite(parsed)?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(parsed)):'';
    return{...summary,location:summary.exists?location:'EMPTY SLOT',detail:summary.detail.replace('STAGE','Stage').replace('PARTY LV','Party Lv'),date};
  }
  function selected(){return titleMenuState==='main'?titleModeIndices.indexOf(titleMenuIndex):titleSubmenuIndex;}
  function actionMenu(){return titleMenuState==='storyActions'||titleMenuState==='hallActions';}
  function slotMenu(){return titleMenuState==='story'||titleMenuState==='hall';}
  function entries(){return titleMenuState==='main'?titleMenuEntries:slotMenu()?['Save I','Save II','Back']:titleMenuIndex===0?['New Game','Continue','Back']:['New Run','Continue Run','Back'];}
  function row(label,index,y,top,bottom,disabled=false){
    const active=selected()===index;hits.push({index,x:450,y:top,w:550,h:bottom-top});
    if(active){line(y-28,520,930,true);line(y+28,520,930,true);diamond(493,y,22,true);ctx.save();ctx.shadowBlur=12;ctx.shadowColor='#a641e8';text(label.toUpperCase(),730,y,31,4,disabled?'#8c8195':'#ffe3a0');ctx.restore();}
    else text(label.toUpperCase(),730,y,29,5,disabled?'#8c8195':'#e4dccb');
  }
  function drawMenu(now){
    hits=[];
    if(titleMenuState==='press'){
      hits.push({index:0,x:0,y:0,w:W,h:H});
      if(!reduced()){ctx.save();ctx.globalAlpha=.10+.06*Math.sin(now/1250);ctx.shadowColor='#cb5eff';ctx.shadowBlur=18;diamond(725,951,17,true);ctx.restore();}
      return;
    }
    cleanedBackground();
    if(canvas.getBoundingClientRect().width<700){drawCompactMenu();return;}
    if(titleMenuState==='main'){
      panel(890,1045);row('Ember Hall',0,962,913,1010);line(1020);diamond(725,1020,7);
    }else if(actionMenu()){
      panel(796,1035,475,976);line(820,500,955);diamond(725,820,7);
      const anySave=[1,2].some(slot=>saveSlotSummary(titleMenuIndex,slot).exists);
      entries().forEach((entry,i)=>row(entry,i,[854,913,975][i],[831,886,946][i],[883,943,1003][i],i===1&&!anySave));line(1008,500,955);diamond(725,1008,7);
    }else if(slotMenu()){
      panel(700,1062,425,1025);text(intent==='new'?(titleMenuIndex===0?'NEW STORY':'NEW EMBER HALL RUN'):(titleMenuIndex===0?'CONTINUE STORY':'EMBER HALL RUNS'),725,747,30,4,'#f4e7c6',true);line(777,450,1000);diamond(725,777,7);
      for(let i=0;i<2;i++){
        const s=saveData(i+1),y=817+i*105,active=selected()===i,disabled=intent==='continue'&&!s.exists;
        hits.push({index:i,x:450,y:y-25,w:555,h:96});
        if(active){line(y-27,450,1000,true);line(y+66,450,1000,true);diamond(474,y+10,24,true);}else diamond(474,y+10,18);
        const color=disabled?'#8c8195':active?'#ffe1a0':'#e0d8e3';
        text('SAVE '+(i?'II':'I'),567,y,23,2,color,true);
        const location=s.location.toUpperCase(),fit=Math.min(23,320/(location.length*.63+1));text(location,811,y,fit,2,color,true);
        if(s.exists){text(s.detail,759,y+27,20,1,'#ede4d8');if(s.date)text(s.date,759,y+52,17,1,'#d6c9dd');}
        else text(intent==='new'?'Begin a new journey':'No saved journey',760,y+30,19,1,'#ac9db3');
      }
      hits.push({index:2,x:470,y:995,w:510,h:55});if(selected()===2)diamond(620,1020,14,true);text('BACK',735,1020,26,5,selected()===2?'#ffe1a0':'#e5dccf');line(1043,510,940);diamond(725,1043,6);
    }
  }
  function drawCompactMenu(){
    // Keep the whole illustration on phones, but give text and touch targets
    // their own larger scale instead of shrinking desktop labels to six pixels.
    const current=selected();
    if(slotMenu()){
      panel(400,1086,130,1320);text(intent==='new'?'NEW '+(titleMenuIndex?'RUN':'STORY'):titleMenuIndex?'EMBER HALL RUNS':'CONTINUE STORY',725,460,49,4,'#f4e7c6',true);line(495,175,1275);
      for(let i=0;i<2;i++){
        const s=saveData(i+1),y=560+i*200,active=current===i,disabled=intent==='continue'&&!s.exists;
        hits.push({index:i,x:155,y:y-40,w:1135,h:190});if(active){diamond(204,y+15,31,true);line(y-43,170,1275,true);line(y+143,170,1275,true);}
        const color=disabled?'#918598':active?'#ffe1a0':'#e5dbe4';text('SAVE '+(i?'II':'I'),392,y,44,2,color,true);
        text(s.location.toUpperCase(),896,y,Math.min(44,600/(s.location.length*.65+1)),2,color,true);
        text(s.exists?s.detail:intent==='new'?'Begin a new journey':'No saved journey',774,y+57,43,1,'#e7dcde');if(s.date&&s.exists)text(s.date,774,y+104,37,1,'#cdbfd8');
      }
      hits.push({index:2,x:185,y:926,w:1080,h:160});if(current===2)diamond(540,1005,24,true);text('BACK',740,1005,48,6,current===2?'#ffe1a0':'#e5dccf');line(1054,260,1190);return;
    }
    const main=titleMenuState==='main',ys=main?[945]:[724,880,1030];panel(main?730:615,1086,170,1280);
    entries().forEach((entry,i)=>{
      const y=ys[i],active=current===i,disabled=!main&&i===1&&![1,2].some(slot=>saveSlotSummary(titleMenuIndex,slot).exists);
      hits.push({index:i,x:170,y:y-75,w:1110,h:150});if(active){line(y-55,250,1200,true);line(y+55,250,1200,true);diamond(277,y,34,true);}
      text(entry.toUpperCase(),760,y,53,5,disabled?'#918598':active?'#ffe1a0':'#e4dccb');
    });
  }
  function drawBanners(now){
    banners.forEach((b,i)=>{
      if(reduced()){ctx.drawImage(b.image,b.x,b.y,b.w,b.h);return;}
      // Warp at native resolution first, then draw once: no fractional strip seams.
      if(!b.surface){b.surface=document.createElement('canvas');b.surface.width=b.w+32;b.surface.height=b.h;}
      const paint=b.surface.getContext('2d');paint.clearRect(0,0,b.w+32,b.h);
      for(let y=0;y<b.h;y+=2){
        const t=y/b.h,dx=b.amp*3.4*Math.pow(t,1.15)*(.8*Math.sin(now/1050+i*.65-t*1.2)+.2*Math.sin(now/1700+i-t*3));
        paint.drawImage(b.image,0,y,b.w,Math.min(2,b.h-y),16+dx,y,b.w,Math.min(2,b.h-y));
      }
      ctx.drawImage(b.surface,b.x-16,b.y);

    });
  }
  // Move only the painted fire inside the glass. The lantern's metal frame,
  // roof and surrounding flowers stay fixed to the original illustration.
  function lanternFire(now){
    for(const points of [[[111,799],[147,800],[147,868],[112,863]],[[161,803],[176,798],[176,872],[161,878]]]){
      ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
      for(let y=797;y<880;y+=2){
        const height=Math.max(0,Math.min(1,(870-y)/65));
        const sway=height*(1.55*Math.sin(now/210+y*.095)+.7*Math.sin(now/113+y*.16));
        ctx.drawImage(art,106,y,76,2,106+sway,y,76,2);
      }
      ctx.globalCompositeOperation='soft-light';
      ctx.fillStyle=`rgba(255,176,55,${.13+.09*Math.sin(now/170)+.045*Math.sin(now/73)})`;
      ctx.fillRect(108,798,72,82);ctx.restore();
    }
  }
  function atmosphere(now){
    if(reduced())return;
    lanternFire(now);
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const [i,[x,y,r]] of [[133,837,43],[169,838,21],[1395,390,18],[1319,569,16],[1274,761,18],[1236,600,16],[254,298,12],[222,339,9],[285,388,9],[370,455,9],[497,489,8],[622,486,8],[1092,486,9],[1344,206,10]].entries()){
      const a=.15+.095*Math.sin(now/(270+i*19)+i*1.7)+.045*Math.sin(now/107+i),g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,211,113,${a})`);g.addColorStop(.36,`rgba(255,164,60,${a*.6})`);g.addColorStop(1,'#ffc26200');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(const [i,[x,y]] of [[560,26],[1130,40],[883,96],[725,50],[891,235],[715,126],[394,47],[981,18],[628,67],[482,31],[1203,90]].entries()){
      const a=Math.pow((Math.sin(now/(770+i*57)+i*1.9)+1)/2,4);ctx.globalAlpha=.08+a*.78;
      const r=1.5+a*5;ctx.shadowColor='#d5bcff';ctx.shadowBlur=5+a*7;ctx.strokeStyle='#f7e8ff';ctx.lineWidth=1.1;
      ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r*1.5);ctx.lineTo(x,y+r*1.5);ctx.stroke();
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,.65+a*.8,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;
    // One quiet meteor at a time, with a visible head and a tapering tail.
    const elapsed=(now+750)%5700;
    if(elapsed<1700){const t=elapsed/1700,right=Math.floor((now+750)/5700)%2===0,x=(right?1130:285)+(right?-170:170)*t,y=20+92*t,dx=right?-58:58;
      ctx.globalAlpha=Math.pow(Math.sin(t*Math.PI),.7)*.9;
      const g=ctx.createLinearGradient(x-dx,y-31,x,y);g.addColorStop(0,'#d7c8ff00');g.addColorStop(.75,'#c9adff');g.addColorStop(1,'#ffffff');ctx.strokeStyle=g;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x-dx,y-31);ctx.lineTo(x,y);ctx.stroke();ctx.shadowColor='#bca0ff';ctx.shadowBlur=9;ctx.fillStyle='#fff8ff';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  drawTitle=function(now=performance.now()){
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#070615';ctx.fillRect(0,0,canvas.width,canvas.height);
    if(!loaded){ctx.restore();return;}
    const l=layout();ctx.imageSmoothingEnabled=true;ctx.translate(l.x,l.y);ctx.scale(l.scale,l.scale);ctx.drawImage(art,0,0,W,H);ctx.drawImage(lute,36,562);drawBanners(now);window.TitleCharacterLife?.draw(ctx,now,reduced());atmosphere(now);drawMenu(now);ctx.restore();
    canvas.setAttribute('aria-label','Verseborn. '+(titleMenuState==='press'?'Press Start.':entries().join(', ')+'. Use arrow keys, Enter and Escape.'));
  };
  titleImageLayout=layout;
  titleMenuEntriesForState=()=>titleMenuState==='press'?['Press Start']:entries();
  moveTitleSelection=function(direction){if(titleMenuState==='press')return;if(titleMenuState==='main'){const i=titleModeIndices.indexOf(titleMenuIndex);titleMenuIndex=titleModeIndices[(i+direction+titleModeIndices.length)%titleModeIndices.length];}else titleSubmenuIndex=(titleSubmenuIndex+direction+3)%3;};
  openTitleSubmenu=function(){
    if(titleMenuState==='press'){titleMenuState='main';playSfx('menu');return;}
    titleMenuState=titleMenuIndex===0?'storyActions':'hallActions';titleSubmenuIndex=[1,2].some(slot=>saveSlotSummary(titleMenuIndex,slot).exists)?1:0;playSfx('menu');
  };
  closeTitleSubmenu=function(){
    if(titleMenuState==='main')titleMenuState='press';
    else if(slotMenu()){titleMenuState=titleMenuIndex===0?'storyActions':'hallActions';titleSubmenuIndex=intent==='new'?0:1;}
    else if(actionMenu()){titleMenuState='main';titleSubmenuIndex=0;}
    playSfx('menu');
  };
  activateTitleSelection=function(){
    if(!loaded)return;
    if(titleMenuState==='press'||titleMenuState==='main')return openTitleSubmenu();
    if(titleSubmenuIndex===2)return closeTitleSubmenu();
    if(actionMenu()){
      intent=titleSubmenuIndex===0?'new':'continue';if(intent==='continue'&&![1,2].some(slot=>saveSlotSummary(titleMenuIndex,slot).exists))return;
      titleMenuState=titleMenuIndex===0?'story':'hall';const preferred=[0,1].find(i=>saveSlotSummary(titleMenuIndex,i+1).exists===(intent==='continue'));titleSubmenuIndex=preferred??0;playSfx('menu');return;
    }
    if(!runtimeAssetsReady)return;
    const slot=titleSubmenuIndex+1,exists=saveSlotSummary(titleMenuIndex,slot).exists;if(intent==='continue'&&!exists)return;
    if(intent==='new'&&exists&&!window.confirm(`Start a new ${titleMenuIndex===0?'story':'Ember Hall run'} in Save ${slot===1?'I':'II'}? This slot's existing progress will be replaced.`))return;
    activeSaveSlot=slot;playSfx('menu');if(titleMenuIndex===1)startHallBattles(intent==='continue');else startTitleGame(intent==='continue');
  };
  titleMenuPointerTarget=function(event){
    if(!loaded)return null;const rect=canvas.getBoundingClientRect(),l=layout(),x=((event.clientX-rect.left)*canvas.width/rect.width-l.x)/l.scale,y=((event.clientY-rect.top)*canvas.height/rect.height-l.y)/l.scale;
    if(titleMenuState==='press')return x>=0&&x<=W&&y>=0&&y<=H?{kind:'confirm'}:null;
    const hit=hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);return hit?{kind:titleMenuState==='main'?'mode':'action',index:hit.index}:null;
  };
  canvas.addEventListener('pointermove',event=>{if(mode!=='title'||titleMenuState==='press')return;const target=titleMenuPointerTarget(event);if(target?.kind==='mode')titleMenuIndex=titleModeIndices[target.index];else if(target?.kind==='action')titleSubmenuIndex=target.index;});
  window.TitlePresentation={ready,layout,saveData,get intent(){return intent;},get hits(){return hits;},get loaded(){return loaded;}};
})();
