// Category-first command HUD. All actions are dispatched to the existing battle engine.
(() => {
  'use strict';
  const model=BattleActionModel,root=el.battle,game=canvas.parentElement;
  root.classList.add('command-battle');
  const make=(tag,cls,parent)=>{const n=document.createElement(tag);n.className=cls;parent?.appendChild(n);return n;};
  const timeline=make('nav','bc-timeline',root);timeline.setAttribute('aria-label','Upcoming turns');
  const cards=make('div','bc-combatants',root);
  const command=make('section','bc-command',root);command.setAttribute('aria-label','Battle commands');
  const left=make('div','bc-command-left',command),heading=make('div','bc-command-heading',left);
  const categories=make('nav','bc-categories',left);categories.setAttribute('aria-label','Action categories');
  const actionRow=make('div','bc-action-row',left),detail=make('aside','bc-detail',command);
  detail.setAttribute('aria-label','Selected action details');
  const foot=make('div','bc-command-foot',left),instruction=make('span','bc-instruction',foot);
  const historyButton=make('button','bc-history-button',foot);historyButton.type='button';historyButton.textContent='Battle history';
  const history=make('dialog','bc-history',document.body);history.innerHTML='<header><strong>Battle history</strong><button type="button" aria-label="Close history">×</button></header><div class="bc-history-content"></div>';
  const unitTooltip=make('aside','bc-unit-tooltip',root);unitTooltip.hidden=true;unitTooltip.setAttribute('role','tooltip');
  let hoveredUnit=null;
  function showUnitTooltip(u,event){
    if(mode!=='battle')return;
    const scroll=hoveredUnit===u?unitTooltip.scrollTop:0;hoveredUnit=u;
    unitTooltip.innerHTML=`<strong>${esc(u.name)}</strong><div class="bc-tooltip-vitals">HP ${Math.max(0,Math.round(u.hp))} / ${u.max} · MP ${Math.max(0,Math.round(u.mp||0))} / ${u.maxmp||0}</div>${(u.statuses||[]).map(s=>{const data=statusDisplayData(u,s);return `<section><b>${esc(data.name)}</b><small>${esc(data.timing)}</small><p>${esc(data.description)}</p></section>`;}).join('')||'<p>No active buffs or debuffs.</p>'}`;
    unitTooltip.hidden=false;unitTooltip.scrollTop=scroll;
    const r=game.getBoundingClientRect(),x=event?.clientX??r.left+r.width/2,y=event?.clientY??r.top+r.height/2;
    unitTooltip.style.left=`${Math.max(6,Math.min(r.width-unitTooltip.offsetWidth-6,x-r.left+16))}px`;
    unitTooltip.style.top=`${Math.max(6,Math.min(r.height-unitTooltip.offsetHeight-6,y-r.top+16))}px`;
  }
  function hideUnitTooltip(){hoveredUnit=null;unitTooltip.hidden=true;}
  command.addEventListener('pointerenter',hideUnitTooltip);
  root.addEventListener('wheel',event=>{if(hoveredUnit&&!unitTooltip.hidden&&unitTooltip.scrollHeight>unitTooltip.clientHeight){unitTooltip.scrollTop+=event.deltaY;event.preventDefault();}},{passive:false});
  history.querySelector('button').onclick=()=>history.close();
  historyButton.onclick=()=>{history.querySelector('header strong').textContent='Battle history';history.querySelector('.bc-history-content').innerHTML=(battle.actionHistory||[]).map(a=>`<div><strong>R${a.round} · ${esc(a.actor)}</strong><p>${esc(a.message)}</p>${(a.events||[]).map(e=>`<small>${esc(e.target)}: ${e.crit?'CRIT ':''}${e.amount} ${esc(e.type||e.kind)} ${esc(e.text)}</small>`).join('')}</div>`).join('')||'<p>No actions yet.</p>';history.showModal();};
  let lockedAction=null,lockedItem=null;
  let owner=null,turnOwner=null,ui={level:'category',category:'attack',action:0,target:0,page:0},groups=[],unit=null,selected=null,targetList=[],targetGroup=false,lastLayout='',statusNodes=[];
  let lastActions={};try{lastActions=JSON.parse(localStorage.getItem('verseborn-battle-ui-v1')||'{}');}catch{}
  if(!lastActions||typeof lastActions!=='object'||Array.isArray(lastActions))lastActions={};
  const memoryKey=()=>unit?unit.id+':'+(unit.form||'base'):'';
  function remember(action=skill()){
    if(!unit||!action)return;
    lastActions[memoryKey()]={name:action.actionId||action.name,category:ui.category};
    try{localStorage.setItem('verseborn-battle-ui-v1',JSON.stringify(lastActions));}catch{}
  }
  function restoreChoice(){
    const previous=lastActions[memoryKey()];if(!previous)return;
    const group=groups.find(g=>g.id===previous.category&&g.actions.some(a=>(a.actionId||a.name)===previous.name))||groups.find(g=>g.actions.some(a=>(a.actionId||a.name)===previous.name));
    if(group){ui.category=group.id;ui.action=group.actions.findIndex(a=>(a.actionId||a.name)===previous.name);}
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={
    attack:'M7 4l13 15-3 3L4 8l-1-5 4 1zM25 4L12 19l3 3L28 8l1-5-4 1zM5 20l7 7M27 20l-7 7',
    defend:'M16 3l11 4v9c0 7-6 11-11 14C11 27 5 23 5 16V7l11-4zM16 8v16M10 13h12',
    spell:'M16 2c4 7-2 8 2 12 2-1 3-4 3-6 7 7 7 12 2 17-5 5-14 3-16-3-3-7 4-9 4-14 3 4-1 8 3 9 3-3-1-8 2-15zM16 21v7M12 24h8',
    heal:'M16 3l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9zM16 11v10M11 16h10',
    buffDebuff:'M16 3c4 3 8 4 11 4v10c0 7-7 11-11 13C12 28 5 24 5 17V7c3 0 7-1 11-4zM16 8v16',
    utility:'M7 3h18M7 29h18M9 4c0 7 2 9 7 12-5 3-7 5-7 12M23 4c0 7-2 9-7 12 5 3 7 5 7 12M12 8h8M12 25l4-5 4 5',
    ultimate:'M16 2l4 9-1 8 7-8-2 13-8 6-8-6-2-13 7 8-1-8 4-9zM16 17v12'
  };
  function icon(kind,color){return `<svg class="bc-icon" viewBox="0 0 32 32" aria-hidden="true" style="--icon-color:${color||'currentColor'}"><path d="${paths[kind]||paths.spell}"/></svg>`;}
  function abilityIcon(sk){
    const source=sk.icon||sk.iconSrc||sk.artwork;
    if(source)return `<img class="bc-ability-icon" src="${esc(source)}" alt="">`;
    // No dedicated ability pictures exist in the old command list. These small
    // reusable vector sigils match the reference, without replacing status art.
    if(sk.category==='spell'||sk.anim==='magic'&&skillTargetsEnemies(sk)){
      const color=sk.element==='Tech'?'#55c7ff':sk.element==='Holy Fire'?'#ffd97d':sk.element==='Ancient Fire'?'#ff9e62':'#d484ff';
      return `<svg class="bc-ability-glyph" viewBox="0 0 64 64" aria-hidden="true" style="color:${color}"><circle class="bc-sigil-halo" cx="32" cy="32" r="22"/><g fill="none" stroke="currentColor" stroke-width="1.7"><ellipse cx="32" cy="32" rx="25" ry="17" transform="rotate(-35 32 32)"/><path d="M13 46C18 12 48 10 49 20S17 54 16 42 44 17 52 16M19 7l3 12M42 47l4 11M6 29l11 3M48 33l11 3"/><path stroke="#fff3ff" d="M31 20l4 9 8 2-9 4-2 9-4-9-8-3 9-3 2-9z"/></g><circle cx="47" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="51" r="1.5" fill="currentColor"/></svg>`;
    }
    return icon(sk.category,model.categories.find(c=>c.id===sk.category)?.color);
  }
  const currentGroup=()=>groups.find(c=>c.id===ui.category)||groups[0];
  const skill=()=>currentGroup()?.actions[ui.action]||currentGroup()?.actions[0];
  const pageSize=()=>game.getBoundingClientRect().width<560?1:game.getBoundingClientRect().width<701?2:6;
  function extras(){
    return [{name:'Defend',category:'defend',targetScope:'self',cost:0,command:'defend',desc:`Block ${defendReduction(unit)}% of the next direct hit and gain 6 Resonance.`},
      ...(carriedBattleItems().length?[{name:'Items',category:'utility',targetScope:'self',command:'items',cost:0,desc:'Use a carried battle item. Consumes the current action.'}]:[])];
  }
  function refreshGroups(){
    groups=model.groups(unit);
    for(const action of extras()){
      let group=groups.find(c=>c.id===action.category);
      if(!group){group={...model.categories.find(c=>c.id===action.category),actions:[]};groups.push(group);}
      group.actions.push(action);
    }
    const support=groups.filter(g=>g.id==='utility'||g.id==='buffDebuff');
    if(support.length){
      const actions=[...new Map(support.flatMap(g=>g.actions).map(a=>[a.actionId||a.name,a])).values()];
      groups=groups.filter(g=>g.id!=='utility'&&g.id!=='buffDebuff');
      groups.push({...model.categories.find(c=>c.id==='buffDebuff'),label:'(De)Buff',kind:'(De)Buff',actions});
      if(ui.category==='utility')ui.category='buffDebuff';
    }
    groups.sort((a,b)=>model.categories.findIndex(c=>c.id===a.id)-model.categories.findIndex(c=>c.id===b.id));
    if(!groups.some(c=>c.id===ui.category)){ui.category=groups[0]?.id;ui.action=0;}
    ui.action=Math.min(ui.action,Math.max(0,currentGroup().actions.length-1));
  }
  function disabled(sk){
    if(sk.command==='defend')return '';
    if(sk.command==='items')return carriedBattleItems().some(([,i])=>canUseBattleItem(unit,i))?'':'No usable item';
    return model.reason(unit,sk);
  }
  function cost(sk){return sk.anim==='ultimate'?'100 Resonance':sk.command?'0 MP':`${skillMpCost(unit.id,sk,unit)} MP`;}
  function selectCategory(id,enter=false){lockedAction=null;battle.targetMode=false;battle.pendingSkill=null;ui.category=id;ui.action=0;ui.level=enter?'action':'category';ui.page=0;renderCommands();}
  function targetName(sk){return model.scopes[sk.targetScope]||'Self';}
  function durationPreview(sk,status,target){
    const def=STATUS_DEFS[status.type]||{},buff=(sk.buffs||[]).includes(status);
    let requested=status.duration;
    if(buff)requested=(requested||def.duration||3)+typedTalentValue(unit.id,'buffDuration')+effectValue(unit.id,'buffDuration')+(typedTalentValue(unit.id,'supportPotency')?1:0);
    else if(status===sk.status&&sk.name==='Scramble Signal')requested=(requested||def.duration||1)+typedTalentValue(unit.id,'scrambleDuration');
    if(status.type==='poison'&&!requested)requested=({weak:3,normal:4,strong:5})[status.potency||'normal'];
    let duration=statusDurationFor(unit,status.type,requested);
    if(def.negative&&target&&(target.id||target.sparringId)){
      // Duration resistance can consume a first-hit guard: preview on a copy only.
      const copy={...target,statusGuards:{...target.statusGuards}};
      let reduction=window.StatusSystem?StatusSystem.durationReduction(copy,status.type,duration):effectValue(target.id,'statusDurationReduction');
      const blessing=battle.party.includes(target)?window.HallHub?.supportForBattle()?.blessing:null;
      if(duration>1&&blessing?.firstStatusDuration&&!target.statusGuards?.kaelDuration)reduction=Math.min(2,reduction+blessing.firstStatusDuration);
      duration=Math.max(1,duration-reduction);
    }
    const bossControl=target&&!target.id&&(target.endgameBoss||target.resistanceTier==='boss'&&!(battle?.hallStage>=51&&battle.hallStage<=60))&&['stun','sleep'].includes(status.type);
    return bossControl?1:Math.max(1,Math.round(duration));
  }
  function detailHtml(sk,target=null){
    if(!sk)return '<p>Choose an action category.</p>';
    const reason=disabled(sk),group=model.categories.find(c=>c.id===sk.category);
    const preview=description(sk,target);
    const statuses=[...(sk.status?[sk.status]:[]),...(sk.extraStatuses||[]),...(sk.buffs||[])];
    return `<header><span class="bc-detail-art">${abilityIcon(sk)}</span><div><h3>${esc(sk.name)}</h3><span class="bc-badge">${group.kind}</span> <span class="bc-badge">${targetName(sk)}</span></div></header><div class="bc-costline"><span>${cost(sk)}</span><span>${sk.command?'Tactical':`${esc(sk.element)} · ${skillScalingLabel(unit.id,sk)}`}</span>${sk.targetPolicy?'<span>Lowest HP</span>':''}</div><p class="bc-description">${esc(preview)}</p>${reason?`<p class="bc-unavailable">${esc(reason)}</p>`:''}${statuses.length?`<div class="bc-effects">${statuses.map(s=>{
      const def=STATUS_DEFS[s.type]||{},recipient=def.negative?target||unit:(sk.targetScope==='self'?unit:target||unit),duration=durationPreview(sk,s,recipient),value=s.value??def.value;
      const previewStatus={...s,remaining:duration,value};
      const previewUnit={...recipient,statuses:[...ensureStatuses(recipient).filter(a=>a.type!==s.type),previewStatus]};
      const desc=statusDisplayData(previewUnit,previewStatus).description;
      return `<span><b>${esc(def.label||s.type)}</b> ${Number.isFinite(value)&&value<1?`${Math.round(value*100)}% · `:''}${duration} actions${s.chance!=null?` · ${Math.round(s.chance*100)}% base chance`:''}${statuses.length===1?`<small>${esc(desc)}</small>`:''}</span>`;
    }).join('')}</div>`:''}`;
  }
  function description(sk,target){
    if(sk.command)return sk.desc;
    let copy=sk.desc||'';
    const statuses=[...(sk.status?[sk.status]:[]),...(sk.extraStatuses||[]),...(sk.buffs||[])];
    if(statuses.length){
      const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
      const mappings=statuses.map(s=>({base:s.duration||STATUS_DEFS[s.type]?.duration||3,effective:durationPreview(sk,s,target||unit)}));
      let ambiguous=false;
      copy=copy.replace(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(actions?|turns?)\b/gi,(text,n,label)=>{
        const base=Number.isFinite(Number(n))?Number(n):words.indexOf(n.toLowerCase()),matches=mappings.filter(m=>m.base===base),values=[...new Set(matches.map(m=>m.effective))];
        if(values.length===1)return `${values[0]} ${label.replace(/s$/,'')}${values[0]===1?'':'s'}`;
        if(values.length>1)ambiguous=true;
        return text;
      });
      if(!/\b\d+\s+(?:actions?|turns?)\b/i.test(copy)||ambiguous){
        if(ambiguous)copy=copy.replace(/\s+for\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:actions?|turns?)/gi,'');
        copy+=' '+statuses.map(s=>`${STATUS_DEFS[s.type]?.label||s.type}: ${durationPreview(sk,s,target||unit)} actions.`).join(' ');
      }
    }
    const native=skillPreview(unit,sk,target),range=native.match(/\b\d+-\d+ damage/);
    if(range&&!sk.statusOnly&&!sk.dispel){
      // Target, cost and scaling already have their own badges. Keep the native
      // calculated range and effects, without repeating that metadata in prose.
      copy=copy.replace(/^\d+(?:\.\d+)?[×x]\s*[^;]*damage[.;]\s*/i,'');
      const basic=sk.basicAttack?weaponBasicAttackEffect(gearByName(baseJobs[unit.id].gear.weapon))?.label:'';
      return `Deal ${range[0].replace('-','–')} (${skillScaling(sk)==='str'?'physical':'magic'}). ${copy}${basic?` ${basic}.`:''}${sk.basicAttack?` Restores ${Math.round(basicAttackMpRecoveryRate(unit.id)*100)}% Max MP.`:''}`;
    }
    if(sk.power<0)return `Heal ${healingAmount(unit.id,sk,unit)} HP. ${copy}`;
    if(sk.manaRecovery)return `Restore ${prrrpManaAmount(unit,sk)} MP. ${copy}`;
    return copy;
  }
  function updatePreview(){
    selected=ui.level==='items'||ui.level==='itemTarget'?null:skill();
    let previewTarget=null;
    if(ui.level==='target')previewTarget=targetList[ui.target];
    else if(selected&&!selected.command){const list=model.targets(unit,selected);previewTarget=list[0];}
    detail.innerHTML=detailHtml(selected,previewTarget);
    highlightTargets();
  }
  function renderCategories(){
    categories.innerHTML='';
    groups.forEach(c=>{
      const b=make('button','bc-category',categories);b.type='button';b.dataset.category=c.id;b.style.setProperty('--category-color',c.color);
      b.classList.toggle('is-selected',ui.category===c.id);b.classList.toggle('is-focused',ui.level==='category'&&ui.category===c.id);b.setAttribute('aria-pressed',String(ui.category===c.id));
      b.innerHTML=`${icon(c.id,c.color)}<span>${c.label}</span>`;
      b.onclick=()=>selectCategory(c.id,true);
      b.title=c.label;
      b.setAttribute('aria-label',c.label);
    });
  }
  function renderCommands(){
    if(!unit||!battle)return;
    root.dataset.level=ui.level;
    heading.innerHTML=`<strong>${esc(unit.name)}</strong><span>${ui.level==='target'?'Choose target':ui.level==='items'?'Carried items':ui.level==='itemTarget'?'Choose fallen ally':'Choose an action'}</span>`;
    renderCategories();actionRow.innerHTML='';
    if(ui.level==='items'){renderItems();}
    else if(ui.level==='itemTarget'){renderItemTargets();}
    else{
      const actions=currentGroup()?.actions||[],size=pageSize();ui.page=Math.floor(ui.action/size);
      const start=ui.page*size;actionRow.style.setProperty('--action-count',Math.min(size,actions.length));
      actions.slice(start,start+size).forEach((sk,j)=>{
        const index=start+j,reason=disabled(sk),b=make('button','bc-action',actionRow);b.type='button';b.dataset.action=String(index);b.dataset.category=sk.category;
        b.setAttribute('aria-disabled',String(Boolean(reason)));b.classList.toggle('is-unavailable',Boolean(reason));b.classList.toggle('is-unaffordable',reason==='Not enough MP');b.classList.toggle('is-selected',ui.action===index);b.classList.toggle('is-focused',ui.level==='action'&&ui.action===index);
        b.innerHTML=`<span class="bc-card-art">${abilityIcon(sk)}</span><span class="bc-action-copy"><strong>${esc(sk.name)}</strong><span><small class="bc-badge">${targetName(sk)}</small><b>${cost(sk)}</b></span>${reason?`<small class="bc-reason">${esc(reason)}</small>`:sk.targetPolicy?'<small class="bc-auto-target">Lowest-HP ally</small>':''}</span>`;
        b.title=sk.name;b.setAttribute('aria-label',sk.name);b.classList.toggle('is-locked',lockedAction===ui.category+':'+(sk.actionId||sk.name));b.setAttribute('aria-pressed',String(lockedAction===ui.category+':'+(sk.actionId||sk.name)));
        // Only an explicit click or navigation input changes the chosen action.
        b.onclick=()=>{
          if(battle.resolving)return;
          const key=ui.category+':'+(sk.actionId||sk.name);
          if(lockedAction===key&&ui.action===index)return activate();
          lockedAction=key;ui.action=index;ui.level='action';battle.targetMode=false;battle.pendingSkill=null;
          if(!reason&&!sk.command)chooseTarget();else renderCommands();
        };
      });
      addPages(actions.length,size);
    }
    instruction.textContent=ui.level==='category'?'← → Category · Confirm: actions':ui.level==='target'?'Choose a target · Click the locked skill again to use':ui.level==='itemTarget'?'Choose ally · Click again to revive':'← → Action · ↑ / Back: categories';
    if(ui.level!=='items'&&ui.level!=='itemTarget')updatePreview();
    renderConfirmHint();
    fitLabels();
  }
  function fitLabels(){
    root.querySelectorAll('.bc-action strong,.bc-category>span,.bc-turn b').forEach(n=>{
      const full=n.textContent;n.title=full;n.parentElement.setAttribute('title',n.parentElement.title||full);
      const minimum=n.closest('.bc-action')?9:n.closest('.bc-category')?11:12;
      let size=parseFloat(getComputedStyle(n).fontSize);
      while(n.scrollWidth>n.clientWidth+1&&size>minimum){size--;n.style.fontSize=size+'px';}
      const parent=n.closest('.bc-turn');if(parent){parent.tabIndex=0;parent.setAttribute('aria-label',full);}
    });
  }
  function renderConfirmHint(){
    const hint=make('div','bc-confirm-hint',detail);
    hint.textContent=ui.level==='target'?`Target: ${targetGroup?targetName(skill()):targetList[ui.target]?.name||'Choose target'} · Click the selected skill again to use`:ui.level==='items'?'Click an item to select; click it again to use':'Click a skill to lock it; click it again to use';
  }
  function addPages(total,size){
    if(total<=size)return;
    const pager=make('div','bc-pager',actionRow);
    for(const [text,d]of [['‹',-1],['›',1]]){const b=make('button','',pager);b.type='button';b.textContent=text;b.setAttribute('aria-label',d<0?'Previous actions':'Next actions');b.onclick=()=>{const pages=Math.ceil(total/size),page=Math.floor(ui.action/size);ui.action=((page+d+pages)%pages)*size;renderCommands();};}
    const count=make('span','',pager);count.textContent=`${ui.page+1} / ${Math.ceil(total/size)}`;
  }
  function chooseTarget(){
    const sk=skill();targetList=model.targets(unit,sk);targetGroup=['all-enemies','all-allies','all-combatants'].includes(sk.targetScope);
    if(!targetList.length)return;
    // First selection only locks, including self and automatic-target skills.
    ui.level='target';ui.target=0;battle.targetMode=true;battle.pendingSkill=sk;battleActionIndex=0;renderCommands();
  }
  function renderTargetCards(){
    const sk=skill();targetList=model.targets(unit,sk);ui.target=Math.min(ui.target,Math.max(0,targetList.length-1));
    const list=targetGroup?[{name:targetName(sk),group:true}]:targetList,size=pageSize();
    const start=targetGroup?0:Math.floor(ui.target/size)*size;actionRow.style.setProperty('--action-count',Math.min(size,list.length));
    list.slice(start,start+size).forEach((target,j)=>{
      const index=start+j,b=make('button','bc-action bc-target-action',actionRow);b.type='button';b.classList.toggle('is-selected',targetGroup||ui.target===index);
      b.innerHTML=`${icon(sk.category)}<span><strong>${esc(target.name)}</strong><small>${target.group?`${targetList.length} affected · Confirm ${esc(sk.name)}`:`HP ${Math.max(0,target.hp)} / ${target.max}`}</small></span>`;
      b.onclick=()=>{ui.target=index;renderCommands();};
    });
  }
  function execute(target){
    const sk=skill();if(disabled(sk)||!target)return;
    if(!model.targets(unit,sk).includes(target)){targetList=model.targets(unit,sk);ui.target=0;return renderCommands();}
    remember(sk);useSkill(unit,sk,target);
  }
  function activate(){
    if(!battle||battle.resolving||!unit)return;
    if(ui.level==='category'){ui.level='action';renderCommands();return;}
    if(ui.level==='target')return execute(targetList[ui.target]||targetList[0]);
    if(ui.level==='items')return activateItem();
    if(ui.level==='itemTarget')return activateRevive();
    const sk=skill();if(!sk||disabled(sk))return;
    if(sk.command==='defend'){remember(sk);return useDefend(unit);}
    if(sk.command==='items'){ui.level='items';ui.action=0;battle.itemMode=true;return renderCommands();}
    chooseTarget();
  }
  let itemIndex=0,pendingItem=null;
  function renderItems(){
    const items=carriedBattleItems(),size=pageSize();itemIndex=Math.min(itemIndex,Math.max(0,items.length-1));
    actionRow.style.setProperty('--action-count',Math.min(size,items.length));
    items.slice(Math.floor(itemIndex/size)*size,Math.floor(itemIndex/size)*size+size).forEach(([name,info],j)=>{
      const index=Math.floor(itemIndex/size)*size+j,b=make('button','bc-action',actionRow);b.type='button';b.classList.toggle('is-selected',itemIndex===index);b.classList.toggle('is-unavailable',!canUseBattleItem(unit,info));b.setAttribute('aria-disabled',String(!canUseBattleItem(unit,info)));
      b.innerHTML=`${inventoryItemIconHtml(name,'bc-card-art')}<span><strong>${esc(name)} ×${state.inventory[name]}</strong><small>${esc(battleItemState(unit,info))} · ${info.battle==='revive'?'Fallen Ally':'Self'}</small></span>`;
      b.onclick=()=>{if(lockedItem===name&&itemIndex===index)return activateItem();lockedItem=name;itemIndex=index;renderCommands();};
    });
    if(items.length>size){const pager=make('div','bc-pager',actionRow);for(const d of[-1,1]){const b=make('button','',pager);b.type='button';b.textContent=d<0?'‹':'›';b.setAttribute('aria-label',d<0?'Previous items':'Next items');b.onclick=()=>{const pages=Math.ceil(items.length/size),page=Math.floor(itemIndex/size);itemIndex=((page+d+pages)%pages)*size;renderCommands();};}}
    const entry=items[itemIndex];detail.innerHTML=entry?`<h3>${esc(entry[0])}</h3><p>${esc(entry[1].desc)}</p><span class="bc-badge">${entry[1].battle==='revive'?'Single Fallen Ally':'Self'}</span><p>Uses 1 item · Ends turn</p>`:'<p>No carried items.</p>';
  }
  function activateItem(){const entry=carriedBattleItems()[itemIndex];if(!entry||!canUseBattleItem(unit,entry[1]))return;if(entry[1].battle==='revive'){pendingItem=entry[0];ui.level='itemTarget';ui.target=0;return renderCommands();}remember({name:'Items',category:'utility'});useBattleItem(unit,entry[0]);}
  function renderItemTargets(){targetList=battle.party.filter(a=>a.hp<=0);ui.target=Math.min(ui.target,Math.max(0,targetList.length-1));actionRow.style.setProperty('--action-count',targetList.length);targetList.forEach((a,i)=>{const b=make('button','bc-action',actionRow);b.type='button';b.classList.toggle('is-selected',ui.target===i);b.innerHTML=`${icon('heal')}<span><strong>${esc(a.name)}</strong><small>Revive · 50% HP</small></span>`;b.onclick=()=>{if(ui.target===i&&lockedItem===pendingItem+':'+i)return activateRevive();lockedItem=pendingItem+':'+i;ui.target=i;renderCommands();};});detail.innerHTML=`<h3>${esc(pendingItem)}</h3><p>Revive a fallen ally. Uses 1 item and ends the turn.</p>`;highlightTargets();}
  function activateRevive(){const target=targetList[ui.target];if(target?.hp<=0){remember({name:'Items',category:'utility'});useBattleItem(unit,pendingItem,target);}}
  function cancel(){
    if(ui.level==='target'){lockedAction=null;battle.targetMode=false;battle.pendingSkill=null;ui.level='action';}
    else if(ui.level==='itemTarget')ui.level='items';
    else if(ui.level==='items'){battle.itemMode=false;ui.level='action';ui.action=currentGroup().actions.findIndex(s=>s.command==='items');}
    else ui.level='category';
    renderCommands();
  }
  function control(c){
    if(history.open){if(c==='cancel'||c==='confirm')history.close();return;}
    if(!unit||battle?.resolving)return;
    if(c==='confirm')return activate();if(c==='cancel')return cancel();
    if(ui.level==='category'){
      if(c==='down'){ui.level='action';return renderCommands();}
      if(c==='left'||c==='right'){const i=groups.findIndex(g=>g.id===ui.category);selectCategory(groups[(i+(c==='left'?-1:1)+groups.length)%groups.length].id);}
      return;
    }
    if(c==='up'&&ui.level==='action'){ui.level='category';return renderCommands();}
    const d=c==='left'||c==='up'?-1:c==='right'||c==='down'?1:0;if(!d)return;
    if(ui.level==='items')itemIndex=(itemIndex+d+carriedBattleItems().length)%carriedBattleItems().length;
    else if(ui.level==='target'||ui.level==='itemTarget'){ui.target=(ui.target+d+targetList.length)%targetList.length;battleActionIndex=ui.target;}
    else ui.action=(ui.action+d+currentGroup().actions.length)%currentGroup().actions.length;
    renderCommands();
  }
  function portrait(turn){
    if(turn.side==='party')return portraitSources[turn.id]||menuPortraitSources[turn.id];
    const e=battle.enemies[turn.index];
    if(e?.sparringId)return portraitSources[e.sparringId];
    return e?enemyPortraitDataUrl(e.sprite||e.name):'';
  }
  renderTurnOrder=function(){
    if(!battle?.turnQueue)return;
    const turns=battle.turnQueue.slice(battle.turnIndex).filter(turnIsAlive);
    timeline.innerHTML=`<strong class="bc-round">R${battle.round}<small>/ ${battle.roundCap||MAX_BATTLE_ROUNDS}</small></strong><div class="bc-turns">${turns.map((t,i)=>{const src=portrait(t);return `<span class="bc-turn ${t.side} ${i===0?'is-current':''}" ${i===0?'aria-current="step"':''} title="${esc(t.name)} · AGI ${t.agi}">${src?`<img src="${esc(src)}" alt="">`:''}<b>${esc(t.name)}</b>${t.extra?'<small>Extra</small>':''}</span>`;}).join('')}</div>`;
  };
  renderBattle=function(log){
    if(!battle)return;
    el.battleLog.textContent=battle.lastAttackDamage||log||'';renderDamageMeter();renderTurnOrder();
    el.battleResonance.style.width=`${Math.max(0,Math.min(100,state.resonance))}%`;
    el.enemyBattleResonance.style.width=`${Math.max(0,Math.min(100,battle.enemyResonance||0))}%`;
    el.battleResonance.parentElement.setAttribute('aria-label',`Party Resonance ${Math.round(state.resonance)} / 100`);
    el.enemyBattleResonance.parentElement.setAttribute('aria-label',`Enemy Resonance ${Math.round(battle.enemyResonance||0)} / 100`);
    const turn=currentTurn(),newTurn=owner!==battle||turnOwner!==turn;
    if(newTurn){lockedAction=null;lockedItem=null;owner=battle;turnOwner=turn;ui={level:'category',category:'attack',action:0,target:0,page:0};}
    unit=turn?.side==='party'?battle.party.find(a=>a.id===turn.id):null;
    rebuildStatusCards();
    if(!unit||battle.resolving||battle.phaseTransition){command.classList.add('is-waiting');heading.innerHTML=`<strong>${esc(turn?.name||battle.name)}</strong><span>${esc(battle.lastAttackDamage||log||'')}</span>`;categories.innerHTML='';actionRow.innerHTML='<div class="bc-waiting">'+(battle.phaseTransition?'Next phase':battle.resolving?'Action in progress…':'Enemy turn')+'</div>';detail.innerHTML='<p class="bc-waiting-note">'+esc(battle.lastAttackDamage||log||'')+'</p>';instruction.textContent='';return;}
    command.classList.remove('is-waiting');
    if(unit.hp<=0)return finishTurn('A fallen ally loses their turn.');
    refreshGroups();if(newTurn)restoreChoice();renderCommands();
  };
  let brokenStatusImage='';
  function brokenIcon(){
    if(brokenStatusImage)return brokenStatusImage;
    const cell=breakIconSheet?.cells[3];if(!cell)return '';
    const c=document.createElement('canvas');c.width=c.height=20;
    c.getContext('2d').drawImage(breakIconSheet.image,cell.x,cell.y,cell.w,cell.h,0,0,20,20);
    return brokenStatusImage=c.toDataURL();
  }
  function rebuildStatusCards(){
    if(!battle)return;
    if(partyCanSeeWeaknesses())battle.enemies.forEach(rememberWeakness);
    cards.innerHTML='';statusNodes=[];
    for(const [side,list]of[['party',battle.party],['enemy',battle.enemies]])list.forEach((u,index)=>{
      if(side==='enemy'&&u.hp<=0)return;
      const n=make('button',`bc-unit ${side} ${u.hp<=0?'is-down':''}`,cards);n.type='button';n.setAttribute('aria-label',`${u.name}: HP ${Math.max(0,u.hp)} / ${u.max}, MP ${u.mp||0} / ${u.maxmp||0}`);
      const displayStatuses=[...(u.statuses||[])].sort((a,b)=>(b.type==='broken')-(a.type==='broken'));
      n.innerHTML=`${side==='enemy'?`<small class="bc-weak">Weak: ${knownWeakness(u)?esc(u.weak):'???'}</small>`:''}<span class="bc-hp bc-vital"><i style="width:${Math.max(0,u.hp/u.max*100)}%"></i><b>HP ${Math.max(0,Math.round(u.hp))}<small> / ${u.max}</small></b></span>${Number.isFinite(u.maxmp)?`<span class="bc-mp bc-vital"><i style="width:${Math.max(0,u.mp/Math.max(1,u.maxmp)*100)}%"></i><b>MP ${Math.max(0,Math.round(u.mp))}<small> / ${u.maxmp}</small></b></span>`:''}<span class="bc-statuses">${displayStatuses.slice(0,6).map(s=>{const data=statusDisplayData(u,s),img=s.type==='broken'?brokenIcon():statusIconImages[statusIconAliases[s.type]||s.type]?.src;return `<span title="${esc(data.name+': '+data.description+' '+data.timing)}">${img?`<img src="${esc(img)}" alt="${esc(data.name)}">`:`<b>${esc(STATUS_DEFS[s.type]?.short||s.type.slice(0,3))}</b>`}<small>${esc(data.compact)}</small></span>`;}).join('')}${displayStatuses.length>6?`<b>+${displayStatuses.length-6}</b>`:''}</span>`;
      if(combatRoleIconSheet){const role=make('span','bc-role',n),index=COMBAT_ROLE_ICON_INDEX[combatRoleKey(u,side==='enemy')]??4;role.setAttribute('aria-hidden','true');role.innerHTML=`<i style="background-image:url('${esc(combatRoleIconSheet.image.src)}');background-position:${index*25}% center"></i>`;}
      const portraitSrc=portrait({side,id:u.id,index});if(portraitSrc){const face=make('img','bc-face',n);face.src=portraitSrc;face.alt=u.name;}
      n.onclick=()=>{if(ui.level==='target'&&targetList.includes(u)){ui.target=targetList.indexOf(u);renderCommands();}else if(ui.level==='itemTarget'&&targetList.includes(u)){ui.target=targetList.indexOf(u);renderCommands();}else if(u.statuses?.length){history.querySelector('header strong').textContent=u.name+' · Status effects';history.querySelector('.bc-history-content').innerHTML=u.statuses.map(s=>{const d=statusDisplayData(u,s);return `<div><b>${esc(d.name)}</b> · ${esc(d.timing)}<p>${esc(d.description)}</p></div>`;}).join('');history.showModal();}};
      n.addEventListener('pointerenter',event=>showUnitTooltip(u,event));n.addEventListener('pointermove',event=>showUnitTooltip(u,event));n.addEventListener('pointerleave',hideUnitTooltip);
      n.addEventListener('focus',()=>{const r=n.getBoundingClientRect();showUnitTooltip(u,{clientX:r.right,clientY:r.top});});n.addEventListener('blur',hideUnitTooltip);
      statusNodes.push({u,index,side,n});
    });
    lastLayout='';positionCards();highlightTargets();
  }
  function battlefieldHeight(){const rect=game.getBoundingClientRect(),commands=command.getBoundingClientRect();return Math.max(105,(commands.top-rect.top)/canvas.getBoundingClientRect().height*LOGICAL_HEIGHT);}
  function visualScale(){return Math.min(1,Math.max(.48,LOGICAL_WIDTH/245),battlefieldHeight()/165);}
  const spriteBounds=new WeakMap(),alphaBounds=new WeakMap();
  function visibleImageBounds(image,args){
    const source=args.length===8?args.slice(0,4):[0,0,image.width,image.height],key=source.join(':');
    let cached=alphaBounds.get(image);if(!cached){cached=new Map();alphaBounds.set(image,cached);}if(cached.has(key))return cached.get(key);
    let result={x:0,y:0,w:1,h:1};
    try{
      const sample=document.createElement('canvas');sample.width=128;sample.height=128;const c=sample.getContext('2d',{willReadFrequently:true});c.drawImage(image,...source,0,0,128,128);
      const pixels=c.getImageData(0,0,128,128).data;let left=128,top=128,right=0,bottom=0;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
      if(right>left&&bottom>top)result={x:left/128,y:top/128,w:(right-left)/128,h:(bottom-top)/128};
    }catch{}cached.set(key,result);return result;
  }
  function captureSprite(u,x,y,draw){
    if(mode!=='battle')return draw();
    const key=canvas.width+':'+canvas.height,previous=spriteBounds.get(u);
    if(previous?.key===key)return draw();
    const original=ctx.drawImage;let bounds=null;
    ctx.drawImage=function(image,...args){
      let [dx,dy,dw,dh]=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],image.width,image.height];
      const visible=visibleImageBounds(image,args);dx+=dw*visible.x;dy+=dh*visible.y;dw*=visible.w;dh*=visible.h;
      if([dx,dy,dw,dh].every(Number.isFinite)){
        const m=ctx.getTransform(),p=m.transformPoint({x:dx,y:dy}),q=m.transformPoint({x:dx+dw,y:dy+dh}),b={left:Math.min(p.x,q.x)/canvas.width*LOGICAL_WIDTH,top:Math.min(p.y,q.y)/canvas.height*LOGICAL_HEIGHT,right:Math.max(p.x,q.x)/canvas.width*LOGICAL_WIDTH,bottom:Math.max(p.y,q.y)/canvas.height*LOGICAL_HEIGHT};
        if(!bounds||(b.right-b.left)*(b.bottom-b.top)>(bounds.right-bounds.left)*(bounds.bottom-bounds.top))bounds=b;
      }
      return original.call(this,image,...args);
    };
    try{return draw();}finally{ctx.drawImage=original;if(bounds){spriteBounds.set(u,{key,dx:(bounds.left+bounds.right)/2-x,dy:bounds.bottom-y,width:bounds.right-bounds.left,height:bounds.bottom-bounds.top});lastLayout='';}}
  }
  const nativePartySprite=drawBattlePartySprite,nativeEnemySprite=drawEnemy;
  drawBattlePartySprite=function(u,x,y,...rest){const s=mode==='battle'?visualScale():1;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.translate(-x,-y);const result=captureSprite(u,x,y,()=>nativePartySprite(u,x,y,...rest));ctx.restore();return result;};
  drawEnemy=function(u,x,y,...rest){if(mode!=='battle')return nativeEnemySprite(u,x,y,...rest);const s=visualScale(),ax=x+8,ay=y+31;ctx.save();ctx.translate(ax,ay);ctx.scale(s,s);ctx.translate(-ax,-ay);captureSprite(u,ax,ay,()=>nativeEnemySprite(u,x,y,...rest));ctx.restore();};
  const nativePartyPosition=partyBattlePosition,nativeEnemyPosition=enemyBattlePosition;
  function position(native,index,count,enemySide){
    if(mode!=='battle')return native(index,count);
    // Three distinct ground positions, mirrored across the battlefield.
    if(game.getBoundingClientRect().width>700){
      let [x,y]=native(index,count);
      if(!enemySide){const spot=[[.14,.52],[.24,.89],[.36,.69]][index]||[.24,.89];x=LOGICAL_WIDTH*spot[0];y=BATTLE_ARENA_HEIGHT*spot[1];}
      else if(count===3){
        const list=enemySide?battle.enemies:battle.party,roles=list.map(u=>combatRoleKey(u,enemySide));
        const frontScore={tank:5,hybrid:3,dps:2,utility:1,healer:0},rearScore={healer:5,utility:4,dps:3,hybrid:2,tank:0};
        const order=[0,1,2],front=order.reduce((a,b)=>(frontScore[roles[b]]||0)>(frontScore[roles[a]]||0)?b:a),remaining=order.filter(i=>i!==front);
        const rear=remaining.reduce((a,b)=>(rearScore[roles[b]]||0)>(rearScore[roles[a]]||0)?b:a);
        const spot=index===front?[.36,.69]:index===rear?[.14,.52]:[.24,.89];
        x=LOGICAL_WIDTH*(enemySide?1-spot[0]:spot[0]);y=BATTLE_ARENA_HEIGHT*spot[1];
      }
      y=Math.min(BATTLE_ARENA_HEIGHT-15,y+5);
      const u=(enemySide?battle?.enemies:battle?.party)?.[index],bounds=u&&spriteBounds.get(u);
      if(!bounds)return [x,y];
      const gutter=200/canvas.getBoundingClientRect().width*LOGICAL_WIDTH;
      return [enemySide?Math.min(x,LOGICAL_WIDTH-gutter-bounds.dx-bounds.width/2):Math.max(x,gutter-bounds.dx+bounds.width/2),y];
    }
    const [x]=native(index,count),height=battlefieldHeight(),ys=count===1?[.67]:count===2?[.52,.82]:[.47,.67,.86];
    // Keep very tall boss drawings beneath the timeline without obscuring cards.
    let y=height*(ys[index]||.67);
    if(enemySide){const e=battle?.enemies[index],h=(enemyAnimationHeights[enemyAnimationKey(e||{})]||44)*enemyBattleScale(enemyAnimationKey(e||{}))*visualScale();if(h>height*.55)y=Math.max(y,Math.min(height*.82,h+19));}
    return [x,y];
  }
  partyBattlePosition=(i,count=battle?.party?.length||1)=>position(nativePartyPosition,i,count,false);
  enemyBattlePosition=(i,count=battle?.enemies?.length||1)=>position(nativeEnemyPosition,i,count,true);
  function positionCards(){
    if(!battle||mode!=='battle')return;
    const r=game.getBoundingClientRect(),field=command.getBoundingClientRect().top-r.top;
    const key=[r.width,r.height,field,statusNodes.length].join(':');if(key===lastLayout)return;lastLayout=key;
    for(const side of ['party','enemy']){
      const group=statusNodes.filter(s=>s.side===side);
      const rowHeight=Math.max(76,...group.map(({n})=>n.offsetHeight+(n.querySelector('.bc-statuses')?.offsetHeight||0)+22));
      const top=Math.max(100,(field-group.length*rowHeight)/2+25);
      group.forEach(({n},i)=>{
        n.style.left=`${side==='party'?53:r.width-n.offsetWidth-12}px`;
        n.style.top=`${Math.min(field-rowHeight-6,top+i*rowHeight)}px`;
      });
    }
  }

  function previewUnits(){
    if(mode!=='battle'||!unit||battle.resolving||!selected||selected.command)return [];
    const list=model.targets(unit,selected);
    if(ui.level==='target')return targetGroup?list:[list[ui.target]].filter(Boolean);
    if(['all-enemies','all-allies','all-combatants','self'].includes(selected.targetScope)||selected.targetPolicy)return list;
    return ui.level==='action'?list.slice(0,1):[];
  }
  function highlightTargets(){const targets=ui.level==='itemTarget'?[targetList[ui.target]]:previewUnits();statusNodes.forEach(({u,n})=>{n.classList.toggle('is-target',targets.includes(u));n.classList.toggle('is-valid-target',ui.level==='target'&&targetList.includes(u));n.classList.toggle('is-active',unit===u&&!battle.resolving);});}
  // Replace old canvas HUD only; existing sprites, telegraphs, attacks and effects remain native.
  drawBattleVitals=()=>{};drawBattleTurnRail=()=>{};drawBattleRoleRosters=()=>{};drawEnemyBreakIcon=()=>{};drawBossIndicatorStrip=()=>{};
  const nativeBackdrop=drawBattleBackground,nativeMarker=drawBattleGroundMarker;
  let drawingScene=false;
  drawBattleGroundMarker=function(...args){if(!drawingScene)return nativeMarker(...args);};
  drawBattleBackground=function(image,arena){
    if(mode!=='battle')return nativeBackdrop(image,arena);
    const ratio=LOGICAL_WIDTH/BATTLE_ARENA_HEIGHT;
    const sw=battle.riftEncounter?Math.min(image.width,image.height*ratio):image.width;
    const sh=Math.min(image.height,sw/ratio),sx=(image.width-sw)/2;
    // Frame a little lower into the existing stage art, keeping the ground plane
    // behind the rear formation. This is a camera crop, not new floating plinths.
    const sy=Math.max(0,Math.min(image.height-sh,(image.height-sh)/2+sh*.08));
    ctx.drawImage(image,sx,sy,sw,sh,0,0,LOGICAL_WIDTH,BATTLE_ARENA_HEIGHT);
    drawRect(0,BATTLE_ARENA_HEIGHT,LOGICAL_WIDTH,LOGICAL_HEIGHT-BATTLE_ARENA_HEIGHT,'#0b0c15');
    // Paint every selector on the ground before any combatant silhouette.
    const turn=currentTurn(),targets=previewUnits();
    for(const [side,list]of [['party',battle.party],['enemy',battle.enemies]])list.forEach((u,i)=>{
      const [x,y]=side==='party'?partyBattlePosition(i,list.length):enemyBattlePosition(i,list.length);
      if(u.hp>0&&turn?.side===side&&(side==='party'?turn.id===u.id:turn.index===i))nativeMarker(x,y,'turn');
      if(targets.includes(u))nativeMarker(x,y,'target');
    });
  };
  const nativeScene=drawBattleScene;
  drawBattleScene=function(){drawingScene=true;try{nativeScene();}finally{drawingScene=false;}positionCards();};
  selectedBattleEnemy=()=>ui.level==='target'&&selected?.targetScope.includes('enemy')?targetList[ui.target]||null:null;
  canvas.addEventListener('pointermove',event=>{
    if(mode!=='battle'||!battle)return hideUnitTooltip();const p=canvasLogicalPoint(event);
    const hit=[...statusNodes].reverse().find(({u,index,side})=>{const b=spriteBounds.get(u);if(!b||u.hp<=0)return false;const [x,y]=side==='party'?partyBattlePosition(index,battle.party.length):enemyBattlePosition(index,battle.enemies.length);return p.x>=x+b.dx-b.width/2&&p.x<=x+b.dx+b.width/2&&p.y>=y+b.dy-b.height&&p.y<=y+b.dy;});
    if(hit)showUnitTooltip(hit.u,event);else hideUnitTooltip();
  });canvas.addEventListener('pointerleave',hideUnitTooltip);
  new MutationObserver(()=>{if(document.body.dataset.playMode!=='battle')hideUnitTooltip();}).observe(document.body,{attributes:true,attributeFilter:['data-play-mode']});
  const oldControl=handleControl;
  handleControl=function(c){if(mode==='battle'&&battle&&!battle.phaseTransition&&['left','right','up','down','confirm','cancel'].includes(c))return control(c);return oldControl(c);};
  closeTargetSelection=()=>cancel();closeBattleItems=()=>cancel();
  confirmBattleAction=()=>activate();moveBattleAction=d=>control(d<0?'left':'right');
  // Stop legacy canvas list hitboxes and duplicate Enter handling on native buttons.
  canvas.addEventListener('click',e=>{if(mode!=='battle'||battle?.phaseTransition)return;const p=canvasLogicalPoint(e);if(p.y>=168){e.stopImmediatePropagation();return;}if(ui.level==='target'){let best=null,dist=Infinity;targetList.forEach(u=>{const i=battle.party.indexOf(u),[x,y]=i>=0?partyBattlePosition(i,battle.party.length):enemyBattlePosition(battle.enemies.indexOf(u),battle.enemies.length),d=Math.hypot(p.x-x,p.y-(y-20));if(d<dist&&d<30){best=u;dist=d;}});if(best){ui.target=targetList.indexOf(best);renderCommands();}e.stopImmediatePropagation();}},true);
  window.addEventListener('keydown',e=>{if(mode!=='battle'||!battle||battle.phaseTransition)return;const key=e.key.toLowerCase(),map={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'up',w:'up',arrowdown:'down',s:'down',enter:'confirm',' ':'confirm',z:'confirm',escape:'cancel',x:'cancel'};if(!map[key])return;if(e.target.closest?.('input,textarea,select'))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)handleControl(map[key]);},true);
  // Gamepad shares the same state transitions as keys and on-screen controls.
  let pads=[],lastPad=0;
  function gamepad(now){if(mode==='battle'&&!history.open){const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);if(pad){const values=[pad.buttons[14]?.pressed||pad.axes[0]<-.55,pad.buttons[15]?.pressed||pad.axes[0]>.55,pad.buttons[12]?.pressed||pad.axes[1]<-.55,pad.buttons[13]?.pressed||pad.axes[1]>.55,pad.buttons[0]?.pressed,pad.buttons[1]?.pressed];values.forEach((v,i)=>{if(v&&(!pads[i]||i<4&&now-lastPad>240)){handleControl(['left','right','up','down','confirm','cancel'][i]);lastPad=now;}});pads=values;}}requestAnimationFrame(gamepad);}requestAnimationFrame(gamepad);
  new ResizeObserver(()=>{lastLayout='';if(mode==='battle'&&unit&&!battle.resolving){renderCommands();positionCards();}}).observe(game);
  window.BattleCommandUI={get state(){return {...ui};},get groups(){return groups;},get actor(){return unit;},get selected(){return selected;},get remembered(){return {...lastActions};},clearMemory(){lastActions={};localStorage.removeItem('verseborn-battle-ui-v1');},get spriteBounds(){return statusNodes.map(({u})=>({name:u.name,...spriteBounds.get(u)}));},control,render:()=>renderBattle(''),previewUnits,positionCards};
})();







