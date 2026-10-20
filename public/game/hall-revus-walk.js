// Joint-driven guest walk. Each foot has its own opposite-phase trajectory;
// stance feet stay planted as the actor travels. No generated pose cycle.
(() => {
  const tau=Math.PI*2;
  const shape=(g,points)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
  const near={hip:[74,69],knee:[83,87],ankle:[94,104],toe:[105,104],thigh:[[67,66],[79,66],[87,83],[90,91],[80,96],[73,82]],shin:[[79,85],[89,84],[98,101],[94,108],[86,106],[81,95]],foot:[[88,101],[97,100],[99,103],[107,102],[110,105],[106,109],[95,112],[88,108]]};
  const far={hip:[70,70],knee:[60,91],ankle:[53,107],toe:[65,109],thigh:[[64,67],[75,72],[70,85],[62,96],[51,94],[56,82]],shin:[[51,90],[62,93],[58,103],[55,109],[48,109],[46,103]],foot:[[48,103],[56,105],[58,108],[65,108],[69,111],[64,113],[53,112],[47,109]]};
  function foot(phase,hipX){
    phase=((phase%1)+1)%1;
    if(phase<.5)return{x:hipX+10-40*phase,y:107,stance:true};
    const t=(phase-.5)*2;return{x:hipX-10+20*t,y:107-3*Math.sin(Math.PI*t),stance:false};
  }
  function joints(phase){
    const bob=.25*Math.cos(phase*tau*2),solve=(leg,p)=>{
      const h={x:leg.hip[0],y:leg.hip[1]+bob},f=foot(p,h.x),dx=f.x-h.x,dy=f.y-h.y,d=Math.hypot(dx,dy),a=d/2,b=f.stance?1.5:1.5+4*Math.sin(Math.PI*((p%1+1)%1-.5)*2);
      return{hip:h,knee:{x:h.x+dx/d*a+dy/d*b,y:h.y+dy/d*a-dx/d*b},ankle:f,toe:{x:f.x+leg.toe[0]-leg.ankle[0],y:f.y+leg.toe[1]-leg.ankle[1]}};
    };
    return{near:solve(near,phase),far:solve(far,phase+.5),bob};
  }
  function segment(g,image,polygon,a,b,toA,toB){
    const dx=b[0]-a[0],dy=b[1]-a[1],tx=toB.x-toA.x,ty=toB.y-toA.y;
    g.save();g.translate(toA.x,toA.y);g.rotate(Math.atan2(ty,tx));g.scale(Math.hypot(tx,ty)/Math.hypot(dx,dy),1);g.rotate(-Math.atan2(dy,dx));g.translate(-a[0],-a[1]);shape(g,polygon);g.clip();g.drawImage(image,0,0,128,128);g.restore();
  }
  function draw(g,image,x,y,size,distance,facing=1){
    const phase=(distance/40)%1,j=joints(phase);g.save();g.translate(x,y);g.scale((facing<0?-1:1)*size/128,size/128);g.translate(-70,-107);
    for(const [leg,p]of [[far,j.far],[near,j.near]]){
      segment(g,image,leg.thigh,leg.hip,leg.knee,p.hip,p.knee);segment(g,image,leg.shin,leg.knee,leg.ankle,p.knee,p.ankle);segment(g,image,leg.foot,leg.ankle,leg.toe,p.ankle,p.toe);
    }
    g.save();g.translate(0,j.bob);g.beginPath();g.rect(0,0,128,67);g.moveTo(18,60);for(const [x,y]of [[58,60],[65,72],[57,83],[45,96],[34,89],[27,91],[18,83]])g.lineTo(x,y);g.closePath();g.moveTo(100,64);g.lineTo(110,64);g.lineTo(110,110);g.lineTo(100,110);g.closePath();g.clip();g.drawImage(image,0,0,128,128);g.restore();g.restore();return j;
  }
  window.RevusHallWalk={draw,joints};
})();
