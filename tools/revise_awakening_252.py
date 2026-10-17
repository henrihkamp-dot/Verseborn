from pathlib import Path
import json
p=Path('public/game/rift-awakening.js');s=p.read_text(encoding='utf-8')
a=s.index('    for(let i=0;i<4;i++){');b=s.index('    loaded=true;',a)
s=s[:a]+'''    for(let i=0;i<4;i++){
      const image=images['vision'+i],c=document.createElement('canvas');c.width=image.width;c.height=image.height;const p=c.getContext('2d');p.drawImage(image,0,0);
      // Feather the panel edges into airborne mist without an oval picture frame.
      p.globalCompositeOperation='destination-in';
      for(const horizontal of [true,false]){const extent=horizontal?c.width:c.height,fade=p.createLinearGradient(0,0,horizontal?extent:0,horizontal?0:extent);fade.addColorStop(0,'#fff0');fade.addColorStop(.15,'#fff');fade.addColorStop(.85,'#fff');fade.addColorStop(1,'#fff0');p.fillStyle=fade;p.fillRect(0,0,c.width,c.height);}
      masks.push(c);
    }
''' + s[b:]
a=s.index("    if(life&&pose===3&&details){");b=s.index('    // All poses',a)
s=s[:a]+'''    if(life&&pose===3&&details){
      const speaking=scene?story.beats[scene.index].speaker==='Stone Sleeper':mode==='talk'&&el.speaker.textContent==='Stone Sleeper',line=scene?story.beats[scene.index].text:el.line.textContent;
      const seed=Array.from(line||'').reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,17),elapsed=scene?scene.clock-scene.beatAt:now,cycle=now%8700;
      const cadence=(elapsed+seed%1900)%3700,syllable=Math.floor(elapsed/145),mouth=[0,1,0,2,1,3,0,1,2,0,3,1,0];
      const frame=cycle<110?4:cycle<220?5:speaking&&cadence<2350?mouth[(syllable+seed)%mouth.length]:cycle>6100&&cycle<6400?6:0;
      const cell=details.face.cell;context.save();context.imageSmoothingEnabled=true;context.drawImage(images.face,frame*cell,0,cell,cell,x-6,baseline-width*1.014,width*1.04,width*1.04);context.restore();return;
    }
''' +s[b:]
old="if(scene.previousVision>=0)vision(scene.previousVision,314,67,184,75,.25,now);vision(v,455,119,335,140,.97*fade,now);if(v>=2)vision(0,270,249,180,74,.20,now);if(v===3)vision(2,484,248,206,82,.32,now);"
new="if(scene.previousVision>=0)vision(scene.previousVision,218,112,170,72,.22*(1-fade*.65),now);vision(v,328,104,324,130,.94*fade,now);if(v>=2)vision(0,440,160,145,61,.18*fade,now);"
assert old in s;s=s.replace(old,new).replace("269,197,now,alarm","248,215,now,alarm").replace("alarm?270+Math.sin(t/450)*2:248","alarm?248+Math.sin(t/450)*2:248")
s=s.replace('x=320-27*e,ground=348-126*e','x=320-50*e,ground=348-173*e')
s=s.replace("      if(!flying&&phase!=='landing'&&phase!=='burp')for(let j=0;j<16;j++){const a=(now/2400+j/16)%1;particle(g,x-20-a*69,y-22-Math.sin(a*Math.PI)*30,3+(j%3),'#c696ff',.32);}\n",'')
s=s.replace("rift-awakening-story.json?v=250","rift-awakening-story.json?v=252")
s=s.replace("if(['Enter',' ','ArrowRight','e'].includes(event.key))", "if(['Enter',' ','ArrowRight','e','z','Z'].includes(event.key))")
s=s.replace("  function converse(){", "  const loreVisits=new Map();\n  function converse(){")
s=s.replace("if(key)showTalk(lore[key],{portraits:[],after:topics});", "if(key){const visit=loreVisits.get(key)||0;loreVisits.set(key,visit+1);showTalk(visit%2&&loreFollowups[key]?loreFollowups[key]:lore[key],{portraits:[],after:topics});}")
pos=s.index('  const loreVisits=')
s=s[:pos]+'''  const loreFollowups={
    'Before Solinar':[['Verseborn','Did humans and dragons really get along?'],['Stone Sleeper','Not always. A dragon could complain about a new bell tower for a century. A baker could refuse him bread until he apologised. Peace was something people practised, not something imposed on them.']],
    'The Elder Ember':[['Verseborn','Can Sparky understand those memories?'],['Stone Sleeper','Some things are felt before they can be understood. Watch what comforts him, and what he protects. Do not demand an ancient answer every time he yawns.']],
    'The Heir':[['Verseborn','And if the Heir makes the wrong choice?'],['Stone Sleeper','Then he will need friends willing to tell him so. Prophecy is a poor substitute for an honest companion.'],['Verseborn','Mira will have that covered.'],['Stone Sleeper','Good. Keep her close.']],
    'What comes next':[['Verseborn','Anything more practical than another prophecy?'],['Stone Sleeper','Eat. Rest. Speak to your companions. A tired mind will mistake certainty for wisdom.'],['Stone Sleeper','And ask the brothers to stop storing crockery against my neck. I am awake now.']]
  };
''' +s[pos:]
p.write_text(s,encoding='utf-8')
p=Path('public/game/rift-awakening-story.json');d=json.loads(p.read_text(encoding='utf-8'))
replacements={
14:'There you are. No need to shout, little one. I remember that warmth.',
17:'Those streets were ours too. Market stalls beneath our wings. Children trying to race our shadows across the roofs.',
18:'There were quarrels, of course. But a human could knock on a dragon’s door without bringing a spear.',
19:'Solinar arrived with answers. Food for the hungry. Order for the frightened. At first, people welcomed him.',
20:'Then disagreement became disloyalty. Books vanished. Names were forbidden. Even a memory could make you an enemy.',
21:'The Elder Ember preserved the lives he tried to erase. He could command a city to be silent. He could not make the flame forget.',
22:'So it was hidden in a little creature he would overlook. Look at him. More interested in his next meal than anyone’s throne.',
26:'Let him grow before you put a crown on him. He has already chosen his companions. That is enough for today.',
28:'Come back when the dust has settled. Ask your questions one at a time. I have been asleep, not rehearsing a speech.'}
for i,text in replacements.items():d['beats'][i]['text']=text
for beat in d['beats']:
 if beat['phase']=='essence':beat['cue']='Sparky sits on the Rift directly before the elder. The elder recognises his familiar flame without a beam or magical stream.'
 if beat['phase']=='arrival':beat['cue']='Sparky flies diagonally left from the Hall passage and lands on the Rift platform directly in front of the elder.'
 if beat['phase']=='memory' and 'cue' in beat:beat['cue']='A clear memory hangs in the air above the centre of the group. Soft mist feathers its edges; faint remembered fragments drift nearby.'
p.write_text(json.dumps(d,indent=2,ensure_ascii=False),encoding='utf-8')
p=Path('public/game/index.html');p.write_text(p.read_text(encoding='utf-8').replace('rift-awakening.js?v=251','rift-awakening.js?v=252'),encoding='utf-8')
