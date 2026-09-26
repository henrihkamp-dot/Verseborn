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

test('New Hall run selects exactly two companions beside fixed Verseborn at level 1', `(() => {
  resetHallBattleRun();
  const rejected=confirmHallStartingParty(['Mira']);
  const accepted=confirmHallStartingParty(['Mira','Seerin']);
  return !rejected&&accepted&&state.party.join(',')==='Verseborn,Mira,Seerin'&&state.activeParty.join(',')==='Verseborn,Mira,Seerin'&&state.party.every(id=>progressFor(id).level===1)&&hallBattleProgress().startingCompanions.join(',')==='Mira,Seerin';
})()`);

test('Three short welcome scenes run in order and then immediately initialize Stage 1', `(() => {
  resetHallBattleRun();
  confirmHallStartingParty(['Mira','Seerin']);
  const ids=[activeRecruitScene?.id];
  skipTalk(); ids.push(activeRecruitScene?.id);
  skipTalk(); ids.push(activeRecruitScene?.id);
  skipTalk();
  return ids.join('|')==='ember-hall-start-verseborn|ember-hall-start-Mira|ember-hall-start-Seerin'&&mode==='battle'&&battle?.hallStage===1;
})()`);

test('Remaining recruits trigger only at Stages 7, 14, 21 and 28 without offering starters again', `(() => {
  resetHallBattleRun();
  state.party=['Verseborn','Mira','Seerin']; state.activeParty=[...state.party];
  state.hallBattles={unlockedStage:1,clearedStages:[],recruitStages:[],pendingRecruit:0,startingCompanions:['Mira','Seerin'],shopStage:0,shopOffers:{},purchasedShopStages:[]};
  const triggered=[];
  for(let stage=1;stage<=28;stage++){
    recordHallBattleClear(stage);
    if(hallBattleProgress().pendingRecruit){
      triggered.push(stage);
      const next=hallRecruitCandidates()[0];
      addParty(next);
      hallBattleProgress().recruitStages.push(stage);
      hallBattleProgress().pendingRecruit=0;
    }
  }
  return triggered.join(',')==='7,14,21,28'&&!hallRecruitCandidates().includes('Mira')&&!hallRecruitCandidates().includes('Seerin')&&state.party.length===7;
})()`);

test('Hall rarity bands and the tunable +1 roll never skip a tier', `(() => {
  const random=Math.random;
  try {
    Math.random=()=>.99;
    const normal=[rollHallGearRarity(1),rollHallGearRarity(9),rollHallGearRarity(10),rollHallGearRarity(19),rollHallGearRarity(20),rollHallGearRarity(39),rollHallGearRarity(40),rollHallGearRarity(50)];
    Math.random=()=>0;
    const upgraded=[rollHallGearRarity(1),rollHallGearRarity(10),rollHallGearRarity(20),rollHallGearRarity(40)];
    return HALL_RARITY_UPGRADE_CHANCE>0&&HALL_RARITY_UPGRADE_CHANCE<=.1&&normal.join(',')==='Rare,Rare,Epic,Epic,Legendary,Legendary,Mythic,Mythic'&&upgraded.join(',')==='Epic,Legendary,Mythic,Mythic';
  } finally { Math.random=random; }
})()`);

test('Every Hall reward pool matches its naming tier and excludes Echo gear', `(() => {
  const pools=[['Rare',HALL_RARE_GEAR_POOL],['Epic',HALL_EPIC_GEAR_POOL],['Legendary',HALL_LEGENDARY_GEAR_POOL],['Mythic',MYTHIC_GEAR]];
  return pools.every(([rarity,pool])=>pool.length>=5&&pool.every(gear=>gearByName(gear.name)&&!echoForgeGearNames.has(gear.name)&&!/^Echo(?:-|\\s)/i.test(gear.name)))&&HALL_RARE_GEAR_POOL.some(gear=>gear.name==='Ironwood Staff')&&HALL_LEGENDARY_GEAR_POOL.some(gear=>gear.name==='Oathblade of the First Flame');
})()`);

test('Glimmer shows exactly one stable exact-rarity Hall offer and advances it per started stage', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles';
  const random=Math.random; Math.random=()=>.2;
  try {
    const first=ensureHallShopOffer(5); const reopened=vendorWares('workshop'); const same=ensureHallShopOffer(5); const next=ensureHallShopOffer(14); const nextWares=vendorWares('workshop');
    return reopened.length===1&&reopened[0].name===first.name&&same.name===first.name&&first.rarity==='Rare'&&nextWares.length===1&&nextWares[0].name===next.name&&next.rarity==='Epic'&&next.name!==first.name;
  } finally { Math.random=random; }
})()`);

test('Hall shop offers exclude starter and Echo gear and early Rare pricing is useful', `(() => {
  resetHallBattleRun(); state.gameMode='hallBattles';
  const starting=new Set(Object.values(STARTING_HERO_GEAR).flatMap(slots=>Object.values(slots)));
  return [1,9,10,19,20,39,40,50].every(stage=>{const offer=ensureHallShopOffer(stage);return offer&&!starting.has(offer.name)&&!echoForgeGearNames.has(offer.name)&&!/^Echo(?:-|\\s)/i.test(offer.name)&&offer.rarity===hallNormalGearRarity(stage);})&&hallShopPrice(1,'Rare')>180&&hallShopPrice(1,'Rare')<=220&&hallShopPrice(40,'Mythic')>hallShopPrice(20,'Legendary');
})()`);

test('Story workshop and Echo Hunt inventory remain on their existing route', `(() => {
  resetHallBattleRun(); state.gameMode='story'; state.echoForgeRank=2;
  const wares=vendorWares('workshop');
  return wares.length>1&&wares.some(ware=>ware.kind==='gear'&&echoForgeGearNames.has(ware.name));
})()`);

console.log(`PASS ${passed}/${passed} focused Ember Hall progression checks`);
