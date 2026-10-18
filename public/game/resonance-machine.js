// Twelve locally animated frames, with the original brass housing and foot anchor fixed.
(() => {
  'use strict';
  const COUNT=12,FRAME_MS=160,frames=[];let loaded=false;
  const fire=new Image();
  const whenReady=new Promise((resolve,reject)=>{fire.onload=()=>{const until=performance.now()+20000;const prepare=()=>{if(stageSelectorImage){build();loaded=true;resolve();}else if(performance.now()>until)reject(Error('Resonance machine source unavailable'));else setTimeout(prepare,50);};prepare();};fire.onerror=()=>reject(Error('Machine flame animation unavailable'));fire.src='assets/ui/machine-255/furnace-fire.webp';});
  whenReady.catch(error=>console.error(error));
  function surface(){const c=document.createElement('canvas');c.width=320;c.height=300;return c;}
  function build(){
    const original=surface(),o=original.getContext('2d');o.drawImage(stageSelectorImage,0,0,320,300,0,0,320,300);
    const base=surface(),b=base.getContext('2d');b.drawImage(original,0,0);
    // Remove the old baked-in note and smoke silhouettes before animating them.
    b.clearRect(120,27,24,37);b.clearRect(179,26,26,40);b.clearRect(225,45,58,60);
    const noteA={x:120,y:27,w:24,h:37},noteB={x:179,y:26,w:26,h:40},cloud={x:245,y:49,w:36,h:34};
    function piece(p,x,y,w=p.w,h=p.h){return[p.x,p.y,p.w,p.h,x,y,w,h];}
    for(let k=0;k<COUNT;k++){
      const c=surface(),p=c.getContext('2d'),phase=k/COUNT,angle=phase*Math.PI*2;p.imageSmoothingEnabled=false;p.drawImage(base,0,0);
      // Liquid texture actually travels up each tube, with a few rising bubbles.
      for(const tube of [{x:113,y:188,w:7,h:34},{x:243,y:150,w:6,h:19}]){
        const offset=Math.round(phase*tube.h)%tube.h;p.save();p.beginPath();p.rect(tube.x,tube.y,tube.w,tube.h);p.clip();
        if(offset)p.drawImage(original,tube.x,tube.y+offset,tube.w,tube.h-offset,tube.x,tube.y,tube.w,tube.h-offset);
        p.drawImage(original,tube.x,tube.y,tube.w,offset||tube.h,tube.x,tube.y+tube.h-offset,tube.w,offset||tube.h);
        p.fillStyle='#f3c8ff';for(let j=0;j<3;j++){const a=(phase+j/3)%1;p.globalAlpha=.35+.35*Math.sin(a*Math.PI);p.fillRect(tube.x+1+(j%2)*2,tube.y+tube.h-a*tube.h,1,j%2?2:1);}p.restore();
      }
      // Only the core's contents swirl; its frame and glass outline remain fixed.
      p.save();p.beginPath();p.ellipse(160,107,17,19,0,0,Math.PI*2);p.clip();p.translate(160,107);p.rotate(angle);p.globalAlpha=.72;p.drawImage(original,141,87,38,40,-19,-20,38,40);p.restore();
      // Real rotating wheel art, counter-rotating around fixed hubs.
      for(const gear of [{x:213,y:189,r:15,dir:1},{x:225,y:236,r:19,dir:-1}]){
        p.save();p.beginPath();p.arc(gear.x,gear.y,gear.r,0,Math.PI*2);p.clip();p.fillStyle='#2a1b19';p.fillRect(gear.x-gear.r,gear.y-gear.r,gear.r*2,gear.r*2);p.translate(gear.x,gear.y);p.rotate(angle*gear.dir);p.drawImage(original,gear.x-gear.r,gear.y-gear.r,gear.r*2,gear.r*2,-gear.r,-gear.r,gear.r*2,gear.r*2);p.restore();
      }
      // The pressure needle moves locally, never through a scale pulse.
      p.save();p.translate(208,143);p.rotate(Math.sin(angle)*.16);p.strokeStyle='#efe1b3';p.lineWidth=1;p.beginPath();p.moveTo(0,1);p.lineTo(6,-6);p.stroke();p.restore();
      p.save();p.beginPath();p.ellipse(159,215,20,20,0,0,Math.PI*2);p.clip();const heat=p.createRadialGradient(159,229,1,159,219,28);heat.addColorStop(0,'#ffc54c');heat.addColorStop(.43,'#d8580e');heat.addColorStop(1,'#42180d');p.fillStyle=heat;p.fillRect(137,193,44,43);p.drawImage(fire,k*64,0,64,64,131,178,56,61);p.restore();
      // Keep the original iron grate in front of the animated fire.
      for(const x of [145,153,162,170])p.drawImage(original,x,218,3,17,x,218,3,17);
      // The same note sprites now drift, bob and change their angle.
      for(const [j,note]of[noteA,noteB].entries()){
        const a=(phase+j*.5)%1;p.save();p.globalAlpha=Math.sin(a*Math.PI)*.95;p.translate(note.x+note.w/2+Math.sin(a*6+j)*3,note.y+note.h/2-a*13);p.rotate(Math.sin(angle+j)*.09);p.drawImage(original,...piece(note,-note.w/2,-note.h/2));p.restore();
      }
      // Textured smoke puffs leave the nozzle, rise, expand and disperse.
      for(let j=0;j<4;j++){
        const a=(phase+j/4)%1,size=12+a*20;p.save();p.globalAlpha=Math.sin(a*Math.PI)*.8;p.drawImage(original,...piece(cloud,226+a*23+Math.sin(a*7+j)*2,101-a*59,size,size*.9));p.restore();
      }
      // Occasional short sparks at the tuning contact and furnace lip.
      if([2,3,7,8].includes(k)){p.fillStyle=k%2?'#ffeac3':'#db9bff';for(let j=0;j<3;j++){const x=174+j*3,y=74-j*4-(k%2)*2;p.fillRect(x,y,1,2);}}
      frames.push(c);
    }
  }
  function frameAt(now){return Math.floor(Math.max(0,now)/FRAME_MS)%COUNT;}
  function draw(context,image,x,baseline,width,height,now=performance.now()){
    if(!loaded)return false;context.drawImage(frames[frameAt(now)],x-width/2,baseline-height,width,height);return true;
  }
  window.ResonanceMachine={whenReady,draw,frameAt,frames,count:COUNT,frameMs:FRAME_MS,get ready(){return loaded;}};
})();
