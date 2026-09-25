const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');
const port = Number(process.argv[2] || 4186);
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.mp3':'audio/mpeg', '.ogg':'audio/ogg' };
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost');
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  if (url.searchParams.has('statusPreview') && path.extname(file)==='.html') {
    const fixture=`<script>if(battle){battle.party[0].statuses=[{type:'evasion',value:.35,remaining:2},{type:'barrier',value:.42,remaining:4},{type:'vampiric',value:.25,remaining:3},{type:'critUp',value:.18,remaining:2},{type:'poison',value:19,remaining:5},{type:'silence',remaining:1},{type:'broken',remaining:1}];battle.enemies[0].statuses=[{type:'burn',value:23,remaining:4},{type:'marked',value:.18,remaining:2},{type:'magicVulnerability',value:.27,remaining:3},{type:'stun',remaining:1},{type:'broken',remaining:1}];}</script>`;
    res.end(fs.readFileSync(file,'utf8').replace('</body>',fixture+'</body>'));return;
  }
  fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`VFX preview: http://127.0.0.1:${port}/game/?qa=flamesolo&hero=Mira`));
