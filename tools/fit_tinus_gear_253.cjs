const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
// Match Torren's transparent portrait canvas and visible head-to-foot height.
(async()=>{const body=await sharp('public/game/assets/tinus/equipment.webp').trim().resize({height:1457}).png().toBuffer();await sharp({create:{width:1024,height:1536,channels:4,background:'#00000000'}}).composite([{input:body,gravity:'north',top:38,left:3}]).webp({quality:90,alphaQuality:100}).toFile('public/game/assets/tinus/equipment-fit-253.webp');})();
