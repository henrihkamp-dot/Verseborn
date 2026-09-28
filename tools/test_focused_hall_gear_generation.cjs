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

test('Hall battle and shop rarity bands are exact with no jackpot tier', `(() => {
  const drops=Array.from({length:50},(_,index)=>hallNormalGearRarity(index+1));
  const shop=Array.from({length:50},(_,index)=>hallShopGearRarity(index+1));
  return drops.slice(0,10).every(r=>r==='Rare')
    &&drops.slice(10,20).every(r=>r==='Epic')
    &&drops.slice(20,30).every(r=>r==='Legendary')
    &&drops.slice(30).every(r=>r==='Mythic')
    &&!drops.includes('Artifact')
    &&shop.slice(0,10).every(r=>r==='Rare')
    &&shop.slice(10,20).every(r=>r==='Epic')
    &&shop.slice(20,30).every(r=>r==='Legendary')
    &&shop.slice(30,40).every(r=>r==='Mythic')
    &&shop.slice(40).every(r=>r==='Artifact')
    &&Array.from({length:50},(_,index)=>rollHallGearRarity(index+1)).join('|')===drops.join('|');
})()`);

test('Ten thousand base-stat rolls follow the requested stat-count distribution', `(() => {
  const random=hallSeededRandom('ten-thousand-hall-rolls');
  const counts={1:0,2:0,3:0,4:0,5:0};
  for(let index=0;index<10000;index++) counts[rollHallBaseStatProfile('Mythic',random).statCount]++;
  globalThis.__hallDistribution=counts;
  return counts[1]>=400&&counts[1]<=600
    &&counts[2]>=400&&counts[2]<=600
    &&counts[3]>=7850&&counts[3]<=8150
    &&counts[4]>=400&&counts[4]<=600
    &&counts[5]>=400&&counts[5]<=600;
})()`);

test('Every rarity respects its budget, offense requirement and single-outlier rule', `(() => {
  let broadBelowMinimum=false;
  return Object.entries(HALL_BASE_STAT_RULES).every(([rarity,rule])=>{
    const random=hallSeededRandom('rules:'+rarity);
    return Array.from({length:2500},()=>rollHallBaseStatProfile(rarity,random)).every(profile=>{
      const values=Object.values(profile.stats);
      const high=values.filter(value=>value>rule.max);
      const outside=values.filter(value=>value<rule.min||value>rule.max);
      const outlierValue=profile.outlier?profile.stats[profile.outlier.stat]:null;
      if(profile.statCount>=4&&values.some(value=>value<rule.min)) broadBelowMinimum=true;
      return values.length===profile.statCount
        &&profile.total===values.reduce((sum,value)=>sum+value,0)
        &&profile.total<=rule.budget
        &&values.every(value=>value>=1&&value<=rule.max+5)
        &&('str' in profile.stats||'mag' in profile.stats)
        &&high.length<=1
        &&(profile.statCount>=4||outside.length<=1)
        &&(!profile.outlier||(profile.outlier.direction==='high'?outlierValue>rule.max:outlierValue<rule.min));
    });
  })&&broadBelowMinimum;
})()`);

test('The outlier branch occurs approximately half the time', `(() => {
  const random=hallSeededRandom('outlier-rate');
  let outliers=0;
  for(let index=0;index<10000;index++) if(rollHallBaseStatProfile('Legendary',random).outlier) outliers++;
  globalThis.__hallOutliers=outliers;
  return outliers>=4800&&outliers<=5200;
})()`);

