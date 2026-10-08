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

test('Flameguard base Evasion is data-driven and agile heroes are distinct', `(() => {
  const expected={Verseborn:.05,Mira:.12,Seerin:.03,Kael:.05,Torren:.02,Glimmer:.08,Sparky:.08};
  return Object.entries(expected).every(([id,value])=>FLAMEGUARD_BASE_EVASION[id]===value&&battleUnit(id).baseEvasion===value)
    &&tryEvadeAttack({id:'Verseborn',baseEvasion:.05,statuses:[]},.01)===true;
})()`);

test('Enemy archetypes and named specialists use distinct base Evasion', `(() => {
  const normal=enemyCombatProfile('hybrid',.1,{hp:1,mp:1,str:1,mag:1,stam:1,agi:1},{},[]);
  return normal.baseEvasion===.05
    &&enemyAbilityProfiles['Cracked Pillar'].baseEvasion===0
    &&enemyAbilityProfiles.Grumm.baseEvasion===.02
    &&enemyAbilityProfiles['Clock Goblin'].baseEvasion===.1
    &&enemyAbilityProfiles.Shade.baseEvasion===.15
    &&enemyAbilityProfiles['Nyx Vael'].baseEvasion===.09
    &&enemyAbilityProfiles.Tja.baseEvasion===.09
    &&enemyAbilityProfiles.Shade.baseEvasion>enemyAbilityProfiles.Grumm.baseEvasion;
})()`);

test('Player status cards and unit bar tooltips expose base/current Evasion', `(() => {
  const hero=statusCardHtml('Mira');
  const enemy={name:'Shade',baseEvasion:.15,statuses:[]};
  const tooltip=statusTooltipHtml(enemy);
  return hero.includes('EVASION')&&hero.includes('12% base')
    &&tooltip.includes('Base Evasion 15%')&&tooltip.includes('Current Evasion 15%')
    &&!updateStatusTooltip.toString().includes('statuses?.length');
})()`);

test('A real player attack can be Evaded with no damage, status, Break or proc', `(() => {
  const oldTalents=[...progressFor('Sparky').talents], oldMode=mode;
  const oldRandom=Math.random;
  try {
    progressFor('Sparky').talents=['Ember Bite'];
    const attacker=battleUnit('Sparky'); attacker.mp=999;
    const defender=prepareEnemyForBattle(enemy('Evasion Target',9999,1,'None','#555',1));
    defender.hp=defender.max=9999; defender.baseEvasion=.6; defender.breakValue=0; defender.statuses=[];
    battle={party:[attacker],enemies:[defender],round:1,turnIndex:0,turnQueue:[{side:'party',id:'Sparky'}],usedOnce:{},extraTurns:0,resolving:false};
    battleFloaters=[]; mode='battle'; Math.random=()=>0;
    const skill=talentTrees.Sparky.find(entry=>entry.name==='Ember Bite').value;
    useSkill(attacker,skill,defender); __impact();
    return defender.hp===9999&&!statusOf(defender,'burn')&&(defender.breakValue||0)===0
      &&battleFloaters.some(entry=>entry.kind==='evade'&&entry.text==='EVADE!');
  } finally { progressFor('Sparky').talents=oldTalents; Math.random=oldRandom; mode=oldMode; }
})()`);

test('AoE Evasion rolls independently for each target', `(() => {
  const a={id:'Verseborn',baseEvasion:.05,statuses:[]};
  const b={id:'Kael',baseEvasion:.05,statuses:[]};
  return tryEvadeAttack(a,.01)===true&&tryEvadeAttack(b,.9)===false;
})()`);

test('DOT damage bypasses Evasion and does not consume an incoming charge', `(() => {
  const unit={id:'Mira',name:'Mira',hp:100,max:100,statuses:[]};
  battle={round:1,party:[unit],enemies:[]}; battleFloaters=[];
  applyStatus(unit,'poison',{name:'Test'},{force:true,duration:3,value:12});
  applyStatus(unit,'evasion',unit,{force:true,duration:2,incomingCharges:2,value:.35});
  processTurnStart(unit);
  return unit.hp===88&&statusOf(unit,'evasion')?.incomingCharges===2;
})()`);

