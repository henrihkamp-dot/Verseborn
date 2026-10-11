const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8743/');await page.waitForFunction(()=>runtimeAssetsReady&&emberHallWorld.ready);
 const heroes=await page.evaluate(()=>Object.keys(baseJobs));
 for(const id of heroes){
  const names=await page.evaluate(id=>{
   state.gameMode='hallBattles';state.map='emberHallBattles';state.party=Object.keys(baseJobs);
   state.heroProgress[id]={level:40,xp:0,talents:[],rank0:rank0Choices[id][0].name};
   activeRecruitScene=null;mode='walk';menuTab='skills';selectedSkillHero=id;toggleMenu();
   return [1,2,3,4,5].flatMap(tier=>talentTrees[id].filter(e=>e.tier===tier).slice(0,tier===5?1:2).map(e=>e.name));
  },id);
  for(const name of names){
   const button=page.locator('[data-talent]').filter({hasText:name}).first();
   assert.ok(await button.isEnabled(),id+': '+name+' unexpectedly disabled');
   await button.click({timeout:5000});
   assert.ok(await page.evaluate(({id,name})=>progressFor(id).talents.includes(name),{id,name}),id+': click did not choose '+name);
  }
  const older=await page.evaluate(id=>talentTrees[id].find(e=>e.tier===1&&!progressFor(id).talents.includes(e.name)).name,id);
  await page.locator('[data-talent]').filter({hasText:older}).first().click({timeout:5000});
  assert.equal(await page.evaluate(id=>progressFor(id).talents.length,id),10);
  console.log('PASS actual UI clicks: '+id+' tiers 1-5 and older tier');
 }
 for(const id of ['Glimmer','Sparky']){
  const rankChoices=await page.evaluate(id=>rank0Choices[id].map(e=>e.name),id);
  for(const rank0 of rankChoices){
   await page.evaluate(({id,rank0})=>{state.heroProgress[id]={level:4,xp:0,talents:[],rank0};mode='walk';menuTab='skills';selectedSkillHero=id;toggleMenu();},{id,rank0});
   const tree=await page.evaluate(id=>talentTrees[id].map(e=>({name:e.name,tier:e.tier})),id);
   const chosen=[];
   for(const level of [4,8,12,16,20,24,28,32,36,40]){
    await page.evaluate(({id,level})=>{progressFor(id).level=level;renderMenu();},{id,level});
    const entry=tree.find(e=>!chosen.includes(e.name)&&e.tier<=Math.floor(chosen.length/2)+1&&(e.tier!==5||!chosen.some(n=>tree.find(t=>t.name===n).tier===5)));
    const button=page.locator('[data-talent]').filter({hasText:entry.name}).first();
    assert.ok(await button.isEnabled(),id+' '+rank0+' level '+level+' '+entry.name);
    await button.click();chosen.push(entry.name);
    assert.equal(await page.evaluate(id=>progressFor(id).talents.length,id),chosen.length);
   }
   console.log('PASS '+id+' Rank 0 '+rank0+': level-by-level UI progression');
  }
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