test('New Hall rewards are independent instances with persistent rolled stats and affixes', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles';
  const first={drops:[],gearDrops:[]},second={drops:[],gearDrops:[]};
  const a=guaranteeHallBattleGearReward(first,35),b=guaranteeHallBattleGearReward(second,35);
  const ia=gearInstance(a.ref),ib=gearInstance(b.ref);
  return a.ref!==b.ref&&a.rarity==='Mythic'&&b.rarity==='Mythic'
    &&Object.values(ia.stats).reduce((sum,value)=>sum+value,0)<=54
    &&Object.values(ib.stats).reduce((sum,value)=>sum+value,0)<=54
    &&ia.affixes.length===4&&ib.affixes.length===4;
})()`);

test('One-time migration rerolls only Hall base stats and preserves legacy identity and history', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles'; state.flags.hallBaseStatsV1=false;
  const hallName=HALL_RARE_GEAR_POOL[0].name;
  const legacyAffixes=[{key:'legacy-roll',type:'statPct',stat:'mag',value:.17,text:'Legacy +17% MAG'}];
  state.ownedGear.push(hallName);
  state.gearCopies[hallName]=2;
  state.gearRarities[hallName]='Rare';
  state.gearAffixes[hallName]=structuredClone(legacyAffixes);
  baseJobs.Verseborn.gear.weapon=hallName;
  const echoName=echoForgeGear[0].name;
  const echoRef=createEchoGearInstance(echoName,{rarity:'Legendary',affixes:[{key:'echo-kept',value:.2}],stats:{mag:999}});
  state.hallBattles.shopOffers[41]={name:HALL_ARTIFACT_GEAR[0].name,rarity:'Artifact',price:5432,affixes:[{key:'shop-kept',value:.3}],stats:{str:1}};
  state.hallBattles.purchasedShopStages=[41];
  const first=migrateHallBaseStatsV1();
  const refs=echoGearInstanceRefs(hallName);
  const migratedStats=refs.map(ref=>JSON.stringify(gearInstance(ref).stats));
  const offer=state.hallBattles.shopOffers[41];
  const snapshot=JSON.stringify({stats:migratedStats,offerStats:offer.stats,equipped:baseJobs.Verseborn.gear.weapon});
  const second=migrateHallBaseStatsV1();
  return first&&!second&&state.flags.hallBaseStatsV1
    &&refs.length===2&&refs.every(ref=>ref.startsWith('hall_'))
    &&refs.every(ref=>JSON.stringify(gearInstance(ref).affixes)===JSON.stringify(legacyAffixes))
    &&gearInstance(baseJobs.Verseborn.gear.weapon)?.name===hallName
    &&gearInstance(echoRef).stats.mag===999&&gearInstance(echoRef).affixes[0].key==='echo-kept'
    &&offer.name===HALL_ARTIFACT_GEAR[0].name&&offer.rarity==='Artifact'&&offer.price===5432
    &&offer.affixes[0].key==='shop-kept'&&state.hallBattles.purchasedShopStages.join(',')==='41'
    &&Object.values(offer.stats).reduce((sum,value)=>sum+value,0)<=78
    &&snapshot===JSON.stringify({stats:refs.map(ref=>JSON.stringify(gearInstance(ref).stats)),offerStats:offer.stats,equipped:baseJobs.Verseborn.gear.weapon});
})()`);

test('New Hall runs are marked migrated so generated rolls are never rerolled on load', `(() => {
  resetHallBattleRun();
  return state.flags.hallBaseStatsV1===true&&!migrateHallBaseStatsV1();
})()`);

test('Migrated base rolls and equipped instance references persist across later loads', `(() => {
  const key='qa-hall-base-stat-migration';
  resetHallBattleRun(); state.gameMode='hallBattles'; state.flags.hallBaseStatsV1=false; mode='walk';
  const name=HALL_EPIC_GEAR_POOL[0].name;
  const affixes=[{key:'persistent-affix',type:'statPct',stat:'mag',value:.12,text:'+12% MAG'}];
  state.ownedGear.push(name); state.gearCopies[name]=1; state.gearRarities[name]='Epic'; state.gearAffixes[name]=structuredClone(affixes);
  baseJobs.Verseborn.gear.weapon=name;
  saveGame(key);
  if(!loadGame(key)) return false;
  const ref=baseJobs.Verseborn.gear.weapon;
  const stats=JSON.stringify(gearInstance(ref)?.stats);
  baseJobs.Verseborn.gear.weapon=null;
  if(!loadGame(key)) return false;
  const stable=baseJobs.Verseborn.gear.weapon===ref
    &&JSON.stringify(gearInstance(ref)?.stats)===stats
    &&JSON.stringify(gearInstance(ref)?.affixes)===JSON.stringify(affixes)
    &&state.flags.hallBaseStatsV1===true;
  localStorage.removeItem(key);
  return stable;
})()`);

