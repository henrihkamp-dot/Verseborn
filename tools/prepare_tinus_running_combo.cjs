const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const generated='C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2/';
async function pixels(file){return sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
function bounds({data,info},left=0,right=info.width){let x1=right,y1=info.height,x2=left,y2=0;for(let y=0;y<info.height;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>16){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}return{left:x1,top:y1,width:x2-x1+1,height:y2-y1+1};}
async function cell(source,box,anchor,scale){return{input:await sharp(source).extract(box).resize({width:Math.round(box.width*scale)}).png().toBuffer(),left:Math.round(256-(anchor-box.left)*scale),top:Math.round(448-box.height*scale)};}
async function atlas(frames,file){await sharp({create:{width:2048,height:512,channels:4,background:'#00000000'}}).composite(frames.map((frame,col)=>({...frame,left:frame.left+512*col}))).webp({lossless:true}).toFile(file);const raw=await pixels(file);for(let col=0;col<4;col++)for(let y=0;y<512;y++)for(const x of[col*512,col*512+511])if(raw.data[(y*2048+x)*4+3])throw Error('Atlas edge clipping '+file);}
(async()=>{
 const output=path.resolve(__dirname,'../../../outputs');
 const runSource=generated+'exec-4de15219-2f0d-4602-8090-b8661f425bc3.png';
 const opposite=generated+'exec-b40377f9-5a28-4624-af0f-257c0ff8f31c.png';
 const original=await pixels(runSource),first=bounds(original,0,560),far=bounds(await pixels(opposite));
 // Replace only the rejected third complete drawing; the first, second and fourth remain intact.
 for(let y=0;y<original.info.height;y++)for(let x=1040;x<1710;x++)original.data[(y*original.info.width+x)*4+3]=0;
 const ratio=first.height/far.height;
 const replacement=await sharp(opposite).extract(far).resize({height:first.height}).png().toBuffer();
 const corrected=path.join(output,'tinus-run-corrected-227.png');
 await sharp(original.data,{raw:{width:original.info.width,height:original.info.height,channels:4}}).composite([{input:replacement,left:Math.round(1430-(640-far.left)*ratio),top:first.top}]).png().toFile(corrected);
 const correctedPixels=await pixels(corrected),runRanges=[[0,560],[620,1040],[1040,1710],[1710,2172]],anchors=[310,870,1430,1975];
 const runFrames=[];
 for(let i=0;i<4;i++)runFrames.push(await cell(corrected,bounds(correctedPixels,...runRanges[i]),anchors[i],338/first.height));
 const assetDir=path.resolve(__dirname,'../public/game/assets/tinus');
 await atlas(runFrames,path.join(assetDir,'run-227.webp'));
 const comboSource=generated+'exec-0d7b4639-1a5a-4bae-90de-ddc8388b9e92.png';
 const nearPunch=generated+'exec-851047d8-4162-4df1-be43-50d7e522c95a.png';
 const combo=await pixels(comboSource),punch=await pixels(nearPunch);
 const specs=[[comboSource,bounds(combo,0,550),250],[nearPunch,bounds(punch),650],[comboSource,bounds(combo,1100,1700),1400],[comboSource,bounds(combo,1700,2172),1975]];
 const comboFrames=[];for(const[source,box,anchor]of specs)comboFrames.push(await cell(source,box,anchor,338/box.height));
 await atlas(comboFrames,path.join(assetDir,'combo-227.webp'));
 const manifestFile=path.join(assetDir,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));
 const config={columns:4,rows:1,cellWidth:512,cellHeight:512,baseline:448,referenceHeight:338,directFrames:true,anchorX:256};
 manifest.mugMelee={...config,file:'combo-227.webp',rowMap:{melee:0}};
 manifest.run={...config,file:'run-227.webp',rowMap:{run:0}};
 fs.writeFileSync(manifestFile,JSON.stringify(manifest)+'\n');
 console.log(JSON.stringify({corrected,run:'run-227.webp',combo:'combo-227.webp',cellEdges:'clear'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
