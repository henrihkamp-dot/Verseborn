from pathlib import Path
import json
p=Path('public/game/rift-awakening.js');s=p.read_text(encoding="utf-8")
s=s.replace('let story,art,scene=', 'let details,settingTalk=false;\n  let story,art,scene=')
s=s.replace("EmberRift.ready,emberHallWorld.ready]", "fetch('assets/rift/awakening-251/manifest.json').then(r=>r.json()).then(async data=>{details=data;await Promise.all(Object.entries(data).map(([key,value])=>load(key,'assets/rift/awakening-251/'+value.file)));}),EmberRift.ready,emberHallWorld.ready]")
s=s.replace("createRadialGradient(0,0,.48,0,0,1)","createRadialGradient(0,0,.70,0,0,1)").replace("fade.addColorStop(.78,'#ffffffb0')","fade.addColorStop(.86,'#fffffff0')")
a=s.index('  function makeOverlay(){');b=s.index('  function startAudio()',a)
s=s[:a]+'''  function makeOverlay(){
    if(film)return;
    film=document.createElement('canvas');film.width=1280;film.height=712;g=film.getContext('2d');
    const style=document.createElement('style');style.textContent='.game.rift-cinematic .hud{display:none}.rift-lore-topics{display:flex;flex-wrap:wrap;gap:8px}.rift-lore-topics button{font:inherit;color:#ffe2af;background:#302535;border:1px solid #b58b4e;border-radius:5px;padding:7px 12px}';document.head.append(style);
    nextButton={focus(){},set disabled(value){const hint=document.querySelector('.dialogue-continue');if(hint)hint.style.visibility=value?'hidden':'';}};
  }
''' +s[b:]
s=s.replace("speaker.textContent=beat.speaker;text.textContent=beat.text||'The cavern stirs…';nextButton.textContent=index===story.beats.length-1?'Return to the cavern':'Continue ›';nextButton.disabled=true;", "settingTalk=true;try{if(beat.text)showTalk([[beat.speaker,beat.text]],{portraits:[],skippable:true});else{mode='riftScene';el.dialogue.classList.add('hidden');}}finally{settingTalk=false;}nextButton.disabled=true;")
s=s.replace('const original={mode,menuTab,','const original={mode,menuTab,activePoint,')
s=s.replace("overlay.hidden=false;setBeat(0)","activePoint=null;document.querySelector('.game').classList.add('rift-cinematic');setBeat(0)")
s=s.replace('scene=null;overlay.hidden=true;',"scene=null;document.querySelector('.game').classList.remove('rift-cinematic');talkQueue=[];talkAfter=null;talkPortraits=[];talkSkippable=false;el.dialogueSkip.classList.add('hidden');renderDialoguePortraits();")
s=s.replace('mode=original.mode;menuTab=', 'activePoint=original.activePoint;mode=original.mode;menuTab=')
s=s.replace("const scale=width/art.referenceWidth;", "const scale=width/art.referenceWidth;\n    if(life&&pose===3&&details){const speaking=scene?story.beats[scene.index].speaker==='Stone Sleeper':mode==='talk'&&el.speaker.textContent==='Stone Sleeper',cycle=now%7400,frame=cycle<120?4:cycle<240?5:speaking?[0,1,2,1,3,0][Math.floor(now/180)%6]:cycle>5400&&cycle<5750?6:0;const cell=details.face.cell;context.save();context.imageSmoothingEnabled=true;context.drawImage(images.face,frame*cell,0,cell,cell,x-6,baseline-width*.72,width*1.04,width*1.04);context.restore();return;}")
s=s.replace("g.globalCompositeOperation='screen'","g.globalCompositeOperation='source-over'")
s=s.replace("vision(v,479,133,262,111,.78*fade,now)","vision(v,455,119,335,140,.97*fade,now)")
a=s.index("    actor('Torren'");b=s.index("    // Falling stones",a)
s=s[:a]+'''    actor('Verseborn',319,276,43,now,false);
    if(['arrival','landing','burp','essence','calm','memory','restored'].includes(phase)){
      const flying=phase==='arrival',p=flying?Math.min(1,phaseT/4):1,e=p*p*(3-2*p),x=320-27*e,ground=348-126*e,y=ground-(flying?Math.sin(p*Math.PI)*45+6:0),image=emberHallWorld.images.Sparky;
      if(flying){const cell=details.flight.cell,frame=[0,1,0,2,3,2][Math.floor(t/135)%6];g.save();g.translate(x,y);g.scale(-1,1);g.drawImage(images.flight,frame*cell,0,cell,cell,-29,-49,58,58);g.restore();}
      else if(image){const burp=phase==='burp',row=burp?4:0,col=burp?2:0,settle=phase==='landing'?Math.sin(Math.min(1,phaseT/.7)*Math.PI)*2:0;g.drawImage(image,col*image.width/8,row*image.height/5,image.width/8,image.height/5,x-19,y-38+settle,38,38);}
      if(phase==='burp'){g.save();g.globalAlpha=Math.sin(Math.min(1,phaseT/1.2)*Math.PI)*.6;g.fillStyle='#ceb1ed';g.font='bold 8px Georgia';g.fillText('brrup!',x-38,y-36-phaseT*5);g.restore();}
      if(!flying&&phase!=='landing'&&phase!=='burp')for(let j=0;j<16;j++){const a=(now/2400+j/16)%1;particle(g,x-20-a*69,y-22-Math.sin(a*Math.PI)*30,3+(j%3),'#c696ff',.32);}
    }
''' +s[b:]
a=s.index('    if(quake>.01)');b=s.index("    if(['calm'",a)
s=s[:a]+'''    if(quake>.01){for(let j=0;j<24;j++){const cycle=2300+(j%5)*270,age=(t+j*337)%cycle/cycle,x=38+(j*73)%558,end=176+(j*29)%140,size=7+(j%5)*2.5,fall=Math.min(1,age/.78),y=-22+fall*fall*(end+22),cell=details.debris.cell;
      g.save();g.globalAlpha=quake;g.translate(x,y);g.rotate(fall*(j%2?2:-2));g.drawImage(images.debris,(j%12)*cell,0,cell,cell,-size/2,-size/2,size,size);g.restore();
      if(age>.78){const impact=(age-.78)/.22;for(let k=0;k<5;k++){g.save();g.globalAlpha=(1-impact)*quake*.28;g.fillStyle=k%2?'#b9a18a':'#807567';g.beginPath();g.ellipse(x+(k-2)*impact*16,end-3-impact*(5+k),3+impact*8,2+impact*3,.2*k,0,Math.PI*2);g.fill();g.restore();}}
    }if(t-scene.impactAt>950&&!document.hidden){scene.impactAt=t;playSfx('hit',.17*quake);}}
''' +s[b:]
s=s.replace("  const oldSave=", "  const oldDraw=drawTileMap,oldNext=nextTalk,oldSkip=skipTalk;\n  drawTileMap=function(...args){if(!scene)return oldDraw(...args);ctx.fillStyle='#100d17';ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);const scale=Math.min(LOGICAL_WIDTH/640,LOGICAL_HEIGHT/356);ctx.drawImage(film,0,0,640*scale,356*scale);};\n  nextTalk=function(...args){return scene&&!settingTalk?next():oldNext(...args);};\n  skipTalk=function(...args){return scene?finish():oldSkip(...args);};\n  const oldSave=")
s=s.replace("if(['Enter',' ','ArrowRight','e'].includes(event.key))next();", "if(event.target?.closest?.('#dialogueSkip')&&['Enter',' '].includes(event.key))finish();else if(['Enter',' ','ArrowRight','e'].includes(event.key))next();")
pos=s.index('  window.RiftAwakening=')
s=s[:pos]+'''  const lore={
    'Before Solinar':[['Verseborn','What was it like before Solinar?'],['Stone Sleeper','A shared sky. Dragons carried news between cities. Humans kept our stories in ink, and we kept theirs in flame. We disagreed often. We did not need one voice to belong together.']],
    'The Elder Ember':[['Verseborn','What does Sparky carry?'],['Stone Sleeper','Memory that refused to kneel. Not simply fire, but lives and names Solinar wanted erased. It survived in someone small enough to be overlooked.'],['Stone Sleeper','Do not mistake the little one for a vessel alone. His choices are his own. Care for him, not merely what you hope he can do.']],
    'The Heir':[['Verseborn','The brothers keep speaking of an Heir. What is expected of him?'],['Stone Sleeper','They have fragments, and a great enthusiasm for arranging them. A title is not an answer.'],['Stone Sleeper','If an heir is to bring those voices together, he must first listen. Human and dragon. Living and remembered. Inheritance is a responsibility, not permission to command.']],
    'What comes next':[['Verseborn','What should we do now?'],['Stone Sleeper','Keep the memories alive. Learn what was erased before deciding what must be rebuilt. And when someone offers a perfect world, ask whose voice it costs.'],['Stone Sleeper','Return when you have questions. There is time for a conversation now.']]
  };
  function converse(){if(scene||!EmberRift.progress().awakeningSeen)return false;const topics=()=>{showTalk([['Stone Sleeper',{html:'What would you remember?<div class="rift-lore-topics">'+[...Object.keys(lore),'Rest'].map((name,i)=>'<button type="button" data-dragon-topic="'+i+'">'+name+'</button>').join('')+'</div>'}]],{portraits:[]});el.line.querySelectorAll('[data-dragon-topic]').forEach(button=>button.onclick=event=>{event.stopPropagation();const key=Object.keys(lore)[Number(button.dataset.dragonTopic)];if(key)showTalk(lore[key],{portraits:[],after:topics});else{talkAfter=null;finishTalk();}});};topics();return true;}
''' +s[pos:]
s=s.replace('={ready,start,maybeStart,next,finish,drawDragon,','={ready,start,maybeStart,next,finish,drawDragon,converse,')
p.write_text(s,encoding="utf-8")
p=Path('public/game/ember-rift.js');s=p.read_text(encoding="utf-8").replace('RiftAwakening.start({replay:true});return;','RiftAwakening.converse();return;');p.write_text(s,encoding="utf-8")
p=Path('public/game/rift-awakening-story.json');d=json.loads(p.read_text(encoding="utf-8"));b=d['beats'];b[4]['text']='You removed it. You wrapped a teapot in it. Verseborn, stay clear of his jaw!';b[4]['cue']='The brothers panic while Verseborn keeps his distance from the warning growl.';b[7].update(speaker='Verseborn',text='Easy. Nobody is going to attack you.',cue='Verseborn raises his empty hand. Only he and the brothers stand in the cavern.');b[10].update(auto=True,cue='Sparky flies in from behind, diagonally left from the Hall passage, wings flapping and feet tucked. He descends onto the front-left rim of the Ember Rift.');b[11:11]=[dict(phase='landing',auto=True,minMs=700,speaker='',text='',cue='Sparky lands and folds his wings into his familiar cute Hall pose.'),dict(phase='burp',auto=True,minMs=1400,speaker='Sparky',text='Brrruup!',cue='A small satisfied burp. The elder notices his flame essence.')];p.write_text(json.dumps(d,indent=2,ensure_ascii=False),encoding="utf-8")
p=Path('public/game/index.html');s=p.read_text(encoding="utf-8").replace('rift-awakening.js?v=250','rift-awakening.js?v=251').replace('ember-rift.js?v=250','ember-rift.js?v=251');p.write_text(s,encoding="utf-8")