test('Shop comparison and Status totals use rolled stats without replacing affixes or Specials', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles'; state.party=['Verseborn','Mira'];
  const offer=ensureHallShopOffer(31);
  const stableOffer=JSON.stringify(offer);
  activeVendor='workshop'; selectedShopHero='Verseborn'; renderVendor();
  selectedShopHero='Mira'; renderVendor();
  const shop=el.menuBody.innerHTML;
  const ref=addOwnedGear(offer.name,1,{rarity:offer.rarity,separateCopy:true,affixes:offer.affixes,stats:offer.stats})[0];
  baseJobs.Mira.gear[gearByName(ref).slot]=ref;
  const status=statusGearOverviewHtml('Mira');
  return shop.includes('Compare for')&&shop.includes('data-shop-hero="Mira"')
    &&shop.includes('data-shop-hero="Verseborn"')&&!shop.includes('data-shop-hero="Seerin"')
    &&JSON.stringify(ensureHallShopOffer(31))===stableOffer
    &&shop.includes(statLine(offer.stats))
    &&status.includes('status-gear-totals')
    &&gearAffixSignature(gearAffixes(ref))===gearAffixSignature(offer.affixes)
    &&JSON.stringify(gearByName(ref).stats)===JSON.stringify(offer.stats);
})()`);

test('Affix hover details expose icon, real value and implementation-based descriptions', `(() => {
  const keen={label:'Keen',type:'critChance',value:.08};
  const venom={label:'Venom Seal',type:'statusOnHit',status:'poison',value:.12};
  const prolonging={label:'Prolonging',type:'buffDuration',value:1};
  const html=[keen,venom,prolonging].map(entry=>affixDetailHtml(entry)).join('');
  return html.includes('affix-icon')&&html.includes('Keen')&&html.includes('+8%')
    &&html.includes('Increases Crit chance by 8 percentage points.')
    &&html.includes('12% chance to inflict POISON on an eligible hit.')
    &&html.includes('Buffs you apply last 1 additional turn.');
})()`);

test('Existing slots, affix counts, equip restrictions and Artifact Specials remain in place', `(() => {
  const slots=['weapon','armour','ring','necklace','helmet'];
  return JSON.stringify(RARITY_AFFIX_COUNTS)===JSON.stringify({Common:0,Uncommon:1,Rare:2,Epic:3,Legendary:4,Mythic:5,Artifact:5})
    &&slots.every(slot=>gearDb[slot]?.length)
    &&typeof canEquip==='function'
    &&HALL_ARTIFACT_GEAR.every(gear=>gearEffects(gear).some(effect=>effect.artifactUnique));
})()`);

const distribution = run('globalThis.__hallDistribution');
const outliers = run('globalThis.__hallOutliers');
const samples = run(`Object.fromEntries(Object.keys(HALL_BASE_STAT_RULES).map(rarity=>[
  rarity,
  [1,2,3].map(index=>rollHallBaseStatProfile(rarity,hallSeededRandom('sample:'+rarity+':'+index)).stats)
]))`);
console.log(`Observed stat counts: ${JSON.stringify(distribution)}; outliers: ${outliers}/10000`);
console.log(`Sample rolls: ${JSON.stringify(samples)}`);
console.log(`PASS ${passed}/${passed} focused Ember Hall gear-generation checks`);
