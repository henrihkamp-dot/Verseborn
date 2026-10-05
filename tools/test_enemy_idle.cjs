const fs = require('node:fs');
const assert = require('node:assert/strict');
const prefix = fs.readFileSync(__dirname + '/test_combat.cjs', 'utf8').split("run('runQaChecks()');")[0]
  .replace('sandbox.window = sandbox;', 'sandbox.fetch=async()=>({ok:false});sandbox.window = sandbox;');
const { run } = new Function('require', '__dirname', prefix + ';return {run};')(require, __dirname);
assert.ok(run(`(()=>{
  const name=Object.keys(enemyAnimationFiles)[0],key=enemyAnimationFiles[name];
  enemyAnimationSheets[key]={image:{},columns:5,cellWidth:100,cellHeight:100,referenceHeight:100,baseline:100,rowMap:{idle:0,melee:1,death:2}};
  const original=ctx.drawImage;let column;
  ctx.drawImage=(...args)=>{column=args[1]/100;};
  const e={name,hp:100,anim:'idle'};
  tick=36-key.length*3;drawAnimatedEnemy(e,80,80);const first=column;
  tick+=35;drawAnimatedEnemy(e,80,80);const held=column;
  tick++;drawAnimatedEnemy(e,80,80);const next=column;
  e.anim='attack';e.attackStyle='melee';e.animTick=10;drawAnimatedEnemy(e,80,80);const attack=column;
  e.hp=0;e.deathTick=tick-10;drawAnimatedEnemy(e,80,80);const death=column;
  ctx.drawImage=original;
  return first===1&&held===1&&next===2&&attack===2&&death===2;
})()`));
console.log('PASS enemy idle holds 36 ticks; attack/death timing unchanged');
