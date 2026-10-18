// Original painted cutouts move over local restored underpainting.
(()=>{
 'use strict';
 const path='assets/ui/title-278/';let regions=[],art,mouth,frames=0;
 const image=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
 const ready=Promise.all([fetch(path+'regions.json').then(r=>r.json()).then(async data=>{regions=await Promise.all(data.map(async r=>({...r,cut:await image(path+r.id+'-cut.webp'),under:await image(path+r.id+'-under.webp')})));for(const r of regions){r.surface=document.createElement('canvas');r.surface.width=r.w+28;r.surface.height=r.h+14;r.paint=r.surface.getContext('2d');}}),image(path+'sparky-closed.webp').then(i=>mouth=i)]);
 function prepare(original){art=original;}
 function motion(r,now){const t=now/r.period*Math.PI*2+r.phase,cycle=(now+r.phase*900)%r.period/r.period;return r.kind==='tap'?{x:0,y:-r.amp*(cycle<.28?Math.sin(cycle/.28*Math.PI)**2:0)}:{x:r.amp*(Math.sin(t)+.18*Math.sin(t*1.7)),y:0};}
 function sparkle(ctx,x,y,r,time,phase,color){
  const pulse=Math.pow((1+Math.sin(time/1350+phase))/2,3),strength=.12+.62*pulse;
  ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${strength})`);g.addColorStop(.35,`rgba(${color},${strength*.65})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  ctx.globalAlpha=pulse*.8;ctx.strokeStyle='#fff2db';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();ctx.restore();
 }
 function draw(ctx,now,reduced){
  if(!art)return;if(reduced){ctx.drawImage(mouth,1280,750,46,43);return;}frames++;
  for(const r of regions){
   const m=motion(r,now),p=r.paint;p.clearRect(0,0,r.w+28,r.h+14);
   // Roots stay attached; only the free ends and the boot toe move.
   if(r.kind==='tap'){
    p.save();p.translate(14+12,7+6);p.rotate(m.y/70);p.drawImage(r.cut,-12,-6);p.restore();
   }else for(let y=0;y<r.h;y++){
    const free=Math.pow(y/r.h,.85),wave=m.x*free+Math.sin(now/1250+y*.035+r.phase)*free*.6;
    p.drawImage(r.cut,0,y,r.w,1,14+wave,7+y,r.w,1);
   }
   ctx.drawImage(r.under,r.x,r.y);ctx.drawImage(r.surface,r.x-14,r.y-7);
  }
  // The shield is a rigid foreground object in front of the flowing hair.
  ctx.save();ctx.beginPath();[[632,611],[656,637],[682,622],[669,692],[635,744],[592,775],[547,785],[546,746],[562,696],[587,654]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(art,0,0);ctx.restore();
  // Mira's armour, straps and cape remain rigid beneath the separate hair.
  ctx.save();ctx.beginPath();[[446,546],[481,546],[481,701],[345,701],[345,652],[359,645],[369,637],[378,631],[385,621],[396,615],[407,609],[425,604],[430,591],[436,577],[446,562]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(art,0,0);ctx.restore();
  // Mira's expression shifts slightly with her hair, without moving her feet.
  const dx=1.25*Math.sin(now/1700+1.7);ctx.save();ctx.beginPath();ctx.ellipse(450,547,12,17,-.2,0,Math.PI*2);ctx.clip();ctx.drawImage(art,434,528,34,40,434+dx,528,34,40);ctx.restore();
  // Distinct open and closed painted frames give Sparky an actual mouth cycle.
  const phase=now%18000,opening=phase>12000&&phase<14300?Math.pow(Math.sin((phase-12000)/2300*Math.PI),.65):0,close=1-opening;
  ctx.save();ctx.globalAlpha=close;ctx.drawImage(mouth,1280,750,46,43);ctx.restore();
  sparkle(ctx,910,514,29,now,0,'194,102,255');sparkle(ctx,1262,783,23,now,2.4,'255,190,65');
 }
 window.TitleCharacterLife={ready,prepare,draw,get regions(){return [...regions.map(r=>r.id),'mira-head','sparky-jaw']},get frames(){return frames},motionAt:now=>regions.map(r=>({id:r.id,...motion(r,now)}))};
})();

