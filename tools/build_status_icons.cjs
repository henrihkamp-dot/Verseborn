const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/Henri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.join(__dirname,'../public/game/assets/ui/status');
const buffs=['strengthUp','magicUp','defenseUp','damageUp','agilityUp','critUp','shadowUp','echoPower','evasion','barrier','mechGuard','holyFollowUp','combatDrone','vampiric','stunFocus'];
const debuffs=['poison','burn','bleed','marked','physicalVulnerability','magicVulnerability','holyVulnerability','critExposed','agilityDown','disrupted','defenseDown','magicDefenseDown','sleep','stun','silence','shadowExposed','broken','resonanceLocked','overheated'];
(async()=>{
  fs.mkdirSync(root,{recursive:true});
  for(const [kind,names,file] of [['buff',buffs,'2505694b-ef27-486b-9f20-07ccab12f313'],['debuff',debuffs,'ccd4696b-ba33-4f3a-b390-51c472c5c352']]) {
    const input=await sharp(`C:/Users/Henri/AppData/Local/Temp/codex-clipboard-${file}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=0;i<names.length;i++) {
      const row=Math.floor(i/5),col=i%5;
      const left=kind==='buff'?[24,315,592,870,1152][col]:row===3?[162,424,688,964][col]:[132,372,605,842,1092][col];
      const top=kind==='buff'?[35,368,697][row]:[12,280,542,790][row];
      const width=kind==='buff'?270:row===3?244:230;
      const height=kind==='buff'?220:row===3?188:182;
      const data=await sharp(input.data,{raw:input.info}).extract({left,top,width,height}).raw().toBuffer();
      // Remove the printed turn medallion; live values are rendered by the HUD.
      const cx=(kind==='buff'?[250,528,808,1090,1380][col]:[[308,544,773,1004,1255],[326,563,782,1033,1281],[311,550,771,1020,1289],[367,625,900,1140]][row][col])-left;
      const cy=(kind==='buff'?[83,414,744][row]:[55,320,579,827][row])-top,r=kind==='buff'?44:39;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if((x-cx)**2+(y-cy)**2<r*r)data[(y*width+x)*4+3]=0;
      await sharp(data,{raw:{width,height,channels:4}}).resize(96,96,{fit:'contain',background:'#00000000'}).webp({lossless:true}).toFile(path.join(root,names[i]+'.webp'));
    }
  }
  console.log('34 status glyphs exported; labels excluded, printed durations removed.');
})().catch(e=>{console.error(e);process.exitCode=1});
