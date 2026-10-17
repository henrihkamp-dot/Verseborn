const fs=require('fs'),path=require('path'),sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'),dir=path.resolve(__dirname,'../public/game/assets/rift/idle-246');
function match(a,b,w,h,step,range,coarse){const gw=Math.ceil(w/step),gh=Math.ceil(h/step),f=new Float32Array(gw*gh*2);for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){
 const x=Math.min(w-1,gx*step+step/2),y=Math.min(h-1,gy*step+step/2),ix=x|0,iy=y|0,ai=(iy*w+ix)*4;
 if(a[ai+3]<5){continue;}let dx0=0,dy0=0;if(coarse){const j=(Math.min(coarse.gh-1,(gy/2)|0)*coarse.gw+Math.min(coarse.gw-1,(gx/2)|0))*2;dx0=Math.round(coarse.f[j]*2);dy0=Math.round(coarse.f[j+1]*2);}
 let score=Infinity,bx=0,by=0;for(let dy=dy0-range;dy<=dy0+range;dy++)for(let dx=dx0-range;dx<=dx0+range;dx++){
  let s=(dx*dx+dy*dy)*.6;for(let py=-2;py<=2;py+=2)for(let px=-2;px<=2;px+=2){const ax=Math.max(0,Math.min(w-1,ix+px)),ay=Math.max(0,Math.min(h-1,iy+py)),xx=Math.max(0,Math.min(w-1,ix+px+dx)),yy=Math.max(0,Math.min(h-1,iy+py+dy)),i=(ay*w+ax)*4,j=(yy*w+xx)*4,aa=a[i+3]/255,ba=b[j+3]/255;for(let c=0;c<3;c++)s+=(a[i+c]*aa-b[j+c]*ba)**2;s+=(a[i+3]-b[j+3])**2*2;}
  if(s<score){score=s;bx=dx;by=dy;}
 }const i=(gy*gw+gx)*2;f[i]=bx;f[i+1]=by;
 }
 // Reject isolated patch matches and extend edge motion into transparent space
 // so a moving wing/cape keeps one edge instead of leaving a second silhouette.
 const stable=new Float32Array(f.length),valid=new Uint8Array(gw*gh);
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const xx=Math.min(w-1,(x*step+step/2)|0),yy=Math.min(h-1,(y*step+step/2)|0);if(a[(yy*w+xx)*4+3]<5)continue;valid[y*gw+x]=1;for(let c=0;c<2;c++){const values=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=gw||ny<0||ny>=gh)continue;const ax=Math.min(w-1,(nx*step+step/2)|0),ay=Math.min(h-1,(ny*step+step/2)|0);if(a[(ay*w+ax)*4+3]>5)values.push(f[(ny*gw+nx)*2+c]);}values.sort((a,b)=>a-b);stable[(y*gw+x)*2+c]=values[(values.length/2)|0]||0;}}
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)if(!valid[y*gw+x]){let best=Infinity,j=-1;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const nx=x+dx,ny=y+dy,d=dx*dx+dy*dy;if(nx>=0&&nx<gw&&ny>=0&&ny<gh&&valid[ny*gw+nx]&&d<best){best=d;j=ny*gw+nx;}}if(j>=0){stable[(y*gw+x)*2]=stable[j*2];stable[(y*gw+x)*2+1]=stable[j*2+1];}}
 return {f:stable,gw,gh};}
(async()=>{const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));for(const[key,c]of Object.entries(manifest)){
 const small=[],large=[];for(let i=0;i<8;i++){const image=sharp(path.join(dir,c.file)).extract({left:i*320,top:0,width:320,height:280});small.push(await image.clone().resize(80,70).ensureAlpha().raw().toBuffer());large.push(await image.clone().resize(160,140).ensureAlpha().raw().toBuffer());}
 const data=Buffer.alloc(320*70*4);for(let i=0;i<8;i++)for(let reverse=0;reverse<2;reverse++){const a=reverse?(i+1)%8:i,b=reverse?i:(i+1)%8,coarse=match(small[a],small[b],80,70,4,6),fine=match(large[a],large[b],160,140,4,3,coarse);
 for(let y=0;y<35;y++)for(let x=0;x<40;x++){const j=((reverse*35+y)*320+i*40+x)*4,k=(y*40+x)*2;data[j]=Math.max(0,Math.min(255,Math.round(128+fine.f[k]*4)));data[j+1]=Math.max(0,Math.min(255,Math.round(128+fine.f[k+1]*4)));data[j+2]=0;data[j+3]=255;}}
 await sharp(data,{raw:{width:320,height:70,channels:4}}).png().toFile(path.join(dir,key+'-flow.png'));c.flow=key+'-flow.png';console.log(key,'motion fields');
 }fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));})();
