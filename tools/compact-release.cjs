const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(process.argv[2]);
assert.ok(root.endsWith(path.join('deployment-hall-154','dist')),'Only the isolated release staging directory may be processed');
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(directory,e.name)):[path.join(directory,e.name)]);}
(async()=>{
 const entries=files(root);let converted=0;
 for(const file of entries.filter(f=>f.endsWith('.png'))){
  const output=file.slice(0,-4)+'.webp';
  if(!fs.existsSync(output))await sharp(file).webp({lossless:true,effort:2}).toFile(output);
  assert.ok(fs.existsSync(output));fs.unlinkSync(file);converted++;
 }
 for(const file of entries.filter(f=>/\.(js|css|json|html)$/.test(f))){
  const source=fs.readFileSync(file,'utf8');
  if(source.includes('.png'))fs.writeFileSync(file,source.replace(/\.png/g,'.webp'));
 }
 console.log('Packaged '+converted+' PNG assets as lossless WebP; original source assets untouched.');
})().catch(e=>{console.error(e);process.exitCode=1;});
