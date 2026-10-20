// Comic inserts belong only to the redesigned Flameguard welcomes.
(() => {
  const pages={"sparky-bowl": {"asset": 1, "label": "A bold interpretation.", "mood": "reaction"}, "sparky-cute": {"asset": 0, "label": "Critical cuteness.", "mood": "reaction"}, "sparky-scold": {"asset": "sparky-angry", "label": "HE HAS A NAME.", "mood": "impact"}, "revusReaction": {"asset": "revusReaction", "label": "Miri. His only weakness.", "mood": "reaction"}, "mira-talk": {"asset": "mira-stand", "rect": [9, 8, 603, 575], "label": "Terms of membership", "mood": "reaction"}, "mira-stare": {"asset": "mira-stand", "rect": [629, 9, 260, 310], "label": "Her choice. Her name.", "mood": "impact"}, "mira-awkward": {"asset": "mira-stand", "rect": [631, 344, 257, 235], "label": "A delicate introduction.", "mood": "reaction"}, "torren-rank": {"asset": "torren-rank", "rect": [19, 19, 860, 365], "label": "A-rank. Naturally.", "mood": "reaction"}, "torren-stew": {"asset": "torren-rank", "rect": [20, 408, 855, 172], "label": "A portion or a challenge?", "mood": "reaction"}, "torren-memory": {"asset": "torren-memory", "rect": [20, 18, 857, 261], "label": "Before the Flameguard", "mood": "memory"}, "torren-supper": {"asset": "torren-memory", "rect": [460, 300, 417, 275], "label": "Who is coming home?", "mood": "warm"}, "seerin-tornado": {"asset": "seerin-tornado", "rect": [22, 22, 575, 550], "label": "From the archives: 40% more cape.", "mood": "reaction"}, "seerin-shame": {"asset": "seerin-tornado", "rect": [634, 357, 245, 225], "label": "I could not turn left.", "mood": "reaction"}, "seerin-ribbon": {"asset": "seerin-team", "rect": [601, 17, 279, 282], "label": "So you remember the team.", "mood": "warm"}, "seerin-team": {"asset": "seerin-team", "rect": [19, 331, 862, 251], "label": "My team.", "mood": "warm"}, "kael-cup": {"asset": "kael-rules", "rect": [18, 13, 866, 327], "label": "Some standards are non-negotiable.", "mood": "reaction"}, "kael-rules": {"asset": "kael-rules", "rect": [20, 365, 374, 220], "label": "No cups. On the bookshelves.", "mood": "reaction"}, "kael-ledger": {"asset": "kael-ledger", "rect": [22, 16, 859, 277], "label": "What the seal concealed", "mood": "memory"}, "kael-coins": {"asset": "kael-ledger", "rect": [24, 320, 388, 255], "label": "Names were never theirs to sell.", "mood": "memory"}, "kael-leave": {"asset": "kael-ledger", "rect": [444, 319, 434, 256], "label": "An order he would not obey.", "mood": "memory"}, "glimmer-report": {"asset": "glimmer-return", "rect": [19, 20, 375, 310], "label": "A professional report", "mood": "memory"}, "glimmer-worry": {"asset": "glimmer-return", "rect": [22, 359, 366, 217], "label": "More frightening than machinery.", "mood": "memory"}, "glimmer-return": {"asset": "glimmer-return", "rect": [417, 20, 462, 555], "label": "A bench of her own", "mood": "warm"}, "glimmer-drone": {"asset": "glimmer-lab", "rect": [20, 19, 503, 282], "label": "I have improved it already.", "mood": "reaction"}, "glimmer-lab": {"asset": "glimmer-lab", "rect": [24, 333, 290, 240], "label": "Why is it smoking?", "mood": "reaction"}, "glimmer-progress": {"asset": "glimmer-lab", "rect": [327, 330, 310, 242], "label": "Progress is happening.", "mood": "reaction"}};
  const fresh=[...new Set(Object.values(pages).map(p=>p.asset).filter(a=>typeof a==='string'&&a!=='revusReaction'))];
  function outline(g,x,y,w,h){g.beginPath();g.moveTo(x,y+1);g.lineTo(x+w*.4,y);g.lineTo(x+w,y+2);g.lineTo(x+w-1,y+h*.56);g.lineTo(x+w,y+h);g.lineTo(x+w*.55,y+h-1);g.lineTo(x,y+h);g.closePath();}
  function draw(g,key,image,age,width,safe){
    const page=pages[key];if(!page||!image)return;
    const u=width/400,enter=Math.min(1,age/240),ease=1-(1-enter)**3,old=['sparky-bowl','sparky-cute','sparky-scold','revusReaction'].includes(key);
    const rect=page.rect||[0,0,image.width,image.height],header=11*u,pad=3*u,ratio=rect[2]/rect[3],maxH=safe*.79,maxW=width*.70;
    const artW=Math.min(maxW-2*pad,(maxH-header-2*pad)*ratio),artH=artW/ratio,w=artW+2*pad,h=artH+header+2*pad;
    const x=(width-w)/2,y=(safe-h)/2+3*u*(1-ease);
    g.save();g.fillStyle='rgba(10,6,16,'+(ease*.66)+')';g.fillRect(0,0,width,safe);g.globalAlpha=ease;
    g.translate(x+w/2,y+h/2);g.rotate(page.mood==='memory'?-.003:page.mood==='impact'?-.009:.006);g.translate(-w/2,-h/2);
    g.fillStyle='#09060dbb';g.fillRect(3*u,4*u,w,h);g.fillStyle='#f5ecd7';outline(g,0,0,w,h);g.fill();g.strokeStyle='#17121c';g.lineWidth=1.4*u;g.stroke();
    // Paper gutter and caption rail remain outside the illustrated panel.
    g.fillStyle=page.mood==='memory'?'#493b39':page.mood==='impact'?'#713044':'#4b3458';g.fillRect(pad,pad,w-2*pad,header-pad);
    g.font='bold '+(5.8*u)+'px Georgia';g.textAlign='left';g.textBaseline='middle';g.fillStyle='#fff2d8';g.fillText(page.label.toUpperCase(),pad+3*u,pad+(header-pad)/2,w-10*u);
    const ax=pad,ay=header,aw=artW,ah=artH;
    g.save();g.beginPath();g.rect(ax,ay,aw,ah);g.clip();g.fillStyle=page.mood==='memory'?'#d8c7aa':'#ede3d1';g.fillRect(ax,ay,aw,ah);
    if(old){
      g.fillStyle=page.mood==='impact'?'#b5557722':'#9b6b8d20';
      for(let i=0;i<18;i++){const a=i*Math.PI/9;g.beginPath();g.moveTo(ax+aw/2,ay+ah/2);g.lineTo(ax+aw/2+Math.cos(a)*aw,ay+ah/2+Math.sin(a)*ah);g.lineTo(ax+aw/2+Math.cos(a+.045)*aw,ay+ah/2+Math.sin(a+.045)*ah);g.closePath();g.fill();}
      g.fillStyle='#3a203817';for(let yy=ay+3*u;yy<ay+ah;yy+=5*u)for(let xx=ax+2*u;xx<ax+aw;xx+=5*u){g.beginPath();g.arc(xx,yy,.4*u,0,Math.PI*2);g.fill();}
    }
    g.drawImage(image,...rect,ax,ay,aw,ah);g.restore();g.strokeStyle='#211824';g.lineWidth=1*u;g.strokeRect(ax,ay,aw,ah);
    // Offset second ink line gives an editorial page edge, not a game modal.
    g.lineWidth=.35*u;g.strokeRect(-1.8*u,1.6*u,w+3.3*u,h);g.restore();
  }
  window.WelcomeComicPanels={pages,fresh,draw};
})();
