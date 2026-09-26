const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const prefix = fs.readFileSync(path.join(__dirname, 'test_combat.cjs'), 'utf8')
  .split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false}); sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', `${prefix}\nreturn {run};`)(require, __dirname);

let passed = 0;
function test(name, expression) {
  assert.ok(run(expression), name);
  passed++;
  console.log(`PASS ${name}`);
}

test('Every requested enemy identity has stats, MP, Crit and an Ultimate profile', `(() => {
  const names=['Slobbo','Brokk','High Administrator Thaddeus','Inkbound Auditor','Dock Foreman','Corrupt Clergy','Saint Justin','Archive Custodian','Gorg','Cracked Pillar','Grumm','Lysra','Kaeldrin','Elder Plumpin','Red Dragon Lord','Clock Goblin','Lord Sprocket','Baron Revus Veln','Dawn Gate Sentinel','Shade','Nyx Vael','Jory Bellwick','Rava','Tja','King Maeric','Angry Gnome Mob','Ash Quarter Thugg','Tibby','Berend Blimpstone','Marla','Prince Lucan Cindralis','Sir Reginald','Harl','Frostmile Wyrm','Ember Leviathan','Solinar','Solinar Enraged'];
  return names.every(name=>{const profile=enemyAbilityProfiles[name];return profile?.identity&&profile.maxMp>0&&profile.crit>0&&profile.moves?.ultimate&&!profile.pattern.includes('ultimate');});
})()`);

test('Single-target attacks avoid Sleep while an awake hero is available', `(() => {
  const sleeping={id:'Mira',name:'Mira',hp:100,max:100,statuses:[{type:'sleep',remaining:2}]};
  const awake={id:'Kael',name:'Kael',hp:100,max:100,statuses:[]};
  const random=Math.random; Math.random=()=>0;
  try { return chooseEnemyTarget({node:1},{kind:'melee'},[sleeping,awake])===awake; }
  finally { Math.random=random; }
})()`);

test('AoE attacks still include Sleeping heroes and direct damage still wakes them', `(() => {
  const sleeping={id:'Mira',hp:100,statuses:[{type:'sleep',remaining:2},{type:'poison',remaining:2}]};
  const awake={id:'Kael',hp:100,statuses:[]};
  battle={party:[sleeping,awake],enemies:[],enemyResonance:0};
  const action={kind:'magic',allTargets:true};
  return enemyTargetsForAction({},action,awake).length===2&&breakSleepFromDamage(sleeping)==='SLEEP BROKEN!'&&!statusOf(sleeping,'sleep')&&Boolean(statusOf(sleeping,'poison'));
})()`);

test('Shared RES 99 cannot trigger an Ultimate', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  battle={party:[],enemies:[unit],enemyResonance:99,defeated:[]};
  return chooseEnemyAction(unit).kind!=='ultimate'&&battle.enemyResonance===99&&!('resonance' in unit);
})()`);

test('Shared RES 100 triggers the next eligible Ultimate', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  battle={party:[],enemies:[unit],enemyResonance:100,defeated:[]};
  return chooseEnemyAction(unit).kind==='ultimate'&&battle.enemyResonance===100;
})()`);

test('Enemy units expose MP while only the battle owns Enemy Resonance', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  battle={party:[],enemies:[unit],enemyResonance:42,defeated:[]};
  return Number.isFinite(unit.mp)&&Number.isFinite(unit.maxmp)&&!('resonance' in unit)&&drawBattleVitals.toString().includes('unit.mp')&&renderBattle.toString().includes('battle.enemyResonance');
})()`);

test('Silence blocks a ready shared-resonance Ultimate', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  unit.statuses=[{type:'silence',remaining:1}];
  battle={party:[],enemies:[unit],enemyResonance:100,defeated:[]};
  return chooseEnemyAction(unit).kind==='melee'&&battle.enemyResonance===100;
})()`);

test('Ultimate resolution consumes shared Resonance and leaves the pattern position intact', `(() => {
  const hero=battleUnit('Mira'); hero.hp=hero.max=99999;
  const unit=prepareEnemyForBattle(enemy('Rava',9999,1,'None','#555',3,'Rava'));
  unit.patternStep=1;
  battle={party:[hero],enemies:[unit],defeated:[],enemyResonance:100,round:1,turnIndex:0,turnQueue:[{side:'enemy',index:0}],usedOnce:{},extraTurns:0,resolving:true,ward:false};
  mode='battle'; resolveEnemyTurn({side:'enemy',index:0},''); __impact();
  const afterUltimate=battle.enemyResonance===0&&unit.patternStep===1;
  const next=chooseEnemyAction(unit);
  return afterUltimate&&next.kind==='buff'&&unit.patternStep===2;
})()`);

