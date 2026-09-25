// Use alpha-connected islands rather than rectangular slices, so no visible pixel
// is severed and detached glow/particles can stay with their owning effect.
function components(data, width, height, threshold = 32) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const result = [];
  for (let seed = 0; seed < visited.length; seed++) {
    if (visited[seed] || data[seed * 4 + 3] < threshold) continue;
    let head=0, tail=1, minX=width, minY=height, maxX=0, maxY=0;
    queue[0]=seed;visited[seed]=1;
    while(head<tail) {
      const p=queue[head++],x=p%width,y=Math.floor(p/width);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const next=ny*width+nx;
        if(!visited[next]&&data[next*4+3]>=threshold) {visited[next]=1;queue[tail++]=next;}
      }
    }
    result.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,count:tail,pixels:queue.slice(0,tail)});
  }
  return result;
}
module.exports={components};
if(require.main===module) {
  const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
  const path=require('node:path');
  (async()=>{
    for(const id of process.argv.slice(2)) {
      const {data,info}=await sharp(path.join(__dirname,'sprite_sources/vfx',id+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      console.log(id,components(data,info.width,info.height).sort((a,b)=>b.count-a.count).slice(0,25).map(({pixels,...c})=>c));
    }
  })();
}
