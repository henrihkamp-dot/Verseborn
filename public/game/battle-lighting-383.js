/* Presentation only: always delegate native frame selection and movement. */
(()=>{
  'use strict';
  let inScene=false,draws=0;
  const scratch=document.createElement('canvas'),paint=scratch.getContext('2d');
  const sample=document.createElement('canvas');sample.width=sample.height=64;const scan=sample.getContext('2d',{willReadFrequently:true});
  function contact(image,dx,dy,dw,dh,p){
    if(ctx.shadowOffsetX||ctx.shadowOffsetY)return;
    scan.clearRect(0,0,64,64);scan.drawImage(image,0,0,64,64);
    let pixels;try{pixels=scan.getImageData(0,0,64,64).data;}catch{return;}
    let bottom=0,left=64,right=0;
    for(let y=0;y<64;y++){let count=0;for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]>100){count++;left=Math.min(left,x);right=Math.max(right,x+1);}if(count>=2)bottom=y+1;}
    if(!bottom||right<=left)return;
    let sum=0,count=0;for(let y=Math.max(0,bottom-5);y<bottom;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]>100){sum+=x+.5;count++;}
    const x=dx+dw*(count?sum/count:(left+right)/2)/64,y=dy+dh*bottom/64-.35,r=Math.max(2,Math.abs(dw)*(right-left)/64*.30);
    ctx.save();ctx.translate(x,y);ctx.scale(1,.19);
    let g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(5,4,10,.65)');g.addColorStop(.50,'rgba(5,4,10,.35)');g.addColorStop(1,'rgba(5,4,10,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
    if(p){ctx.save();ctx.globalCompositeOperation='screen';ctx.translate(x,y);ctx.scale(1,.30);g=ctx.createRadialGradient(0,0,0,0,0,r*1.7);g.addColorStop(0,`rgba(${p[0]},.065)`);g.addColorStop(1,`rgba(${p[0]},0)`);ctx.fillStyle=g;ctx.fillRect(-r*1.7,-r*1.7,r*3.4,r*3.4);ctx.restore();}
  }
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
    contact(scratch,dx,dy,dw,dh,p);
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
    // Actual visible feet are measured from the current frame in litDraw.
  };
  const scene=drawBattleScene;
  drawBattleScene=function(...args){const previous=inScene;inScene=true;try{return scene.apply(this,args);}finally{inScene=previous;}};
  window.BattleLighting={get shadedDraws(){return draws;},get scratchPixels(){return scratch.width*scratch.height;}};
})();
