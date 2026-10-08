const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

// Reuse only the existing isolated combat harness, never its regression assertions.
const harness = fs.readFileSync(path.join(__dirname, 'test_combat.cjs'), 'utf8');
const marker = "run('runQaChecks()');";
assert.ok(harness.includes(marker));
const setup = harness.split(marker)[0].replace('sandbox.window = sandbox;', 'sandbox.fetch = async () => ({ok:false}); sandbox.window = sandbox;');
const { run, sandbox, timers } = new Function('require', '__dirname', setup + '\nreturn {run,sandbox,timers};')(require, __dirname);
const root = path.join(__dirname, '../public/game/assets/effects/characters');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
sandbox.vfxManifest = manifest;
run(`
  Object.entries(vfxManifest).forEach(([id,config])=>characterVfxSheets[id]={...config,image:{}});
  state.activeParty=['Mira','Kael','Verseborn'];
  battle={party:state.activeParty.map(battleUnit),enemies:[enemy('A',9999,1,'Earth','#555',1),enemy('B',9999,1,'Fire','#555',1),enemy('C',9999,1,'Ice','#555',1)],usedOnce:{},turnQueue:[],turnIndex:0,round:1,extraTurns:0};
  mode='battle';
`);
let passed = 0;
function check(name, code) { assert.ok(run(code),name); passed++; console.log('PASS',name); }
check('Nine base/form mappings are available', 'Object.keys(characterVfxSheets).length===9');
check('Clean rows have four frames; connected rows retain one intact image', 'Object.values(characterVfxSheets).every(s=>s.frames===4&&s.rects.length===3&&s.rects.every((r,i)=>r.length===(s.modes[i]==="connected"?1:4)))');
check('Projectile starts at caster and ends at selected diagonal target', `(()=>{const u=battle.party[0], sk=baseJobs.Mira.skills[1], target=battle.enemies[2], fx=makeBattleEffect(u,sk,target), a=characterVfxSample(fx,target,0), b=characterVfxSample(fx,target,400), c=characterVfxSample(fx,target,fx.timing.impactMs);return fx.targets[0]===target&&a.x===a.from.x&&a.y===a.from.y&&b.x>a.x&&b.y>a.y&&c.x===c.to.x&&c.y===c.to.y&&a.frame===0&&b.frame===2&&c.frame===3})()`);
check('Connected artwork passes through buildup, travel and impact without cropping', `(()=>{const u=battle.party[2],target=battle.enemies[1],fx=makeBattleEffect(u,{name:'Connected',anim:'ultimate',power:10},target);return [0,400,fx.timing.impactMs].map(t=>characterVfxSample(fx,target,t).phase).join(',')==='begin,travel,impact'&&characterVfxSheets.Verseborn.rects[2].length===1})()`);
check('Heals travel diagonally to the healed ally and finish at impact', `(()=>{const u=battle.party[1],target=battle.party[0],fx=makeBattleEffect(u,{...baseJobs.Kael.skills[1],targetSide:'self'},u);fx.targets=[target];const a=characterVfxSample(fx,target,0),b=characterVfxSample(fx,target,400),c=characterVfxSample(fx,target,fx.timing.impactMs);return a.x===a.from.x&&b.progress>0&&b.progress<1&&c.x===c.to.x&&c.y===c.to.y&&c.phase==='impact'})()`);
check('Moving a formation anchor updates the trajectory', `(()=>{const u=battle.party[0], target=battle.enemies[0], fx=makeBattleEffect(u,baseJobs.Mira.skills[1],target), first=characterVfxSample(fx,target,640);battle.enemies.reverse();const last=characterVfxSample(fx,target,640);battle.enemies.reverse();return first.to.y!==last.to.y})()`);
check('Group offense fans to every living enemy', `(()=>{const u=battle.party[2],fx=makeBattleEffect(u,baseJobs.Verseborn.skills.find(s=>s.anim==='ultimate'),battle.enemies[0]);return fx.vfxRow==='ultimate'&&fx.targets.length===3})()`);
check('Heal uses same weakest-ally rule as existing combat', `(()=>{battle.party[0].hp=1;const u=battle.party[1],fx=makeBattleEffect(u,baseJobs.Kael.skills[1],u);return fx.vfxRow==='heal'&&fx.targets[0]===battle.party[0]&&fx.timing.impactMs>=780})()`);
check('Party heal fans to all living allies', `(()=>{const u=battle.party[2],fx=makeBattleEffect(u,{...baseJobs.Verseborn.skills[2],partyWide:true},u);return fx.targets.length===3&&fx.targets.every(t=>battle.party.includes(t))})()`);
check('Self heal stays on the caster', `(()=>{const u=battle.party[1],fx=makeBattleEffect(u,{...baseJobs.Kael.skills[1],targetSide:'self'},u);return fx.targets.length===1&&fx.targets[0]===u})()`);
check('Revival visuals include fallen allies without changing their HP', `(()=>{const u=battle.party[1],ally=battle.party[0],before=ally.hp;ally.hp=0;const fx=makeBattleEffect(u,{...baseJobs.Kael.skills[1],revive:.35,partyWide:true},u);const ok=fx.targets.includes(ally)&&ally.hp===0;ally.hp=before;return ok})()`);
for (const [id,form] of [['Kael','shadowpriest'],['Glimmer','mech']]) {
  check(`${id} transformation keeps its original animation/effect`, `(()=>{const u={...battle.party[1],id:'${id}'},sk=baseJobs['${id}'].skills.find(s=>s.transform);const fx=makeBattleEffect(u,sk,u);return !fx.characterVfx&&fx.kind==='ultimate'&&battleAnimationName(sk,u)==='ultimate'})()`);
  check(`${id} transformed attacks use the matching sheet`, `(()=>{const u={...battle.party[1],id:'${id}',form:'${form}'},fx=makeBattleEffect(u,TRANSFORMED_SKILLS['${form}'][1],battle.enemies[0]);return fx.characterVfx==='${id==='Kael'?'KaelShadow':'GlimmerMech'}'})()`);
  check(`${id} transformed ultimate uses the matching sheet`, `(()=>{const u={...battle.party[1],id:'${id}',form:'${form}'},fx=makeBattleEffect(u,TRANSFORMED_SKILLS['${form}'].find(s=>s.anim==='ultimate'),battle.enemies[0]);return fx.characterVfx==='${id==='Kael'?'KaelShadow':'GlimmerMech'}'&&fx.vfxRow==='ultimate'})()`);
}
check('Support-only Vampiric uses friendly VFX, never offensive VFX', `characterVfxRow({id:'Sparky'},baseJobs.Sparky.skills.find(s=>s.name==='Emberblood'))==='heal'`);
check('Every active non-transformation skill has VFX', `Object.entries(baseJobs).every(([id,job])=>job.skills.every(sk=>sk.basicAttack||sk.transform||characterVfxRow({id},sk)!==null))`);
check('Mira Silent Step and Cut the Tongue use her projectile sheet', `['Silent Step','Cut the Tongue'].every(name=>{const fx=makeBattleEffect(battle.party[0],baseJobs.Mira.skills.find(s=>s.name===name),battle.enemies[0]);return fx.characterVfx==='Mira'&&fx.vfxRow==='projectile'})`);
check('Ultimate arrives faster with unchanged impact linger', `(()=>{const u=battle.party[0],sk=baseJobs.Mira.skills.find(s=>s.anim==='ultimate'),old=battleActionTiming(sk.anim),now=skillVisualTiming(u,sk);return now.impactMs<old.impactMs&&now.totalMs-now.impactMs===old.totalMs-old.impactMs})()`);
check('Basic melee remains unchanged', `characterVfxRow(battle.party[0],baseJobs.Mira.skills[0])===null`);
check('Sheet-unavailable fallback remains usable', `(()=>{const old=characterVfxSheets.Mira;delete characterVfxSheets.Mira;const fx=makeBattleEffect(battle.party[0],baseJobs.Mira.skills[1],battle.enemies[0]);characterVfxSheets.Mira=old;return !fx.characterVfx&&fx.kind==='magic'})()`);
check('Rendering causes no HP or MP changes', `(()=>{const before=JSON.stringify([...battle.party,...battle.enemies].map(u=>[u.hp,u.mp]));Object.keys(characterVfxSheets).forEach(id=>{const u={...battle.party[0],id:id==='KaelShadow'?'Kael':id==='GlimmerMech'?'Glimmer':id,form:id==='KaelShadow'?'shadowpriest':id==='GlimmerMech'?'mech':null};for(const anim of ['magic','ultimate']){const fx=makeBattleEffect(u,{name:'VFX test',anim,power:10,element:'Sound'},battle.enemies[0]);if(fx.characterVfx)drawCharacterVfx(fx)}});return before===JSON.stringify([...battle.party,...battle.enemies].map(u=>[u.hp,u.mp]))})()`);
timers.length=0;
const hpBefore = run('battle.enemies[2].hp');
run(`battle.resolving=false;state.resonance=100;renderBattle=()=>{};updatePanels=()=>{};battle.party[0].mp=100;useSkill(battle.party[0],baseJobs.Mira.skills[1],battle.enemies[2]);`);
assert.equal(run('battle.enemies[2].hp'),hpBefore,'damage must wait until impact');
timers.at(-1)();
assert.ok(run('battle.enemies[2].hp')<hpBefore,'impact still resolves damage');
passed++;
console.log('PASS Damage resolves only at the impact callback');

