// World-space candlelight: shared by exploration and Hall cinematics, beneath interface text.
(()=>{
 const W=640,H=356,lamps=[[87,32,53],[43,21,24],[149,25,26],[173,14,24],[189,18,24],[192,57,30],[229,73,37],[265,21,28],[366,21,28],[438,48,32],[480,14,25],[500,33,26],[604,22,28],[50,123,49],[152,121,44],[172,132,33],[123,132,53],[256,141,36],[373,141,36],[455,130,30],[489,122,28],[591,122,29],[574,143,69,[255,166,63],.22],[21,229,29],[74,214,29],[133,213,55],[141,229,57],[25,278,31],[226,235,37],[415,235,37],[474,220,28],[528,218,29],[615,230,29],[608,246,28],[491,246,64]];
 const shade=document.createElement('canvas');shade.width=W;shade.height=H;const s=shade.getContext('2d');
 let signature=null;
 function activeLamps(){
  const active=lamps.filter(([x,y])=>{const room=window.emberHallWorld?.closedRooms.find(({rect:[rx,ry,rw,rh]})=>x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh);return !room||state.party.includes(room.owner);});
  // Fixed apparatus casts onto its surroundings; only Sparky's tail follows its owner.
  if(state.party.includes('Glimmer'))active.push([463,39,45,[190,91,255],.23],[559,37,50,[185,83,255],.24]);
  if(!window.HallOpening?.active||HallOpening.stage===5)active.push([300,83,31,[174,87,255],.2],[335,81,33,[184,96,255],.2],[315,113,37,[255,151,52],.22]);
  if(state.party.includes('Sparky')){const sparky=window.emberHallWorld?.actors.find(a=>a.id==='Sparky');if(sparky)active.push([sparky.x,sparky.y-9,30,[204,160,255],.10],[sparky.x-12,sparky.y-8,19,[190,101,255],.24]);}
  return active;
 }
 function rebuild(active){const key=JSON.stringify(active);if(key===signature)return;signature=key;
  s.clearRect(0,0,W,H);s.globalCompositeOperation='source-over';s.fillStyle='rgba(9,6,12,.72)';s.fillRect(0,0,W,H);
  s.globalCompositeOperation='destination-out';for(const[x,y,r]of active){const radius=r*1.34,g=s.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,'rgba(0,0,0,.92)');g.addColorStop(.28,'rgba(0,0,0,.8)');g.addColorStop(.62,'rgba(0,0,0,.36)');g.addColorStop(1,'transparent');s.fillStyle=g;s.fillRect(x-radius,y-radius,radius*2,radius*2);}
  s.globalCompositeOperation='source-over';const edge=s.createRadialGradient(320,173,110,320,173,365);edge.addColorStop(0,'transparent');edge.addColorStop(.55,'rgba(8,6,12,.13)');edge.addColorStop(1,'rgba(6,4,10,.66)');s.fillStyle=edge;s.fillRect(0,0,W,H);
 }
 const haze=document.createElement('canvas');haze.width=W+120;haze.height=H;const h=haze.getContext('2d');
 for(let i=0;i<15;i++){const x=(i*149)%760,y=30+(i*73)%290;h.save();h.translate(x,y);h.scale(1,.22);const g=h.createRadialGradient(0,0,0,0,0,92);g.addColorStop(0,'rgba(187,167,137,.085)');g.addColorStop(.45,'rgba(158,145,132,.035)');g.addColorStop(1,'transparent');h.fillStyle=g;h.fillRect(-92,-92,184,184);h.restore();}
 function draw(camera={x:0,y:0},now=performance.now(),width=LOGICAL_WIDTH,height=LOGICAL_HEIGHT){
  const active=activeLamps();rebuild(active);const x=camera.x||0,y=camera.y||0;ctx.save();ctx.drawImage(shade,-x,-y);ctx.globalCompositeOperation='screen';
  for(let i=0;i<active.length;i++){const[lx,ly,r,color=[255,166,63],power=.17]=active[i];if(lx+r<x||lx-r>x+width||ly+r<y||ly-r>y+height)continue;const flicker=.88+.07*Math.sin(now/730+i*2.4)+.035*Math.sin(now/271+i);const g=ctx.createRadialGradient(lx-x,ly-y,0,lx-x,ly-y,r);g.addColorStop(0,`rgba(${color.join(',')},${power*flicker})`);g.addColorStop(.32,`rgba(${color.map(v=>Math.round(v*.82)).join(',')},${power*.56*flicker})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(lx-x-r,ly-y-r,r*2,r*2);}
  ctx.globalCompositeOperation='source-over';ctx.drawImage(haze,-60-x+Math.sin(now/19000)*18,-y+Math.sin(now/23000)*3);
  const vignette=ctx.createRadialGradient(width*.5,height*.48,width*.21,width*.5,height*.5,Math.max(width,height)*.65);vignette.addColorStop(0,'transparent');vignette.addColorStop(.65,'rgba(9,6,12,.08)');vignette.addColorStop(1,'rgba(6,4,10,.36)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);ctx.restore();
 }
 window.HallAtmosphere={draw,activeLamps};
})();
