// Presentation only: native progression, skill costs and combat remain authoritative.
(() => {
  'use strict';
  const themes = {
    Verseborn: { name:'Lyricus Verseborn', color:'#efc978', second:'#e99874', lanes:['Song','Resonance','Inspiration'], motif:'The Songweaver', icon:3 },
    Mira: { name:'Mira Veln', color:'#cd9aff', second:'#a2cd72', lanes:['Precision','Shadow','Venom'], motif:'The Whispering Arrow', icon:0 },
    Seerin: { name:'Seerin Vahl', color:'#f4cc87', second:'#e58268', lanes:['Judgment','Protection','Conviction'], motif:"The Flame’s Shield", icon:4 },
    Kael: { name:'Kael Ironhand', color:'#9ccfdf', second:'#b695ed', lanes:['Sigils','Restoration','Shadow'], motif:'The Silent Oath', icon:7 },
    Torren: { name:'Torren Stonekin', color:'#d8b087', second:'#a8b997', lanes:['Stone','Endurance','Retaliation'], motif:'The Stoneheart', icon:12 },
    Glimmer: { name:'Glimmer', color:'#e6a7d9', second:'#84d7de', lanes:['Engineering','Invention','Overdrive'], motif:'The Gearmind', icon:8 },
    Sparky: { name:'Sparky', color:'#c79cfa', second:'#f49d6c', lanes:['Dragonblood','Devotion','Ancient Fire'], motif:'The Emberborn', icon:10 },
    Tinus: { name:'Tinus', color:'#8dccf8', second:'#edca7e', lanes:['Network','Revision','Freedom'], motif:'The Chaos Agent', icon:15 }
  };
  let view='talents', lastHero=null, detailPane='ability', bonusPage=0;
  const skillPages=new Map();
  const selections = new Map(), scrolls = new Map();
  const e = text => escapeMarkup(String(text ?? ''));
  const themeFor = id => themes[id] || themes.Verseborn;
  // Full character scenes are separate from the native portrait/sprite registry.
  function sceneSource(id) {
    const file='assets/talent-scenes-354/'+id.toLowerCase()+'.webp';
    return location.hostname.endsWith('.chatgpt.site')
      ? 'https://raw.githubusercontent.com/henrihkamp-dot/Verseborn/main/public/game/'+file
      : file;
  }
  function iconIndex(entry,id) {
    const sk=entry?.type==='newSkill'?entry.value:entry;
    const text=[entry?.name,entry?.type,sk?.element,...(sk?.buffs||[]).map(b=>b.type)].join(' ').toLowerCase();
    if(/poison|venom/.test(text))return 2;
    if(/duration|lingering|lasting|enduring|tempo|cost|rhythm|wasted/.test(text))return 13;
    if(/heal|restor|mercy|comfort|patch|prrrp|coffee/.test(text)||sk?.power<0)return 6;
    if(/barrier|shelter|protective/.test(text))return 9;
    if(/guard|shield|defen|intercept|bastion|resistan|scales/.test(text))return 5;
    if(/crit|precision|mark|weak|target|focus/.test(text))return 14;
    if(/shadow|veil|fade|silence|dream|night|void/.test(text))return id==='Kael'?7:1;
    if(/burn|flame|inferno|fire/.test(text))return 11;
    if(/sigil|magic|dispel|rite/.test(text))return id==='Tinus'?15:7;
    if(/drone|mech|turret|tech|gear|overclock/.test(text))return 8;
    if(/earth|stone|break|fault|quake|hammer/.test(text))return 12;
    return themeFor(id).icon;
  }
  function icon(entry,id,cls='') {
    const sk=entry?.type==='newSkill'?entry.value:entry,art=window.CharacterAbilityArt?.source(id,sk?.name);
    if(art)return `<span class="ts-icon ts-illustrated ${cls}" style="background-image:url('${e(art)}');background-size:cover!important;background-position:center!important" aria-hidden="true"></span>`;
    const i=iconIndex(entry,id);
    return `<span class="ts-icon ${cls}" style="--ix:${i%4};--iy:${Math.floor(i/4)}" aria-hidden="true"></span>`;
  }
  function dataFor(id) {
    const p=progressFor(id), earned=talentPointsEarned(p.level), spent=p.talents.length;
    return { p,earned,spent,available:Math.max(0,earned-spent),capstone:activeTalents(id).find(t=>t.tier===5) };
  }
  function nodeState(id,entry,rank0=false) {
    const d=dataFor(id),learned=rank0?unlockedRank0(id).some(s=>s.name===entry.name):d.p.talents.includes(entry.name);
    const cost=rank0&&!d.p.rank0?0:1;
    const requirement=rank0?0:(entry.tier-1)*2;
    const swap=!rank0&&entry.tier===5&&!!d.capstone&&!learned;
    // Match toggleTalent's capstone replacement rule, including spent points.
    const effectiveSpent=d.spent-(swap?1:0);
    const tierOpen=effectiveSpent>=requirement;
    const allowed=!learned&&mode!=='battle'&&tierOpen&&(cost===0||d.available>0||swap);
    const reason=learned?'Learned':mode==='battle'?'Unavailable during battle':!tierOpen?`Requires ${requirement} spent points`:allowed?(swap?'Swap capstone':cost===0?'First choice · free':'Available to learn'):'No talent points available';
    return {learned,cost,requirement,swap,allowed,reason};
  }
  const keyFor = (kind,index) => `${kind}:${index}`;
  function skillEntries(id) {
    const unit={id,statuses:[]}, normal=battleSkills(id,unit);
    const secret=state.gameMode==='hallBattles'&&window.EmberRift?.progress().learnedSkills[id]?EmberRift.secretSkills[id]:null;
    const entries=normal.filter(s=>s.name!==secret?.name).map(sk=>({sk,unit,group:'Current skills'}));
    if(secret)entries.push({sk:normal.find(s=>s.name===secret.name)||secret,unit,group:'Ember Rift · permanently learned',rift:true});
    for(const form of new Set(normal.filter(s=>s.transform).map(s=>s.transform))) {
      const formUnit={id,form,statuses:[]};
      for(const sk of battleSkills(id,formUnit))entries.push({sk,unit:formUnit,group:form==='mech'?'Mech Form':form==='shadowpriest'?'Shadowpriest':form});
    }
    return entries;
  }
  function selection(id) {
    const entries=view==='skills'?skillEntries(id):[...(rank0Choices[id]||[]).map((entry,index)=>({entry,rank0:true,key:keyFor('r',index)})),...(talentTrees[id]||[]).map((entry,index)=>({entry,rank0:false,key:keyFor('t',index)}))];
    const key=id+':'+view, saved=selections.get(key);
    let selected=view==='skills'?entries[saved??0]:entries.find(item=>item.key===saved);
    if(!selected)selected=view==='skills'?entries[0]:entries.find(item=>nodeState(id,item.entry,item.rank0).allowed)||entries[0];
    return {entries,selected};
  }
  function bonusHtml(id) {
    const chosen=activeTalents(id),procs=equippedProcChances(id),pages=Math.max(1,Math.ceil(chosen.length/4));
    bonusPage=Math.min(bonusPage,pages-1);
    return `<section class="ts-bonuses"><h3>Chosen talents <span>${chosen.length}</span></h3>${chosen.length?chosen.slice(bonusPage*4,bonusPage*4+4).map(t=>`<div><strong>${e(t.name)}</strong><p>${e(t.unlockDesc)}</p></div>`).join(''):'<p>No talent points spent yet.</p>'}${pages>1?`<nav class="ts-pager"><button data-ts-bonus-page="${bonusPage-1}" ${bonusPage===0?'disabled':''}>←</button><span>${bonusPage+1} / ${pages}</span><button data-ts-bonus-page="${bonusPage+1}" ${bonusPage===pages-1?'disabled':''}>→</button></nav>`:''}<h3>Equipped proc chances</h3>${procs.length?procs.map(p=>`<p class="ts-proc"><span>${e(p.type)} <small>vs normal foes ${Math.round(p.normalChance*100)}%</small></span><b>${Math.round(p.raw*100)}%</b></p>`).join(''):'<p>No Poison, Sleep or Stun proc equipped.</p>'}<h3>Prolonging effects</h3><p>Equipment · Buffs +${effectValue(id,'buffDuration')} action(s)<br>Negative statuses +${effectValue(id,'statusDuration')} action(s)</p></section>`;
  }
  function detailHtml(id,item) {
    if(!item)return '<p>No abilities available.</p>';
    const isSkill=view==='skills',entry=isSkill?item.sk:item.entry,sk=isSkill?entry:entry.type==='newSkill'?entry.value:item.rank0&&!entry.passive?entry:null;
    const stateInfo=isSkill?null:nodeState(id,entry,item.rank0);
    const label=isSkill?(item.rift?'Ember Rift skill':item.group):item.rank0?(entry.passive?'Starting passive':'Starting skill'):entry.type==='newSkill'?'Unlock a skill':'Passive talent';
    const desc=isSkill?entry.desc:item.rank0?entry.desc:entry.unlockDesc;
    const benefitLabels={critChance:'CRIT chance',physicalDamage:'physical damage',magicDamage:'magic damage',healBoost:'healing',statusResistance:'status resistance',barrierBoost:'barrier strength',ultimateBoost:'ultimate potency'};
    const benefit=!isSkill&&!item.rank0&&benefitLabels[entry.type]&&typeof entry.value==='number'?`+${Math.round(entry.value*100)}% ${benefitLabels[entry.type]}`:'';
    const cost=sk?(sk.anim==='ultimate'?'100 Resonance':sk.basicAttack?`0 MP · restores ${Math.round(basicAttackMpRecoveryRate(id)*100)}% Max MP`:`${skillMpCost(id,sk,item.unit||{id,statuses:[]})} MP`):'';
    return `<nav class="ts-detail-tabs"><button data-ts-pane="ability" aria-pressed="${detailPane==='ability'}">Ability</button><button data-ts-pane="bonuses" aria-pressed="${detailPane==='bonuses'}">Build bonuses</button></nav><div class="ts-detail-page"><div class="ts-detail-main" ${detailPane==='ability'?'':'hidden'}>${icon(entry,id,'ts-detail-icon')}<small class="ts-eyebrow">${e(label)}</small><h2>${e(entry.name)}</h2>${benefit?`<strong class="ts-benefit">${e(benefit)}</strong>`:''}<p class="ts-description">${e(desc)}</p>${sk?`<div class="ts-facts"><span><small>Cost</small><strong>${e(cost)}</strong></span><span><small>Target</small><strong>${e(battleSkillTargetLabel(id,sk))}</strong></span><span><small>Element</small><strong>${e(sk.element)}</strong></span><span><small>Formula</small><strong>${e(skillFormula(sk,id))}</strong></span></div>${statusAbilityMetricsHtml(id,sk,item.unit||{id,statuses:[]})}<p class="ts-estimate">Estimates use current gear and talents. Damage is per target, before enemy defenses, weakness and temporary buffs.</p>`:''}${isSkill?`<p class="ts-state is-learned">✓ ${item.rift?'Purchased with Rift Shards · permanently learned':'Available in '+(item.unit.form?'this transformation':'battle')}</p>`:`<p class="ts-state ${stateInfo.learned?'is-learned':''}">${stateInfo.learned?'✓ ':''}${e(stateInfo.reason)}</p><button type="button" class="ts-learn" data-ts-learn="${e(item.key)}" ${stateInfo.allowed?'':'disabled'}>${stateInfo.learned?'Already learned':stateInfo.swap?'Swap capstone · no extra point':stateInfo.cost===0?'Learn starting skill · free':'Learn talent · 1 point'}</button>${!item.rank0&&entry.tier===5?'<p class="ts-rule">Choose one capstone. An unlocked capstone can be swapped without spending another point.</p>':''}`}</div><div class="ts-bonus-page" ${detailPane==='bonuses'?'':'hidden'}>${bonusHtml(id)}</div></div>`;
  }
  function talentHtml(id,selected) {
    const nodes=(rank0Choices[id]||[]).map((entry,index)=>({entry,rank0:true,key:keyFor('r',index)})).concat((talentTrees[id]||[]).map((entry,index)=>({entry,rank0:false,key:keyFor('t',index)})));
    const d=dataFor(id);
    const row=(tier,title,note)=>`<section class="ts-tier" data-tier="${tier}" aria-label="${e(title)}"><header title="${e(note)}"><strong>${tier===0?e(title):tier===5?'✦':tier}</strong><small>${tier===0?e(note):`${(tier-1)*2} pts`}</small></header><div class="ts-nodes">${nodes.filter(n=>tier===0?n.rank0:!n.rank0&&n.entry.tier===tier).map(n=>{
      const s=nodeState(id,n.entry,n.rank0),isSelected=selected?.key===n.key;
      return `<button type="button" class="ts-node ${s.learned?'is-learned':s.allowed?'is-available':'is-locked'} ${isSelected?'is-selected':''}" data-ts-node="${e(n.key)}" aria-pressed="${isSelected}" aria-label="${e(n.entry.name+' · '+s.reason)}">${icon(n.entry,id)}<span class="ts-node-name">${e(n.entry.name)}</span><span class="ts-node-status">${s.learned?'✓ Learned':s.allowed?(s.cost===0?'Free choice':s.swap?'Swap':'Available'):'◇ Locked'}</span></button>`;
    }).join('')}</div></section>`;
    const secret=state.gameMode==='hallBattles'&&window.EmberRift?.progress().learnedSkills[id]?EmberRift.secretSkills[id]:null;
    return `<div class="ts-tree-intro"><p>Spend points to open tiers. Choose freely across each row.</p><small>Connections show tier progression, not individual prerequisites.</small></div>${row(0,'Starting skills','First choice free · additional choices cost 1 point')}<div class="ts-lanes" aria-label="Character themes">${themeFor(id).lanes.map(name=>`<span>${e(name)}</span>`).join('')}</div>${[1,2,3,4,5].map(t=>row(t,t===5?'Tier 5 · Capstone':`Tier ${t}`,t===1?'Open':`${(t-1)*2} spent points${t===5?' · choose one':''}`)).join('')}${secret?`<section class="ts-rift"><small class="ts-eyebrow">Ember Rift · learned</small><button type="button" data-ts-rift>${icon(secret,id)}<span><strong>${e(secret.name)}</strong><small>Purchased with Rift Shards · View skill →</small></span></button></section>`:''}<footer class="ts-tree-footer"><span>${d.spent} / ${d.earned} points spent</span>${canResetTalents()?'<small>Reset available above.</small>':'<small>Recruit Kael to reset talents.</small>'}</footer>`;
  }
  function skillsHtml(id,entries,selected) {
    let group='';const page=skillPages.get(id)||0,pages=Math.max(1,Math.ceil(entries.length/6));
    return `<div class="ts-tree-intro"><p>Your learned abilities, using current equipment and talents.</p></div>${entries.slice(page*6,page*6+6).map((item,offset)=>{const index=page*6+offset;
      const heading=group===item.group?'':`<h3 class="ts-skill-group">${e(item.group)}</h3>`;group=item.group;
      const sk=item.sk,cost=sk.anim==='ultimate'?'100 ULT':`${skillMpCost(id,sk,item.unit)} MP`;
      return `${heading}<button type="button" class="ts-skill-row ${item===selected?'is-selected':''} ${item.rift?'is-rift':''}" data-ts-skill="${index}" aria-pressed="${item===selected}">${icon(sk,id)}<span><strong>${e(sk.name)}</strong><small>${e(sk.element)} · ${e(battleSkillTargetLabel(id,sk))}</small></span><b>${e(cost)}</b></button>`;
    }).join('')}<nav class="ts-pager"><button data-ts-skill-page="${page-1}" ${page===0?'disabled':''}>← Previous</button><span>${page+1} / ${pages}</span><button data-ts-skill-page="${page+1}" ${page===pages-1?'disabled':''}>Next →</button></nav>`;
  }
  function fitDetails() {
    const box=el.menuBody.querySelector('.ts-detail-page');if(!box)return;
    const content=box.querySelector(':scope > :not([hidden])');if(!content)return;
    content.style.zoom='1';const ratio=Math.min(1,(box.clientHeight-4)/content.scrollHeight);content.style.zoom=String(ratio);
  }
  window.addEventListener('resize',()=>requestAnimationFrame(fitDetails));
  function render() {
    if(!state.party.includes(selectedSkillHero))selectedSkillHero=state.party[0];
    const id=selectedSkillHero;if(!id)return;
    const heroChanged=lastHero!==id;lastHero=id;
    const theme=themeFor(id),hero=baseJobs[id],d=dataFor(id),{entries,selected}=selection(id);
    const scrollKey=id+':'+view;
    el.menu.dataset.menuView='skills';
    el.menu.style.setProperty('--ts-accent',theme.color);
    const sceneIndex=Object.keys(themes).indexOf(id);
    el.menuBody.innerHTML=`<section class="skill-studio" data-hero="${e(id)}" data-view="${view}" style="--ts-accent:${theme.color};--ts-second:${theme.second};--ts-scene-x:${sceneIndex%4};--ts-scene-y:${Math.floor(sceneIndex/4)};--ts-sigil-x:${theme.icon%4};--ts-sigil-y:${Math.floor(theme.icon/4)}"><div class="ts-world"><img class="ts-scene" src="${e(sceneSource(id))}" alt="${e(theme.name)} in their own world"></div><div class="ts-atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><aside class="ts-profile"><img class="ts-portrait" src="${e(menuPortraitSource(id))}" alt="${e(hero.name)}"><div class="ts-identity"><h2>${e(theme.name||hero.name)}</h2><p class="ts-character-title">${e(theme.motif)}</p><small class="ts-eyebrow">${e(hero.element)}</small><strong class="ts-level">Level ${d.p.level}</strong>${xpProgressHtml(id)}</div><nav class="ts-roster" aria-label="Choose character">${state.party.map(heroId=>`<button type="button" data-ts-hero="${e(heroId)}" class="${id===heroId?'is-selected':''}" aria-label="${e(heroId)}" aria-pressed="${id===heroId}" title="${e(heroId)}"><img src="${e(menuPortraitSource(heroId))}" alt=""><span>${e(heroId)}</span></button>`).join('')}</nav></aside><main class="ts-workspace"><header class="ts-top"><div><small class="ts-eyebrow">Character development</small><h2>${view==='talents'?'Talents':'Skills'}</h2>${view==='talents'?'<small class="ts-tier-count">5 tiers · 15 talents</small>':''}</div><div class="ts-top-actions">${canResetTalents()?`<button type="button" class="ts-reset" data-ts-reset ${d.spent||d.p.rank0?'':'disabled'}>Reset talents</button>`:''}<span class="ts-points">✦ ${d.available} ${d.available===1?'point':'points'} available</span></div></header><nav class="ts-view-tabs" aria-label="Ability view"><button type="button" data-ts-view="talents" aria-pressed="${view==='talents'}" class="${view==='talents'?'is-selected':''}">Talents</button><button type="button" data-ts-view="skills" aria-pressed="${view==='skills'}" class="${view==='skills'?'is-selected':''}">Skills</button><span>${theme.lanes.map(e).join(' · ')}</span></nav><div class="ts-scroll">${view==='talents'?talentHtml(id,selected):skillsHtml(id,entries,selected)}</div></main><aside class="ts-detail" aria-label="Selected ability details">${detailHtml(id,selected)}</aside><div class="ts-live" role="status" aria-live="polite"></div></section>`;
    const scene=el.menuBody.querySelector('.ts-scene');
    const showScene=()=>{const studio=scene.closest('.skill-studio');studio?.classList.add('has-scene');if(heroChanged)studio?.classList.add('is-hero-selected');};
    scene.addEventListener('load',showScene,{once:true});
    if(scene.complete&&scene.naturalWidth)showScene();
    const scroll=el.menuBody.querySelector('.ts-scroll');scroll.scrollTop=scrolls.get(scrollKey)||0;
    scroll.addEventListener('scroll',()=>scrolls.set(scrollKey,scroll.scrollTop),{passive:true});
    el.menuBody.querySelectorAll('[data-ts-hero]').forEach(b=>b.onclick=()=>{selectedSkillHero=b.dataset.tsHero;renderMenu();});
    el.menuBody.querySelectorAll('[data-ts-view]').forEach(b=>b.onclick=()=>{view=b.dataset.tsView;renderMenu();});
    const select=(key)=>{detailPane='ability';selections.set(scrollKey,key);renderMenu();};
    el.menuBody.querySelectorAll('[data-ts-pane]').forEach(b=>b.onclick=()=>{detailPane=b.dataset.tsPane;renderMenu();});
    el.menuBody.querySelectorAll('[data-ts-bonus-page]').forEach(b=>b.onclick=()=>{bonusPage=Number(b.dataset.tsBonusPage);renderMenu();});
    el.menuBody.querySelectorAll('[data-ts-skill-page]').forEach(b=>b.onclick=()=>{skillPages.set(id,Number(b.dataset.tsSkillPage));renderMenu();});
    requestAnimationFrame(fitDetails);
    el.menuBody.querySelectorAll('[data-ts-node]').forEach(b=>b.onclick=()=>{select(b.dataset.tsNode);el.menuBody.querySelector(`[data-ts-node="${b.dataset.tsNode}"]`)?.focus({preventScroll:true});});
    el.menuBody.querySelectorAll('[data-ts-skill]').forEach(b=>b.onclick=()=>{select(Number(b.dataset.tsSkill));el.menuBody.querySelector(`[data-ts-skill="${b.dataset.tsSkill}"]`)?.focus({preventScroll:true});});
    el.menuBody.querySelector('[data-ts-rift]')?.addEventListener('click',()=>{const skills=skillEntries(id);view='skills';detailPane='ability';const riftIndex=skills.findIndex(s=>s.rift);skillPages.set(id,Math.floor(riftIndex/6));selections.set(id+':skills',riftIndex);renderMenu();});
    const learn=el.menuBody.querySelector('[data-ts-learn]');
    if(learn)learn.onclick=()=>{
      const current=selection(id).selected;if(!current||!nodeState(id,current.entry,current.rank0).allowed)return;
      if(current.rank0)selectRank0(id,current.entry.name);else{toggleTalent(`${id}:${current.entry.name}`);queueSave();}
      el.menuBody.querySelector('.ts-live').textContent=`${current.entry.name} learned.`;
      el.menuBody.querySelector('[data-ts-learn]')?.focus({preventScroll:true});
    };
    el.menuBody.querySelector('[data-ts-reset]')?.addEventListener('click',()=>{
      if(!confirm(`Reset ${hero.name}’s talents and starting skill choices? All spent talent points will be returned.`))return;
      resetTalents(id);
    });
  }
  const original=renderMenu;
  renderMenu=function(...args){
    // Let native navigation and other menu extensions perform their normal housekeeping.
    const result=original(...args);
    if(menuTab==='skills')render();
    return result;
  };
  window.TalentStudio={themes,render,skillEntries,nodeState,get view(){return view;}};
})();