test('Enemy MP is paid before resolution and never becomes negative', `(() => {
  const hero=battleUnit('Mira'); hero.hp=hero.max=99999;
  const unit=prepareEnemyForBattle(enemy('Slobbo',9999,1,'None','#555',1));
  unit.patternStep=0; unit.mp=20;
  battle={party:[hero],enemies:[unit],defeated:[],enemyResonance:0,round:1,turnIndex:0,turnQueue:[{side:'enemy',index:0}],usedOnce:{},extraTurns:0,resolving:true,ward:false};
  mode='battle'; resolveEnemyTurn({side:'enemy',index:0},'');
  const paid=unit.mp===2; __impact();
  return paid&&unit.mp>=0;
})()`);

test('An unaffordable pattern action falls back to an affordable basic attack', `(() => {
  const unit=prepareEnemyForBattle(enemy('Slobbo',999,20,'None','#555',1));
  unit.mp=0; unit.patternStep=0;
  battle={party:[{id:'Mira',hp:100,max:100,statuses:[]}],enemies:[unit],enemyResonance:0,defeated:[]};
  const action=chooseEnemyAction(unit);
  return action.kind==='melee'&&enemyActionMpCost(unit,action)===0&&unit.mp===0;
})()`);

test('Enemy Crit uses the individual profile chance and the existing x2 baseline', `(() => {
  const target={id:'Mira',hp:1000,max:1000,statuses:[]};
  const unit=prepareEnemyForBattle(enemy('Shade',999,20,'None','#555',3,'Shade'));
  const action=enemyActionForKind(unit,'melee');
  const random=Math.random;
  try {
    Math.random=()=>.5; unit.crit=0.01; const normal=enemyDamageRoll(unit,action,target);
    Math.random=()=>.5; unit.crit=1; const critical=enemyDamageRoll(unit,action,target);
    return !normal.critical&&critical.critical&&critical.damage>=normal.damage*2;
  } finally { Math.random=random; }
})()`);

test('Heal selection chooses the lowest useful HP ally', `(() => {
  const healer=prepareEnemyForBattle(enemy('Marla',100,10,'None','#555',2,'Marla'));
  const low=prepareEnemyForBattle(enemy('Brokk',100,10,'None','#555',2)); low.hp=Math.round(low.max*.25);
  const scratched=prepareEnemyForBattle(enemy('Slobbo',100,10,'None','#555',2)); scratched.hp=Math.round(scratched.max*.7);
  battle={party:[],enemies:[healer,scratched,low],enemyResonance:0,defeated:[]};
  const selected=chooseEnemyAction(healer);
  return chooseEnemyHealTarget()===low&&selected.healing&&selected.target===low;
})()`);

test('Cleanse selection prioritizes meaningful control and ignores expiring minor damage', `(() => {
  const healer=prepareEnemyForBattle(enemy('Corrupt Clergy',100,10,'None','#555',2));
  const controlled=prepareEnemyForBattle(enemy('Brokk',100,10,'None','#555',2));
  const minor=prepareEnemyForBattle(enemy('Slobbo',100,10,'None','#555',2));
  controlled.statuses=[{type:'poison',remaining:3},{type:'stun',remaining:1}];
  minor.statuses=[{type:'bleed',remaining:1}];
  battle={party:[],enemies:[healer,controlled,minor],enemyResonance:0,defeated:[]};
  const action=chooseEnemyAction(healer);
  return chooseEnemyCleanseTarget()===controlled&&enemyCleanseStatus(controlled).type==='stun'&&action.kind==='cleanse'&&action.target===controlled;
})()`);

test('Role buffs choose an ally that benefits and avoid early refresh', `(() => {
  const leader=prepareEnemyForBattle(enemy('Kaeldrin',100,10,'None','#555',2,'Kaeldrin'));
  const shade=prepareEnemyForBattle(enemy('Shade',100,18,'None','#555',2,'Shade'));
  const grumm=prepareEnemyForBattle(enemy('Grumm',100,14,'None','#555',2,'Grumm'));
  battle={party:[],enemies:[leader,shade,grumm],enemyResonance:0,defeated:[]};
  const first=enemyBuffTarget(leader,enemyActionForKind(leader,'buff'))===shade;
  shade.statuses=[{type:'strengthUp',remaining:3},{type:'critUp',remaining:3}];
  const second=enemyBuffTarget(leader,enemyActionForKind(leader,'buff'))===grumm;
  return first&&second;
})()`);

