const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
const file='public/game/hall-progression-dialogue.js',source=fs.readFileSync(file,'utf8'),before=cp.execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'});
function read(s){const c={window:{},hallBattleProgress:()=>({clearedStages:Array.from({length:60},(_,i)=>i+1)})};vm.runInNewContext(s,c);return c.window.HallProgressionDialogue;}
const old=read(before),current=read(source);
for(const key of ['brothers','brotherAmbient'])assert.equal(JSON.stringify(current[key]),JSON.stringify(old[key]),'Ember Rift dialogue changed');
for(const group of ['greetings','ambient','visits'])for(const [id,pool]of Object.entries(current[group])){assert.equal(pool.length,5,group+':'+id);assert.equal(new Set(pool.map(c=>JSON.stringify(c))).size,5);const references=pool.filter(c=>c.some(([,line])=>/Verseborn|our leader|your sixty|your cloak|my warm seat|least practised element/i.test(line)));assert.ok(references.length<=2,group+':'+id+' focuses on Verseborn too often');for(const convo of pool){assert.ok(convo.length>=3&&convo.length<=4);for(const [speaker,line]of convo){assert.ok(speaker&&line);assert.ok(line.length<180);}}}
console.log('PASS five distinct conversations per set; Verseborn focus limit; Ember Rift dialogue unchanged');
