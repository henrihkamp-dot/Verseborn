const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
 const source=process.argv[2];if(!source)throw Error('Pass the generated overhead-smash strip');
 const regions=[[47,504],[588,1095],[1100,1718],[1719,2124]],anchors=[345,895,1415,1950],scale=.7;
 const overlays=[];
 for(let col=0;col<4;col++){
  const [left,right]=regions[col];
  const input=await sharp(source).extract({left,top:0,width:right-left,height:724}).resize({width:Math.round((right-left)*scale)}).png().toBuffer();
  overlays.push({input,left:col*640+Math.round(320-(anchors[col]-left)*scale),top:20});
 }
 const directory=path.resolve(__dirname,'../public/game/assets/sprites/flameguard-melee');fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,'verseborn-overhead-228.webp');
 await sharp({create:{width:2560,height:640,channels:4,background:'#00000000'}}).composite(overlays).webp({lossless:true}).toFile(file);
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let edges=0;
 for(let col=0;col<4;col++)for(let y=0;y<640;y++)for(const x of [col*640,col*640+639])if(data[(y*info.width+x)*4+3])edges++;
 if(edges)throw Error('Overhead lute touches a frame edge');
 fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({Verseborn:{file:path.basename(file),columns:4,rows:1,cellWidth:640,cellHeight:640,baseline:475,referenceHeight:266,anchorX:320,directFrames:true,raisedReach:1.62,rowMap:{melee:0}}},null,2)+'\n');
 console.log(JSON.stringify({file,frames:4,edges,scale}));
})().catch(error=>{console.error(error);process.exitCode=1});