test('Temporary Evasion spends one charge on either a hit or an Evade', `(() => {
  const unit={id:'Mira',hp:100,max:100,statuses:[]};
  battle={round:1,party:[unit],enemies:[]};
  applyStatus(unit,'evasion',unit,{force:true,duration:2,incomingCharges:2,value:.35});
  const evaded=tryEvadeAttack(unit,0);
  const afterEvade=statusOf(unit,'evasion')?.incomingCharges;
  const hit=tryEvadeAttack(unit,.99);
  return evaded&&afterEvade===1&&!hit&&!statusOf(unit,'evasion');
})()`);

test('Mira kill Evasion leads into an Evade and Shadowstep Crit payoff', `(() => {
  const old=[...progressFor('Mira').talents];
  try {
    progressFor('Mira').talents=['Fade Into Shadow','Shadowstep'];
    const mira={...battleUnit('Mira'),statuses:[]};
    battle={round:1,party:[mira],enemies:[]};
    applyStatus(mira,'evasion',mira,{force:true,duration:2,incomingCharges:2,value:typedTalentValue('Mira','killEvasion')});
    const evaded=tryEvadeAttack(mira,0);
    return typedTalentValue('Mira','killEvasion')===.35&&evaded
      &&statusOf(mira,'evasion')?.incomingCharges===1
      &&statusOf(mira,'critUp')?.value===.5;
  } finally { progressFor('Mira').talents=old; }
})()`);

test('Sparky Smoke Trail creates a meaningful two-attack Evasion window', `(() => {
  const old=[...progressFor('Sparky').talents];
  try {
    progressFor('Sparky').talents=['Smoke Trail'];
    const sparky={...battleUnit('Sparky'),statuses:[]};
    battle={round:1,party:[sparky],enemies:[]};
    const value=typedTalentValue('Sparky','fireEvasion');
    applyStatus(sparky,'evasion',sparky,{force:true,duration:2,incomingCharges:2,value});
    return value===.25&&combatEvasionChance(sparky)===.33&&statusOf(sparky,'evasion')?.incomingCharges===2;
  } finally { progressFor('Sparky').talents=old; }
})()`);

test('Hall generation exposes only the new sustain affix family', `(() => {
  const oldMode=state.gameMode;
  try {
    state.gameMode='hallBattles';
    const hallPools=[gearAffixPool(gearByName('Ashrunner Knife')),gearAffixPool(gearByName('Ashcloak')),gearAffixPool(gearByName('Promise Ring'))];
    const hallTypes=new Set(hallPools.flat().map(entry=>entry.type));
    state.gameMode='story';
    const storyTypes=new Set(gearAffixPool(gearByName('Ashrunner Knife')).map(entry=>entry.type));
    return hallTypes.has('leeching')&&hallTypes.has('siphoning')
      &&![...hallTypes].some(type=>['hpOnHit','mpOnHit','battleRegen'].includes(type))
      &&!storyTypes.has('leeching')&&!storyTypes.has('siphoning');
  } finally { state.gameMode=oldMode; }
})()`);

