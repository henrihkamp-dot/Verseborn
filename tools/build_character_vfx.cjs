const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const { components } = require('./vfx_components.cjs');

// Source-space frame boundaries and label-only exclusions, reviewed per sheet.
const sheets = {
  Seerin: { file: 'f2ec413d-b080-4437-8cb4-ec254e6486aa', rows: [[0, 60, 420], [0, 420, 730], [0, 730, 1086]], labels: [[570,0,320,145],[680,413,85,49],[649,726,151,52]] },
  Mira: { file: '9dd42312-bbfc-47da-85db-f056c4f15594', rows: [[0,90,416],[0,416,730],[0,730,1086]], labels: [[510,0,430,128],[12,105,305,78],[12,418,215,86],[12,738,222,81]], xs: [0,355,755,1140,1448] },
  Verseborn: { file: '70dd39c1-dcad-43e1-ba16-2178ce86a40b', rows: [[180,0,384],[175,384,740],[185,740,1086]], labels: [[420,0,615,116]], xs: [180,485,790,1100,1448], seamRanges: [[370,395],[710,768]] },
  Kael: { file: 'b351752c-2709-4604-825c-e913c6fabbd4', rows: [[0,110,404],[0,404,728],[0,728,1086]], labels: [[575,95,300,70],[667,397,114,50],[624,729,198,56]] },
  Sparky: { file: '6b603ace-329e-4074-a592-7683764f12c0', rows: [[0,115,446],[0,446,737],[0,737,1086]], labels: [[6,128,355,77],[10,449,162,72],[8,727,225,74],[480,0,482,142]] },
  KaelShadow: { file: '1c972334-de34-4476-94cf-bfbc7f573756', rows: [[0,92,379],[0,379,727],[0,727,1086]], labels: [[4,90,312,79],[0,377,152,76],[0,724,213,60],[325,0,787,99]] },
  Glimmer: { file: 'c0363526-6c0f-4776-89dd-44d47943fdbf', rows: [[0,110,394],[0,394,694],[0,694,1086]], labels: [[0,94,352,57],[0,389,225,56],[0,695,292,62]], xs: [0,365,724,1086,1448] },
  GlimmerMech: { file: '7477bb85-17fb-40fb-a6ec-553b2dcda115', rows: [[0,80,414],[0,414,739],[0,739,1086]], labels: [[14,77,297,65],[12,413,119,57],[6,733,226,65]] },
  Torren: { file: '2de7ad52-ce77-4a83-ad1e-abe1cf95769c', rows: [[0,50,398],[0,398,756],[0,756,1086]], labels: [[14,108,270,66],[15,441,108,52],[14,797,204,55],[398,0,646,103]], xs: [0,370,770,1110,1448] }
};
const sourceDir = path.join(__dirname, 'sprite_sources/vfx');
const output = path.join(__dirname, '../public/game/assets/effects/characters');
const preview = path.join(__dirname, '../.analysis-battle/vfx');
const connectedRows = { Seerin: [], Mira: [2], Verseborn: [0,1,2], Kael: [], Sparky: [2], KaelShadow: [2], Glimmer: [], GlimmerMech: [1,2], Torren: [2] };
const padding = 16;

// Follow transparent space between vertically interleaved tips instead of a straight cut.
function rowSeam(data, width, low, high) {
  const height=high-low+1, previous=new Int16Array(width*height);
  let costs=new Float64Array(height);
  for(let x=0;x<width;x++) {
    const next=new Float64Array(height);
    for(let y=0;y<height;y++) {
      let best=Infinity,from=y;
      for(let d=-2;d<=2;d++)if(y+d>=0&&y+d<height) {
        const cost=costs[y+d]+Math.abs(d)*.01;
        if(cost<best){best=cost;from=y+d;}
      }
      const alpha=data[((low+y)*width+x)*4+3];
      next[y]=best+alpha*alpha;
      previous[x*height+y]=from;
    }
    costs=next;
  }
  let y=costs.indexOf(Math.min(...costs));
  const seam=new Int16Array(width);
  for(let x=width-1;x>=0;x--){seam[x]=low+y;y=previous[x*height+y];}
  return seam;
}

function isolateFrames(data, width, height, boundaries) {
  const owners = new Int8Array(width * height).fill(-1);
  const queue = new Int32Array(width * height);
  let head=0,tail=0;
  const nearest = x => {
    let best=0,distance=Infinity;
    for(let i=0;i<4;i++) {const d=Math.abs(x-(boundaries[i]+boundaries[i+1])/2);if(d<distance){distance=d;best=i;}}
    return best;
  };
  // Assign complete visible islands before growing into their translucent halos.
  // A rectangular boundary never cuts through a visible island.
  for (const island of components(data,width,height)) {
    const owner=nearest(island.x+island.w/2);
    for(const p of island.pixels) {owners[p]=owner;queue[tail++]=p;}
  }
  while(head<tail) {
    const p=queue[head++],x=p%width,y=Math.floor(p/width);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=width||ny>=height)continue;
      const q=ny*width+nx;
      if(owners[q]===-1&&data[q*4+3]) {owners[q]=owners[p];queue[tail++]=q;}
    }
  }
  const buffers=Array.from({length:4},()=>Buffer.alloc(data.length));
  for(let p=0;p<owners.length;p++) {
    if(!data[p*4+3])continue;
    const owner=owners[p]<0?nearest(p%width):owners[p];
    data.copy(buffers[owner],p*4,p*4,p*4+4);
  }
  return buffers;
}