(async()=>{
  for(const [id,entry] of Object.entries(manifest)) {
    const {data,info}=await sharp(path.join(root,entry.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,entry.width);
    assert.equal(info.height,entry.height);
    for(const [row,rects] of entry.rects.entries()) for(const [col,r] of rects.entries()) {
      assert.ok(r.x>=0&&r.x+r.w<=info.width);
      if(entry.modes[row]==='frames')assert.ok(r.x>=col*entry.cellWidth&&r.x+r.w<=(col+1)*entry.cellWidth);
      else assert.ok(r.anchorX>0&&r.anchorX<1&&r.anchorY>0&&r.anchorY<1);
      assert.ok(r.y>=row*entry.cellHeight&&r.y+r.h<=(row+1)*entry.cellHeight);
      let visible=0;
      for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(data[(y*info.width+x)*4+3]>0)visible++;
      assert.ok(visible>100,`${id} ${row}/${col} is not empty`);
      assert.equal(data[((row*entry.cellHeight)*info.width+col*entry.cellWidth)*4+3],0,'grid padding is transparent');
    }
  }
  console.log(`PASS 81 nonempty transparent frames in isolated atlas cells`);
  console.log(`${passed+1} focused VFX checks passed; full regression not run.`);
})().catch(error=>{console.error(error);process.exitCode=1});
