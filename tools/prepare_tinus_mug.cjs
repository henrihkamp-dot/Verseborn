const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
// Extract intact drawings only. The unused windup changes hands, so it is rejected.
(async () => {
  const source = process.argv[2];
  if (!source) throw Error('Pass the generated mug-strip path.');
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const poses=[{left:35,right:510,anchor:275},{left:1100,right:1720,anchor:1385}];
  const frames=[];
  for(const pose of poses){
    const width=pose.right-pose.left, buffer=Buffer.alloc(width*info.height*4);
    for(let y=0;y<info.height;y++)for(let x=pose.left;x<pose.right;x++){
      // Exclude the next character's distant boot, below the extended mug.
      if(pose.left>1000&&x>1660&&y>360)continue;
      const src=(y*info.width+x)*4,dst=(y*width+x-pose.left)*4;
      data.copy(buffer,dst,src,src+4);
    }
    const scale=.62;
    const image=await sharp(buffer,{raw:{width,height:info.height,channels:4}}).resize({width:Math.round(width*scale)}).png().toBuffer();
    frames.push({input:image,left:Math.round(256-(pose.anchor-pose.left)*scale),top:Math.round(470-654*scale)});
  }
  const order=[0,0,1,0];
  const output=path.resolve(__dirname,'../public/game/assets/tinus/mug-melee-226.webp');
  await sharp({create:{width:2048,height:512,channels:4,background:'#00000000'}})
    .composite(order.map((index,col)=>({...frames[index],left:frames[index].left+512*col})))
    .webp({lossless:true,effort:4}).toFile(output);
  const {data:pixels,info:atlas}=await sharp(output).raw().toBuffer({resolveWithObject:true});
  let edges=0;
  for(let col=0;col<4;col++)for(let y=0;y<atlas.height;y++)for(const x of [col*512,col*512+511])if(pixels[(y*atlas.width+x)*4+3])edges++;
  if(edges)throw Error('Mug sprite touches a cell edge');
  const manifestPath=path.resolve(__dirname,'../public/game/assets/tinus/manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  manifest.mugMelee={file:'mug-melee-226.webp',columns:4,rows:1,cellWidth:512,cellHeight:512,baseline:470,referenceHeight:310,directFrames:true,rowMap:{melee:0},anchorX:256};
  fs.writeFileSync(manifestPath,JSON.stringify(manifest)+'\n');
  console.log(JSON.stringify({output,edges,frames:4,referenceHeight:310}));
})().catch(error=>{console.error(error);process.exitCode=1;});
