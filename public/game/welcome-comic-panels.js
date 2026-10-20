// Comic inserts belong only to the redesigned Flameguard welcomes.
(() => {
  const pages={
    'sparky-bowl':{asset:1,label:'A bold interpretation.',mood:'reaction'},
    'sparky-cute':{asset:0,label:'Critical cuteness.',mood:'reaction'},
    'sparky-scold':{asset:2,label:'He has a name.',mood:'impact'},
    revusReaction:{asset:'revusReaction',label:'Miri. His only weakness.',mood:'reaction'},
    'mira-stand':{asset:'mira-stand',label:'Her choice. Her name.',mood:'impact'},
    'torren-rank':{asset:'torren-rank',label:'A-rank. Naturally.',mood:'reaction'},
    'torren-memory':{asset:'torren-memory',label:'Before the Flameguard',mood:'memory'},
    'seerin-tornado':{asset:'seerin-tornado',label:'From the archives: 40% more cape.',mood:'reaction'},
    'seerin-team':{asset:'seerin-team',label:'One more round. Together.',mood:'warm'},
    'kael-ledger':{asset:'kael-ledger',label:'What the seal concealed',mood:'memory'},
    'kael-rules':{asset:'kael-rules',label:'Some standards are non-negotiable.',mood:'reaction'},
    'glimmer-return':{asset:'glimmer-return',label:'A choice of her own',mood:'memory'},
    'glimmer-lab':{asset:'glimmer-lab',label:'Progress is happening.',mood:'reaction'}
  };
  const fresh=Object.keys(pages).filter(k=>!['sparky-bowl','sparky-cute','sparky-scold','revusReaction'].includes(k));
  function outline(g,x,y,w,h){g.beginPath();g.moveTo(x,y+1);g.lineTo(x+w*.4,y);g.lineTo(x+w,y+2);g.lineTo(x+w-1,y+h*.56);g.lineTo(x+w,y+h);g.lineTo(x+w*.55,y+h-1);g.lineTo(x,y+h);g.closePath();}
  function draw(g,key,image,age,width,safe){
    const page=pages[key];if(!page||!image)return;
    const u=width/400,enter=Math.min(1,age/240),ease=1-(1-enter)**3,old=['sparky-bowl','sparky-cute','sparky-scold','revusReaction'].includes(key);
    const header=11*u,pad=3*u,ratio=image.width/image.height,maxH=safe*.82,maxW=width*.78;
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
    g.drawImage(image,ax,ay,aw,ah);g.restore();g.strokeStyle='#211824';g.lineWidth=1*u;g.strokeRect(ax,ay,aw,ah);
    // Offset second ink line gives an editorial page edge, not a game modal.
    g.lineWidth=.35*u;g.strokeRect(-1.8*u,1.6*u,w+3.3*u,h);g.restore();
  }
  window.WelcomeComicPanels={pages,fresh,draw};
})();
