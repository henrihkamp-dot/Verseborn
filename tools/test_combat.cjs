const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

// Exercise the actual game code without a browser, network, audio or a player's save.
const noop = () => {};
const drawing = new Proxy({}, { get: (target, key) => target[key] || (key === 'measureText' ? text => ({ width: String(text).length * 3 }) : noop) });
class Element {
  constructor() { this.children = []; this.dataset = {}; this.style = {}; this.attrs = {}; this._html = ''; this.classList = { add: noop, remove: noop, toggle: noop, contains: () => false }; }
  set innerHTML(value) { this._html = value; this.children = []; }
  get innerHTML() { return this._html; }
  getContext() { return drawing; }
  getBoundingClientRect() { return { width: 768, height: 672, left: 0, top: 0 }; }
  addEventListener() {}
  appendChild(child) { this.children.push(child); }
  querySelector() { return new Element(); }
  querySelectorAll() { return []; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  insertAdjacentHTML(where, value) { this._html = where === 'afterbegin' ? value + this._html : this._html + value; }
  focus() {}
}
const elements = new Map();
const body = new Element();
const document = { body, getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, querySelector: () => new Element(), querySelectorAll: () => [], createElement: () => new Element(), addEventListener: noop };
const storage = new Map();
const timers = [];
const sandbox = {
  console, document, URLSearchParams, structuredClone, location: { search: '?qa=full' }, performance: { now: () => 0 },
  Image: class { constructor() { this.complete = false; } addEventListener() {} },
  Audio: class { addEventListener() {} pause() {} play() { return Promise.resolve(); } },
  ResizeObserver: class { observe() {} },
  requestAnimationFrame: noop, setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout: noop,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  navigator: {}, addEventListener: noop, devicePixelRatio: 1, innerWidth: 1000, innerHeight: 900,
};
sandbox.window = sandbox;
sandbox.__impact = () => timers.at(-1)();
vm.createContext(sandbox);
const gamePath = path.join(__dirname, '../public/game/game.js');
vm.runInContext(fs.readFileSync(gamePath, 'utf8'), sandbox, { filename: gamePath });
const run = code => vm.runInContext(code, sandbox);
run('runQaChecks()');
const legacy = JSON.parse(body.getAttribute('data-qa-result'));
console.log(`Existing QA: ${legacy.passed}/${legacy.total}`);
for (const [name, result] of Object.entries(legacy.results)) if (!result.pass) console.error(name, result.detail);
assert.equal(legacy.passed, legacy.total);

let passed = 0;
function check(name, code) {
  assert.ok(run(code), name);
  passed++;
  console.log('PASS', name);
}
check('Two choices at all eight milestones for every hero', 'Object.keys(baseJobs).every(id => SKILL_MILESTONE_LEVELS.every(level => talentTrees[id].filter(t => t.level === level).length === 2))');
check('Every talent has a meaningful description', 'Object.values(talentTrees).flat().every(t => t.unlockDesc.length > 10)');
check('Physical ultimate scaling corrected', 'talentTrees.Mira.filter(t => t.type === "newSkill" && t.value.anim === "ultimate" && t.value.power > 0 && !t.name.includes("Night Without")).every(t => skillScaling(t.value) === "str") && battleSkills("Torren", {id:"Torren"}).filter(sk=>sk.power>0).every(sk=>skillScaling(sk)==="str")');
check('Poison follows explicit STR or MAG, not element or animation', 'sourceRelevantStat({atk:80,stats:{str:80,mag:10}}, {scaling:"str",element:"Shadow",damageKind:"ultimate"}) === 80 && sourceRelevantStat({atk:80,stats:{str:80,mag:10}}, {scaling:"mag",damageKind:"melee"}) === 10');
check('Healing grows with MAG', `(() => { const sk=baseJobs.Kael.skills.find(s=>s.power<0); const old=baseJobs.Kael.stats.mag; const before=healingAmount('Kael',sk); baseJobs.Kael.stats.mag+=20; const after=healingAmount('Kael',sk); baseJobs.Kael.stats.mag=old; return after>before; })()`);
check('Old Blood actually increases magic damage', `(() => { const p=progressFor('Sparky'); p.level=40; p.talents=[]; const before=outgoingDamageMultiplier({id:'Sparky',statuses:[]},'magic'); p.talents=['Old Blood']; return outgoingDamageMultiplier({id:'Sparky',statuses:[]},'magic')>before; })()`);
check('New speed buff changes remaining order, not number of actions', `(() => {const a=battleUnit('Verseborn'), b=battleUnit('Glimmer'); const foe=prepareEnemyForBattle(enemy('Speed Test',100,1,'Fire','#555',1)); foe.stats.agi=Math.round(totals('Glimmer').agi*1.1); battle={party:[a,b],enemies:[foe],round:2,turnIndex:0,extraTurns:0,turnQueue:[{side:'party',id:a.id},{side:'enemy',index:0},{side:'party',id:b.id}]}; applySkillBuffs(a,[b],{buffs:[{type:'agilityUp'}]}); return battle.turnQueue.length===3 && battle.turnQueue[1].id===b.id && battle.extraTurns===0;})()`);
check('Ending a turn does not reference a missing skill', 'Array.isArray(processTurnEnd(battle.party[0]))');
check('Extra turn cap blocks skill without spending MP', `(() => { const u=battle.party[0]; battle.resolving=false; battle.usedOnce={}; battle.extraTurns=2; const mp=u.mp; useSkill(u, skill('Cap test','magic','Tech',0,3,'',{immediateTurn:true})); return u.mp===mp && !canGrantImmediateTurn(); })()`);
check('Weakness is hidden then remembered', `(() => {state.activeParty=['Glimmer']; progressFor('Glimmer').talents=[]; const e={name:'Discovery Test',weak:'Earth'}; return !knownWeakness(e) && rememberWeakness(e) && knownWeakness(e) && !rememberWeakness(e);})()`);
check('Gear comparison does not alter equipped items', `(() => {const before=JSON.stringify(baseJobs.Mira.gear); const html=gearComparisonHtml('Mira','weapon','Ashrunner Knife'); return html.includes('Current') && before===JSON.stringify(baseJobs.Mira.gear);})()`);
check('Skill catalogue includes transformation kit and coefficients', `(() => {progressFor('Glimmer').level=40; const t=talentTrees.Glimmer.find(t=>t.value?.transform==='mech'); progressFor('Glimmer').talents=[t.name]; const html=skillCatalogueHtml('Glimmer'); return html.includes('Piston Impact') && html.includes('1.35 x STR');})()`);
check('Only the selected Echo affix changes, on only one copy', `(() => { activeVendor='workshop'; state.gold=2000; const name=echoForgeGear[0].name; const refs=addOwnedGear(name,2,{rarity:'Legendary',rollAffixes:true}); const before=JSON.parse(JSON.stringify(gearAffixes(refs[0]))); const other=JSON.stringify(gearAffixes(refs[1])); const result=rerollGearAffix(refs[0],1); state.qaRerollRef=refs[0]; return result && state.gold===1750 && JSON.stringify(gearAffixes(refs[1]))===other && before.every((a,i)=>i===1 ? a.key!==gearAffixes(refs[0])[i].key : JSON.stringify(a)===JSON.stringify(gearAffixes(refs[0])[i]));})()`);
check('Favorite blocks sale and reroll', `(() => { const ref=state.qaRerollRef; state.favoriteGear[ref]=true; const gold=state.gold; const before=JSON.stringify(gearAffixes(ref)); sellVendorItem('gear',ref); return !rerollGearAffix(ref,0) && state.gold===gold && before===JSON.stringify(gearAffixes(ref)) && Boolean(gearInstance(ref));})()`);
check('No-money reroll leaves item unchanged', `(() => {const ref=state.qaRerollRef; delete state.favoriteGear[ref]; state.gold=0; const before=JSON.stringify(gearAffixes(ref)); return !rerollGearAffix(ref,0) && before===JSON.stringify(gearAffixes(ref));})()`);
check('Favorites and discovered weaknesses survive save/load', `(() => {mode='walk'; state.favoriteGear[state.qaRerollRef]=true; saveGame(); state.favoriteGear={}; state.knownWeaknesses={}; return loadGame() && state.favoriteGear[state.qaRerollRef] && state.knownWeaknesses['Discovery Test']==='Earth';})()`);
check('Legacy saves without new fields still load', `(() => {const data=JSON.parse(localStorage.getItem(SAVE_KEY)); delete data.state.favoriteGear; delete data.state.knownWeaknesses; localStorage.setItem(SAVE_KEY,JSON.stringify(data)); return loadGame() && Object.keys(state.favoriteGear).length===0 && Object.keys(state.knownWeaknesses).length===0;})()`);
check('Talent menu groups eight pairs with scaling', `(() => {state.party=Object.keys(baseJobs); selectedSkillHero='Mira'; menuTab='skills'; renderMenu(); return (el.menuBody.innerHTML.match(/class="talent-milestone"/g)||[]).length===8 && el.menuBody.innerHTML.includes('+ STR') && !el.menuBody.innerHTML.includes('undefined');})()`);
check('Swapping one milestone preserves all other old choices', `(() => {const p=progressFor('Mira'); p.level=40; p.talents=['First Cut','Voidthorn Rain','Ledger Sight','Between Two Names']; toggleTalent('Mira:Dagger Discipline'); return p.talents.join(',')==='Voidthorn Rain,Ledger Sight,Between Two Names,Dagger Discipline';})()`);
check('Selecting an already chosen talent does not remove it', `(() => {const before=progressFor('Mira').talents.join(','); toggleTalent('Mira:Dagger Discipline'); return before===progressFor('Mira').talents.join(',');})()`);
check('Clear Command heals only after a successful cleanse', `(() => {progressFor('Kael').level=40; progressFor('Kael').talents=['Clear Command']; const ally={hp:10,max:100,statuses:[{type:'poison'}]}; const source={id:'Kael'}; return cleanseWithTalent(source,ally)===1 && ally.hp===30 && cleanseWithTalent(source,ally)===0 && ally.hp===30;})()`);
check('Typed stun talent does not inflate poison or sleep sheet chances', `(() => {const p=progressFor('Glimmer'); p.level=40; p.talents=[]; const ref=baseJobs.Glimmer.gear.weapon; state.gearAffixes[ref]=[{type:'statusOnHit',status:'poison',value:.1},{type:'statusOnHit',status:'stun',value:.1}]; const before=equippedProcChances('Glimmer'); p.talents=['Focused Coil']; const after=equippedProcChances('Glimmer'); return before.find(p=>p.type==='poison').normalChance===after.find(p=>p.type==='poison').normalChance && after.find(p=>p.type==='stun').normalChance>before.find(p=>p.type==='stun').normalChance;})()`);
check('Real attacks use displayed scaling and bonuses in both forms', `(() => {const random=Math.random; Math.random=()=>.999; let okay=true; try {for(const [id,form] of [['Mira',null],['Torren',null],['Glimmer','mech'],['Kael','shadowpriest'],['Sparky',null]]) {const u=battleUnit(id); if(form)u.form=form; const foe=prepareEnemyForBattle(enemy('Damage Test',10000,1,'No weakness','#555',1)); foe.hp=foe.max=10000; battle={party:[u],enemies:[foe],round:1,turnIndex:0,turnQueue:[{side:'party',id}],usedOnce:{},extraTurns:2,resolving:false}; mode='battle'; state.resonance=100; u.mp=1000; const sk=battleSkills(id,u).find(s=>s.coefficient||s.power>0); const key=skillScaling(sk); const stat=Math.round(totals(id)[key]*transformedStatMultiplier(u,key)); const expected=Math.max(1,Math.round(((sk.coefficient?stat*sk.coefficient:sk.power+stat)+5+(sk.staggerPower>=3?12:0))*outgoingDamageMultiplier(u,key==='str'?'melee':'magic',foe))); useSkill(u,sk,foe); __impact(); if(10000-foe.hp!==expected)okay=false;}}finally{Math.random=random;} return okay;})()`);
console.log(`New combat/gear checks: ${passed}/${passed}`);
