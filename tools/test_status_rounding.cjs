const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prefix=fs.readFileSync(path.join(__dirname,'test_combat.cjs'),'utf8').split("run('runQaChecks()');")[0].replace('sandbox.window = sandbox;','sandbox.fetch=async()=>({ok:false}); sandbox.window=sandbox;');
const {run}=new Function('require','__dirname',prefix+'\nreturn {run};')(require,__dirname);
assert.ok(run(`(()=>{
 const target={name:'Target',hp:100,statuses:[]};
 applyStatus(target,'magicUp',target,{duration:5.990209,value:.2,force:true});
 if(statusOf(target,'magicUp').remaining!==6)return false;
 applyStatus(target,'burn',target,{duration:2.4,value:10,force:true});
 if(statusOf(target,'burn').remaining!==2)return false;
 target.statuses.push({type:'evasion',remaining:3.8,initialRemaining:3.8,incomingCharges:2.7});
 const evasion=statusOf(target,'evasion');
 return evasion.remaining===4&&evasion.initialRemaining===4&&evasion.incomingCharges===3&&statusDurationFor(target,'sleep',4.6)===5;
})()`));
console.log('PASS New effects and existing fractional durations use whole actions');
