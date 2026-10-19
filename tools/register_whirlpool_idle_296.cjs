const fs=require('fs'),path=require('path'),sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
const root='public/game/assets/tinus-gauntlet',manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),result={};
for(const c of manifest.characters){
 const frames=await Promise.all(c.frames.slice(0,8).map(async f=>{const [left,top,width,height]=f.cell;return sharp(path.join(root,c.sheet)).extract({left,top,width,height}).ensureAlpha().raw().toBuffer();}));
 const ref=frames[0],offsets=[[0,0]];
 // Register planted lower-body texture, ignoring moving hands, faces and weapons.
 function loss(buf,dx,dy){let total=0,count=0;for(let y=306;y<353;y+=3)for(let x=32;x<352;x+=3){const xx=x-dx,yy=y-dy;if(xx<0||xx>=384||yy<0||yy>=384)continue;const a=(y*384+x)*4,b=(yy*384+xx)*4,aa=ref[a+3]/255,bb=buf[b+3]/255;if(aa<.1&&bb<.1)continue;total+=Math.abs(aa-bb)*220;for(let k=0;k<3;k++)total+=Math.abs(ref[a+k]*aa-buf[b+k]*bb)/3;count++;}return total/Math.max(1,count);}
 for(let i=1;i<8;i++){let best={score:Infinity,dx:0,dy:0};for(let dy=-6;dy<=6;dy+=2)for(let dx=-48;dx<=48;dx+=2){const score=loss(frames[i],dx,dy);if(score<best.score)best={score,dx,dy};}const coarse=best;for(let dy=coarse.dy-1;dy<=coarse.dy+1;dy++)for(let dx=coarse.dx-1;dx<=coarse.dx+1;dx++){const score=loss(frames[i],dx,dy);if(score<best.score)best={score,dx,dy};}offsets.push([best.dx,best.dy]);}
 result[c.id]=offsets;
}
fs.writeFileSync(path.join(root,'idle-registration-296.json'),JSON.stringify(result));console.log(result);
})().catch(e=>{console.error(e);process.exit(1)});
