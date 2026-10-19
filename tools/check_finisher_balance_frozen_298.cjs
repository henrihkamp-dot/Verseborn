const fs=require('fs'),cp=require('child_process'),assert=require('assert/strict');
const current=fs.readFileSync('public/game/game.js','utf8').replace(/\r\n/g,'\n'),before=cp.execFileSync('git',['show','HEAD:public/game/game.js'],{encoding:'utf8'}).replace(/\r\n/g,'\n');
function block(text,name){const start=text.indexOf('function '+name+'(');assert.ok(start>=0,name);const next=text.indexOf('\nfunction ',start+1);return text.slice(start,next<0?undefined:next);}
for(const name of ['enemyDamageRoll','defendReduction','useDefend','totals','healingAmount','developerScale','enemyBalanceValue','enemyActionMpCost'])assert.equal(block(current,name),block(before,name),name+' balance changed');
assert.equal(current.match(/const ENEMY_DIRECT_DAMAGE_MULTIPLIER = [^;]+;/)[0],before.match(/const ENEMY_DIRECT_DAMAGE_MULTIPLIER = [^;]+;/)[0]);
console.log('PASS unchanged direct-damage formula and 1.45 multiplier, Guard reduction/recovery, totals, healing and costs');
