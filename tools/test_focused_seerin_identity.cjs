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

test('Verseborn loses Purge Refrain while Hushed Refrain Silence stays unchanged', `(() => {
  const purge=baseJobs.Verseborn.skills.find(skill=>skill.name==='Purge Refrain'||skill.dispel);
  const silence=baseJobs.Verseborn.skills.find(skill=>skill.name==='Hushed Refrain');
  return !purge&&silence?.status?.type==='silence'&&silence.status.duration===2&&silence.status.force===true&&silence.power===18&&silence.cost===7;
})()`);

test('Kael Purification removes exactly one valid ally debuff and preserves Broken', `(() => {
  const purify=talentTrees.Kael.find(entry=>entry.name==='Purification')?.value;
  const ally={statuses:[{type:'silence',remaining:2},{type:'poison',remaining:4},{type:'broken',remaining:1}]};
  const removed=cleanseStatuses(ally);
  return purify?.targetSide==='ally'&&purify.cleanse===true&&!purify.partyWide&&removed===1&&!statusOf(ally,'silence')&&statusOf(ally,'poison')&&statusOf(ally,'broken');
})()`);

test('Seerin Radiant Purge is a damage-free single-target enemy Dispel', `(() => {
  const purge=baseJobs.Seerin.skills.find(skill=>skill.name==='Radiant Purge');
  return purge?.targetSide==='enemy'&&purge.dispel===true&&purge.power===0&&!purge.buffs&&!purge.healing&&skillTargetsEnemies(purge)&&skillExpectedOutput('Seerin',purge,{id:'Seerin',statuses:[]})===0&&skillOutputBreakdown('Seerin',purge,{id:'Seerin',statuses:[]}).kind==='support';
})()`);

test('Radiant Purge removes exactly one buff and cannot remove forms or structural statuses', `(() => {
  const enemy={form:'mech',finalState:'enraged',statuses:[
    {type:'barrier',remaining:3},{type:'strengthUp',remaining:3},{type:'mechGuard',remaining:2},{type:'combatDrone',remaining:99}
  ]};
  const removed=dispelStatus(enemy);
  return removed==='BARRIER'&&statusOf(enemy,'strengthUp')&&statusOf(enemy,'mechGuard')&&statusOf(enemy,'combatDrone')&&enemy.form==='mech'&&enemy.finalState==='enraged';
})()`);

test('Seerin STR attacks preserve coefficients and gain MAG at half coefficient', `(() => {
  const active=[...baseJobs.Seerin.skills,...talentTrees.Seerin.filter(entry=>entry.type==='newSkill').map(entry=>entry.value)];
  const attack=active.find(skill=>skill.name==='Attack');
  const radiant=active.find(skill=>skill.name==='Radiant Strike');
  const charge=active.find(skill=>skill.name==='ULT II: Flameguard Charge');
  const stats={str:100,mag:40,agi:0,stam:0,echo:0};
  const unit={id:'Seerin',statuses:[]};
  const combined=skill=>skillOffensiveStat('Seerin',skill,unit,stats);
  return attack&&!attack.coefficient&&combined(attack)===120&&radiant.coefficient===1.15&&combined(radiant)*radiant.coefficient===138&&charge.coefficient===2.7&&combined(charge)*charge.coefficient===324&&skillScalingLabel('Seerin',radiant)==='STR + 0.5 MAG';
})()`);

test('Seerin healing, Guard, buffs and Purge stay outside hybrid damage calculation', `(() => {
  const guard=baseJobs.Seerin.skills.find(skill=>skill.name==='Cinder Guard');
  const partyBuff=talentTrees.Seerin.find(entry=>entry.name==="Guardian's Oath")?.value;
  const purge=baseJobs.Seerin.skills.find(skill=>skill.name==='Radiant Purge');
  return guard.power<0&&!skillTargetsEnemies(guard)&&partyBuff?.anim==='block'&&!skillTargetsEnemies(partyBuff)&&skillFormula(purge,'Seerin')==='Dispel / no damage scaling'&&skillScalingLabel('Seerin',purge)==='MAG';
})()`);

test('Seerin Holy vulnerability, Break and Guard secondary effects remain intact', `(() => {
  const radiant=talentTrees.Seerin.find(entry=>entry.name==='Radiant Strike')?.value;
  const charge=talentTrees.Seerin.find(entry=>entry.name==='Flameguard Charge')?.value;
  return radiant?.element==='Holy Fire'&&radiant.status?.type==='holyVulnerability'&&radiant.status.chance===1&&radiant.status.duration===2&&radiant.status.value===.2&&charge?.element==='Holy Fire'&&charge.staggerPower===5&&charge.selfGuard===true;
})()`);

console.log(`PASS ${passed}/${passed} focused Seerin identity checks`);
