from pathlib import Path
root=Path('public/game')
p=root/'welcome-comic-panels.js';s=p.read_text(encoding='utf-8');s=s[:s.index('  function outline')]+r'''
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
    const rect=page.rect||[0,0,image.width,image.height],ratio=rect[2]/rect[3],pad=4*u,maxH=safe*.72,maxW=width*.69;
    const artW=Math.min(maxW-2*pad,(maxH-2*pad)*ratio),artH=artW/ratio,w=artW+2*pad,h=artH+2*pad;
    const sign=key.split('').reduce((n,c)=>n+c.charCodeAt(0),0)%2?1:-1;
    const x=(width-w)/2+sign*5*u*(1-ease),y=(safe-h)/2+4*u+5*u*(1-ease);
    g.save();g.fillStyle='rgba(18,9,24,'+(ease*.62)+')';g.fillRect(0,0,width,safe);g.globalAlpha=ease;
    // Screen-tone and speed strokes sit behind a single illustrated shot.
    g.fillStyle='#eed7ad12';for(let yy=4*u;yy<safe;yy+=6*u)for(let xx=(Math.round(yy/u)%12?3:0)*u;xx<width;xx+=6*u){g.beginPath();g.arc(xx,yy,.45*u,0,Math.PI*2);g.fill();}
    if(impact){g.strokeStyle='#ead5a73b';for(let i=0;i<28;i++){const a=i*Math.PI/14;g.lineWidth=(i%3? .45:1.1)*u;g.beginPath();g.moveTo(width/2+Math.cos(a)*width*.29,safe/2+Math.sin(a)*safe*.33);g.lineTo(width/2+Math.cos(a)*width,safe/2+Math.sin(a)*safe);g.stroke();}}
    g.translate(x+w/2,y+h/2);g.rotate(sign*(memory?.018:impact?.042:.027)+(1-ease)*sign*.035);g.translate(-w/2,-h/2);
    if(impact)burst(g,w/2,h/2,w*.52,h*.51,u);
    g.save();g.translate(3.3*u,3.8*u);shape(g,0,0,w,h,page.mood);g.fillStyle='#09060ee6';g.fill();g.restore();
    shape(g,-2*u,-2*u,w+4*u,h+4*u,page.mood);g.fillStyle='#f6e9cd';g.fill();g.strokeStyle='#140e1b';g.lineWidth=2.6*u;g.stroke();
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
    g.fillStyle='#120b19';g.fillRect(1.5*u,1.5*u,lw,lh);g.fillStyle=impact?'#f0ca64':memory?'#dfc99d':'#f8eccf';
    g.beginPath();g.moveTo(0,0);g.lineTo(lw,1*u);g.lineTo(lw-2*u,lh);g.lineTo(1*u,lh-1*u);g.closePath();g.fill();g.strokeStyle='#140e1b';g.lineWidth=.9*u;g.stroke();
    g.textBaseline='middle';g.textAlign='left';g.fillStyle='#241324';g.fillText(label,4*u,lh/2,lw-8*u);g.restore();g.restore();
  }
  window.WelcomeComicPanels={pages,fresh,draw};
})();
''';p.write_text(s,encoding='utf-8')
p=root/'welcome-cinematics.js';s=p.read_text(encoding='utf-8');s=s.replace('<img class="welcome-portrait" alt="">','<div class="welcome-portrait-frame"><img class="welcome-portrait" alt=""></div>')
s=s.replace("const src=portrait(b.speaker);ui.portrait.hidden=!src;if(src)ui.portrait.src=src;","const src=portrait(b.speaker);ui.portrait.hidden=!src;ui.portrait.parentElement.hidden=!src;overlay.dataset.speaker=b.speaker||'';if(src)ui.portrait.src=src;")
p.write_text(s,encoding='utf-8')
p=root/'index.html';s=p.read_text(encoding='utf-8').replace('welcome-cinematics.css?v=302','welcome-cinematics.css?v=308').replace('welcome-comic-panels.js?v=307','welcome-comic-panels.js?v=308').replace('welcome-cinematics.js?v=307','welcome-cinematics.js?v=308');p.write_text(s,encoding='utf-8')
