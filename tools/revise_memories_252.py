from pathlib import Path
import subprocess,json
p=Path('public/game/rift-awakening-story.json');original=json.loads(subprocess.check_output(['git','show','HEAD:public/game/rift-awakening-story.json']));current=json.loads(p.read_text(encoding='utf-8'))
for old,new in zip(original['beats'],current['beats']):new['text']=old['text']
p.write_text(json.dumps(current,indent=2,ensure_ascii=False),encoding='utf-8')
p=Path('public/game/rift-awakening.js');s=p.read_text(encoding='utf-8');a=s.index('  const loreFollowups=');b=s.index('  function converse()',a);s=s[:a]+s[b:];a=s.index('if(key){const visit=');b=s.index('else{talkAfter=null;',a);s=s[:a]+"if(key)showTalk(lore[key],{portraits:[],after:topics});"+s[b:]
old='const cadence=(elapsed+seed%1900)%3700,syllable=Math.floor(elapsed/145),mouth=[0,1,0,2,1,3,0,1,2,0,3,1,0];\n      const frame=cycle<110?4:cycle<220?5:speaking&&cadence<2350?mouth[(syllable+seed)%mouth.length]:cycle>6100&&cycle<6400?6:0;'
new='''const beat=Math.floor(elapsed/130),phrase=Math.floor(elapsed/1100),hash=((Math.imul(beat+(seed>>>4),1664525)+1013904223)>>>0),pause=(phrase+seed)%5===2&&elapsed%1100>480;
      const readTime=Math.max(2200,(line||'').length*63),talking=speaking&&elapsed<readTime&&!pause,accent=hash%11;
      const frame=cycle<100?4:cycle<210?5:talking?(accent<2?0:accent<6?1:accent<8?2:3):cycle>6100&&cycle<6480?6:0;'''
assert old in s;s=s.replace(old,new)
old='const card=`<div class="scene-memory-grid"><section class="scene-memory-group scene-memory-hall"><strong>Ember Rift</strong><div><button type="button" data-replay-scene="${memoryId}">The Flame That Remembers</button></div></section></div>`;return html.replace(/<\\/section>$/,card+\'</section>\');'
new='const card=`<section class="memory-chapter"><h3>Ember Rift</h3><div class="memory-cards"><article class="memory-card memory-card-story"><div><strong>The Flame That Remembers</strong><small>The Stone Sleeper awakens</small></div><button type="button" data-replay-scene="${memoryId}">Replay scene <span aria-hidden="true">▶</span></button></article></div></section>`;return html.replace(\'<!--memory-story-end-->\',card);'
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf-8')
p=Path('public/game/game.js');s=p.read_text(encoding='utf-8');a=s.index('function sceneMemoriesHtml() {');b=s.index('\nfunction chooseHallRecruit',a)
s=s[:a]+'''function sceneMemoriesHtml() {
  if (state.gameMode !== 'hallBattles') return '';
  const history=loadRecruitSceneHistory(),intro=RECRUIT_SCENES.find(scene=>scene.id===EMBER_HALL_INTRO_ID);
  const button=scene=>{const seen=history.seen.includes(scene.id),attr=seen?'data-replay-scene':'data-play-arrival-scene';return `<button type="button" ${attr}="${scene.id}">${scene.title}${seen?'':' <em>Unseen</em>'}<span aria-hidden="true">▶</span></button>`;};
  const cards=HALL_RECRUITS.filter(name=>state.party.includes(name)).map(name=>{
    const scenes=RECRUIT_SCENES.filter(scene=>scene.recruit===name&&(history.seen.includes(scene.id)||scene.variant==='welcome'));
    if(!scenes.length)return '';
    return `<article class="memory-card"><img src="${menuPortraitSource(name)}" alt=""><div><strong>${name}</strong><div class="memory-actions">${scenes.map(button).join('')}</div></div></article>`;
  }).join('');
  return `<section class="memories-catalog"><header><h2>Scene Memories</h2><p>Revisit the moments that brought the Hall to life.</p></header>${intro?`<section class="memory-chapter"><h3>Ember Hall</h3><article class="memory-card memory-card-story"><div><strong>Where it began</strong></div>${button(intro)}</article></section>`:''}<section class="memory-chapter"><h3>Flameguard arrivals</h3><div class="memory-cards">${cards}<!--memory-character-end--></div></section><!--memory-story-end--></section>`;
}
''' +s[b:];p.write_text(s,encoding='utf-8')
p=Path('public/game/tinus-recruitment.js');s=p.read_text(encoding='utf-8');a=s.index('    const card =',s.index("const memoryId = 'tinus-betweenworld-arrival'"));b=s.index('\n  };',a)
s=s[:a]+'''    const card = `<article class="memory-card"><img src="${menuPortraitSource('Tinus')}" alt=""><div><strong>Tinus</strong><div class="memory-actions"><button type="button" data-replay-scene="${memoryId}">An Unscheduled Arrival<span aria-hidden="true">▶</span></button></div></div></article>`;
    return html.replace('<!--memory-character-end-->',card+'<!--memory-character-end-->');''' +s[b:];p.write_text(s,encoding='utf-8')
