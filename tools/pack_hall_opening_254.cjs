const fs=require('fs'),path=require('path'),sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=path.resolve('public/game/assets/hall/opening-254');fs.mkdirSync(out,{recursive:true});
async function pack(file,name,cols,rows,cell){
 const {data,info:{width:w,height:h}}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),groups=Array.from({length:cols*rows},()=>[]),parts=[];
 for(let i=0;i<w*h;i++){if(seen[i]||data[4*i+3]<24)continue;let n=1,k=0,sx=0,sy=0;queue[0]=i;seen[i]=1;while(k<n){const j=queue[k++],x=j%w,y=j/w|0;sx+=x;sy+=y;for(const v of[x?j-1:-1,x<w-1?j+1:-1,y?j-w:-1,y<h-1?j+w:-1])if(v>=0&&!seen[v]&&data[v*4+3]>=24){seen[v]=1;queue[n++]=v;}}if(n<12)continue;const pixels=Array.from(queue.subarray(0,n)),index=Math.min(rows-1,sy/n/h*rows|0)*cols+Math.min(cols-1,sx/n/w*cols|0);groups[index]=groups[index].concat(pixels);parts.push({pixels,n});}
 const bounds=pixels=>{let l=w,t=h,r=0,b=0;for(const j of pixels){const x=j%w,y=j/w|0;l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);}return{l,t,r,b};};
 const rects=groups.map(bounds),scale=Math.min(...rects.map(p=>(cell-24)/Math.max(p.r-p.l,p.b-p.t))),layers=[],audit=[];
 async function extract(pixels,p){const rw=p.r-p.l,rh=p.b-p.t,raw=Buffer.alloc(rw*rh*4);for(const j of pixels)data.copy(raw,(((j/w|0)-p.t)*rw+j%w-p.l)*4,j*4,j*4+4);return sharp(raw,{raw:{width:rw,height:rh,channels:4}});}
 for(let i=0;i<groups.length;i++){const p=rects[i],width=Math.round((p.r-p.l)*scale),height=Math.round((p.b-p.t)*scale),left=Math.round((cell-width)/2),top=cell-12-height;layers.push({input:await(await extract(groups[i],p)).resize(width,height).png().toBuffer(),left:i*cell+left,top});audit.push({left,top,width,height,source:p});}
 await sharp({create:{width:cell*groups.length,height:cell,channels:4,background:'#00000000'}}).composite(layers).webp({quality:83,alphaQuality:100}).toFile(path.join(out,name+'.webp'));
 if(name==='construction'){const tools=parts.filter(p=>p.n>120&&p.n<18000).sort((a,b)=>b.n-a.n).slice(0,12),layers=[];for(let i=0;i<tools.length;i++){const p=bounds(tools[i].pixels),image=await(await extract(tools[i].pixels,p)).resize({width:52,height:52,fit:'inside'}).png().toBuffer();layers.push({input:image,left:i*64+6,top:6});}await sharp({create:{width:64*tools.length,height:64,channels:4,background:'#00000000'}}).composite(layers).webp({quality:82,alphaQuality:100}).toFile(path.join(out,'tools.webp'));fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({cell,frames:audit,tools:tools.length}));}
 console.log(name,audit);
}
(async()=>{await pack('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2/exec-c17461fa-b39e-4326-bb85-6000774986c8.png','construction',2,2,320);if(process.argv[2])await pack(process.argv[2],'glimmer-seated',4,1,100);})();

