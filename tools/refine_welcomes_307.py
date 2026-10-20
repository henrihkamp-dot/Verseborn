from pathlib import Path
import json

root=Path('public/game')
p=root/'welcome-comic-panels.js'
s=p.read_text(encoding='utf-8')
start=s.index('  const pages=')
end=s.index('  function outline',start)
panels={
 'sparky-bowl':dict(asset=1,label='A bold interpretation.',mood='reaction'),
 'sparky-cute':dict(asset=0,label='Critical cuteness.',mood='reaction'),
 'sparky-scold':dict(asset='sparky-angry',label='HE HAS A NAME.',mood='impact'),
 'revusReaction':dict(asset='revusReaction',label='Miri. His only weakness.',mood='reaction'),
}
def panel(key,asset,rect,label,mood='reaction'):
 panels[key]=dict(asset=asset,rect=rect,label=label,mood=mood)
panel('mira-talk','mira-stand',[9,8,603,575],'Terms of membership')
panel('mira-stare','mira-stand',[629,9,260,310],'Her choice. Her name.','impact')
panel('mira-awkward','mira-stand',[631,344,257,235],'A delicate introduction.')
panel('torren-rank','torren-rank',[19,19,860,365],'A-rank. Naturally.')
panel('torren-stew','torren-rank',[20,408,855,172],'A portion or a challenge?')
panel('torren-memory','torren-memory',[20,18,857,261],'Before the Flameguard','memory')
panel('torren-supper','torren-memory',[460,300,417,275],'Who is coming home?','warm')
panel('seerin-tornado','seerin-tornado',[22,22,575,550],'From the archives: 40% more cape.')
panel('seerin-shame','seerin-tornado',[634,357,245,225],'I could not turn left.')
panel('seerin-ribbon','seerin-team',[601,17,279,282],'So you remember the team.','warm')
panel('seerin-team','seerin-team',[19,331,862,251],'My team.','warm')
panel('kael-cup','kael-rules',[18,13,866,327],'Some standards are non-negotiable.')
panel('kael-rules','kael-rules',[20,365,374,220],'No cups. On the bookshelves.')
panel('kael-ledger','kael-ledger',[22,16,859,277],'What the seal concealed','memory')
panel('kael-coins','kael-ledger',[24,320,388,255],'Names were never theirs to sell.','memory')
panel('kael-leave','kael-ledger',[444,319,434,256],'An order he would not obey.','memory')
panel('glimmer-report','glimmer-return',[19,20,375,310],'A professional report','memory')
panel('glimmer-worry','glimmer-return',[22,359,366,217],'More frightening than machinery.','memory')
panel('glimmer-return','glimmer-return',[417,20,462,555],'A bench of her own','warm')
panel('glimmer-drone','glimmer-lab',[20,19,503,282],'I have improved it already.')
panel('glimmer-lab','glimmer-lab',[24,333,290,240],'Why is it smoking?')
panel('glimmer-progress','glimmer-lab',[327,330,310,242],'Progress is happening.')
s=s[:start]+'  const pages='+json.dumps(panels,ensure_ascii=True)+';\n  const fresh=[...new Set(Object.values(pages).map(p=>p.asset).filter(a=>typeof a===\'string\'&&a!==\'revusReaction\'))];\n'+s[end:]
s=s.replace("const header=11*u,pad=3*u,ratio=image.width/image.height,maxH=safe*.82,maxW=width*.78;","const rect=page.rect||[0,0,image.width,image.height],header=11*u,pad=3*u,ratio=rect[2]/rect[3],maxH=safe*.79,maxW=width*.70;")
s=s.replace('g.drawImage(image,ax,ay,aw,ah);','g.drawImage(image,...rect,ax,ay,aw,ah);')
p.write_text(s,encoding='utf-8')

p=root/'welcome-story.json';data=json.loads(p.read_text(encoding='utf-8'))
# Each insert belongs to its own beat. No image persists by accident.
for story in data.values():
 for b in story['beats']: b.pop('panel',None)