test('Self-buffs are not refreshed while their useful duration remains', `(() => {
  const shade=prepareEnemyForBattle(enemy('Shade',100,18,'None','#555',2,'Shade'));
  battle={party:[],enemies:[shade],enemyResonance:0,defeated:[]};
  const focus=enemyActionForKind(shade,'buff');
  const initiallyUseful=enemyBuffTarget(shade,focus)===shade;
  shade.statuses=[{type:'critUp',remaining:3},{type:'agilityUp',remaining:3}];
  return initiallyUseful&&enemyBuffTarget(shade,enemyActionForKind(shade,'buff'))===null;
})()`);

test('Lysra and Rava synergy sends Arcane Aegis to the allied fire caster', `(() => {
  const lysra=prepareEnemyForBattle(enemy('Lysra',100,10,'None','#555',2,'Lyrsa'));
  const rava=prepareEnemyForBattle(enemy('Rava',100,18,'None','#555',2,'Rava'));
  battle={party:[],enemies:[lysra,rava],enemyResonance:0,defeated:[]};
  return enemyBuffTarget(lysra,enemyActionForKind(lysra,'buff'))===rava;
})()`);

test('Enemy Break reaches Broken without creating Stun or an automatic skipped turn', `(() => {
  const hero=battleUnit('Mira'); hero.hp=hero.max=99999; hero.stagger=2;
  const unit=prepareEnemyForBattle(enemy('Brokk',9999,1,'None','#555',1));
  unit.patternStep=0;
  battle={party:[hero],enemies:[unit],defeated:[],enemyResonance:0,round:1,turnIndex:0,turnQueue:[{side:'enemy',index:0}],usedOnce:{},extraTurns:0,resolving:true,ward:false};
  mode='battle'; resolveEnemyTurn({side:'enemy',index:0},''); __impact();
  const start=processTurnStart(hero);
  return Boolean(statusOf(hero,'broken'))&&!statusOf(hero,'stun')&&!start.skip&&hero.stagger===0;
})()`);

test('Broken payoff targeting prefers an already Broken hero', `(() => {
  const normal={id:'Mira',hp:100,max:100,statuses:[]};
  const broken={id:'Torren',hp:100,max:100,statuses:[{type:'broken',remaining:1}]};
  const random=Math.random; Math.random=()=>0;
  try { return chooseEnemyTarget({}, {kind:'ultimate',payoff:'broken'}, [normal,broken])===broken; }
  finally { Math.random=random; }
})()`);

test('Shared Resonance control drains the team meter and lock blocks team gains', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',100,10,'None','#555',2,'Rava'));
  battle={party:[],enemies:[unit],enemyResonance:80,defeated:[]};
  const sk=baseJobs.Kael.skills.find(entry=>entry.name==='Quiet Tithe');
  applyEnemyResonanceControl({id:'Kael'},unit,sk);
  const blocked=gainEnemyResonance(unit,20);
  return battle.enemyResonance===40&&blocked===0&&statusOf(unit,'resonanceLocked')?.remaining===1;
})()`);

test('A critical heal takes priority over a lower-value cleanse', `(() => {
  const healer=prepareEnemyForBattle(enemy('Corrupt Clergy',100,10,'None','#555',2));
  const critical=prepareEnemyForBattle(enemy('Brokk',100,10,'None','#555',2)); critical.hp=Math.round(critical.max*.2);
  const silenced=prepareEnemyForBattle(enemy('Slobbo',100,10,'None','#555',2)); silenced.statuses=[{type:'silence',remaining:2}];
  battle={party:[],enemies:[healer,critical,silenced],enemyResonance:0,defeated:[]};
  const action=chooseEnemyAction(healer);
  return action.healing&&action.target===critical;
})()`);

test('Maeric team support is recognized as a useful full-formation buff', `(() => {
  const maeric=prepareEnemyForBattle(enemy('King Maeric',100,10,'None','#555',3));
  const reginald=prepareEnemyForBattle(enemy('Sir Reginald',100,10,'None','#555',3));
  const lucan=prepareEnemyForBattle(enemy('Prince Lucan Cindralis',100,10,'None','#555',3));
  battle={party:[],enemies:[maeric,reginald,lucan],enemyResonance:0,defeated:[]};
  const command=enemyActionForKind(maeric,'buff');
  return command.allAllies&&enemyActionUseful(maeric,command)&&command.target&&command.target.hp>0;
})()`);

console.log(`${passed} focused enemy framework checks passed; no full regression run.`);