async function paddedFrame(data,width,height) {
  let left=width,right=0,top=height,bottom=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]) {
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const w=right-left+1,h=bottom-top+1;
  const input=await sharp(data,{raw:{width,height,channels:4}}).extract({left,top,width:w,height:h}).extend({top:padding,bottom:padding,left:padding,right:padding,background:'#00000000'}).png().toBuffer();
  return {input,w:w+padding*2,h:h+padding*2,sourceLeft:left,sourceTop:top};
}

(async () => {
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(preview, { recursive: true });
  const manifest = {};
  for (const [id, spec] of Object.entries(sheets)) {
    const source = path.join(sourceDir, `${id}.png`);
    if (!fs.existsSync(source)) fs.copyFileSync(path.join('C:/Users/Henri/AppData/Local/Temp', `codex-clipboard-${spec.file}.png`), source);
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [x,y,w,h] of spec.labels) {
      for (let py=y; py<Math.min(info.height,y+h); py++) for (let px=x; px<Math.min(info.width,x+w); px++) data[(py*info.width+px)*4+3]=0;
    }
    const seams=spec.seamRanges?.map(([low,high])=>rowSeam(data,info.width,low,high));
    const prepared=[];
    for (let row=0; row<3; row++) {
      const [left,baseTop,baseBottom]=spec.rows[row];
      const top=seams&&row>0?Math.min(...seams[row-1]):baseTop;
      const bottom=seams&&row<2?Math.max(...seams[row])+1:baseBottom;
      const xs=spec.xs || [0,362,724,1086,1448];
      const width=info.width-left,height=bottom-top;
      const raw=await sharp(data,{raw:info}).extract({left,top,width,height}).raw().toBuffer();
      if(seams)for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
        if((row>0&&y+top<seams[row-1][x+left])||(row<2&&y+top>=seams[row][x+left]))raw[(y*width+x)*4+3]=0;
      }
      const connected=connectedRows[id].includes(row);
      const rawFrames=connected?[raw]:isolateFrames(raw,width,height,xs.map(x=>x-left));
      const frames=[];
      for(const frame of rawFrames) frames.push(await paddedFrame(frame,width,height));
      if(connected) {
        const frame=frames[0];
        let weight=0,sumX=0,sumY=0;
        for(let y=0;y<height;y++)for(let x=Math.max(0,xs[3]-left);x<width;x++) {
          const a=raw[(y*width+x)*4+3];
          weight+=a;sumX+=x*a;sumY+=y*a;
        }
        frame.anchorX=(sumX/weight-frame.sourceLeft+padding)/frame.w;
        frame.anchorY=(sumY/weight-frame.sourceTop+padding)/frame.h;
      }
      prepared.push({mode:connected?'connected':'frames',frames});
    }
    const cellWidth=Math.max(1,...prepared.filter(r=>r.mode==='frames').flatMap(r=>r.frames.map(f=>f.w)));
    const cellHeight=Math.max(...prepared.flatMap(r=>r.frames.map(f=>f.h)));
    const atlasWidth=Math.max(cellWidth*4,...prepared.filter(r=>r.mode==='connected').flatMap(r=>r.frames.map(f=>f.w)));
    const layers=[],rects=[];
    prepared.forEach((entry,row)=>{
      rects[row]=entry.frames.map((frame,col)=>{
        const x=entry.mode==='connected'?Math.floor((atlasWidth-frame.w)/2):col*cellWidth+Math.floor((cellWidth-frame.w)/2);
        const y=row*cellHeight+Math.floor((cellHeight-frame.h)/2);
        layers.push({input:frame.input,left:x,top:y});
        return {x,y,w:frame.w,h:frame.h,...(entry.mode==='connected'?{anchorX:frame.anchorX,anchorY:frame.anchorY}:{})};
      });
    });
    const atlas=sharp({create:{width:atlasWidth,height:cellHeight*3,channels:4,background:'#00000000'}}).composite(layers);
    await atlas.clone().webp({lossless:true}).toFile(path.join(output,`${id}.webp`));
    await sharp(await atlas.clone().png().toBuffer()).resize({width:1200}).flatten({background:'#26333b'}).png().toFile(path.join(preview,`${id}.png`));
    manifest[id]={file:`${id}.webp`,width:atlasWidth,height:cellHeight*3,cellWidth,cellHeight,rows:{projectile:0,heal:1,ultimate:2},frames:4,modes:prepared.map(row=>row.mode),rects};
    console.log(`Prepared ${id}: ${manifest[id].modes.join(' / ')}`);
  }
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
})();
