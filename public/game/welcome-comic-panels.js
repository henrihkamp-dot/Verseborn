// Comic inserts belong only to the redesigned Flameguard welcomes.
(() => {
  const pages={"sparky-bowl": {"asset": 1, "label": "A bold interpretation.", "mood": "reaction"}, "sparky-cute": {"asset": 0, "label": "Critical cuteness.", "mood": "reaction"}, "sparky-scold": {"asset": "sparky-angry", "label": "HE HAS A NAME.", "mood": "impact"}, "revusReaction": {"asset": "revusReaction", "label": "Miri. His only weakness.", "mood": "reaction"}, "mira-talk": {"asset": "mira-stand", "rect": [9, 8, 603, 575], "label": "Terms of membership", "mood": "reaction"}, "mira-stare": {"asset": "mira-stand", "rect": [629, 9, 260, 310], "label": "Her choice. Her name.", "mood": "impact"}, "mira-awkward": {"asset": "mira-stand", "rect": [631, 344, 257, 235], "label": "A delicate introduction.", "mood": "reaction"}, "torren-rank": {"asset": "torren-rank", "rect": [19, 19, 860, 365], "label": "A-rank. Naturally.", "mood": "reaction"}, "torren-stew": {"asset": "torren-rank", "rect": [20, 408, 855, 172], "label": "A portion or a challenge?", "mood": "reaction"}, "torren-memory": {"asset": "torren-memory", "rect": [20, 18, 857, 261], "label": "Before the Flameguard", "mood": "memory"}, "torren-supper": {"asset": "torren-memory", "rect": [460, 300, 417, 275], "label": "Who is coming home?", "mood": "warm"}, "seerin-tornado": {"asset": "seerin-tornado", "rect": [22, 22, 575, 550], "label": "From the archives: 40% more cape.", "mood": "reaction"}, "seerin-shame": {"asset": "seerin-tornado", "rect": [634, 357, 245, 225], "label": "I could not turn left.", "mood": "reaction"}, "seerin-ribbon": {"asset": "seerin-team", "rect": [601, 17, 279, 282], "label": "So you remember the team.", "mood": "warm"}, "seerin-team": {"asset": "seerin-team", "rect": [19, 331, 862, 251], "label": "My team.", "mood": "warm"}, "kael-cup": {"asset": "kael-rules", "rect": [18, 13, 866, 327], "label": "Some standards are non-negotiable.", "mood": "reaction"}, "kael-rules": {"asset": "kael-rules", "rect": [20, 365, 374, 220], "label": "No cups. On the bookshelves.", "mood": "reaction"}, "kael-ledger": {"asset": "kael-ledger", "rect": [22, 16, 859, 277], "label": "What the seal concealed", "mood": "memory"}, "kael-coins": {"asset": "kael-ledger", "rect": [24, 320, 388, 255], "label": "Names were never theirs to sell.", "mood": "memory"}, "kael-leave": {"asset": "kael-ledger", "rect": [444, 319, 434, 256], "label": "An order he would not obey.", "mood": "memory"}, "glimmer-report": {"asset": "glimmer-return", "rect": [19, 20, 375, 310], "label": "A professional report", "mood": "memory"}, "glimmer-worry": {"asset": "glimmer-return", "rect": [22, 359, 366, 217], "label": "More frightening than machinery.", "mood": "memory"}, "glimmer-return": {"asset": "glimmer-return", "rect": [417, 20, 462, 555], "label": "A bench of her own", "mood": "warm"}, "glimmer-drone": {"asset": "glimmer-lab", "rect": [20, 19, 503, 282], "label": "I have improved it already.", "mood": "reaction"}, "glimmer-lab": {"asset": "glimmer-lab", "rect": [24, 333, 290, 240], "label": "Why is it smoking?", "mood": "reaction"}, "glimmer-progress": {"asset": "glimmer-lab", "rect": [327, 330, 310, 242], "label": "Progress is happening.", "mood": "reaction"}};
  pages['sparky-intimidated']={asset:'sparky-panic',label:'His soul left the conversation.',mood:'panic'};
  pages['sparky-nervous']={asset:'sparky-panic',crop:[.37,0,.63,1],label:'His soul left the conversation.',mood:'panic'};
  const fresh=[...new Set(Object.values(pages).map(p=>p.asset).filter(a=>typeof a==='string'&&a!=='revusReaction'))];

  function shape(g,x,y,w,h,mood){
    const points=mood==='impact'?[[.03,.04],[.39,0],[.57,.025],[.98,0],[.96,.40],[1,.62],[.96,.98],[.58,.96],[.37,1],[0,.95],[.025,.53],[0,.29]]:
      mood==='memory'?[[.025,0],[.29,.018],[.55,0],[.98,.025],[1,.28],[.985,.61],[1,.97],[.67,1],[.34,.98],[0,1],[.014,.53],[0,.23]]:
      [[0,.035],[.96,0],[1,.945],[.045,1]];
    g.beginPath();points.forEach(([a,b],i)=>i?g.lineTo(x+a*w,y+b*h):g.moveTo(x+a*w,y+b*h));g.closePath();
  }
  function burst(g,cx,cy,rx,ry,u){
    g.beginPath();for(let i=0;i<32;i++){const a=i*Math.PI/16,r=i%2?1:1.13,x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r;i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();g.fillStyle='#f6d875';g.fill();g.lineWidth=2.2*u;g.strokeStyle='#140e1b';g.stroke();
  }
  function draw(g,key,image,age,width,safe){
    const page=pages[key];if(!page||!image)return;
    const u=width/400,enter=Math.min(1,age/300),ease=1-(1-enter)**3,impact=page.mood==='impact',memory=page.mood==='memory';
    const rect=page.crop?[(page.crop[0]*image.width),(page.crop[1]*image.height),(page.crop[2]*image.width),(page.crop[3]*image.height)]:page.rect||[0,0,image.width,image.height],ratio=rect[2]/rect[3],pad=4*u,maxH=safe*.72,maxW=width*.69;
    const artW=Math.min(maxW-2*pad,(maxH-2*pad)*ratio),artH=artW/ratio,w=artW+2*pad,h=artH+2*pad;
    const sign=key.split('').reduce((n,c)=>n+c.charCodeAt(0),0)%2?1:-1;
    const x=(width-w)/2+sign*5*u*(1-ease),y=(safe-h)/2+4*u+5*u*(1-ease);
    g.save();g.fillStyle='rgba(18,9,24,'+(ease*.62)+')';g.fillRect(0,0,width,safe);g.globalAlpha=ease;
    // Screen-tone and speed strokes sit behind a single illustrated shot.
    g.fillStyle='#eed7ad12';for(let yy=4*u;yy<safe;yy+=6*u)for(let xx=(Math.round(yy/u)%12?3:0)*u;xx<width;xx+=6*u){g.beginPath();g.arc(xx,yy,.45*u,0,Math.PI*2);g.fill();}
    if(impact){g.strokeStyle='#ead5a73b';for(let i=0;i<28;i++){const a=i*Math.PI/14;g.lineWidth=(i%3? .45:1.1)*u;g.beginPath();g.moveTo(width/2+Math.cos(a)*width*.29,safe/2+Math.sin(a)*safe*.33);g.lineTo(width/2+Math.cos(a)*width,safe/2+Math.sin(a)*safe);g.stroke();}}
    g.translate(x+w/2,y+h/2);g.rotate(sign*(memory?.018:impact?.042:.027)+(1-ease)*sign*.035+(page.mood==='panic'?Math.sin(age*.022)*.004:0));g.translate(-w/2,-h/2);
    if(impact)burst(g,w/2,h/2,w*.52,h*.51,u);
    g.save();g.translate(3.3*u,3.8*u);shape(g,0,0,w,h,page.mood);g.fillStyle='#09060ee6';g.fill();g.restore();
    shape(g,-2*u,-2*u,w+4*u,h+4*u,page.mood);g.fillStyle='#ddbb7e';g.fill();g.strokeStyle='#140e1b';g.lineWidth=2.6*u;g.stroke();
    const ax=pad,ay=pad,aw=artW,ah=artH;
    g.save();shape(g,ax,ay,aw,ah,page.mood);g.clip();g.fillStyle=memory?'#d8c7aa':'#eee1c8';g.fillRect(ax,ay,aw,ah);
    if(typeof page.asset==='number'||page.asset==='revusReaction'){
      g.fillStyle='#5e3d5a22';for(let yy=ay;yy<ay+ah;yy+=4*u)for(let xx=ax;xx<ax+aw;xx+=4*u){g.beginPath();g.arc(xx,yy,.45*u,0,Math.PI*2);g.fill();}
      g.strokeStyle='#86627d36';g.lineWidth=.5*u;for(let i=0;i<20;i++){const a=i*Math.PI/10;g.beginPath();g.moveTo(ax+aw/2+Math.cos(a)*aw*.23,ay+ah/2+Math.sin(a)*ah*.23);g.lineTo(ax+aw/2+Math.cos(a)*aw,ay+ah/2+Math.sin(a)*ah);g.stroke();}
    }
    g.drawImage(image,...rect,ax,ay,aw,ah);g.restore();shape(g,ax,ay,aw,ah,page.mood);g.strokeStyle='#17101b';g.lineWidth=1.25*u;g.stroke();
    // Imperfect ink corners and a loose caption sticker break the modal silhouette.
    g.strokeStyle='#140e1b';g.lineWidth=.65*u;g.beginPath();g.moveTo(-4*u,h*.12);g.lineTo(-5*u,h*.48);g.moveTo(w+4*u,h*.53);g.lineTo(w+5*u,h*.86);g.stroke();
    g.save();g.translate(-3*u,-5*u);g.rotate(-sign*.035);g.font='italic 900 '+(5.5*u)+'px Arial';
    const label=page.label.toUpperCase(),lw=Math.min(width*.64,g.measureText(label).width+9*u),lh=12*u;
    g.fillStyle='#120b19';g.fillRect(1.5*u,1.5*u,lw,lh);g.fillStyle=impact?'#f0ca64':memory?'#dfc99d':'#e3c58a';
    g.beginPath();g.moveTo(0,0);g.lineTo(lw,1*u);g.lineTo(lw-2*u,lh);g.lineTo(1*u,lh-1*u);g.closePath();g.fill();g.strokeStyle='#140e1b';g.lineWidth=.9*u;g.stroke();
    g.textBaseline='middle';g.textAlign='left';g.fillStyle='#241324';g.fillText(label,4*u,lh/2,lw-8*u);g.restore();g.restore();
  }
  window.WelcomeComicPanels={pages,fresh,draw};
})();
