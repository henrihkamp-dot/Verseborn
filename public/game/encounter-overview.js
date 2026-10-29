// Preview uses the same enemy preparation as combat, including level and scaling.
(()=>{
 const summaries={tank:'A durable frontline enemy built to absorb pressure.',bruiser:'A tough physical attacker with frontline staying power.',assassin:'A fast attacker focused on concentrated damage.',dps:'An attacker focused on dealing damage.',fighter:'A physical fighter applying steady attack pressure.',caster:'A magic attacker that relies on spells.',mage:'A magic attacker that relies on spells.',healer:'A support enemy that restores allies.',controller:'A control specialist using disruptive effects.',utility:'A support specialist using effects and disruption.',hybrid:'A versatile enemy with a mixed combat role.'};
 function mount(host,path){
  const overview=host.querySelector('.trial-overview');if(!overview)return;
  let waves=[];
  if(path==='ember'){const stage=Number(host.querySelector('[data-hall-stage].is-selected')?.dataset.hallStage),info=hallBattleInfo(stage);if(info)waves=[info.enemies,...info.waves].map((keys,i)=>hallEnemiesForStage(stage,keys,i).map(u=>prepareEnemyForBattle(u,stage>50?'emberHallBattles':info.mapId)));}
  else if(path==='rift'){const id=Number(host.querySelector('[data-rift-select].is-selected')?.dataset.riftSelect),info=EmberRift.encounters[id-1];if(info)waves=info.waves.map((keys,phase)=>keys.map((key,i)=>prepareEnemyForBattle(EmberRift.makeEnemy(key,id,phase,i),'emberRiftVault')));}
  else if(path==='whirlpool'){const id=Number(host.querySelector('[data-whirlpool-select].is-selected')?.dataset.whirlpoolSelect);if(id)waves=[[prepareEnemyForBattle(TinusWhirlpool.makeEnemy(id),'emberHallBattles')]];}
  else {const id=host.querySelector('[data-shadow].is-selected')?.dataset.shadow;if(id){const total=HallHub.shadowStats(id),source=enemy('Shadow '+id,total.max,total.str,baseJobs[id].element,'#bd9971',1,id);source.sparringId=id;source.levelHint=40;source.fixedLevel=true;waves=[[prepareEnemyForBattle(source,'emberHallBattles')]];}}
  if(!waves.length)return;
  const stage=path==='ember'?Number(host.querySelector('[data-hall-stage].is-selected')?.dataset.hallStage):0;
  overview.querySelector('.encounter-design-note')?.remove();
  if(stage&&window.HallEncounters){const note=document.createElement('small');note.className='encounter-design-note';note.textContent=HallEncounters.encounterLabel(stage)+(stage===26?' · Starts alone; calls one Shadow Echo below 65% HP.':' · '+waves.length+' phase'+(waves.length>1?'s':''));overview.prepend(note);}
  overview.querySelectorAll('ol,ul,.encounter-enemies,.encounter-wave-tabs').forEach(n=>n.remove());
  const list=document.createElement('div');list.className='encounter-enemies';
  const tabs=document.createElement('nav');tabs.className='encounter-wave-tabs';tabs.setAttribute('aria-label','Enemy waves');
  if(waves.length>1)overview.appendChild(tabs);
  waves.forEach((wave,index)=>{const section=document.createElement('section'),title=document.createElement('h4');section.hidden=index>0;
  if(waves.length>1){const button=document.createElement('button');button.type='button';button.textContent='Wave '+(index+1);button.classList.toggle('is-selected',index===0);button.onclick=()=>{[...list.children].forEach((n,i)=>n.hidden=i!==index);[...tabs.children].forEach((n,i)=>n.classList.toggle('is-selected',i===index));};tabs.appendChild(button);}
title.textContent=waves.length>1?'Wave '+(index+1):'Enemies';section.appendChild(title);
   wave.forEach(u=>{const row=document.createElement('article');row.className='encounter-enemy';const portrait=document.createElement('img');EncounterPortraits.assign(portrait,EncounterPortraits.unit(u));portrait.alt=u.name;portrait.className='encounter-enemy-portrait';row.appendChild(portrait);const name=document.createElement('strong');name.textContent=u.name;const role=document.createElement('small'),raw=String(u.role||'fighter').toLowerCase(),label=raw.charAt(0).toUpperCase()+raw.slice(1);role.textContent=label+' · Level '+u.level;if(u.sparringId){const key=combatRoleKey({id:u.sparringId},false);role.textContent=key.charAt(0).toUpperCase()+key.slice(1)+' · Level '+u.level;}const stats=document.createElement('span');stats.textContent='HP '+u.max.toLocaleString()+' · MP '+(u.maxmp||0).toLocaleString();const sentence=document.createElement('p');sentence.textContent=(u.sparringId?summaries[combatRoleKey({id:u.sparringId},false)]:null)||summaries[raw]||summaries[combatRoleKey(u,true)]||summaries.hybrid;row.append(name,role,stats,sentence);section.appendChild(row);});list.appendChild(section);
  });overview.appendChild(list);const face=overview.querySelector(':scope>img');if(face&&waves[0]?.length){if(path==='shadow')face.src=EncounterPortraits.unit(waves[0][0]);else if(path!=='ember')face.src=EncounterPortraits.enemy(face.alt);}
 }
 window.EncounterOverview={mount};
})();
