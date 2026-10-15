const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let scaffold=fs.readFileSync(path.join(__dirname,'test_ember_rift.cjs'),'utf8').split('let passed=0;')[0];
scaffold=scaffold.replace("const {run,sandbox}=new Function('require','__dirname',prefix)(require,__dirname);",'return new Function(\'require\',\'__dirname\',prefix)(require,__dirname);');
const {run,sandbox}=new Function('require','__dirname',scaffold)(require,__dirname);
sandbox.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../public/game',url.split('?')[0]),'utf8'))});
sandbox.Image=class{constructor(){this.complete=true;this.width=1536;this.height=2304;}set src(v){this._src=v;if(this.onload)this.onload();}get src(){return this._src;}addEventListener(){}};
sandbox.TinusRecruitment={progress:()=>({recruited:true}),interact:()=>false};
run(fs.readFileSync(path.join(__dirname,'../public/game/tinus-character.js'),'utf8'));
run(fs.readFileSync(path.join(__dirname,'../public/game/tinus-whirlpool.js'),'utf8'));
let passed=0;function check(label,code){assert.ok(run(code),label);console.log('PASS '+label);passed++;}
(async()=>{await Promise.all([sandbox.TinusCharacter.ready,sandbox.TinusWhirlpool.ready]);run(`state.gameMode='hallBattles';state.map='emberHallBattles';state.party=['Verseborn','Mira','Torren','Glimmer','Kael','Sparky','Seerin'];TinusCharacter.recruit();state.party.forEach(id=>{progressFor(id).level=40;progressFor(id).talents=[];progressFor(id).rank0=null;});runCurrentTurn=()=>{};Math.random=()=>.5;
 function setupRing(owner){const ring=TinusWhirlpool.rings.find(g=>g.owner===owner);if(!gearCopyCount(ring.name))addOwnedGear(ring.name,1,{rarity:'Personal Artifact',stats:{},affixes:[],separateCopy:true,rollAffixes:false});baseJobs[owner].gear.ring2=echoGearInstanceRefs(ring.name)[0];const u=battleUnit(owner),ally=battleUnit(owner==='Kael'?'Tinus':'Kael'),e=prepareEnemyForBattle(enemy('Destiny Test',99999,1,'None','#555',1));u.mp=u.maxmp;ally.hp=1;mode='battle';state.resonance=20;battle={party:[u,ally],enemies:[e],round:1,turnIndex:0,turnQueue:[{side:'party',id:owner}],usedOnce:{},extraTurns:0,resolving:false,enemyResonance:80};return{ring,u,ally,e,sk:battleSkills(owner,u).find(s=>s.name===ring.ability)};}
 `);
for(const [owner,type]of [['Verseborn','magicVulnerability'],['Mira','shadowExposed'],['Torren','physicalVulnerability'],['Glimmer','disrupted'],['Sparky','burn'],['Seerin','holyVulnerability'],['Tinus','disrupted']])check(owner+' ring modifies a real native skill impact',`(()=>{const{u,e,sk}=setupRing('${owner}');useSkill(u,sk,e);__impact();return e.hp<e.max&&statusOf(e,'${type}');})()`);
check('Kael Quiet Rite actually heals and cleanses',`(()=>{const{u,ally,e,sk}=setupRing('Kael');applyStatus(ally,'poison',e,{force:true});useSkill(u,sk,ally);__impact();return ally.hp>1&&!statusOf(ally,'poison');})()`);
check('Glimmer drains enemy Resonance in addition to disruption',`(()=>{const{u,e,sk}=setupRing('Glimmer');useSkill(u,sk,e);__impact();return battle.enemyResonance<80;})()`);
check('Tinus base cost decreases by two without changing original skill',`(()=>{const{sk}=setupRing('Tinus');return sk.cost===6&&baseJobs.Tinus.skills.find(s=>s.name==='Form 17.2-B').cost===8;})()`);
check('Torren adds exactly one base Break buildup',`(()=>{const{ring,sk}=setupRing('Torren');const ref=baseJobs.Torren.gear.ring2;baseJobs.Torren.gear.ring2=null;const original=battleSkills('Torren').find(s=>s.name===ring.ability);baseJobs.Torren.gear.ring2=ref;return sk.staggerPower===original.staggerPower+1;})()`);
check('Shadow opponents do not inherit the player Destiny Ring effect',`(()=>{const{ring}=setupRing('Mira');battle.turnQueue=[{side:'enemy',index:0}];return !battleSkills('Mira').find(s=>s.name===ring.ability).destinyRing;})()`);
check('Unequipping removes augmentation and preserves all original skill data',`(()=>{const{ring}=setupRing('Sparky');baseJobs.Sparky.gear.ring2=null;const sk=battleSkills('Sparky').find(s=>s.name===ring.ability);return !sk.destinyRing&&!baseJobs.Sparky.skills.find(s=>s.name===ring.ability).extraStatuses;})()`);
check('Actual equipment assignment rejects wrong owner and wrong ring slot',`(()=>{mode='walk';const{ring}=setupRing('Tinus');mode='menu';const ref=echoGearInstanceRefs(ring.name)[0];baseJobs.Tinus.gear.ring2=null;return !assignGearRef('Mira','ring2',ref)&&!assignGearRef('Tinus','ring',ref)&&assignGearRef('Tinus','ring2',ref);})()`);
check('Auto equip retains the unique ability ring',`(()=>{mode='menu';setupRing('Tinus');mode='menu';autoEquipHero('Tinus');return gearByName(baseJobs.Tinus.gear.ring2)?.owner==='Tinus';})()`);
check('Old saves without the new slot normalize to empty ring2',`slotsFrom(['a','b','c','d','e']).ring2===null&&Object.values(STARTING_HERO_GEAR).every(g=>'ring2'in g)`);
check('Progress sanitizer rejects duplicate and invalid encounters',`normalizeHallBattleProgress({whirlpool:{cleared:[1,1,3,-1,9,'2']}}).whirlpool.cleared.join(',')==='1,3'`);
run('Math.random=globalThis.__testRandom || (()=> {globalThis.__testSeed=(globalThis.__testSeed||1)*16807%2147483647;return globalThis.__testSeed/2147483647;});');
check('Only new rings reject random affixes; ordinary rings still roll',`rollGearAffixes(TinusWhirlpool.rings[0],'Personal Artifact','dragon',5).length===0&&rollGearAffixes(TinusWhirlpool.curios[4],'Shadow Artifact','dragon',5).length===5`);
check('The new weapon retains a native Basic Attack effect',`weaponBasicAttackEffect(TinusWhirlpool.curios[0]).status==='magicVulnerability'`);
console.log('PASS '+passed+' native Whirlpool combat/equipment checks');
})().catch(e=>{console.error(e);process.exitCode=1;});


