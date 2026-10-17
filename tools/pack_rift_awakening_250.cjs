const fs=require('fs'),path=require('path'),sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=path.resolve('public/game/assets/rift/awakening-250');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const file='C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2/exec-90d9399c-19e0-486b-ac63-7e5296577cb7.png';
 const{data,info:{width:w,height:h}}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Int32Array(w*h),q=new Int32Array(w*h),parts=[];let id=0;
 for(let i=0;i<w*h;i++){if(seen[i]||data[i*4+3]<20)continue;id++;let n=1,k=0,l=w,t=h,r=0,b=0;q[0]=i;seen[i]=id;while(k<n){const j=q[k++],x=j%w,y=(j/w)|0;l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1);for(const v of[x?j-1:-1,x<w-1?j+1:-1,y?j-w:-1,y<h-1?j+w:-1])if(v>=0&&!seen[v]&&data[v*4+3]>=20){seen[v]=id;q[n++]=v;}}if(n>50000)parts.push({id,n,l,t,r,b});}
 if(parts.length!==4)throw Error('Dragon poses overlap: '+parts.length);parts.sort((a,b)=>Math.round((a.t+a.b)/2/h*2-.5)-Math.round((b.t+b.b)/2/h*2-.5)||a.l-b.l);
 const scale=Math.min(350/Math.max(...parts.map(p=>p.r-p.l)),245/Math.max(...parts.map(p=>p.b-p.t))),composite=[],audit=[];
 for(let i=0;i<4;i++){const p=parts[i],raw=Buffer.alloc(w*h*4);for(let j=0;j<w*h;j++)if(seen[j]===p.id)data.copy(raw,j*4,j*4,j*4+4);const width=Math.round((p.r-p.l)*scale),height=Math.round((p.b-p.t)*scale),left=12,top=260-height;composite.push({input:await sharp(raw,{raw:{width:w,height:h,channels:4}}).extract({left:p.l,top:p.t,width:p.r-p.l,height:p.b-p.t}).resize(width,height).png().toBuffer(),left:i*384+left,top});audit.push({sourceBounds:p,left,top,width,height});}
 await sharp({create:{width:1536,height:272,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composite).webp({quality:77,alphaQuality:100}).toFile(path.join(out,'stone-sleeper.webp'));
 const refs=path.resolve('../../outputs/vortex-script-references'),specs=[['shared-sky','issue-10-page-11.jpg',{left:185,top:35,width:499,height:180}],['solinar','issue-10-page-11.jpg',{left:190,top:250,width:494,height:140}],['elder-ember','issue-10-page-12.jpg',{left:190,top:30,width:492,height:173}],['remembered-voices','issue-10-page-12.jpg',{left:145,top:442,width:535,height:191}]];
 for(const[name,file,rect]of specs)await sharp(path.join(refs,file)).extract(rect).resize({width:480}).webp({quality:78}).toFile(path.join(out,name+'.webp'));
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({file:'stone-sleeper.webp',cellWidth:384,cellHeight:272,referenceWidth:audit[0].width,baseline:260,left:12,frames:audit,visions:specs.map(([name])=>name+'.webp')}));
 console.log('Packed four full dragon poses and four actual comic memory panels.');
})();