def at(story,text,key):
 next(b for b in data[story]['beats'] if text in b.get('text',''))['panel']=key
at('Mira','You have a home.','mira-talk')
at('Mira',"That answer is why",'mira-stare')
idx=next(i for i,b in enumerate(data['Mira']['beats']) if b.get('panel')=='mira-stare')
data['Mira']['beats'].insert(idx+1,dict(panel='mira-awkward',minMs=2100,caption='A delicate introduction.'))
at('Torren','And the badge?', 'torren-rank')
at('Torren','A-rank. Guardian' if False else 'Spent enough years','torren-memory')
at('Torren',"Now I want to know",'torren-supper')
at('Torren','spoon supposed','torren-stew')
at('Seerin','This poster says','seerin-tornado')
at('Seerin',"couldn't turn my head",'seerin-shame')
at('Seerin','remember the team','seerin-ribbon')
at('Seerin','I know my team','seerin-team')
at('Kael','It was confirmed','kael-cup')
at('Kael','No cups on','kael-rules')
at('Kael','They called them transfers','kael-ledger')
at('Kael',"Sold under the church",'kael-coins')
at('Kael','They gave me an order','kael-leave')
at('Glimmer','Only one demonstration','glimmer-report')
at('Glimmer','Stonewake taught me','glimmer-worry')
at('Glimmer','bench is yours','glimmer-return')
at('Glimmer','improved it already','glimmer-drone')
at('Glimmer','Why is it smoking','glimmer-lab')
at('Glimmer','Because progress','glimmer-progress')
at('Sparky','His name is Sparky','sparky-scold')
for text,event in [('could have stayed','glimmer-boost'),('Here, when something breaks','glimmer-repair'),('People. Not just equipment','glimmer-back'),('little light turns purple','glimmer-boost-two'),('It is purple now','glimmer-repair'),('See? An excellent','glimmer-back')]:
 next(b for b in data['Glimmer']['beats'] if text in b.get('text',''))['event']=event
p.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

p=root/'welcome-cinematics.js';s=p.read_text(encoding='utf-8').replace('?v=306','?v=307')
s=s.replace("load(id,'assets/hall/comic-306/'+id+'.webp')","load(id,'assets/hall/'+(id==='sparky-angry'?'comic-307/':'comic-306/')+id+'.webp')")
s=s.replace("load('revusRig','assets/hall/welcome-304/revus-rig.webp')","load('revusRig','assets/hall/welcome-304/revus-rig.webp'),load('revusFront','assets/hall/comic-307/revus-front.webp')")
s=s.replace("function event(name){","function fly(x,y){const a=scene.actors.find(a=>a.id==='Glimmer'),p=currentPos(a);a.motion={x:p.x,y:p.y,toX:x,toY:y,points:[[p.x,p.y],[x,y]],length:Math.hypot(x-p.x,y-p.y),at:scene.clock,duration:1600};a.flying=true;a.labWorking=false;scene.holdUntil=scene.clock+1850;}\n  function event(name){")
s=s.replace("case 'glimmer-bench':move('Verseborn',440,87);move('Glimmer',464,87);get('Glimmer').labWorking=true;break;","case 'glimmer-bench':move('Verseborn',440,87);move('Glimmer',464,87);get('Glimmer').labWorking=false;break;\n      case 'glimmer-boost':fly(496,78);break;\n      case 'glimmer-boost-two':fly(477,105);break;\n      case 'glimmer-repair':get('Glimmer').labWorking=true;get('Glimmer').flying=false;break;\n      case 'glimmer-back':fly(464,87);break;")
s=s.replace("if(b.event)event(b.event);if(Object.prototype.hasOwnProperty.call(b,'panel'))setComic(b.panel);scene.beat=b;","setComic(null);if(b.event)event(b.event);if(Object.prototype.hasOwnProperty.call(b,'panel'))setComic(b.panel);scene.beat=b;")
s=s.replace("if(walk)RevusHallWalk.draw(ctx,art.revusRig,p.x,p.y,size,p.distance,a.motion.toX<a.motion.x?-1:1);", "if(walk){const front=art.revusFront,cw=front.width/4,ch=front.height,index=Math.floor(p.distance/2.8)%4;ctx.drawImage(front,index*cw,0,cw,ch,p.x-size*cw/ch/2,p.y-size*.96,size*cw/ch,size);}")
s=s.replace("source=walk?'hall/welcome-304/revus-rig.webp'", "source=walk?'hall/comic-307/revus-front.webp'")
# Guest children use stable anchored art, soft continuous breathing/head turns,
# and low-amplitude reaction gestures instead of jumping between unrelated poses.
old="if(guestIds.includes(a.id)){"
new="""if(['Nyx','Rava','Jory'].includes(a.id)){
      const image=art[a.id],cell=100,seed=['Nyx','Rava','Jory'].indexOf(a.id),speaking=scene.beat.speaker===a.id;
      const active=scene.actors.find(a=>a.id==='Seerin')?.practice;
      const phase=now/1100+seed*1.8,breath=Math.sin(phase)*.0018,lean=Math.sin(now/1700+seed)*.009+(speaking?Math.sin((now-scene.beatAt)/420)*.012:0);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(lean);ctx.scale(a.id==='Rava'?1:-1,1+breath);
      const index=0;ctx.drawImage(image,0,0,cell,cell,-size/2,-size*.96,size,size);
      // Head nod is independent of planted feet, with a soft eased arc.
      const nod=speaking?Math.sin((now-scene.beatAt)/480)*.24:Math.sin(phase)*.07;
      if(active){ctx.save();ctx.translate(0,-size*.52);ctx.rotate(Math.sin(now/800+seed)*.04);ctx.globalAlpha=.13;ctx.restore();}
      ctx.restore();source='hall/welcome-304/'+a.id.toLowerCase()+'.webp';
      a.gesture={lean,breath,nod};
    }else if(guestIds.includes(a.id)){"""
