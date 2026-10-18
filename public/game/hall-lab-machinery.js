// Animate the painted liquid, wheel and rotor regions; furniture/glass stay fixed.
(() => {
  'use strict';
  const COUNT=48,FRAME_MS=100,region={x:1170,y:20,w:305,h:200},frames=[],propFrames=[[],[],[]],images={};
  let loaded=false;
  const load=(key,url)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[key]=image;resolve();};image.onerror=()=>reject(Error('Lab animation source unavailable: '+key));image.src=url;});
  const ready=Promise.all([load('hall','assets/hall/hall.webp'),load('props','assets/hall/glimmer-repair-props-v244.webp'),load('steam','assets/hall/living-256/torren-kitchen.webp')]).then(()=>{build();loaded=true;});
  ready.catch(error=>console.error(error));
  const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const liquids=[
    {x:1210,y:119,rx:2,ry:7},
    {x:1335,y:108,rx:4.3,ry:6.5},{x:1352,y:126,rx:3.3,ry:5.5},
    {x:1371,y:129,rx:4.5,ry:2},{x:1371,y:75,rx:7,ry:3.5},
    {x:1371,y:89,rx:3.2,ry:6.5},{x:1326,y:123,rx:3.5,ry:1.8},
    {x:1416,y:119,rx:2,ry:4.5}
  ];
  function liquid(p,source,v,phase,offset=0){
    const x=Math.floor(v.x-v.rx),y=Math.floor(v.y-v.ry),w=Math.ceil(v.rx*2),h=Math.ceil(v.ry*2);
    p.save();p.beginPath();p.ellipse(v.x,v.y,v.rx,v.ry,0,0,Math.PI*2);p.clip();
    // Circulating colour is sampled from the original painted glass interior.
    // Its border, fittings and vessel silhouette never move.
    for(let row=0;row<h;row++){
      const shift=Math.floor(((phase*2+offset)%1)*h),sy=y+(row+shift)%h;
      p.drawImage(source,x,sy,w,1,x+Math.sin(row*.7+phase*Math.PI*4+offset)*.45,y+row,w,1);
    }
    p.strokeStyle='#f9d6ff';p.lineWidth=.55;
    for(let j=0;j<3;j++){
      const age=(phase*2+j/3+offset)%1,bx=v.x+Math.sin(j*4+age*4)*v.rx*.45,by=v.y+v.ry-age*v.ry*2;
      p.globalAlpha=Math.sin(age*Math.PI)*.75;p.beginPath();p.ellipse(bx,by,.55+(j%2)*.3,.7+(j%2)*.35,0,0,Math.PI*2);p.stroke();
    }
    p.restore();
  }
  function wheel(p,source,x,y,rx,ry,angle,sx=x,sy=y){
    p.save();p.beginPath();p.ellipse(x,y,rx,ry,0,0,Math.PI*2);p.clip();
    p.fillStyle='#332218';p.fillRect(x-rx,y-ry,rx*2,ry*2);
    p.translate(x,y);p.scale(1,ry/rx);p.rotate(angle);
    p.drawImage(source,sx-rx,sy-ry,rx*2,ry*2,-rx,-rx,rx*2,rx*2);p.restore();
  }
  function build(){
    const hall=images.hall,props=images.props,cell=props.width/3,steamCell=images.steam.width/4;
    for(let k=0;k<COUNT;k++){
      const phase=k/COUNT,angle=phase*Math.PI*2,c=surface(region.w,region.h),p=c.getContext('2d');
      p.imageSmoothingEnabled=false;p.translate(-region.x,-region.y);p.drawImage(hall,0,0);
      liquids.forEach((v,i)=>liquid(p,hall,v,phase,i*.137));
      // The little handwheel above the brewing kettle turns in its tabletop plane.
      wheel(p,hall,1311,76,7,3,angle);
      // Kettle steam rises from its opening in staggered, textured wisps.
      for(const [i,x,y] of [[0,1311,77],[1,1369,65]])for(let j=0;j<3;j++){
        const age=(phase+j/3+i*.2)%1,w=10+age*8,h=5+age*7;
        p.save();p.globalAlpha=Math.sin(age*Math.PI)*.36;
        p.drawImage(images.steam,Math.floor((k/4+j)%4)*steamCell,steamCell*2,steamCell,steamCell*.3,x-w/2+Math.sin(age*5+j)*1.5,y-7-age*12,w,h);p.restore();
      }
      // Pinpricks drift upwards inside the existing purple resonance plume.
      p.save();p.globalCompositeOperation='screen';
      for(let j=0;j<7;j++){
        const age=(phase+j/7)%1;p.globalAlpha=Math.sin(age*Math.PI)*.75;p.fillStyle=j%2?'#f5bbff':'#dc8dff';
        p.fillRect(1357+j%3*8+Math.sin(age*5+j)*2,62-age*35,1,j%2?1:2);
      }
      p.restore();frames.push(c);
      for(let index=0;index<3;index++){
        const base=surface(cell,cell),g=base.getContext('2d');g.drawImage(props,index*cell,0,cell,cell,0,0,cell,cell);
        const original=surface(cell,cell);original.getContext('2d').drawImage(base,0,0);g.imageSmoothingEnabled=false;
        if(index===0){
          wheel(g,original,34,40,9,12,angle);wheel(g,original,54,45,5.5,7,-angle*2);
        }else if(index===1){
          liquid(g,original,{x:38,y:41,rx:5.1,ry:11},phase);
          liquid(g,original,{x:20,y:44,rx:2.4,ry:7},phase,.35);
          wheel(g,original,37,9,10,3.5,angle);
          g.save();g.translate(56,29);g.rotate(Math.sin(angle)*.3);g.strokeStyle='#302122';g.lineWidth=1;g.beginPath();g.moveTo(0,1);g.lineTo(3,-5);g.stroke();g.restore();
        }else{
          // Reuse the actual painted propeller as a rotating planar part.
          g.clearRect(5,0,75,22);g.save();g.translate(43,13);g.scale(1,.23);g.rotate(angle*2);
          g.drawImage(original,7,0,73,21,-36.5,-36.5,73,73);g.restore();
          g.drawImage(original,38,10,11,15,38,10,11,15);
          liquid(g,original,{x:43,y:43,rx:3.7,ry:4.5},phase,.2);
        }
        propFrames[index].push(base);
      }
    }
  }
  function frameAt(now){return Math.floor(Math.max(0,now)/FRAME_MS)%COUNT;}
  function draw(camera,now){
    if(!loaded||!state.party.includes('Glimmer')||state.map!=='emberHallBattles')return false;
    const sx=images.hall.width/640,sy=images.hall.height/356;
    ctx.drawImage(frames[frameAt(now)],region.x/sx-camera.x,region.y/sy-camera.y,region.w/sx,region.h/sy);return true;
  }
  function drawProp(index,x,y,width,camera,now){
    if(!loaded)return false;ctx.drawImage(propFrames[index][frameAt(now)],x-camera.x-width/2,y-camera.y-width,width,width);return true;
  }
  window.HallLabMachinery={ready,draw,drawProp,frameAt,frames,propFrames,region,liquids,count:COUNT,frameMs:FRAME_MS,get loaded(){return loaded;}};
})();
