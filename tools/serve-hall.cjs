const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[3]||path.join(__dirname,'../public/game')),port=Number(process.argv[2]||8744);
http.createServer((req,res)=>{
 const pathname=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));
