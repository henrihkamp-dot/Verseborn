const fs=require('fs');let f='public/game/game.js',s=fs.readFileSync(f,'utf8');const target='  runCurrentTurn(openingNotes);\n}';if(!s.includes(target))throw Error('Battle opening point missing');s=s.replace(target,`  const openingBattle = battle;
  battle.phaseTotal = waves.length + 1;
  battle.phaseTransition = {step:'incoming',number:1,total:battle.phaseTotal,enemies:battle.enemies,opening:true,advance:()=>{
    if(battle!==openingBattle||mode!=='battle'||!battle.phaseTransition?.opening)return;
    battle.phaseTransition=null;
    runCurrentTurn(openingNotes);
  }};
  battle.resolving=true;
  renderBattle('The battle starts. Review the opening formation.');
}`);fs.writeFileSync(f,s);
f='public/game/battle-phase-banner.js';s=fs.readFileSync(f,'utf8');s=s.replace("const next=phase.number+':'+phase.enemies.map(e=>e.name).join('|');", "const next=phase.number+':'+phase.enemies.map(e=>[e.name,e.level,e.hp,e.max,e.mp,e.maxmp,e.resistanceTier].join(',')).join('|');");s=s.replace("const title=window.HallEncounters?.phaseTitle(battle.hallStage,phase.number,phase.enemies)||'REINFORCEMENTS ARRIVE';", "const title=phase.number===1&&phase.total===1?'OPENING FORMATION':window.HallEncounters?.phaseTitle(battle.hallStage,phase.number,phase.enemies)||(phase.number===1?'OPENING FORMATION':'REINFORCEMENTS ARRIVE');\n  const fmt=n=>Math.max(0,Number(n)||0).toLocaleString();\n  const boss=e=>e.resistanceTier==='boss'||e.npcBoss||e.endgameBoss||e.boss;");s=s.replace('THE BATTLE CONTINUES</div>','${phase.number===1?\'THE BATTLE STARTS\':\'THE BATTLE CONTINUES\'}</div>');s=s.replace("${e.finalState==='enraged'?' · ENRAGED':''}</small>"," · LV ${fmt(e.level||1)}${boss(e)?' · BOSS':''}${e.finalState==='enraged'?' · ENRAGED':''}</small><span class=\"phase-vitals\">HP ${fmt(e.hp??e.max)}/${fmt(e.max)}<br>MP ${fmt(e.mp??e.maxmp)}/${fmt(e.maxmp)}</span>");fs.writeFileSync(f,s);
f='public/game/battle-phase-banner.css';fs.appendFileSync(f,'\n.phase-cast .phase-vitals{display:block;margin-top:5px;font:600 11px/1.4 "Segoe UI",sans-serif;letter-spacing:.2px;color:#e5d3c3}\n');
f='public/game/index.html';s=fs.readFileSync(f,'utf8').replace('game.js?v=350','game.js?v=351').replaceAll('battle-phase-banner.js?v=331','battle-phase-banner.js?v=351').replaceAll('battle-phase-banner.css?v=331','battle-phase-banner.css?v=351');fs.writeFileSync(f,s);
