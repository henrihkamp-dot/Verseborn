const fs=require('fs'),path=require('path'),sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const target=path.resolve(__dirname,'../public/game/assets/sprites/shadow-idle-231');
async function prepare(key,file){
 const{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});const seen=new Uint8Array(info.width*info.height),components=[];
 let grouping=Uint8Array.from(seen,(_,i)=>Number(data[i*4+3]>=(['Torren','Glimmer'].includes(key)?128:20)));
 // Tibby's case touches a neighbouring curl by a few pixels. Erode labels only,
 // then restore original pixels by nearest connected owner; never crop the artwork.
 if(key==='Tibby')for(let pass=0;pass<5;pass++){const next=new Uint8Array(grouping.length);for(let y=1;y<info.height-1;y++)for(let x=1;x<info.width-1;x++){const i=y*info.width+x;if(!grouping[i])continue;let inside=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!grouping[i+dy*info.width+dx])inside=false;if(inside)next[i]=1;}grouping=next;}
 for(let p=0;p<seen.length;p++){
  if(seen[p]||!grouping[p])continue;const points=[p];seen[p]=1;let x0=info.width,y0=info.height,x1=0,y1=0;
  for(let h=0;h<points.length;h++){const i=points[h],x=i%info.width,y=Math.floor(i/info.width);x0=Math.min(x,x0);y0=Math.min(y,y0);x1=Math.max(x,x1);y1=Math.max(y,y1);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,n=ny*info.width+nx;if(nx>=0&&nx<info.width&&ny>=0&&ny<info.height&&!seen[n]&&grouping[n]){seen[n]=1;points.push(n);}}
  }components.push({points,x0,y0,x1,y1});
 }
 components.sort((a,b)=>b.points.length-a.points.length);const mains=components.slice(0,8);
 if(mains.length!==8||mains.some(c=>c.points.length<1000))throw Error('Sheet must have eight separated character silhouettes: '+key);
 mains.sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1));const columns=Number(process.argv[4]||4),ordered=[];for(let start=0;start<8;start+=columns)ordered.push(...mains.slice(start,start+columns).sort((a,b)=>a.x0-b.x0));
 const groups=ordered.map(main=>[main]);for(const part of components.slice(8)){if(part.points.length<3)continue;let best=0,distance=Infinity;ordered.forEach((m,i)=>{const d=Math.hypot(Math.max(0,m.x0-part.x1,part.x0-m.x1),Math.max(0,m.y0-part.y1,part.y0-m.y1));if(d<distance){best=i;distance=d;}});if(distance<Math.min(info.width/4,info.height/2)*.25)groups[best].push(part);}
 if(['Tibby','Torren','Glimmer'].includes(key)){
  const owners=new Int16Array(seen.length).fill(-1),queue=[],limits=groups.map(parts=>Math.max(...parts.map(p=>p.y1))+6);
  groups.forEach((parts,owner)=>parts.forEach(part=>part.points.forEach(i=>{owners[i]=owner;queue.push(i);}))); 
  for(let head=0;head<queue.length;head++){const i=queue[head],x=i%info.width,y=Math.floor(i/info.width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,n=ny*info.width+nx;if(nx>=0&&nx<info.width&&ny>=0&&ny<info.height&&ny<=limits[owners[i]]&&owners[n]<0&&data[n*4+3]>=20){owners[n]=owners[i];queue.push(n);}}}
  const restored=groups.map(()=>({points:[],x0:info.width,y0:info.height,x1:0,y1:0}));
  for(let i=0;i<owners.length;i++)if(owners[i]>=0){const p=restored[owners[i]],x=i%info.width,y=Math.floor(i/info.width);p.points.push(i);p.x0=Math.min(p.x0,x);p.y0=Math.min(p.y0,y);p.x1=Math.max(p.x1,x);p.y1=Math.max(p.y1,y);}
  restored.forEach((part,i)=>{groups[i]=[part];});
 }
 const frames=[];
 for(let i=0;i<8;i++){
  const parts=groups[i],main=ordered[i],x0=Math.min(...parts.map(c=>c.x0)),y0=Math.min(...parts.map(c=>c.y0)),x1=Math.max(...parts.map(c=>c.x1)),y1=Math.max(...parts.map(c=>c.y1)),width=x1-x0+1,height=y1-y0+1,out=Buffer.alloc(width*height*4);
  for(const part of parts)for(const index of part.points){const x=index%info.width,y=Math.floor(index/info.width),to=((y-y0)*width+x-x0)*4;data.copy(out,to,index*4,index*4+4);}
  const isBootColumn=x=>(key!=='Tibby'||x<main.x0+(main.x1-main.x0)*.62)&&(key!=='Ash Quarter Thugg'||x>main.x0+(main.x1-main.x0)*.25);
  let bootBottom=0;for(const index of main.points)if(isBootColumn(index%info.width))bootBottom=Math.max(bootBottom,Math.floor(index/info.width));
  const footBand=bootBottom-(main.y1-main.y0)*.06;let mass=0,sum=0;for(const index of main.points){const x=index%info.width,y=Math.floor(index/info.width);if(y>=footBand&&isBootColumn(x)){const a=data[index*4+3]/255;sum+=x*a;mass+=a;}}
  frames.push({out,width,height,anchorX:sum/mass-x0,baseline:bootBottom-y0+1});
 }
 const scale=260/Math.max(...frames.map(f=>f.baseline)),cw=Math.max(340,Math.ceil(Math.max(...frames.map(f=>Math.max(f.anchorX,f.width-f.anchorX)))*scale*2+40)),ch=310,baseline=290,composite=[],output=path.resolve(__dirname,'../../../outputs/shadow-idle-231');
 for(let i=0;i<8;i++){
  const f=frames[i],width=Math.round(f.width*scale),height=Math.round(f.height*scale),left=Math.round(cw/2-f.anchorX*scale),top=Math.round(baseline-f.baseline*scale);
  if(left<8||top<8||left+width>cw-8||top+height>ch-8)throw Error('Insufficient margin '+key+' '+i);
  const resized=await sharp(f.out,{raw:{width:f.width,height:f.height,channels:4}}).resize(width,height).png().toBuffer();
  const frame=await sharp({create:{width:cw,height:ch,channels:4,background:'#00000000'}}).composite([{input:resized,left,top}]).png().toBuffer();
  await sharp(frame).toFile(path.join(output,key.toLowerCase().replaceAll(' ','-')+'-'+i+'.png'));composite.push({input:frame,left:i*cw,top:0});
 }
 fs.mkdirSync(target,{recursive:true});const name=key.toLowerCase().replaceAll(' ','-')+'.webp';
 await sharp({create:{width:cw*8,height:ch,channels:4,background:'#00000000'}}).composite(composite).webp({quality:94,alphaQuality:100,effort:6}).toFile(path.join(target,name));
 const manifestFile=path.join(target,'manifest.json'),manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{};
 const oldRoot=path.resolve(__dirname,'../public/game/assets/sprites/hall-duels'),old=JSON.parse(fs.readFileSync(path.join(oldRoot,'manifest.json')))[key];
 const {data:original,info:oldInfo}=await sharp(path.join(oldRoot,old.file)).extract({left:0,top:0,width:old.cellWidth,height:old.cellHeight}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let bx0=oldInfo.width,by0=oldInfo.height,bx1=0,by1=0;for(let y=0;y<oldInfo.height;y++)for(let x=0;x<oldInfo.width;x++)if(original[(y*oldInfo.width+x)*4+3]>=20){bx0=Math.min(bx0,x);bx1=Math.max(bx1,x);by0=Math.min(by0,y);by1=Math.max(by1,y);}
 const oldBodyHeight=by1-by0+1,referenceHeight=frames[0].baseline*scale/(oldBodyHeight/old.referenceHeight);
 let oldMass=0,oldSum=0;for(let y=Math.ceil(by1-oldBodyHeight*.06);y<=by1;y++)for(let x=bx0;x<=bx1;x++){const a=original[(y*oldInfo.width+x)*4+3]/255;oldMass+=a;oldSum+=x*a;}
 const anchorX=cw/2+(old.cellWidth/2-oldSum/oldMass)/old.referenceHeight*referenceHeight;
 const durations=[700,450,180,500,650,180,550,1250];
 manifest[key]={file:name,cellWidth:cw,cellHeight:ch,anchorX,baseline:baseline+(old.baseline-by1-1)/old.referenceHeight*referenceHeight,referenceHeight,sourceBodyRatio:oldBodyHeight/old.referenceHeight,sourceFootOffset:(oldSum/oldMass-old.cellWidth/2)/old.referenceHeight,order:[0,1,2,3,4,5,6,7],durations,cycleMs:durations.reduce((a,b)=>a+b,0)};
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({key,frames:8,config:manifest[key]}));
}
prepare(process.argv[2],process.argv[3]).catch(e=>{console.error(e);process.exitCode=1});


