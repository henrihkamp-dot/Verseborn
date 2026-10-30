// Light the existing poses; never replace frames, destinations, clocks or sizes.
(() => {
  'use strict';
  const surface=document.createElement('canvas');surface.width=surface.height=512;
  const g=surface.getContext('2d'),boundsCache=new WeakMap();
  function bounds(source,sx,sy,sw,sh){
    let frames=boundsCache.get(source);if(!frames){frames=new Map();boundsCache.set(source,frames);}
    const mutable=!source.naturalWidth,key=mutable?'mutable':`${sx},${sy},${sw},${sh}`;
    if(frames.has(key))return frames.get(key);
    pg.clearRect(0,0,48,48);pg.drawImage(source,sx,sy,sw,sh,0,0,48,48);
    const pixels=pg.getImageData(0,0,48,48).data;api.boundsReads++;
    let bottom=47,min=48,max=0,found=false;
    for(;bottom>0;bottom--){for(let x=0;x<48;x++)if(pixels[(bottom*48+x)*4+3]>48){found=true;break;}if(found)break;}
    for(let y=Math.max(0,bottom-5);y<=bottom;y++)for(let x=0;x<48;x++)if(pixels[(y*48+x)*4+3]>48){min=Math.min(min,x);max=Math.max(max,x);}
    const result={bottom,min,max};frames.set(key,result);return result;
  }
  const probe=document.createElement('canvas');probe.width=probe.height=48;
  const pg=probe.getContext('2d',{willReadFrequently:true});
  const colors={Mira:[179,112,255],Seerin:[255,218,126],Kael:[202,186,248],Glimmer:[121,219,255],Sparky:[184,99,255],Verseborn:[255,201,119],Torren:[255,174,96]};
  function draw(actor,camera,render){
    if(!api.enabled||state.map!=='emberHallBattles'||state.gameMode!=='hallBattles'||mode==='battle')return render();
    const original=ctx.drawImage,baseTransform=ctx.getTransform();
    const lamps=window.HallAtmosphere?.activeLamps()||[];
    const nearby=lamps.map(l=>({l,p:Math.max(0,1-Math.hypot(actor.x-l[0],actor.y-17-l[1])/(l[2]*1.5))})).sort((a,b)=>b.p-a.p).slice(0,2);
    let shadowed=false;
    ctx.drawImage=function(source,...args){
      const url=source.currentSrc||source.src||'';
      if(/portal|vortex/i.test(url))return original.call(this,source,...args);
      let sx=0,sy=0,sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height,dx,dy,dw,dh;
      if(args.length===8)[sx,sy,sw,sh,dx,dy,dw,dh]=args;
      else if(args.length===4)[dx,dy,dw,dh]=args;
      else return original.call(this,source,...args);
      if(!sw||!sh||dw<1||dh<1||sw*sh>2000000)return original.call(this,source,...args);
      // Repaint every draw: Tinus's coffee poses use a mutable blended canvas.
      if(sw>surface.width||sh>surface.height)return original.call(this,source,...args);
      let bottom,min,max;
      try{({bottom,min,max}=bounds(source,sx,sy,sw,sh));}catch{return original.call(this,source,...args);}
      // The fixed scratch buffer avoids reallocating a canvas for every actor.
      // Tint is still repainted every draw, including mutable coffee/idle poses.
      g.clearRect(0,0,sw,sh);g.globalCompositeOperation='source-over';g.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
      const feetX=dx+(min<=max?(min+max+1)/96:.5)*dw,feetY=dy+(bottom+1)/48*dh;
      if(!shadowed&&!actor.clipY&&dh>12){
        const anchor=actor.player?this.getTransform().inverse().transformPoint(baseTransform.transformPoint({x:actor.x-camera.x,y:actor.y-camera.y})):null;
        const groundY=anchor?anchor.y:feetY+(actor.id==='Glimmer'?(actor.labLift||0):0),rx=Math.max(2,Math.min(9,(max-min+1)/48*dw*.47));
        this.save();this.translate(anchor?anchor.x:feetX,groundY);this.scale(rx,Math.max(.8,rx*.23));
        const shade=this.createRadialGradient(0,0,0,0,0,1);shade.addColorStop(0,'rgba(9,5,14,.70)');shade.addColorStop(.4,'rgba(9,5,14,.4)');shade.addColorStop(1,'rgba(9,5,14,0)');this.fillStyle=shade;this.fillRect(-1,-1,2,2);this.restore();shadowed=true;
      }
      g.globalCompositeOperation='source-atop';
      const ambient=g.createLinearGradient(0,0,0,sh);ambient.addColorStop(0,'rgba(255,210,150,.09)');ambient.addColorStop(1,'rgba(34,23,58,.22)');g.fillStyle=ambient;g.fillRect(0,0,sw,sh);
      for(const {l,p} of nearby){if(p<=0)continue;const c=l[3]||[255,166,63],flip=this.getTransform().a<0?-1:1;
        const x=sw*(.5+Math.max(-.5,Math.min(.5,(l[0]-actor.x)/70))*flip),y=sh*.23;
        const light=g.createRadialGradient(x,y,0,x,y,Math.max(sw,sh)*.9);light.addColorStop(0,`rgba(${c},${p*.34})`);light.addColorStop(1,`rgba(${c},0)`);g.fillStyle=light;g.fillRect(0,0,sw,sh);
      }
      const c=colors[actor.id];if(c){const light=g.createRadialGradient(sw*.5,sh*.62,0,sw*.5,sh*.62,sh*.43);light.addColorStop(0,`rgba(${c},.15)`);light.addColorStop(1,`rgba(${c},0)`);g.fillStyle=light;g.fillRect(0,0,sw,sh);}
      g.globalCompositeOperation='source-over';
      return original.call(this,surface,0,0,sw,sh,dx,dy,dw,dh);
    };
    try{return render();}finally{ctx.drawImage=original;}
  }
  const api=window.HallCharacterLighting={enabled:true,boundsReads:0,draw};
})();
