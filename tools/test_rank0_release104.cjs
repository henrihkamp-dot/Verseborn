const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(path.join(__dirname, 'test_combat.cjs'), 'utf8')
  .split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false}); sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', `${prefix}\nreturn {run};`)(require, __dirname);
let passed = 0;
function check(name, code) {
  assert.ok(run(`(() => {const random=Math.random;Math.random=()=>.999;try{return (${code});}finally{Math.random=random;}})()`), name);
  console.log('PASS', name);
  passed++;
}
run(`state.party=Object.keys(baseJobs);
  function rankBattle(id, name, talents=[]) {
    state.heroProgress[id]={level:40,xp:0,talents,rank0:name};
    const u=battleUnit(id);u.hp=u.max;u.mp=u.maxmp=999;
    const foe=prepareEnemyForBattle(enemy('Rank Test',99999,1,'None','#555',1));foe.hp=foe.max=99999;
    const ally={id:'Mira',name:'Ally',hp:50,max:100,mp:10,maxmp:20,statuses:[]};
    battle={party:[u,ally],enemies:[foe],round:1,turnIndex:0,turnQueue:[{side:'party',id}],usedOnce:{},extraTurns:0,resolving:false,enemyResonance:80};
    mode='battle';battleFloaters=[];return {u,foe,ally};
  }
  function castRank(id,name,talents=[]) {
    const setup=rankBattle(id,name,talents);const sk=battleSkills(id).find(s=>s.rank0);
    useSkill(setup.u,sk,skillTargetsEnemies(sk)?setup.foe:sk.targetSide==='ally'?setup.ally:setup.u);__impact();return {...setup,sk};
  }`);
