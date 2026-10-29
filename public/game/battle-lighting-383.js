/* Presentation only: always delegate native frame selection and movement. */
(()=>{
  'use strict';
  let inScene=false,draws=0;
  const scratch=document.createElement('canvas'),paint=scratch.getContext('2d');
  const profiles={Torren:['255,151,48',.77,.60],Seerin:['255,213,116',.58,.52],Mira:['174,103,255',.63,.65],Verseborn:['241,190,114',.61,.53],Kael:['245,221,164',.72,.35],Glimmer:['120,221,245',.72,.60],Sparky:['177,104,255',.74,.74],Tinus:['240,172,84',.72,.48]};
  function profile(unit){return profiles[unit?.id]||null;}
  function wash(c,w,h,p){
    c.globalCompositeOperation='source-atop';
    let g=c.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'rgba(248,218,165,.12)');g.addColorStop(.47,'rgba(99,100,138,.025)');g.addColorStop(1,'rgba(39,37,67,.17)');
    c.fillStyle=g;c.fillRect(0,0,w,h);
    if(p){g=c.createRadialGradient(w*p[1],h*p[2],0,w*p[1],h*p[2],w*.48);g.addColorStop(0,`rgba(${p[0]},.17)`);g.addColorStop(1,`rgba(${p[0]},0)`);c.fillStyle=g;c.fillRect(0,0,w,h);}
  }
  function litDraw(native,image,args,p){
    const iw=image?.naturalWidth||image?.videoWidth||image?.width,ih=image?.naturalHeight||image?.videoHeight||image?.height;
    if(!iw||!ih||![2,4,8].includes(args.length))return native.call(ctx,image,...args);
    const crop=args.length===8?args.slice(0,4):[0,0,iw,ih],dest=args.length===8?args.slice(4):args.length===4?args:[...args,iw,ih];
    const [sx,sy,sw,sh]=crop,[dx,dy,dw,dh]=dest;
    if(sw<=0||sh<=0||sw*sh>2097152)return native.call(ctx,image,...args);
    // Repaint EVERY draw. Idle blends use mutable canvases with stable identity.
    const w=Math.ceil(sw),h=Math.ceil(sh);
    if(scratch.width!==w)scratch.width=w;if(scratch.height!==h)scratch.height=h;
    paint.save();paint.setTransform(1,0,0,1,0,0);paint.globalAlpha=1;paint.globalCompositeOperation='source-over';paint.clearRect(0,0,w,h);
    paint.imageSmoothingEnabled=ctx.imageSmoothingEnabled;
    paint.drawImage(image,sx,sy,sw,sh,0,0,w,h);wash(paint,w,h,p);paint.restore();
    // The source-atop wash preserves the original alpha and exact draw bounds.
    draws++;return native.call(ctx,scratch,0,0,w,h,dx,dy,dw,dh);
  }
  function wrap(native){return function(unit,...args){
    if(!inScene||mode!=='battle')return native.call(this,unit,...args);
    const draw=ctx.drawImage,p=profile(unit);
    ctx.drawImage=function(image,...a){return litDraw(draw,image,a,p);};
    try{return native.call(this,unit,...args);}finally{ctx.drawImage=draw;}
  };}
  drawBattlePartySprite=wrap(drawBattlePartySprite);drawEnemy=wrap(drawEnemy);
  const shadow=drawFieldShadow;
  drawFieldShadow=function(x,y,r){
    if(!inScene||mode!=='battle')return shadow.apply(this,arguments);
    ctx.save();ctx.translate(x,y);ctx.scale(1,.27);
    let g=ctx.createRadialGradient(-r*.38,r*.20,0,-r*.38,r*.20,r*1.7);g.addColorStop(0,'rgba(9,7,18,.40)');g.addColorStop(.48,'rgba(9,7,18,.20)');g.addColorStop(1,'rgba(9,7,18,0)');ctx.fillStyle=g;ctx.fillRect(-r*2.1,-r*1.6,r*3.5,r*3.5);
    g=ctx.createRadialGradient(0,0,0,0,0,r*.82);g.addColorStop(0,'rgba(7,6,12,.52)');g.addColorStop(1,'rgba(7,6,12,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
  };
  const backdrop=drawBattleBackground;
  drawBattleBackground=function(...args){
    const result=backdrop.apply(this,args);
    if(!inScene||mode!=='battle'||!battle)return result;
    ctx.save();ctx.beginPath();ctx.rect(0,0,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT);ctx.clip();ctx.globalCompositeOperation='screen';
    battle.party.forEach((unit,i)=>{
      const p=profile(unit);if(!p||unit.hp<=0||unit.anim==='melee'||unit.anim==='attack')return;
      const [x,y]=partyBattlePosition(i,battle.party.length),radius=unit.id==='Torren'?34:25;
      const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,`rgba(${p[0]},.12)`);g.addColorStop(.45,`rgba(${p[0]},.045)`);g.addColorStop(1,`rgba(${p[0]},0)`);
      ctx.save();ctx.translate(x,y);ctx.scale(1,.42);ctx.translate(-x,-y);ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.restore();
    });ctx.restore();return result;
  };
  const scene=drawBattleScene;
  drawBattleScene=function(...args){const previous=inScene;inScene=true;try{return scene.apply(this,args);}finally{inScene=previous;}};
  window.BattleLighting={get shadedDraws(){return draws;},get scratchPixels(){return scratch.width*scratch.height;}};
})();
