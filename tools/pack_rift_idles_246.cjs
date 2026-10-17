const fs=require('fs'),path=require('path'),sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source=require('./rift-idle-246-sources.json'),native=require('../public/game/assets/rift/manifest.json'),out=path.resolve(__dirname,'../public/game/assets/rift/idle-246');fs.mkdirSync(out,{recursive:true});
// Extract connected silhouettes, never rectangular grid slices that sever weapons.
function separate(d,w,h,cols){
 const labels=new Int32Array(w*h),q=new Int32Array(w*h),parts=[];let id=0;
 for(let i=0;i<w*h;i++){if(labels[i]||d[i*4+3]<20)continue;id++;let n=1,k=0,l=w,t=h,r=0,b=0;q[0]=i;labels[i]=id;
  while(k<n){const j=q[k++],x=j%w,y=(j/w)|0;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const v of [x?j-1:-1,x<w-1?j+1:-1,y?j-w:-1,y<h-1?j+w:-1])if(v>=0&&!labels[v]&&d[v*4+3]>=20){labels[v]=id;q[n++]=v;}}
  parts.push({id,n,l,t,r:r+1,b:b+1});
 }
 const main=parts.filter(p=>p.n>30000);if(main.length!==8)throw Error('Expected eight separate complete figures, found '+main.length);
 main.sort((a,b)=>Math.round(((a.t+a.b)/2)/h*(8/cols)-.5)-Math.round(((b.t+b.b)/2)/h*(8/cols)-.5)||a.l-b.l);
 const owners=new Map(main.map((p,i)=>[p.id,i]));
 for(const p of parts)if(!owners.has(p.id)){
  const x=(p.l+p.r)/2,y=(p.t+p.b)/2;let best=0,dist=Infinity;
  main.forEach((m,i)=>{const v=Math.max(m.l-x,0,x-m.r)**2+Math.max(m.t-y,0,y-m.b)**2;if(v<dist){dist=v;best=i;}});owners.set(p.id,best);
 }
 const frames=main.map(()=>Buffer.alloc(w*h*4));
 for(let i=0;i<w*h;i++){if(!d[i*4+3])continue;let owner=owners.get(labels[i]);if(owner===undefined){const x=i%w,y=(i/w)|0;let dist=Infinity;main.forEach((m,j)=>{const v=Math.max(m.l-x,0,x-m.r)**2+Math.max(m.t-y,0,y-m.b)**2;if(v<dist){dist=v;owner=j;}});}d.copy(frames[owner],i*4,i*4,i*4+4);}
 return frames.map((data,i)=>({data,main:main[i]}));
}
function analyze(data,w,h,main){let l=w,t=h,r=0,b=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>8){l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1);}
 // Ground registration uses the full silhouette's feet, not the arbitrary cell centre.
 let baseline=main.b-1,x0=Math.round(main.l+(main.r-main.l)*.2),x1=Math.round(main.l+(main.r-main.l)*.8);
 for(let y=main.b-1;y>=main.t+(main.b-main.t)*.7;y--){let n=0;for(let x=x0;x<x1;x++)if(data[(y*w+x)*4+3]>170)n++;if(n>=Math.max(5,(main.r-main.l)*.025)){baseline=y;break;}}
 let fl=w,fr=0;for(let y=baseline-Math.round((main.b-main.t)*.035);y<=baseline;y++)for(let x=main.l;x<main.r;x++)if(data[(y*w+x)*4+3]>170){fl=Math.min(fl,x);fr=Math.max(fr,x);}
 return {box:[l,t,r,b],anchorX:(fl+fr)/2,baseline};
}
(async()=>{const manifest={},audit={};for(const[key,record]of Object.entries(source)){
 const{data,info}=await sharp(record.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});const frames=separate(data,info.width,info.height,record.columns||4).map(f=>({...f,...analyze(f.data,info.width,info.height,f.main)}));
 for(const f of frames)if(f.main.l<=0||f.main.t<=0||f.main.r>=info.width||f.main.b>=info.height)throw Error(key+' source touches outside edge');
 const left=Math.max(...frames.map(f=>f.anchorX-f.box[0])),right=Math.max(...frames.map(f=>f.box[2]-f.anchorX)),above=Math.max(...frames.map(f=>f.baseline-f.box[1])),below=Math.max(...frames.map(f=>f.box[3]-f.baseline)),first=frames[0];
 const scale=Math.min(200/(first.baseline-first.main.t),280/(left+right),235/above,20/Math.max(1,below)),anchorX=(320-(left+right)*scale)/2+left*scale,baseline=250,composite=[];
 for(let i=0;i<8;i++){const f=frames[i],[l,t,r,b]=f.box,width=Math.round((r-l)*scale),height=Math.round((b-t)*scale),x=Math.round(anchorX-(f.anchorX-l)*scale),y=Math.round(baseline-(f.baseline-t)*scale);
  if(x<10||y<10||x+width>310||y+height>275)throw Error(key+' insufficient safe margin');
  const input=await sharp(f.data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:l,top:t,width:r-l,height:b-t}).resize(width,height).png().toBuffer();composite.push({input,left:i*320+x,top:y});
 }
 await sharp({create:{width:2560,height:280,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composite).webp({quality:80,alphaQuality:100}).toFile(path.join(out,key+'.webp'));
 const old=native.characters[key],ratio=(old.bounds[0][3]-old.bounds[0][1])/old.referenceHeight,referenceHeight=(first.main.b-first.main.t)*scale/ratio;
 manifest[key]={file:key+'.webp',cellWidth:320,cellHeight:280,anchorX,baseline,referenceHeight,leftExtent:left*scale,rightExtent:right*scale,durations:[900,300,650,800,800,650,650,950],cycleMs:5700};
 audit[key]={source:record.source,mainBounds:frames.map(f=>f.main),bounds:frames.map(f=>f.box),anchors:frames.map(f=>[f.anchorX,f.baseline]),scale};console.log(key,'complete figures',frames.length);
 }fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest));fs.writeFileSync(path.join(__dirname,'rift-idle-246-alignment.json'),JSON.stringify(audit,null,2));})();