p=Path('public/game/rpg-menu.css');s=p.read_text(encoding='utf-8')+'''
/* Memories: one ordered catalogue, with shared card geometry and quiet backgrounds. */
.menu .memories-catalog{padding:20px;display:grid;gap:24px;background:linear-gradient(145deg,#211b24eb,#16131bec);border:1px solid #9e7a4966}
.menu .memories-catalog>header{border-bottom:1px solid #b9904c66;padding-bottom:14px}
.menu .memories-catalog h2{margin:0;font:700 28px/1.2 Georgia,serif;color:#ffe3a5}
.menu .memories-catalog header p{margin:8px 0 0;font-size:14px;color:#c6bba7}
.menu .memory-chapter h3{margin:0 0 12px;font:700 19px/1.3 Georgia,serif;color:#edc58b}
.menu .memory-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:stretch}
.menu .memory-card{display:grid;grid-template-columns:68px minmax(0,1fr);gap:12px;align-items:center;min-width:0;margin:0;padding:12px;border:1px solid #a3804b66;background:linear-gradient(120deg,#352735bb,#211b25);border-radius:5px;box-shadow:inset 0 1px #f8d58e12}
.menu .memory-card>img{width:68px;height:82px;object-fit:contain;object-position:center bottom;background:#100e1666;border:1px solid #b88c4b66;border-radius:3px}
.menu .memory-card>div{min-width:0}.menu .memory-card strong{font:700 18px/1.25 Georgia,serif;color:#f4d79f}.menu .memory-card small{display:block;margin-top:5px;color:#c5b9a4;font-size:13px}
.menu .memory-actions{display:grid;gap:7px;margin-top:10px}
.menu .memory-card button{display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;min-width:0;width:100%;min-height:40px;padding:9px 10px;border:1px solid #ae854b88;border-radius:3px;background:linear-gradient(#3a2b38,#271e2c);color:#f6dfb1;font:14px/1.35 Georgia,serif;white-space:normal}
.menu .memory-card button:hover,.menu .memory-card button:focus-visible{background:#514052;border-color:#f0c476}.menu .memory-card button span{color:#ecc578;font-size:11px;flex-shrink:0}.menu .memory-card em{font:11px/1.2 Arial,sans-serif;color:#ffd888;border:1px solid #c39b5466;border-radius:8px;padding:3px 5px;font-style:normal}
.menu .memory-card-story{grid-template-columns:minmax(0,1fr) minmax(180px,1fr);max-width:760px}.menu .memory-card-story button{justify-self:end}.menu .memory-card-story::after{display:none}
@media(max-width:1050px){.menu .memory-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.menu .memories-catalog{padding:12px;gap:18px}.menu .memory-cards{grid-template-columns:minmax(0,1fr)}.menu .memory-card-story{grid-template-columns:minmax(0,1fr)}.menu .memories-catalog h2{font-size:24px}}
''';p.write_text(s,encoding='utf-8')
p=Path('public/game/index.html');s=p.read_text(encoding='utf-8').replace('game.js?v=developer-shards-249','game.js?v=memories-252').replace('rpg-menu.css?v=241','rpg-menu.css?v=252').replace('tinus-recruitment.js?v=tinus-memory-music-229','tinus-recruitment.js?v=memories-252');p.write_text(s,encoding='utf-8')
