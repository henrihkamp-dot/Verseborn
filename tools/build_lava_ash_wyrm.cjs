const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const sprites = 'assets/sprites/enemies-battle';
const effects = 'assets/effects/endgame-bosses';
async function cell(source, left, top, width, height, size) {
  return sharp(source).extract({left, top, width, height}).resize(size, size, {fit:'contain', background:'#00000000'}).png().toBuffer();
}
(async () => {
  const source = path.join(root, 'public/game', sprites, 'ash-wyrm-lava-source.png');
  const meta = await sharp(source).metadata();
  const frames=[];
  for(let row=0;row<5;row++) for(let col=0;col<4;col++) {
    const left=Math.floor(col*meta.width/4), top=Math.floor(row*meta.height/5);
    frames.push({input:await cell(source,left,top,Math.floor((col+1)*meta.width/4)-left,Math.floor((row+1)*meta.height/5)-top,256),left:col*256,top:row*256});
  }
  const output=path.join(root,'public/game',sprites,'ash-wyrm-lava.webp');
  await sharp({create:{width:1024,height:1280,channels:4,background:'#00000000'}}).composite(frames).webp({quality:82,alphaQuality:100,effort:6}).toFile(output);
  const manifestPath=path.join(root,'public/game',sprites,'manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const entry=manifest.enemies?.['Ash Wyrm'] || manifest['Ash Wyrm'];
  if(!entry) throw Error('Missing Ash Wyrm manifest entry');
  Object.assign(entry,{file:'ash-wyrm-lava.webp',columns:4,rows:5,cellWidth:256,cellHeight:256,baseline:250,referenceHeight:245,
    rowMap:{idle:0,walk:0,melee:2,magic:1,ultimate:3,death:4},
    frameSequences:{idle:[0,1,2,3,2,1],walk:[0,1,2,3],melee:[0,1,2,3],magic:[0,1,2,3],ultimate:[0,1,2,3],death:[0,1,2,3]}});
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const fxSource=path.join(root,'public/game',effects,'ash-wyrm-lava-source.png');
  const fxMeta=await sharp(fxSource).metadata();
  const fxFrames=[];
  for(let row=0;row<2;row++) for(let col=0;col<4;col++) {
    const count=row===0?4:3, index=Math.min(col,count-1);
    const left=Math.floor(index*fxMeta.width/count), top=Math.floor(row*fxMeta.height/2);
    fxFrames.push({input:await cell(fxSource,left,top,Math.floor((index+1)*fxMeta.width/count)-left,Math.floor((row+1)*fxMeta.height/2)-top,192),left:col*192,top:row*192});
  }
  const fxOutput=path.join(root,'public/game',effects,'ash-wyrm-lava.webp');
  await sharp({create:{width:768,height:384,channels:4,background:'#00000000'}}).composite(fxFrames).webp({quality:80,alphaQuality:100,effort:6}).toFile(fxOutput);
  const fxPath=path.join(root,'public/game',effects,'manifest.json');
  const fxManifest=JSON.parse(fs.readFileSync(fxPath,'utf8'));
  fxManifest['Ash Wyrm']={file:'ash-wyrm-lava.webp',cellWidth:192,cellHeight:192,anchorX:96,anchorY:96,columns:4,rows:2,rowMap:{magic:0,ultimate:1}};
  fs.writeFileSync(fxPath,JSON.stringify(fxManifest,null,2)+'\n');
  for(const [folder,file] of [[sprites,'ash-wyrm-lava.webp'],[sprites,'manifest.json'],[effects,'ash-wyrm-lava.webp'],[effects,'manifest.json']])
    fs.copyFileSync(path.join(root,'public/game',folder,file),path.join(root,'dist/client/game',folder,file));
  console.log('Lava Ash Wyrm sprite + VFX bytes:',fs.statSync(output).size+fs.statSync(fxOutput).size);
})().catch(error=>{console.error(error);process.exitCode=1;});
