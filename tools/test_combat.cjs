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
check('Every Flameguard tree has five tiers and fifteen choices', 'Object.keys(baseJobs).every(id => talentTrees[id].length===15 && [1,2,3,4,5].every(tier => talentTrees[id].filter(t=>t.tier===tier).length===3))');
check('Talent point levels match the ten-point progression', 'JSON.stringify(TALENT_POINT_LEVELS)===JSON.stringify([4,8,12,16,20,24,28,32,36,40])');
check('Every talent has a meaningful description', 'Object.values(talentTrees).flat().every(t => t.unlockDesc.length >= 8)');
check('All non-Ultimate skills store fixed costs', 'Object.values(baseJobs).flatMap(h=>h.skills).concat(Object.values(talentTrees).flat().filter(t=>t.type==="newSkill").map(t=>t.value),Object.values(TRANSFORMED_SKILLS).flat()).every(sk=>Number.isFinite(sk.cost) && !("mpRate" in sk))');
check('Increasing MAG increases Max MP without changing stored skill cost', `(() => {const old=baseJobs.Kael.stats.mag; const sk=baseJobs.Kael.skills.find(s=>s.name==='Quiet Rite'); const cost=sk.cost, before=totals('Kael').mp; baseJobs.Kael.stats.mag+=20; const after=totals('Kael').mp; baseJobs.Kael.stats.mag=old; return after-before===10 && sk.cost===cost;})()`);
check('AGI grants 0.10 percentage point CRIT per point', 'Math.abs(agilityCritBonusFromAgi(137)-.137)<.000001 && Math.abs(agilityCritBonusFromAgi(90)-.09)<.000001');
check('ECHO increases Ultimate potency', `(() => {const old=baseJobs.Sparky.stats.echo; const sk=baseJobs.Sparky.skills.find(s=>s.anim==='ultimate'); const before=ultimatePotencyMultiplier('Sparky',sk); baseJobs.Sparky.stats.echo+=20; const after=ultimatePotencyMultiplier('Sparky',sk); baseJobs.Sparky.stats.echo=old; return after>before;})()`);
check('Ultimate ranks improve at levels 12, 24 and 36', `(() => {const p=progressFor('Verseborn'), old=p.level; const ranks=[1,12,24,36].map(level=>(p.level=level,ultimateRank('Verseborn'))); p.level=old; return ranks.join(',')==='1,2,3,4';})()`);
check('All normal weapons and Echo bases have a Basic Attack effect', 'Object.values(gearDb).flat().filter(g=>g.slot==="weapon").every(g=>Boolean(weaponBasicAttackEffect(g)))');
check('Normal Attack restores exactly 6 percent Max MP and triggers weapon setup', `(() => {const p=progressFor('Mira'); p.talents=[]; const u=battleUnit('Mira'); u.mp=0; const foe=prepareEnemyForBattle(enemy('Basic Test',9999,1,'None','#555',1)); battle={party:[u],enemies:[foe],round:1,turnIndex:0,turnQueue:[{side:'party',id:'Mira'}],usedOnce:{},extraTurns:0,resolving:false}; mode='battle'; useSkill(u,battleSkills('Mira',u)[0],foe); __impact(); return u.mp===Math.round(u.maxmp*.06) && Boolean(statusOf(foe,'marked'));})()`);
check('Weapon Basic Attack effects never trigger from skills', `(() => {const u=battleUnit('Mira'); u.mp=999; const foe=prepareEnemyForBattle(enemy('Skill Test',9999,1,'None','#555',1)); battle={party:[u],enemies:[foe],round:1,turnIndex:0,turnQueue:[{side:'party',id:'Mira'}],usedOnce:{},extraTurns:0,resolving:false}; mode='battle'; useSkill(u,baseJobs.Mira.skills[2],foe); __impact(); return !statusOf(foe,'marked');})()`);
check('Flat MP-on-hit recovery scales but keeps its minimum', 'scaledMpOnHitRecovery({maxmp:20},2)===2 && scaledMpOnHitRecovery({maxmp:200},2)===8');
check('Mech and Shadowpriest scale from current stats and ECHO', `(() => {const g={id:'Glimmer',form:'mech'}, k={id:'Kael',form:'shadowpriest'}; return transformedStatMultiplier(g,'mag')>1 && transformedStatMultiplier(k,'mag')>1;})()`);
check('Capstone selection replaces only the previous capstone', `(() => {mode='walk'; const p=progressFor('Verseborn'); p.level=40; p.talents=talentTrees.Verseborn.filter(t=>t.tier<5).slice(0,8).map(t=>t.name); toggleTalent('Verseborn:Maestro of Flame'); toggleTalent('Verseborn:Voice of Ruin'); return p.talents.length===9 && !p.talents.includes('Maestro of Flame') && p.talents.includes('Voice of Ruin');})()`);
check('Talent reset is available only outside combat', `(() => {const p=progressFor('Verseborn'); mode='battle'; resetTalents('Verseborn'); const kept=p.talents.length; mode='walk'; resetTalents('Verseborn'); return kept>0 && p.talents.length===0;})()`);
check('Talent menu renders five tiers and fixed MP language', `(() => {state.party=Object.keys(baseJobs); selectedSkillHero='Mira'; menuTab='skills'; renderMenu(); return (el.menuBody.innerHTML.match(/class="talent-tier /g)||[]).length===5 && el.menuBody.innerHTML.includes('fixed MP') && !el.menuBody.innerHTML.includes('undefined');})()`);
check('Status sheet explains ECHO, AGI CRIT and fixed MP endurance', `(() => {const html=statusCardHtml('Sparky'); return html.includes('ECHO') && html.includes('AGI + CRIT') && statusStatHelp.some(row=>row[1].includes('fixed'));})()`);
check('Speed buffs reorder actions without creating extra turns', `(() => {const a=battleUnit('Verseborn'), b=battleUnit('Glimmer'); const foe=prepareEnemyForBattle(enemy('Speed Test',100,1,'Fire','#555',1)); foe.stats.agi=Math.round(totals('Glimmer').agi*1.1); battle={party:[a,b],enemies:[foe],round:2,turnIndex:0,extraTurns:0,turnQueue:[{side:'party',id:a.id},{side:'enemy',index:0},{side:'party',id:b.id}]}; applySkillBuffs(a,[b],{buffs:[{type:'agilityUp'}]}); return battle.turnQueue.length===3 && battle.turnQueue[1].id===b.id && battle.extraTurns===0;})()`);
check('Weakness discovery remains intact', `(() => {state.activeParty=['Glimmer']; progressFor('Glimmer').talents=[]; const e={name:'Discovery Test',weak:'Earth'}; return !knownWeakness(e) && rememberWeakness(e) && knownWeakness(e);})()`);
check('Every Tier 2 offers exactly one damage or healing area conversion', `(() => {const expected={Verseborn:['Resonant Field','Resonant Verse','allEnemies'],Mira:['Voidthorn Rain','Voidthorn Mark','allEnemies'],Seerin:['Cinder Sanctuary','Cinder Guard','partyWide'],Torren:['Foundation Quake','Foundation Break','allEnemies'],Glimmer:['Patch Network','Patch Job','partyWide'],Kael:['Communal Rite','Quiet Rite','partyWide'],Sparky:['Memory Wildfire','Memory Flare','allEnemies']}; return Object.entries(expected).every(([id,[talentName,skillName,flag]])=>{const tierTwo=talentTrees[id].filter(t=>t.tier===2&&['aoeSkill','partyHeal'].includes(t.type)); progressFor(id).talents=[talentName]; const sk=battleSkills(id,{id}).find(s=>s.name===skillName); return tierTwo.length===1&&sk?.[flag]&&sk.desc.includes('every living');});})()`);
check('Area heals carry their distinct party buffs', `(() => {const expected={Seerin:['Cinder Sanctuary','Cinder Guard','holyFollowUp',.1,1],Glimmer:['Patch Network','Patch Job','combatDrone',.4,2],Kael:['Communal Rite','Quiet Rite','defenseUp',.12,2]}; return Object.entries(expected).every(([id,[talentName,skillName,type,value,duration]])=>{progressFor(id).talents=[talentName]; const sk=battleSkills(id,{id}).find(s=>s.name===skillName); const buff=sk?.buffs?.find(entry=>entry.type===type); return sk?.partyWide&&buff?.value===value&&buff?.duration===duration;});})()`);
check('Seerin Holy Follow-up adds ten percent once then expires', `(() => {const random=Math.random; Math.random=()=>.999; try {progressFor('Verseborn').talents=[]; const u=battleUnit('Verseborn'); u.mp=999; applyStatus(u,'holyFollowUp',{id:'Seerin'},{force:true,duration:1,value:.1}); const foe=prepareEnemyForBattle(enemy('Holy Follow-up Test',9999,1,'None','#555',1)); foe.hp=foe.max=9999; battle={party:[u],enemies:[foe],round:1,turnIndex:0,turnQueue:[{side:'party',id:u.id}],usedOnce:{},extraTurns:0,resolving:false}; mode='battle'; const sk=baseJobs.Verseborn.skills.find(s=>s.name==='Resonant Verse'); const base=Math.max(1,Math.round((sk.power+totals('Verseborn').mag+5)*outgoingDamageMultiplier(u,'magic',foe))); useSkill(u,sk,foe); __impact(); return 9999-foe.hp===base+Math.max(1,Math.round(base*.1))&&!statusOf(u,'holyFollowUp');} finally {Math.random=random;}})()`);
check('Shared Combat Drone uses Glimmer as its damage and talent source', `(() => {progressFor('Glimmer').talents=['Dual Drone Protocol']; progressFor('Torren').talents=[]; const u=battleUnit('Torren'); applyStatus(u,'combatDrone',{id:'Glimmer'},{force:true,duration:2,value:.4}); const drone=statusOf(u,'combatDrone'); const glimmerPower=(drone.value*(1+typedTalentValue('Glimmer','dronePower'))); const fromGlimmer=Math.round(totals('Glimmer').mag*glimmerPower); const fromTorren=Math.round(totals('Torren').mag*glimmerPower); return drone.source.id==='Glimmer'&&fromGlimmer>fromTorren;})()`);
check('Shared Combat Drone visibly fires after an ally damaging action', `(() => {const random=Math.random; Math.random=()=>.999; try {progressFor('Glimmer').talents=[]; progressFor('Torren').talents=[]; const u=battleUnit('Torren'); u.mp=999; applyStatus(u,'combatDrone',{id:'Glimmer'},{force:true,duration:2,value:.4}); const foe=prepareEnemyForBattle(enemy('Drone Test',9999,1,'None','#555',1)); foe.hp=foe.max=9999; battle={party:[u],enemies:[foe],round:1,turnIndex:0,turnQueue:[{side:'party',id:u.id}],usedOnce:{},extraTurns:0,resolving:false}; battleFloaters=[]; mode='battle'; useSkill(u,battleSkills('Torren',u)[0],foe); __impact(); const droneFloater=battleFloaters.find(entry=>entry.damageType==='Drone Tech'); return Boolean(droneFloater)&&droneFloater.amount>Math.round(totals('Glimmer').mag*.4)&&foe.hp<foe.max;} finally {Math.random=random;}})()`);
check('Damage and healing floaters remain for an extra half-second', 'BATTLE_FLOATER_LIFETIME===78');
console.log(`New combat/gear checks: ${passed}/${passed}`);
