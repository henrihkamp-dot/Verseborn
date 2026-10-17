// New whole-character idle drawings for Rift battles. Native combat rows remain in use.
(() => {
  'use strict';
  const sheets=new Map(),clocks=new WeakMap(),buffers=new Map();
  function phaseAt(config,elapsed){
    let t=((elapsed%config.cycleMs)+config.cycleMs)%config.cycleMs;
    for(let i=0;i<config.durations.length;i++){
      const duration=config.durations[i];
      if(t<duration){const p=t/duration;return {frame:i,next:(i+1)%8,mix:p*p*(3-2*p)};}
      t-=duration;
    }
    return {frame:0,next:1,mix:0};
  }
  const ready=(async()=>{
    const response=await fetch('assets/rift/idle-246/manifest.json?v=246');if(!response.ok)throw Error('Rift idle manifest unavailable');
    const manifest=await response.json();
    const load=file=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Rift idle '+file));image.src='assets/rift/idle-246/'+file;});
    await Promise.all(Object.entries(manifest).map(async([key,c])=>{const [image,flow]=await Promise.all([load(c.file),load(c.flow)]);sheets.set(key,{...c,image,flow});}));
  })();ready.catch(error=>console.error(error));
  // Motion-guided in-betweens move the source details before blending. Plain
  // crossfades produced duplicate blades and translucent silhouette edges.
  const surface=document.createElement('canvas');surface.width=320;surface.height=280;
  const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:false});
  let program,locations;const textures=new Map();
  if(gl){
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 uv;void main(){uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5);gl_Position=vec4(position,0,1);}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;
      varying vec2 uv;uniform sampler2D art;uniform sampler2D motion;uniform float frame;uniform float nextFrame;uniform float amount;
      vec2 flowAt(float row){vec2 fuv=vec2((frame*40.0+clamp(uv.x*40.0,.5,39.5))/320.0,(row*35.0+clamp(uv.y*35.0,.5,34.5))/70.0);return clamp((texture2D(motion,fuv).rg*255.0-128.0)*.5,vec2(-20.0),vec2(20.0))/vec2(320,280);}
      vec4 pose(float index,vec2 p){p=clamp(p,vec2(.001),vec2(.999));vec4 c=texture2D(art,vec2((index+p.x)/8.0,p.y));return vec4(c.rgb*c.a,c.a);}
      void main(){vec4 a=pose(frame,uv-amount*flowAt(0.0));vec4 b=pose(nextFrame,uv-(1.0-amount)*flowAt(1.0));gl_FragColor=mix(a,b,amount);}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    locations=Object.fromEntries(['art','motion','frame','nextFrame','amount'].map(n=>[n,gl.getUniformLocation(program,n)]));gl.uniform1i(locations.art,0);gl.uniform1i(locations.motion,1);
  }
  function guidedFrame(key,c,phase){
    if(!gl)return blendedFrame(key,c,{...phase,mix:0});
    let pair=textures.get(key);if(!pair){pair=[c.image,c.flow].map(image=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return t;});textures.set(key,pair);}
    pair.forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);});gl.uniform1f(locations.frame,phase.frame);gl.uniform1f(locations.nextFrame,phase.next);gl.uniform1f(locations.amount,phase.mix);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return surface;
  }
  function blendedFrame(key,c,phase){
    let canvas=buffers.get(key);if(!canvas){canvas=document.createElement('canvas');canvas.width=c.cellWidth;canvas.height=c.cellHeight;buffers.set(key,canvas);}
    const paint=canvas.getContext('2d');paint.clearRect(0,0,canvas.width,canvas.height);paint.globalCompositeOperation='source-over';paint.globalAlpha=1-phase.mix;
    paint.drawImage(c.image,phase.frame*c.cellWidth,0,c.cellWidth,c.cellHeight,0,0,c.cellWidth,c.cellHeight);
    if(phase.mix){paint.globalCompositeOperation='lighter';paint.globalAlpha=phase.mix;paint.drawImage(c.image,phase.next*c.cellWidth,0,c.cellWidth,c.cellHeight,0,0,c.cellWidth,c.cellHeight);}
    paint.globalAlpha=1;paint.globalCompositeOperation='source-over';return canvas;
  }
  function draw(key,c,x,y,elapsed,height){
    const scale=height/c.referenceHeight,groundX=Math.max(2+c.leftExtent*scale,Math.min(LOGICAL_WIDTH-2-c.rightExtent*scale,x));
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(guidedFrame(key,c,phaseAt(c,elapsed)),groundX-c.anchorX*scale,y-c.baseline*scale,c.cellWidth*scale,c.cellHeight*scale);ctx.restore();
  }
  const original=drawAnimatedEnemy;
  drawAnimatedEnemy=function(unit,px,py){
    const c=sheets.get(unit.riftKey),native=window.EmberRift?.sheets[unit.riftKey];
    if(!battle?.riftEncounter||!c||!native||unit.hp<=0||['attack','death'].includes(unit.anim))return original(unit,px,py);
    const key=unit.riftKey,size=key==='dragon'?78:key==='engine'?70:unit.riftBoss?56:['warden','bear','brute'].includes(key)?49:['fae','mina','sella'].includes(key)?36:43;
    const nativeScale=Math.min(size/native.referenceHeight,105/(native.maxCellWidth||native.cells[0][2]));
    const now=performance.now();if(!clocks.has(unit))clocks.set(unit,now-(battle.enemies.indexOf(unit)||0)*467);
    draw(key,c,px+8,py+31,now-clocks.get(unit),nativeScale*native.referenceHeight);return true;
  };
  window.RiftEnemyIdle={ready,phaseAt,preview(key,x,y,t,height=90){const c=sheets.get(key);if(c)draw(key,c,x,y,t,height);},get manifest(){return Object.fromEntries(sheets);}};
})();
