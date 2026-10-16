const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../dist/client');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
(async()=>{
 const entries=files(root);let converted=0;
 for(const file of entries.filter(f=>f.endsWith('.png'))){
  if(!file.startsWith(root+path.sep))throw Error('Asset outside build');
  const target=file.slice(0,-4)+'.webp';
  if(!fs.existsSync(target))await sharp(file).webp({lossless:true,effort:2}).toFile(target);
  if(!fs.statSync(target).size)throw Error('Empty converted asset');
  fs.unlinkSync(file);converted++;
 }
 for(const file of entries.filter(f=>/\.(js|css|html|json)$/.test(f))){
  const src=fs.readFileSync(file,'utf8');if(src.includes('.png'))fs.writeFileSync(file,src.replace(/\.png/g,'.webp'));
 }
 // Retain source resolution and alpha; compact existing release art for hosting.
 // Approved new idle pixels remain lossless and are excluded from recompression.
 for(const file of files(root).filter(f=>f.endsWith('.webp.compact.webp')))fs.unlinkSync(file);
 const art=files(root).filter(f=>f.endsWith('.webp')&&!f.includes(path.sep+'flameguard-idle'+path.sep)&&fs.statSync(f).size>150000);
 let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(cursor<art.length){
   const file=art[cursor++],original=fs.readFileSync(file);
   const compact=await sharp(original).webp({quality:90,alphaQuality:100,effort:2}).toBuffer();
   if(compact.length<original.length)fs.writeFileSync(file,compact);
  }
 }));
 console.log('Compact build prepared: '+converted+' PNG assets use WebP; source artwork retained.');
})().catch(e=>{console.error(e);process.exitCode=1});