test('Legacy Hall sustain migrates once without rerolling other affixes or offers', `(() => {
  const snapshot={mode:state.gameMode,flags:state.flags,affixes:state.gearAffixes,instances:state.gearInstances,hall:state.hallBattles};
  try {
    state.gameMode='hallBattles'; state.flags={};
    state.gearAffixes={Test:[{key:'oldhp',label:'Old',type:'hpOnHit',value:6},{key:'keen',label:'Keen',type:'critChance',value:.07}]};
    state.gearInstances={one:{affixes:[{key:'oldmp',label:'Old MP',type:'mpOnHit',value:4},{key:'fleet',label:'Fleet',type:'statPct',stat:'agi',value:.1}]}};
    state.hallBattles={shopOffers:{41:{name:'Offer',affixes:[{key:'regen',label:'Regen',type:'battleRegen',value:20},{key:'cruel',label:'Cruel',type:'statusDuration',value:1}]}}};
    const first=migrateHallSustainAffixes(), saved=JSON.stringify([state.gearAffixes,state.gearInstances,state.hallBattles.shopOffers]);
    const second=migrateHallSustainAffixes();
    return first&&!second&&saved===JSON.stringify([state.gearAffixes,state.gearInstances,state.hallBattles.shopOffers])
      &&state.gearAffixes.Test[0].type==='leeching'&&state.gearAffixes.Test[1].key==='keen'
      &&state.gearInstances.one.affixes[0].type==='siphoning'&&state.gearInstances.one.affixes[1].key==='fleet'
      &&state.hallBattles.shopOffers[41].affixes[0].type==='leeching'&&state.hallBattles.shopOffers[41].affixes[1].key==='cruel';
  } finally { state.gameMode=snapshot.mode; state.flags=snapshot.flags; state.gearAffixes=snapshot.affixes; state.gearInstances=snapshot.instances; state.hallBattles=snapshot.hall; }
})()`);

test('Leeching and Siphoning scale once from aggregate direct action output', `(() => {
  const oldMode=state.gameMode, ref=baseJobs.Mira.gear.ring, base=gearBaseName(ref), old=state.gearAffixes[base];
  try {
    state.gameMode='hallBattles';
    state.gearAffixes[base]=[
      {key:'leeching',label:'Leeching',type:'leeching',value:.07},
      {key:'siphoning',label:'Siphoning',type:'siphoning',value:.08}
    ];
    const unit=battleUnit('Mira'); unit.hp=10; unit.mp=0;
    battle={party:[unit],enemies:[]}; battleFloaters=[];
    const skill=baseJobs.Mira.skills.find(entry=>entry.name==='Voidthorn Mark');
    const beforeHp=unit.hp, beforeMp=unit.mp;
    const result=resolveActionSustain(unit,skill,300);
    const expectedHp=Math.round(Math.min(300,unit.max*2)*.07), expectedMp=Math.round(totals('Mira').mag*.08);
    return result.hp===expectedHp&&unit.hp-beforeHp===expectedHp&&result.mp===expectedMp&&unit.mp-beforeMp===expectedMp;
  } finally { state.gameMode=oldMode; if(old) state.gearAffixes[base]=old; else delete state.gearAffixes[base]; }
})()`);

test('Physical Siphoning uses STR and basic attacks cannot trigger it', `(() => {
  const oldMode=state.gameMode, ref=baseJobs.Mira.gear.ring, base=gearBaseName(ref), old=state.gearAffixes[base];
  try {
    state.gameMode='hallBattles'; state.gearAffixes[base]=[{key:'siphoning',label:'Siphoning',type:'siphoning',value:.1}];
    const unit=battleUnit('Mira'); unit.mp=0; battle={party:[unit],enemies:[]};
    const physical=baseJobs.Mira.skills.find(entry=>entry.name==='Silent Step');
    const skillResult=resolveActionSustain(unit,physical,100);
    unit.mp=0;
    const basicResult=resolveActionSustain(unit,{...baseJobs.Mira.skills[0],basicAttack:true},100);
    return skillResult.mp===Math.round(totals('Mira').str*.1)&&basicResult.mp===0;
  } finally { state.gameMode=oldMode; if(old) state.gearAffixes[base]=old; else delete state.gearAffixes[base]; }
})()`);

test('Sustain resolves only once per action and excludes follow-up damage sources', `(() => {
  const source=useSkill.toString();
  return source.split('resolveActionSustain(').length-1===1
    &&source.includes('resolveActionSustain(u, sk, directDamageDealt)')
    &&source.indexOf('Combat Drone hits')<source.indexOf('resolveActionSustain(u, sk, directDamageDealt)');
})()`);

test('Battle drops and cumulative Hall Shop offers share the same affix roller', `(() => {
  return createEchoGearInstance.toString().includes('rollGearAffixes(gear, rarity)')
    &&ensureHallShopOfferAffixes.toString().includes('rollGearAffixes(gear, offer.rarity');
})()`);

console.log(`PASS ${passed}/${passed} focused Evasion and sustain checks`);
