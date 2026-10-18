const fs=require('fs'),path=require('path'),sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root='C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2',out='public/game/assets/hall/living-256';
(async()=>{fs.mkdirSync(out,{recursive:true});
await sharp(path.join(root,'exec-ed307e11-5e7e-48b9-9577-b23f9aa5cec9.png')).resize(160,147).webp({quality:92}).toFile(out+'/drone.webp');
await sharp(path.join(root,'exec-d7748ce5-6b30-4b3b-b038-00816df30a25.png')).resize(90,96,{fit:'fill'}).webp({quality:95}).toFile(out+'/drone-wall.webp');
// Equal source cells preserve feet and body scale across every cooking pose.
await sharp(path.join(root,'exec-989f6f84-1f10-4baa-b3f5-73458242c00a.png')).resize(576,432).webp({quality:92}).toFile(out+'/torren-kitchen.webp');
await sharp(path.join(root,'exec-fa5393a1-de35-4585-aaae-10ba12c962cd.png')).trim().resize(96,96,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:92}).toFile(out+'/prep-block.webp');
console.log('Prepared four small Hall assets.');})();
