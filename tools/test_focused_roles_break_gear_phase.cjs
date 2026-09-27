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

test('Flameguard and enemy role mappings are exact', `(() => {
  const expected={Verseborn:'utility',Mira:'dps',Seerin:'tank',Torren:'tank',Glimmer:'dps',Kael:'healer',Sparky:'hybrid'};
  return Object.entries(expected).every(([id,role])=>combatRoleKey({id},false)===role)
    &&combatRoleKey({role:'bruiser'},true)==='tank'
    &&combatRoleKey({role:'controller'},true)==='utility'
    &&combatRoleKey({role:'assassin'},true)==='dps'
    &&combatRoleKey({role:'hybrid'},true)==='hybrid';
})()`);

test('Only Flameguard Tanks and displayed enemy Tanks generate Break', `(() => {
  const blocked={stagger:0}, allowed={stagger:0}, enemyBlocked={stagger:0}, enemyAllowed={stagger:0};
  const a=addBreakProgress({id:'Mira'},blocked,3);
  const b=addBreakProgress({id:'Seerin'},allowed,3);
  const c=addBreakProgress({role:'hybrid',stats:{str:20}},enemyBlocked,3);
  const d=addBreakProgress({role:'bruiser',stats:{str:20}},enemyAllowed,3);
  return a.gain===0&&blocked.stagger===0&&b.breaks===1
    &&c.gain===0&&enemyBlocked.stagger===0&&d.breaks===1
    &&['Verseborn','Mira','Glimmer','Kael','Sparky'].every(id=>!canGenerateBreak({id}))
    &&['Seerin','Torren'].every(id=>canGenerateBreak({id}));
})()`);

test('Future gear and fixed effects expose no generic Stagger or Break affix', `(() => {
  const pool=Object.values(affixPools).flat();
  const gear=Object.values(gearDb).flat();
  const fixed=gear.flatMap(entry=>gearEffects(entry));
  const basic=Object.values(WEAPON_BASIC_ATTACK_EFFECTS);
  return ![...pool,...fixed,...basic].some(isGenericBreakGearAffix)
    &&!gear.some(entry=>/\\bstagger\\b/i.test(entry.desc||''));
})()`);

test('Legacy invalid gear affixes migrate once without rerolling valid data', `(() => {
  const snapshot={flags:state.flags,affixes:state.gearAffixes,instances:state.gearInstances,hall:state.hallBattles,mode:state.gameMode};
  try {
    state.gameMode='hallBattles'; state.flags={};
    state.gearAffixes={'Faultspark Ring':[{key:'legacy',label:'+2 Stagger',type:'stagger',value:2},{key:'keen',label:'Keen',type:'critChance',value:.07}]};
    state.gearInstances={hall_99:{id:'hall_99',name:'Faultspark Ring',affixes:[{key:'oldBreak',label:'Break +1',type:'break',value:1},{key:'fleet',label:'Fleet',type:'statPct',stat:'agi',value:.1}]}};
    state.hallBattles={shopOffers:{20:{name:'Faultspark Ring',affixes:[{key:'old',label:'+1 Stagger',type:'stagger',value:1},{key:'cruel',label:'Cruel',type:'statusDuration',value:1}]}}};
    const first=migrateGenericBreakGearAffixes();
    const saved=JSON.stringify([state.gearAffixes,state.gearInstances,state.hallBattles.shopOffers]);
    const second=migrateGenericBreakGearAffixes();
    const all=[...state.gearAffixes['Faultspark Ring'],...state.gearInstances.hall_99.affixes,...state.hallBattles.shopOffers[20].affixes];
    return first&&!second&&saved===JSON.stringify([state.gearAffixes,state.gearInstances,state.hallBattles.shopOffers])
      &&!all.some(isGenericBreakGearAffix)&&state.gearAffixes['Faultspark Ring'].some(entry=>entry.key==='keen')
      &&state.gearInstances.hall_99.affixes.some(entry=>entry.key==='fleet')
      &&state.hallBattles.shopOffers[20].affixes.some(entry=>entry.key==='cruel');
  } finally { state.flags=snapshot.flags; state.gearAffixes=snapshot.affixes; state.gearInstances=snapshot.instances; state.hallBattles=snapshot.hall; state.gameMode=snapshot.mode; }
})()`);

test('Cleanse and Dispel floaters name the actual removed effect', `(() => {
  const ally={id:'Kael',name:'Kael',hp:100,max:100,statuses:[{type:'silence',remaining:2}]};
  const enemy={name:'Target',hp:100,max:100,statuses:[{type:'barrier',remaining:2,value:.2}]};
  battle={party:[ally],enemies:[enemy]}; battleFloaters=[];
  const clean=cleanseWithTalent({id:'Kael'},ally);
  const dispel=enemyDispelOne(enemy);
  return clean===1&&dispel==='BARRIER'
    &&battleFloaters.some(entry=>entry.text==='CLEANSED: SILENCE')
    &&battleFloaters.some(entry=>entry.text==='DISPELLED: BARRIER');
})()`);

test('BROKEN feedback is guarded by the actual threshold transition', `(() => {
  const player=useSkill.toString(), enemy=resolveEnemyTurn.toString();
  return player.includes('if (!brokenAtHitStart)')&&player.includes('text: "BROKEN!"')
    &&enemy.includes('if (!brokenAtHitStart)')&&enemy.includes('text: "BROKEN!"');
})()`);

test('Gear comparison uses real formulas, affix deltas and temporary metadata', `(() => {
  const html=withTemporaryGearMetadata('Faultspark Ring',{affixes:[{key:'keen',label:'Keen',type:'critChance',value:.09}]},()=>gearComparisonContentHtml('Seerin','ring','Faultspark Ring'));
  return html.includes('Hovered item')&&html.includes('Difference')&&html.includes('Estimated combat impact')
    &&html.includes('Skill-by-skill formula impact')&&html.includes('STR + 0.5 MAG')
    &&gearComparisonContentHtml.toString().includes('skillExpectedOutput');
})()`);

test('Hall shop sections preserve original offer indexes and purchase history', `(() => {
  const source=renderVendor.toString();
  return source.includes('Available')&&source.includes('Purchased (')
    &&source.includes('purchasedShopStages.includes(ware.hallStage)')
    &&source.includes('shopWareRowHtml(ware, index)');
})()`);

test('Hall phase pause waits for explicit confirmation and then advances once', `(() => {
  let advances=0; mode='battle'; battle={phaseTransition:{step:'incoming',advance:()=>{advances++; battle.phaseTransition=null;}}};
  const first=confirmPhaseTransition();
  const second=confirmPhaseTransition();
  return first&&!second&&advances===1&&!winBattle.toString().includes('setTimeout(advanceWave');
})()`);

assert.ok(fs.existsSync(path.join(__dirname, '../public/game/assets/ui/combat-role-icons.png')), 'role icon runtime asset exists');
passed++;
console.log('PASS supplied role icon runtime asset exists');
console.log(`PASS ${passed}/${passed} focused role, Break, gear UI and phase checks`);
