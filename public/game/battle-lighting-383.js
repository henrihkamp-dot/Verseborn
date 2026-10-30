/* Presentation only: always delegate native frame selection and movement. */
(()=>{
  'use strict';
  let inScene=false,draws=0;
  const scratch=document.createElement('canvas'),paint=scratch.getContext('2d');
  const sample=document.createElement('canvas');sample.width=sample.height=64;const scan=sample.getContext('2d',{willReadFrequently:true});
  function contact(image,dx,dy,dw,dh,p,groundOffsetY=0){
    if(ctx.shadowOffsetX||ctx.shadowOffsetY)return;
    scan.clearRect(0,0,64,64);scan.drawImage(image,0,0,64,64);
    let pixels;try{pixels=scan.getImageData(0,0,64,64).data;}catch{return;}
    let bottom=0,top=64,left=64,right=0;
    for(let y=0;y<64;y++){let count=0;for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]>100){count++;left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);}if(count>=2)bottom=y+1;}
    if(!bottom||right<=left)return;
    let sum=0,count=0;for(let y=Math.max(0,bottom-5);y<bottom;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]>100){sum+=x+.5;count++;}
    const x=dx+dw*(count?sum/count:(left+right)/2)/64,y=dy+dh*bottom/64-.35-groundOffsetY,r=Math.max(2,Math.abs(dw)*(right-left)/64*.30);
    ctx.save();ctx.translate(x,y);ctx.scale(1,.19);
    let g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(5,4,10,.65)');g.addColorStop(.50,'rgba(5,4,10,.35)');g.addColorStop(1,'rgba(5,4,10,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
    if(p){
      ctx.save();ctx.globalCompositeOperation='screen';
      const sources=p[3]||[[p[1],p[2],p[0]]],width=Math.abs(dw)*(right-left)/64,height=Math.abs(dh)*(bottom-top)/64;
      for(const [u,v,colour]of sources){
        const lx=dx+dw*(left+(right-left)*u)/64,ly=dy+dh*(top+(bottom-top)*v)/64,reach=Math.max(width*.50,height*.29),floorRadius=r*2.5;
        // Local spill sits behind the unchanged silhouette, not over the UI.
        g=ctx.createRadialGradient(lx,ly,0,lx,ly,reach);g.addColorStop(0,`rgba(${colour},.50)`);g.addColorStop(.30,`rgba(${colour},.27)`);g.addColorStop(1,`rgba(${colour},0)`);ctx.fillStyle=g;ctx.fillRect(lx-reach,ly-reach,reach*2,reach*2);
        ctx.save();ctx.translate(lx,y);ctx.scale(1,.27);g=ctx.createRadialGradient(0,0,0,0,0,floorRadius);g.addColorStop(0,`rgba(${colour},.34)`);g.addColorStop(.45,`rgba(${colour},.16)`);g.addColorStop(1,`rgba(${colour},0)`);ctx.fillStyle=g;ctx.fillRect(-floorRadius,-floorRadius,floorRadius*2,floorRadius*2);ctx.restore();
      }
      ctx.restore();
    }
  }
  const profiles={Torren:['255,151,48',.77,.60],Seerin:['255,221,137',.58,.52,[[.59,.64,'255,222,142'],[.78,.55,'255,205,102']]],Mira:['174,103,255',.63,.65,[[.18,.69,'184,100,255'],[.80,.70,'161,94,255']]],Verseborn:['241,190,114',.61,.53],Kael:['245,221,164',.72,.35,[[.77,.38,'255,233,181'],[.28,.65,'141,101,225']]],Glimmer:['120,221,245',.72,.60,[[.78,.57,'114,223,255'],[.31,.63,'236,135,245']]],Sparky:['177,104,255',.74,.74,[[.24,.76,'176,93,255'],[.73,.43,'187,121,255']]],Tinus:['120,191,255',.72,.48,[[.74,.45,'116,194,255']]]};
  const shadowKael=['174,115,255',.72,.35,[[.77,.38,'179,109,255'],[.28,.65,'104,78,212']]];
  function profile(unit){return unit?.id==='Kael'&&unit.form==='shadowpriest'?shadowKael:profiles[unit?.id]||null;}
  function wash(c,w,h,p){
    c.globalCompositeOperation='source-atop';
    let g=c.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'rgba(248,218,165,.12)');g.addColorStop(.47,'rgba(99,100,138,.025)');g.addColorStop(1,'rgba(39,37,67,.17)');
    c.fillStyle=g;c.fillRect(0,0,w,h);
    if(p){for(const [u,v,colour]of p[3]||[[p[1],p[2],p[0]]]){g=c.createRadialGradient(w*u,h*v,0,w*u,h*v,w*.36);g.addColorStop(0,`rgba(${colour},.34)`);g.addColorStop(.45,`rgba(${colour},.13)`);g.addColorStop(1,`rgba(${colour},0)`);c.fillStyle=g;c.fillRect(0,0,w,h);}}
  }
  function litDraw(native,image,args,p,unit){
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
    contact(scratch,dx,dy,dw,dh,p,window.GlimmerMechAnimation?.offsetFor(unit)?.y||0);
    draws++;return native.call(ctx,scratch,0,0,w,h,dx,dy,dw,dh);
  }
  function wrap(native){return function(unit,...args){
    if(!inScene||mode!=='battle')return native.call(this,unit,...args);
    const draw=ctx.drawImage,p=profile(unit);
    ctx.drawImage=function(image,...a){return litDraw(draw,image,a,p,unit);};
    try{return native.call(this,unit,...args);}finally{ctx.drawImage=draw;}
  };}
  drawBattlePartySprite=wrap(drawBattlePartySprite);drawEnemy=wrap(drawEnemy);
  const shadow=drawFieldShadow;
  drawFieldShadow=function(x,y,r){
    if(!inScene||mode!=='battle')return shadow.apply(this,arguments);
    // Actual visible feet are measured from the current frame in litDraw.
  };
  const scene=drawBattleScene;
  drawBattleScene=function(...args){const previous=inScene;inScene=true;try{return scene.apply(this,args);}finally{inScene=previous;}};
  window.BattleLighting={get shadedDraws(){return draws;},get scratchPixels(){return scratch.width*scratch.height;}};
})();
