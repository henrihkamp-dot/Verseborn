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

test('Single-target attacks avoid Sleep while an awake hero is available', `(() => {
  const sleeping={id:'Mira',name:'Mira',hp:100,max:100,statuses:[{type:'sleep',remaining:2}]};
  const awake={id:'Kael',name:'Kael',hp:100,max:100,statuses:[]};
  const random=Math.random; Math.random=()=>0;
  try { return chooseEnemyTarget({node:1},{kind:'melee'},[sleeping,awake])===awake; }
  finally { Math.random=random; }
})()`);

test('A Sleeping hero remains targetable when every living hero is asleep', `(() => {
  const first={id:'Mira',hp:100,statuses:[{type:'sleep',remaining:2}]};
  const second={id:'Kael',hp:100,statuses:[{type:'sleep',remaining:1}]};
  const random=Math.random; Math.random=()=>0;
  try { return chooseEnemyTarget({node:1},{kind:'magic'},[first,second])===first; }
  finally { Math.random=random; }
})()`);

test('AoE Ultimates still include Sleeping heroes', `(() => {
  const sleeping={id:'Mira',hp:100,statuses:[{type:'sleep',remaining:2}]};
  const awake={id:'Kael',hp:100,statuses:[]};
  battle={party:[sleeping,awake],enemies:[]};
  const action={kind:'ultimate'};
  return enemyActionHitsAll({npcBoss:true},action)&&enemyTargetsForAction({npcBoss:true},action,awake).length===2;
})()`);

test('Direct damage still removes Sleep', `(() => {
  const target={hp:100,statuses:[{type:'sleep',remaining:2},{type:'poison',remaining:2}]};
  return breakSleepFromDamage(target)==='SLEEP BROKEN!'&&!statusOf(target,'sleep')&&Boolean(statusOf(target,'poison'));
})()`);

test('Disabling actions prefer a hero without the same status', `(() => {
  const stunned={id:'Mira',hp:100,statuses:[{type:'stun',remaining:1}]};
  const available={id:'Kael',hp:100,statuses:[]};
  const random=Math.random; Math.random=()=>0;
  try { return chooseEnemyTarget({node:1},{kind:'magic',status:{type:'stun'}},[stunned,available])===available; }
  finally { Math.random=random; }
})()`);

test('Enemy patterns contain no fixed Ultimate steps', `Object.values(enemyAbilityProfiles).every(profile=>!profile.pattern?.includes('ultimate'))`);

test('An enemy below 100 Resonance continues its non-Ultimate pattern', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  unit.npcBoss=true; unit.resonance=99; unit.patternStep=2;
  battle={party:[],enemies:[unit]};
  const action=chooseEnemyAction(unit);
  return action.kind==='melee'&&unit.patternStep===3&&unit.resonance===99;
})()`);

test('An enemy at 100 Resonance can select its Ultimate', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  unit.npcBoss=true; unit.resonance=100; unit.patternStep=2;
  battle={party:[],enemies:[unit]};
  const action=chooseEnemyAction(unit);
  return action.kind==='ultimate'&&unit.patternStep===2;
})()`);

test('After an Ultimate the normal pattern resumes where it stopped', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  unit.npcBoss=true; unit.resonance=100; unit.patternStep=1;
  battle={party:[],enemies:[unit]};
  const ultimate=chooseEnemyAction(unit);
  unit.resonance=0;
  const next=chooseEnemyAction(unit);
  return ultimate.kind==='ultimate'&&next.kind==='magic'&&unit.patternStep===2;
})()`);

test('Silence blocks an Ultimate even at 100 Resonance', `(() => {
  const unit=prepareEnemyForBattle(enemy('Rava',999,20,'None','#555',3,'Rava'));
  unit.npcBoss=true; unit.resonance=100; unit.statuses=[{type:'silence',remaining:1}];
  battle={party:[],enemies:[unit]};
  return chooseEnemyAction(unit).kind==='melee';
})()`);

test('Using an Ultimate resets visible enemy Resonance to zero', `(() => {
  const hero=battleUnit('Mira'); hero.hp=hero.max=99999;
  const unit=prepareEnemyForBattle(enemy('Rava',9999,1,'None','#555',3,'Rava'));
  unit.npcBoss=true; unit.resonance=100;
  battle={party:[hero],enemies:[unit],round:1,turnIndex:0,turnQueue:[{side:'enemy',index:0}],usedOnce:{},extraTurns:0,resolving:true,ward:false};
  mode='battle';
  resolveEnemyTurn({side:'enemy',index:0},'');
  __impact();
  return unit.resonance===0;
})()`);

console.log(`${passed} focused enemy AI checks passed; no full regression run.`);
