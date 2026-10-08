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

test('Stages 1-9 remain single-phase while only some Stages 10-20 gain a second phase', `(() => {
  const early=HALL_BATTLE_BLUEPRINTS.slice(0,9);
  const middle=HALL_BATTLE_BLUEPRINTS.slice(9,20);
  const multi=middle.filter(info=>info.waves.length===1).length;
  return early.every(info=>info.waves.length===0)&&multi>=4&&multi<middle.length&&middle.every(info=>info.waves.length<=1);
})()`);

test('Stages 21-40 use frequent two-phase fights and include three-enemy waves', `(() => {
  const bracket=HALL_BATTLE_BLUEPRINTS.slice(20,40);
  const multi=bracket.filter(info=>info.waves.length===1);
  const triples=bracket.flatMap(info=>[info.enemies,...info.waves]).filter(wave=>wave.length===3);
  return multi.length>=12&&triples.length>=10;
})()`);

test('Stages 41-49 keep three phases with at least one mixed three-enemy phase', `(() => {
  return HALL_BATTLE_BLUEPRINTS.slice(40,49).every(info=>{
    const phases=[info.enemies,...info.waves];
    return phases.length===3&&phases.some(wave=>wave.length===3)&&phases.some(wave=>wave.length===2);
  });
})()`);

test('Stage 50 keeps the established Frostmile to Leviathan to Solinar finale', `(() => {
  const info=hallBattleInfo(50);
  return JSON.stringify([info.enemies,...info.waves])===JSON.stringify([['frostmile'],['leviathan'],['solinar'],['solinarEnraged']]);
})()`);

test('Cleanse removes exactly one valid debuff and cannot remove Broken or structural effects', `(() => {
  const unit={statuses:[
    {type:'silence',remaining:2},{type:'poison',remaining:4},{type:'broken',remaining:1},
    {type:'resonanceLocked',remaining:2},{type:'overheated',remaining:2}
  ]};
  const removed=cleanseStatuses(unit);
  return removed===1&&!statusOf(unit,'silence')&&statusOf(unit,'poison')&&statusOf(unit,'broken')&&statusOf(unit,'resonanceLocked')&&statusOf(unit,'overheated');
})()`);

test('Kael has a single-target Cleanse and Seerin has a single-target Dispel', `(() => {
  const purify=talentTrees.Kael.find(entry=>entry.name==='Purification')?.value;
  const purge=baseJobs.Seerin.skills.find(entry=>entry.dispel);
  return purify?.cleanse===true&&purify.targetSide==='ally'&&!purify.partyWide&&purge?.targetSide==='enemy'&&skillTargetsEnemies(purge);
})()`);

test('Dispel removes one meaningful buff but not form-related structural statuses', `(() => {
  const unit={statuses:[
    {type:'damageUp',remaining:3},{type:'barrier',remaining:2},{type:'mechGuard',remaining:2},{type:'combatDrone',remaining:99}
  ]};
  const removed=dispelStatus(unit);
  return removed==='BARRIER'&&statusOf(unit,'damageUp')&&statusOf(unit,'mechGuard')&&statusOf(unit,'combatDrone');
})()`);

test('Only the selected four utility enemies gain Dispel and never waste it without a buff', `(() => {
  const expected=['High Administrator Thaddeus','Jory Bellwick','King Maeric','Nyx Vael'];
  const actual=Object.entries(enemyAbilityProfiles).filter(([,profile])=>profile.moves?.dispel).map(([name])=>name).sort();
  const enemy={name:'Nyx Vael',hp:100,max:100,mp:100,statuses:[],stats:{str:1,mag:1,stam:1,agi:1}};
  const hero={name:'Hero',hp:100,max:100,statuses:[]};
  battle={enemies:[enemy],party:[hero],defeated:[],enemyResonance:0};
  const noBuff=enemyActionUseful(enemy,enemyActionForKind(enemy,'dispel'));
  hero.statuses=[{type:'defenseUp',remaining:3}];
  const action=enemyActionForKind(enemy,'dispel');
  const useful=enemyActionUseful(enemy,action);
  return actual.join('|')===expected.sort().join('|')&&!noBuff&&useful&&action.target===hero;
})()`);

test('Hall shop offers roll the exact rarity affix counts once and persist them', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles';
  const stages=[[5,'Rare',1],[14,'Epic',2],[25,'Legendary',3],[41,'Artifact',5]];
  const first=stages.map(([stage,rarity,count])=>{const offer=ensureHallShopOffer(stage);return [offer,gearAffixSignature(offer.affixes),rarity,count];});
  const stable=first.every(([offer,signature,rarity,count])=>offer.rarity===rarity&&offer.affixes.length===count&&gearAffixSignature(ensureHallShopOffer(offer.hallStage).affixes)===signature);
  const mythic={name:MYTHIC_GEAR[0].name,rarity:'Mythic',price:1};
  ensureHallShopOfferAffixes(mythic,MYTHIC_GEAR[0],41);
  return stable&&mythic.affixes.length===4;
})()`);

test('Existing shop offers missing affixes migrate once without changing their identity or purchase state', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles';
  const gear=hallShopGearPool('Epic',14)[0];
  state.hallBattles.shopOffers[14]={name:gear.name,rarity:'Epic',price:777};
  state.hallBattles.purchasedShopStages=[14];
  const migrated=ensureHallShopOffer(14);
  const signature=gearAffixSignature(migrated.affixes);
  const reopened=ensureHallShopOffer(14);
  return migrated.name===gear.name&&migrated.price===777&&migrated.affixes.length===2&&gearAffixSignature(reopened.affixes)===signature&&hallBattleProgress().purchasedShopStages.join(',')==='14';
})()`);

test('A purchased Hall offer receives the exact persisted offer affixes', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles'; state.gold=99999; state.hallBattles.unlockedStage=5; activeVendor='workshop';
  const ware=vendorWares('workshop')[4];
  const signature=gearAffixSignature(ware.affixes);
  buyWare(4);
  const instance=echoGearInstanceRefs(ware.name).map(ref=>gearInstance(ref)).at(-1);
  return instance&&gearAffixSignature(instance.affixes)===signature&&hallBattleProgress().purchasedShopStages.includes(5);
})()`);

test('Glimmer offer metadata and Status equipment rows expose the requested live information', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles'; state.hallBattles.unlockedStage=14; activeVendor='workshop';
  renderVendor();
  const shop=el.menuBody.innerHTML;
  const ref=baseJobs.Verseborn.gear.weapon;
  state.gearAffixes[gearBaseName(ref)]=rollGearAffixes(gearByName(ref),'Rare','dragon',1);
  const status=statusEquipmentHtml('Verseborn');
  const rows=(status.match(/status-gear-row/g)||[]).length;
  return shop.includes('UNLOCKED STAGE 14')&&shop.includes('Base stats:')&&shop.includes('Affixes:')&&shop.includes('EPIC')&&!/Stage 14/i.test(ensureHallShopOffer(14).name)&&rows===5&&status.includes('Base stats:')&&status.includes('Special:')&&status.includes('Affix:');
})()`);

console.log(`PASS ${passed}/${passed} focused encounter, utility, shop and status checks`);
