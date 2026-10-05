const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../public/game');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(8807,'127.0.0.1',r));let browser;try{
browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8807/');await page.waitForFunction('runtimeAssetsReady',{},{timeout:120000});
await page.evaluate(`startTitleGame(false);state.gameMode='hallBattles';mode='walk';toggleMenu();menuTab='lore';renderMenu();`);
await page.locator('[data-lexicon-stage]').selectOption('60');assert.ok(await page.locator('.hall-archive').innerText().then(t=>t.includes('Ilyss')));
await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/archive-lore.png')});
await page.evaluate(`menuTab='world';renderMenu();`);assert.ok(await page.locator('.archive-legend-item').count()>30);
await page.screenshot({path:path.resolve(__dirname,'../.sites-artifacts/archive-world.png')});
assert.deepEqual(errors,[]);console.log('PASS Lore stage selection and World icon legend in browser');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
