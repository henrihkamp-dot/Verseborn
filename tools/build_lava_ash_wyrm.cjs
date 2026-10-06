const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const sprites = 'assets/sprites/enemies-battle';
const effects = 'assets/effects/endgame-bosses';
async function cell(source, left, top, width, height, size) {
  return sharp(source).extract({left, top, width, height}).resize(size, size, {fit:'contain', background:'#00000000'}).png().toBuffer();
}
async function isolatedPose(source, rect, row) {
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
  // Align the feet rather than the full silhouette (tail/flames change its bounds).
  let footX=0, footY=0, count=0;
  for(const p of largest) {
    const x=p%info.width,y=Math.floor(p/info.width),i=p*4;
    if(x<info.width*.12 || x>info.width*.7 || y<info.height*.84)continue;
    if(data[i]>140 && data[i+1]>75 && data[i+2]<data[i+1]*.65) {footX+=x;footY=Math.max(footY,y);count++;}
  }
  const anchorX=count && row<4 ? footX/count : info.width*.42;
  const anchorY=count && row<4 ? footY : info.height-8;
  const scale=.76;
  const input=await sharp(data,{raw:info}).resize(Math.round(info.width*scale),Math.round(info.height*scale)).png().toBuffer();
  return {input,left:Math.round(110-anchorX*scale),top:Math.round(242-anchorY*scale)};
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
    const pose=await isolatedPose(source,{left,top,width:Math.floor((col+1)*meta.width/4)-left,height:rowEnds[row]-top},row);
    frames.push({input:pose.input,left:col*256+Math.max(0,pose.left),top:row*256+Math.max(0,pose.top)});
  }
  const idle=[];
  for(let col=0;col<4;col++) {
    const pose=frames[col];
    idle.push(await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}})
      .composite([{input:pose.input,left:pose.left-col*256,top:pose.top}]).raw().toBuffer());
  }
  const base=idle[0];
  for(let col=0;col<4;col++) {
    let best={error:Infinity,x:0,y:0};
    for(let dy=-12;dy<=12;dy++) for(let dx=-12;dx<=12;dx++) {
      let error=0,count=0;
      // Register only the torso, excluding the moving head, wings, fire and tail.
      for(let y=125;y<190;y+=2) for(let x=55;x<135;x+=2) {
        const a=(y*256+x)*4,b=((y+dy)*256+x+dx)*4;
        if(base[a+3]<200)continue;
        count++;
        for(let c=0;c<4;c++)error+=(base[a+c]-idle[col][b+c])**2;
      }
      error/=Math.max(1,count);
      if(error<best.error)best={error,x:dx,y:dy};
    }
    const stable=Buffer.from(base);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
      const sx=x+best.x,sy=y+best.y;
      if(sx<0||sx>=256||sy<0||sy>=256)continue;
      // Keep the torso and planted feet identical; animate the head/wing/flame silhouette.
      const moving=y<125 || x>165;
      if(moving)idle[col].copy(stable,(y*256+x)*4,(sy*256+sx)*4,(sy*256+sx)*4+4);
    }
    frames[col]={input:await sharp(stable,{raw:{width:256,height:256,channels:4}}).png().toBuffer(),left:col*256,top:0};
    console.log(`Idle ${col}: torso registration ${best.x},${best.y}; fixed torso/feet`);
  }
  const output=path.join(root,'public/game',sprites,'ash-wyrm-lava.webp');
  await sharp({create:{width:1024,height:1280,channels:4,background:'#00000000'}}).composite(frames).webp({quality:82,alphaQuality:100,effort:6}).toFile(output);
  const manifestPath=path.join(root,'public/game',sprites,'manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const entry=manifest.enemies?.['Ash Wyrm'] || manifest['Ash Wyrm'];
  if(!entry) throw Error('Missing Ash Wyrm manifest entry');
  Object.assign(entry,{file:'ash-wyrm-lava-stable.webp',columns:4,rows:5,cellWidth:256,cellHeight:256,baseline:242,referenceHeight:224,
    rowMap:{idle:0,walk:0,melee:2,magic:1,ultimate:3,death:4},
    frameSequences:{idle:[0,2,3,2],walk:[0,2,3,2],melee:[0,1,2,3],magic:[0,1,2,3],ultimate:[0,1,2,3],death:[0,1,2,3]}});
  fs.copyFileSync(output,path.join(root,'public/game',sprites,'ash-wyrm-lava-animated.webp'));
  fs.copyFileSync(output,path.join(root,'public/game',sprites,'ash-wyrm-lava-stable.webp'));
  fs.copyFileSync(output,path.join(root,'dist/client/game',sprites,'ash-wyrm-lava-stable.webp'));
  fs.copyFileSync(output,path.join(root,'dist/client/game',sprites,'ash-wyrm-lava-animated.webp'));
  fs.copyFileSync(output,path.join(root,'public/game',sprites,'ash-wyrm-lava-fixed.webp'));
  fs.copyFileSync(output,path.join(root,'dist/client/game',sprites,'ash-wyrm-lava-fixed.webp'));
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const fxSource=path.join(root,'public/game',effects,'ash-wyrm-lava-source.png');
  const fxMeta=await sharp(fxSource).metadata();
  const fxFrames=[];
  for(let row=0;row<2;row++) for(let col=0;col<4;col++) {
    const count=row===0?4:3, index=Math.min(col,count-1);
    const left=Math.floor(index*fxMeta.width/count), top=row===0?90:485;
    const height=row===0?375:Math.min(530,fxMeta.height-top);
    fxFrames.push({input:await cell(fxSource,left,top,Math.floor((index+1)*fxMeta.width/count)-left,height,192),left:col*192,top:row*192});
  }
  const fxOutput=path.join(root,'public/game',effects,'ash-wyrm-lava-animated.webp');
  await sharp({create:{width:768,height:384,channels:4,background:'#00000000'}}).composite(fxFrames).webp({quality:80,alphaQuality:100,effort:6}).toFile(fxOutput);
  const fxPath=path.join(root,'public/game',effects,'manifest.json');
  const fxManifest=JSON.parse(fs.readFileSync(fxPath,'utf8'));
  fxManifest['Ash Wyrm']={file:'ash-wyrm-lava-animated.webp',cellWidth:192,cellHeight:192,anchorX:96,anchorY:96,columns:4,rows:2,rowMap:{magic:0,ultimate:1}};
  fs.writeFileSync(fxPath,JSON.stringify(fxManifest,null,2)+'\n');
  for(const [folder,file] of [[sprites,'ash-wyrm-lava.webp'],[sprites,'manifest.json'],[effects,'ash-wyrm-lava-animated.webp'],[effects,'manifest.json']])
    fs.copyFileSync(path.join(root,'public/game',folder,file),path.join(root,'dist/client/game',folder,file));
  console.log('Lava Ash Wyrm sprite + VFX bytes:',fs.statSync(output).size+fs.statSync(fxOutput).size);
})().catch(error=>{console.error(error);process.exitCode=1;});
