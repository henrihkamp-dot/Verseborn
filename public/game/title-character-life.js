// Local, feathered deformations keep the original illustration and grounded poses.
(()=>{
 'use strict';
 const regions=[
  {id:'verseborn-foot',points:[[298,743],[320,745],[336,765],[365,771],[376,792],[333,792],[311,779]],kind:'tap',amp:2.2,period:6100,phase:0},
  {id:'mira',points:[[322,555],[395,530],[450,527],[468,544],[450,575],[438,616],[374,650],[309,625]],kind:'wind',amp:1.15,period:4700,phase:1.7},
  {id:'seerin-hair',points:[[654,511],[699,522],[710,555],[684,602],[646,641],[579,678],[543,671],[550,620],[596,564]],kind:'wind',amp:1.65,period:5300,phase:3.1},
  {id:'torren-hair',points:[[985,582],[1026,589],[1045,624],[1023,651],[1004,690],[970,734],[936,749],[923,715],[941,661],[965,623]],kind:'wind',amp:1.35,period:5700,phase:4.3},
  {id:'sparky-jaw',points:[[1284,759],[1296,764],[1307,763],[1320,772],[1315,782],[1302,783],[1290,773]],kind:'jaw',amp:1.7,period:6900,phase:2.2}
 ];
 let source,ready=false,last=-Infinity,frame=0;
 function prepare(art){
  source=art;
  for(const r of regions){
   const xs=r.points.map(p=>p[0]),ys=r.points.map(p=>p[1]);r.x=Math.floor(Math.min(...xs))-6;r.y=Math.floor(Math.min(...ys))-6;r.w=Math.ceil(Math.max(...xs))-r.x+7;r.h=Math.ceil(Math.max(...ys))-r.y+7;
   r.surface=document.createElement('canvas');r.surface.width=r.w;r.surface.height=r.h;r.paint=r.surface.getContext('2d',{willReadFrequently:true});r.paint.drawImage(art,-r.x,-r.y);r.original=r.paint.getImageData(0,0,r.w,r.h);r.output=r.paint.createImageData(r.w,r.h);
   const mask=document.createElement('canvas');mask.width=r.w;mask.height=r.h;const m=mask.getContext('2d',{willReadFrequently:true});m.filter='blur(2px)';m.fillStyle='#fff';m.beginPath();r.points.forEach(([x,y],i)=>i?m.lineTo(x-r.x,y-r.y):m.moveTo(x-r.x,y-r.y));m.closePath();m.fill();r.weights=m.getImageData(0,0,r.w,r.h).data;
  }ready=true;
 }
 function update(now){
  if(now===last)return;last=now;frame++;
  for(const r of regions){
   const input=r.original.data,out=r.output.data,w=r.w,h=r.h,t=now/r.period*Math.PI*2+r.phase;
   // Pause between the small foot taps and mouth movements.
   const cycle=(now+r.phase*900)%r.period/r.period;
   const pulse=cycle<.24?Math.sin(cycle/.24*Math.PI)**2:0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=(y*w+x)*4,weight=r.weights[k+3]/255;let dx=0,dy=0;
    if(r.kind==='wind'){const root=Math.max(.12,y/h);dx=r.amp*weight*root*(Math.sin(t-y*.016)+.22*Math.sin(t*1.7+y*.04));dy=.28*weight*root*Math.sin(t*.8);}
    if(r.kind==='tap')dy=-r.amp*weight*pulse*Math.max(0,(x-8)/w);
    if(r.kind==='jaw')dy=-r.amp*weight*pulse;
    const sx=Math.max(0,Math.min(w-1.001,x-dx)),sy=Math.max(0,Math.min(h-1.001,y-dy)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,a=(iy*w+ix)*4,b=a+4,c=a+w*4,d=c+4;
    for(let q=0;q<3;q++)out[k+q]=(input[a+q]*(1-fx)+input[b+q]*fx)*(1-fy)+(input[c+q]*(1-fx)+input[d+q]*fx)*fy;out[k+3]=255;
   }r.paint.putImageData(r.output,0,0);
  }
 }
 function shimmer(ctx,x,y,r,time,phase,color){
  const strength=.08+.17*Math.pow((1+Math.sin(time/1700+phase))/2,3);ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${strength})`);g.addColorStop(.35,`rgba(${color},${strength*.65})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
 }
 window.TitleCharacterLife={prepare,draw(ctx,now,reduced){if(!ready||reduced)return;update(Math.floor(now/50)*50);for(const r of regions)ctx.drawImage(r.surface,r.x,r.y);shimmer(ctx,910,514,29,now,0,'194,102,255');shimmer(ctx,1262,783,20,now,2.4,'255,192,69');},get regions(){return regions.map(r=>r.id)},get frames(){return frame}};
})();