check('Seven heroes each have exactly three Rank 0 choices', `Object.keys(baseJobs).every(id=>rank0Choices[id].length===3&&new Set(rank0Choices[id].map(s=>s.name)).size===3)`);
check('Moved skills retain every release-104 field and cost', `Object.keys(baseJobs).every(id=>{const old=baseJobs[id].skills.find(s=>s.name===rank0MovedSkills[id]);const moved=rank0Choices[id][0];return Object.keys(old).every(key=>JSON.stringify(old[key])===JSON.stringify(moved[key]));})`);
check('Legacy saves keep talents and have no automatic Rank 0', `(() => {state.heroProgress.Verseborn={level:20,xp:100,talents:['Perfect Pitch','Battle Hymn']};const p=progressFor('Verseborn');return !p.rank0&&p.talents.join('|')==='Perfect Pitch|Battle Hymn';})()`);
check('Free selection replaces one choice without spending points', `(() => {mode='menu';selectedSkillHero='Verseborn';const p=progressFor('Verseborn');const before=JSON.stringify(p.talents);selectRank0('Verseborn','Hushed Refrain');selectRank0('Verseborn','Rallying Chorus');return p.rank0==='Rallying Chorus'&&JSON.stringify(p.talents)===before&&battleSkills('Verseborn').filter(s=>s.rank0).length===1;})()`);
check('Rank 0 selection persists through the normal save payload', `(() => {saveGame();return JSON.parse(localStorage.getItem(SAVE_KEY)).state.heroProgress.Verseborn.rank0==='Rallying Chorus';})()`);
check('Invalid or in-combat selections are refused', `(() => {const p=progressFor('Verseborn');mode='menu';const invalid=selectRank0('Verseborn','Bad');mode='battle';const locked=selectRank0('Verseborn','Hushed Refrain');return !invalid&&!locked&&p.rank0==='Rallying Chorus';})()`);
check('Resetting paid talents keeps Rank 0 selection', `(() => {mode='menu';resetTalents('Verseborn');return progressFor('Verseborn').rank0==='Rallying Chorus';})()`);
check('All normal base skills remain except the explicitly moved choice', `Object.keys(baseJobs).every(id=>rank0Choices[id].every(choice=>{rankBattle(id,choice.name);const kit=battleSkills(id);return baseJobs[id].skills.filter(s=>s.name!==rank0MovedSkills[id]).every(s=>kit.some(k=>k.name===s.name))&&kit.filter(s=>s.rank0).length===(choice.passive?0:1)&&!kit.some(s=>s.name===rank0MovedSkills[id]&&!s.rank0);}))`);
check('All five tiers and fifteen existing talent nodes remain', `Object.keys(baseJobs).every(id=>talentTrees[id].length===15&&[1,2,3,4,5].every(t=>talentTrees[id].filter(n=>n.tier===t).length===3))&&BREAK_THRESHOLD===3`);
check('Rank 0 UI has three cards, selected state and free cost for every hero', `Object.keys(baseJobs).every(id=>{const html=rank0ChoicesHtml(id);return (html.match(/data-rank0=/g)||[]).length===3&&html.includes('0 talent points')&&(html.match(/aria-pressed="true"/g)||[]).length<=1;})`);
check('Hushed Refrain preserves Sound damage, 7 MP and two-action Silence', `(() => {const {u,foe,sk}=castRank('Verseborn','Hushed Refrain');const valid=foe.hp<foe.max&&sk.element==='Sound'&&u.mp===992&&statusOf(foe,'silence').remaining===2;processTurnEnd(foe);const one=statusOf(foe,'silence').remaining===1;processTurnEnd(foe);return valid&&one&&!statusOf(foe,'silence');})()`);
check('Cut the Tongue preserves both two-action statuses and Shadow payoff', `(() => {const {foe,sk}=castRank('Mira','Cut the Tongue');const mark=baseJobs.Mira.skills.find(s=>s.name==='Voidthorn Mark');return sk.cost===7&&sk.anim==='melee'&&sk.element==='Shadow'&&statusOf(foe,'silence').remaining===2&&statusOf(foe,'shadowExposed').remaining===2&&skillWeaknessMultiplier('Mira',mark,foe)>1.55;})()`);
check('Oathbreak remains damaging Holy Fire and clears all enemy Resonance', `(() => {const {foe,sk}=castRank('Seerin','Oathbreak');return sk.cost===8&&foe.hp<foe.max&&sk.element==='Holy Fire'&&battle.enemyResonance===0;})()`);
check('Hearty Red Stew grants every ally 20% Vampiric for three actions', `(() => {const {u,ally,sk}=castRank('Torren','Hearty Red Stew');return sk.cost===9&&[u,ally].every(a=>statusOf(a,'vampiric')?.value===.2&&statusOf(a,'vampiric').remaining===3);})()`);
check('Patch Job still heals the most wounded ally', `(() => {const {u,ally,sk}=castRank('Glimmer','Patch Job');return sk.cost===6&&ally.hp>50&&u.hp===u.max;})()`);
check('Patch Network still converts selected Patch Job into party heal and Drone', `(() => {const {u,ally}=castRank('Glimmer','Patch Job',['Patch Network']);return [u,ally].every(a=>statusOf(a,'combatDrone')?.value===.4&&statusOf(a,'combatDrone').remaining===2)&&ally.hp>50;})()`);
check('Quiet Tithe keeps its hit-then-half-current drain order and one-action gain lock', `(() => {const {foe,sk}=castRank('Kael','Quiet Tithe');const valid=sk.cost===9&&sk.element==='Sigil'&&foe.hp<foe.max&&battle.enemyResonance===44&&statusOf(foe,'resonanceLocked').remaining===1;gainEnemyResonance(foe,10);const blocked=battle.enemyResonance===44;processTurnEnd(foe);return valid&&blocked&&!statusOf(foe,'resonanceLocked');})()`);
check('Emberblood grants only the target 25% Vampiric for three actions', `(() => {const {u,ally,sk}=castRank('Sparky','Emberblood');return sk.cost===8&&!statusOf(u,'vampiric')&&statusOf(ally,'vampiric')?.value===.25&&statusOf(ally,'vampiric').remaining===3;})()`);
check('Kael keeps Quiet Rite and Seerin keeps Cinder Guard unchanged', `battleSkills('Kael').some(s=>s.name==='Quiet Rite'&&s.power===-36&&s.cost===8)&&battleSkills('Seerin').some(s=>s.name==='Cinder Guard'&&s.power===-26&&s.cost===7)`);
check('Transformations still unlock at level 10 and last four actions', `['Kael','Glimmer'].every(id=>{rankBattle(id,rank0Choices[id][0].name);progressFor(id).level=9;const before=!battleSkills(id).some(s=>s.transform);progressFor(id).level=10;const sk=battleSkills(id).find(s=>s.transform);const u=battle.party[0];activateTransformation(u,sk.transform);return before&&sk.ultimateIndex===2&&sk.cost===100&&u.formTurns===4&&battleSkills(id,u).every(s=>!s.rank0);})`);
check('New active choices execute safely and pay their fixed MP costs', `Object.keys(rank0Choices).every(id=>rank0Choices[id].filter(s=>!s.passive).every(choice=>{const {u,sk}=castRank(id,choice.name);return u.mp===999-sk.cost&&!battle.attackDamage;}))`);
check('Rallying Chorus buffs the whole party with STR and MAG for two actions', `(() => {const {u,ally}=castRank('Verseborn','Rallying Chorus');return [u,ally].every(a=>['strengthUp','magicUp'].every(type=>statusOf(a,type)?.value===.15&&statusOf(a,type).remaining===2));})()`);
check('Mira sustain heals only Mira and grants limited Evasion', `(() => {const {u,ally}=rankBattle('Mira','Fade into Shadow');u.hp=Math.floor(u.max/2);useSkill(u,battleSkills('Mira').find(s=>s.rank0),u);__impact();return u.hp>Math.floor(u.max/2)&&ally.hp===50&&statusOf(u,'evasion')?.incomingCharges===2;})()`);
check('Shieldbreaker is a passive +2 Break modifier only on normal Attack', `(() => {rankBattle('Seerin','Shieldbreaker Oath');const kit=battleSkills('Seerin');return kit.find(s=>s.basicAttack).rank0Break===2&&!kit.some(s=>s.rank0)&&kit.filter(s=>!s.basicAttack).every(s=>!s.rank0Break);})()`);
check('New protection guards its owner, intercepts once and never redirects AoE', `['Seerin','Sparky'].every(id=>{const {u,ally}=castRank(id,id==='Seerin'?'Bulwark of Faith':'Tiny Dragon, Big Problem');const aoe=rank0Protector(ally,true);const guarded=u.guarding&&statusOf(u,'defenseUp')?.value===.25;const single=rank0Protector(ally,false);return !aoe&&guarded&&single===u&&!rank0Protector(ally,false);})`);
check('Support Drone reuses the existing party-wide Patch Network Drone', `(() => {const {u,ally}=castRank('Glimmer','Support Drone');return [u,ally].every(a=>statusOf(a,'combatDrone')?.value===HEAL_CONVERSION_BUFFS.Glimmer['Patch Job'].value&&statusOf(a,'combatDrone').remaining===2)&&ally.hp===50;})()`);
check('Scramble Signal deals no damage and reduces offensive output', `(() => {const {foe,sk}=castRank('Glimmer','Scramble Signal');return foe.hp===foe.max&&statusOf(foe,'disrupted')?.value===.2&&skillExpectedOutput('Glimmer',sk)===0;})()`);
check('Umbral Brand is damage-free and does not overwrite Exposure', `(() => {const {foe}=rankBattle('Kael','Umbral Brand');applyStatus(foe,'shadowExposed',battle.party[0],{force:true,duration:2});useSkill(battle.party[0],battleSkills('Kael').find(s=>s.rank0),foe);__impact();return foe.hp===foe.max&&statusOf(foe,'shadowVulnerability')?.value===.2&&statusOf(foe,'shadowExposed').remaining===2;})()`);
check('Old Flame doubles only Sparky-owned Burn ticks without changing stored damage or duration', `(() => {const {u,foe}=rankBattle('Sparky','Old Flame');applyStatus(foe,'burn',u,{force:true,duration:4,value:10});applyStatus(foe,'poison',u,{force:true,duration:4,value:7});const hp=foe.hp;processTurnStart(foe);const once=hp-foe.hp===27;processTurnStart(foe);return once&&hp-foe.hp===54&&statusOf(foe,'burn').value===10&&statusOf(foe,'burn').remaining===4&&!battleSkills('Sparky').some(s=>s.rank0);})()`);
check('Old Flame does not multiply another character Burn', `(() => {const {u,foe}=rankBattle('Sparky','Old Flame');applyStatus(foe,'burn',{id:'Verseborn',name:'Verseborn'},{force:true,duration:4,value:10});const hp=foe.hp;processTurnStart(foe);return hp-foe.hp===10;})()`);
check('Umbral Brand boosts Mira and Shadowpriest Shadow damage, not other elements', `['Mira','Kael'].every(id=>{
  function hit(element,brand){const {u,foe}=rankBattle(id,rank0Choices[id][0].name);if(id==='Kael')u.form='shadowpriest';if(brand)applyStatus(foe,'shadowVulnerability',{id:'Kael'},{force:true,duration:3,value:.2});useSkill(u,{name:'Probe',anim:'magic',element,power:0,cost:0,coefficient:1},foe);__impact();return foe.max-foe.hp;}
  return hit('Shadow',true)>hit('Shadow',false)&&hit('Sigil',true)===hit('Sigil',false);
})`);
check('Old Flame never multiplies the initial hit that applies Burn', `(() => {
  function hit(choice){const {u,foe}=rankBattle('Sparky',choice);const sk={name:'Burn Probe',anim:'magic',element:'Ancient Fire',power:0,cost:0,coefficient:1,status:{type:'burn',force:true,duration:4}};useSkill(u,sk,foe);__impact();return {damage:foe.max-foe.hp,dot:statusOf(foe,'burn').value,duration:statusOf(foe,'burn').remaining};}
  const plain=hit(null),old=hit('Old Flame');return JSON.stringify(plain)===JSON.stringify(old);
})()`);
console.log(`PASS ${passed}/${passed} focused Rank 0 checks`);
if (process.argv.includes('--fixture')) {
  run(`mode='menu';selectedSkillHero='Seerin';menuTab='skills';renderMenu()`);
  const dir=path.resolve(__dirname,'../.sites-artifacts/rank0-qa');
  fs.mkdirSync(dir,{recursive:true});
  const menu=run('el.menuBody.innerHTML').replaceAll('src="assets/','src="/public/game/assets/');
  fs.writeFileSync(path.join(dir,'skills.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/public/game/styles.css"></head><body data-play-mode="menu"><section class="menu" data-menu-view="skills"><div class="menu-inner"><div class="menu-tabs"><button>Skills</button></div><div class="menu-body">${menu}</div></div></section></body></html>`);
}
