const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const sprites = 'assets/sprites/enemies-battle';
const effects = 'assets/effects/endgame-bosses';
async function cell(source, left, top, width, height, size) {
  return sharp(source).extract({left, top, width, height}).resize(size, size, {fit:'contain', background:'#00000000'}).png().toBuffer();
}
async function isolatedPose(source, rect) {
  const {data,info}=await sharp(source).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const seen=new Uint8Array(info.width*info.height);
  let largest=[];
  for(let start=0;start<seen.length;start++) {
    if(seen[start] || data[start*4+3]<32) continue;
    const component=[start];seen[start]=1;
    for(let i=0;i<component.length;i++) {
      const p=component[i],x=p%info.width,y=Math.floor(p/info.width);
      for(const n of [x>0?p-1:-1,x+1<info.width?p+1:-1,y>0?p-info.width:-1,y+1<info.height?p+info.width:-1]) {
        if(n<0||seen[n]||data[n*4+3]<32)continue;
        seen[n]=1;component.push(n);
      }
    }
    if(component.length>largest.length)largest=component;
  }
  const keep=new Uint8Array(seen.length);largest.forEach(p=>keep[p]=1);
  for(let p=0;p<keep.length;p++)if(!keep[p])data[p*4+3]=0;
  return sharp(data,{raw:info}).trim().resize({width:224,height:224,fit:'inside'}).png().toBuffer();
}
(async () => {
  const source = path.join(root, 'public/game', sprites, 'ash-wyrm-lava-clean-source.png');
  const meta = await sharp(source).metadata();
  const frames=[];
  // The supplied sheet has uneven row spacing, not five equal-height rows.
  const rowEdges=[0,282,552,823,1095,meta.height];
  const rowEnds=rowEdges.slice(1);
  for(let row=0;row<5;row++) for(let col=0;col<4;col++) {
    const left=Math.floor(col*meta.width/4), top=rowEdges[row];
    const input=await isolatedPose(source,{left,top,width:Math.floor((col+1)*meta.width/4)-left,height:rowEnds[row]-top});
    const size=await sharp(input).metadata();
    frames.push({input,left:col*256+Math.floor((256-size.width)/2),top:row*256+250-size.height});
  }
  const output=path.join(root,'public/game',sprites,'ash-wyrm-lava.webp');
  await sharp({create:{width:1024,height:1280,channels:4,background:'#00000000'}}).composite(frames).webp({quality:82,alphaQuality:100,effort:6}).toFile(output);
  const manifestPath=path.join(root,'public/game',sprites,'manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const entry=manifest.enemies?.['Ash Wyrm'] || manifest['Ash Wyrm'];
  if(!entry) throw Error('Missing Ash Wyrm manifest entry');
  Object.assign(entry,{file:'ash-wyrm-lava-fixed.webp',columns:4,rows:5,cellWidth:256,cellHeight:256,baseline:250,referenceHeight:245,
    rowMap:{idle:0,walk:0,melee:2,magic:1,ultimate:3,death:4},
    frameSequences:{idle:[0],walk:[0],melee:[0,1,2,3],magic:[0,1,2,3],ultimate:[0,1,2,3],death:[0,1,2,3]}});
  fs.copyFileSync(output,path.join(root,'public/game',sprites,'ash-wyrm-lava-fixed.webp'));
  fs.copyFileSync(output,path.join(root,'dist/client/game',sprites,'ash-wyrm-lava-fixed.webp'));
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