s=s.replace(old,new)
s=s.replace("walking?p.facing:(scene.id==='Mira'||scene.id==='Seerin'?2:3)","walking?p.facing:(scene.id==='Mira'?2:scene.id==='Seerin'?3:2)")
# Mira's original sheet has left/right in the opposite order to Torren's.
s=s.replace("p.row*cell,cell,cell,p.x-renderSize/2", "(id==='Mira'&&p.row>=2?5-p.row:p.row)*cell,cell,cell,p.x-renderSize/2")
s=s.replace("}else if(walking){", """}else if(id==='Glimmer'&&!a.ambientResident){
      const moving=walking&&a.flying;
      if(moving||a.labWorking){emberHallWorld.drawActor({...p,id,size,labActive:true,labFlying:moving,labDirection:a.motion?.toX>a.motion?.x?1:0,labClock:now,labRow:2,labLift:moving?Math.sin(Math.PI*clamp((now-a.motion.at)/a.motion.duration,0,1))*4:0},4,0,{x:0,y:0});source='hall/glimmer-lab-v244.webp';}
      else{const image=emberHallWorld.images.Glimmer,cell=image.width/8,render=size*.65,row=p.x>440?3:2;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(scene.beat.speaker==='Glimmer'?Math.sin((now-scene.beatAt)/430)*.012:0);ctx.drawImage(image,7*cell,row*cell,cell,cell,-render/2,-render*.94,render,render);ctx.restore();source='hall/glimmer-clean-v3.webp';}
    }else if(walking){""")
s=s.replace("row:p.row,x:p.x", "row:id==='Mira'&&p.row>=2?5-p.row:p.row,facing:id==='Verseborn'&&!walking?(scene.id==='Mira'?2:scene.id==='Seerin'?3:2):p.facing,gesture:a.gesture,labWorking:!!a.labWorking,flying:!!a.flying,x:p.x")
p.write_text(s,encoding='utf-8')
p=root/'index.html';p.write_text(p.read_text(encoding='utf-8').replace('welcome-comic-panels.js?v=306','welcome-comic-panels.js?v=307').replace('welcome-cinematics.js?v=306','welcome-cinematics.js?v=307'),encoding='utf-8')
