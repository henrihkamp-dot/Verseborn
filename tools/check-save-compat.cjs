const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const directory='C:/Users/Henri/Downloads';
 const files=fs.readdirSync(directory).filter(name=>/^verseborn-ember-hall-slot.*\.json$/.test(name));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const name of files){
  const file=path.join(directory,name),original=fs.readFileSync(file,'utf8'),data=JSON.parse(original);
  const page=await browser.newPage();
  await page.goto(process.env.HALL_TEST_URL||'http://127.0.0.1:8744/');await page.waitForFunction(()=>runtimeAssetsReady&&emberHallWorld.ready);
  const result=await page.evaluate(raw=>{
   const key=hallSaveKey(1);localStorage.setItem(key,raw);const loaded=loadGame(key);
   const snapshot=()=>({party:[...state.party],gold:state.gold,progress:JSON.parse(JSON.stringify(state.heroProgress)),gear:Object.fromEntries(Object.entries(baseJobs).map(([id,h])=>[id,{...h.gear}])),hall:JSON.parse(JSON.stringify(state.hallBattles))});
   const before=snapshot();mode='walk';saveGame(key);const reloaded=loadGame(key);const after=snapshot();
   return {loaded,reloaded,before,after};
  },original);
  assert.ok(result.loaded&&result.reloaded,name);assert.deepEqual(result.before.party,data.state.party,name);assert.equal(result.before.gold,data.state.gold,name);
  assert.deepEqual(result.after,result.before,'Round-trip changed progress, talents or gear: '+name);
  assert.equal(fs.readFileSync(file,'utf8'),original,'Source save file was modified');
  await page.close();console.log('PASS '+name);
 }
 }finally{await browser.close();}
 console.log('PASS '+files.length+' original saves loaded and round-tripped; source files untouched.');
})().catch(error=>{console.error(error);process.exitCode=1;});
