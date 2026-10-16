const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source=path.resolve(__dirname,'../public/game/assets/sprites/enemies-battle');
const target=path.resolve(__dirname,'../public/game/assets/sprites/hall-idle-229');
(async()=>{
 fs.mkdirSync(target,{recursive:true});const sheets=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'))),manifest={};
 for(const[key,sheet]of Object.entries(sheets)){
  const col=sheet.frameSequences?.idle?.[0]||0,row=sheet.rowMap.idle||0;
  const{data,info}=await sharp(path.join(source,sheet.file)).extract({left:col*sheet.cellWidth,top:row*sheet.cellHeight,width:sheet.cellWidth,height:sheet.cellHeight}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const seen=new Uint8Array(info.width*info.height),components=[];
  for(let p=0;p<seen.length;p++){
   if(seen[p]||data[p*4+3]<8)continue;
   const queue=[p],points=[];seen[p]=1;let minX=info.width,minY=info.height,maxX=0,maxY=0;
   for(let head=0;head<queue.length;head++){
    const index=queue[head],x=index%info.width,y=Math.floor(index/info.width);points.push(index);
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=info.width||ny>=info.height)continue;
     const next=ny*info.width+nx;if(!seen[next]&&data[next*4+3]>=8){seen[next]=1;queue.push(next);}
    }
   }
   components.push({points,minX,minY,maxX,maxY});
  }
  components.sort((a,b)=>b.points.length-a.points.length);const main=components[0];if(!main)throw Error('Empty idle '+key);
  const pad=Math.max(6,sheet.referenceHeight*.11);
  const kept=components.filter(c=>c===main||(c.points.length>=3&&c.maxY<=Math.max(main.maxY,sheet.baseline)+2
   &&Math.max(0,main.minX-c.maxX,c.minX-main.maxX,main.minY-c.maxY,c.minY-main.maxY)<=pad));
  const minX=Math.min(...kept.map(c=>c.minX)),minY=Math.min(...kept.map(c=>c.minY)),maxX=Math.max(...kept.map(c=>c.maxX)),maxY=Math.max(...kept.map(c=>c.maxY));
  const margin=20,width=maxX-minX+1+margin*2,height=maxY-minY+1+margin*2,out=Buffer.alloc(width*height*4);
  for(const component of kept)for(const index of component.points){const x=index%info.width,y=Math.floor(index/info.width),to=((y-minY+margin)*width+x-minX+margin)*4;data.copy(out,to,index*4,index*4+4);}
  const file=key.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.webp';
  await sharp(out,{raw:{width,height,channels:4}}).webp({lossless:true}).toFile(path.join(target,file));
  manifest[key]={file,width,height,anchorX:sheet.cellWidth/2-minX+margin,baseline:sheet.baseline-minY+margin,referenceHeight:sheet.referenceHeight,
    body:{x:margin,y:margin,width:maxX-minX+1,height:maxY-minY+1},nativeColumn:col,removedFragments:components.length-kept.length};
 }
 fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({enemies:Object.keys(manifest).length,removedFragments:Object.values(manifest).reduce((n,c)=>n+c.removedFragments,0),target}));
})().catch(error=>{console.error(error);process.exitCode=1;});
