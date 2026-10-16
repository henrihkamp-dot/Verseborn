// Normal Hall only: continuous, locally pinned movement in the existing artwork.
(() => {
 'use strict';
 const sheets=new Map(),clocks=new WeakMap(),TAU=Math.PI*2;
 // Regions: centre x/y, radius x/y, horizontal/vertical travel as fractions of body height.
 const cloth=(x=.81,y=.67,rx=.23,ry=.30,a=.032)=>[x,y,rx,ry,a,.005,0];
 const hair=(x=.65,y=.20,rx=.23,ry=.20,a=.018)=>[x,y,rx,ry,a,.004,1];
 const guard=(x=.18,y=.50,rx=.20,ry=.35,a=.013)=>[x,y,rx,ry,a,.009,2];
 const profiles={
  'Slobbo':[cloth(.82,.4,.23,.29),cloth(.72,.77,.24,.19,.021),guard(.11,.50,.17,.25)],
  'Brokk':[hair(.47,.40,.22,.23,.013),cloth(.78,.65),guard(.65,.17,.29,.25,.009)],
  'High Administrator Thaddeus':[cloth(.84,.65),hair(.58,.13),guard(.23,.50,.17,.39,.009)],
  'Dock Foreman':[cloth(.83,.63,.23,.29,.027),hair(.58,.18),guard(.17,.53)],
  'Gorg':[cloth(.88,.65,.18,.28,.027),guard(.17,.69,.20,.24,.011)],
  'Corrupt Clergy':[cloth(.80,.66),cloth(.51,.85,.27,.12,.014),guard(.16,.43,.15,.38,.008)],
  'Seal Bearer':[cloth(.79,.67),guard(.16,.34,.20,.32,.010),cloth(.43,.82,.20,.13,.015)],
  'Saint Justin':[hair(.37,.43,.18,.23,.012),cloth(.80,.65),guard(.18,.50,.14,.24,.008)],
  'Inkbound Auditor':[cloth(.83,.55),guard(.16,.45,.19,.35,.013),cloth(.52,.86,.25,.13,.014)],
  'Archive Custodian':[cloth(.83,.65),guard(.18,.48,.21,.28,.010),hair(.72,.20)],
  'Cracked Pillar':[guard(.43,.36,.17,.37,.010),cloth(.55,.82,.24,.16,.015)],
  'Grumm':[hair(.47,.43,.22,.22,.012),guard(.14,.73,.23,.22,.016),cloth(.53,.80,.21,.17,.012)],
  'Lysra':[hair(.72,.34,.24,.36,.028),cloth(.70,.80,.25,.20,.024),guard(.16,.48,.16,.39,.009)],
  'Kaeldrin':[cloth(.82,.59,.23,.35,.032),hair(.53,.13),guard(.15,.68,.22,.29,.012)],
  'Ash Wyrm':[cloth(.80,.29,.23,.29,.024),cloth(.91,.72,.15,.26,.025),guard(.18,.30,.17,.21,.006)],
  'Elder Plumpin':[cloth(.81,.68),hair(.34,.44,.17,.23,.014),guard(.12,.45,.14,.37,.010)],
  'Red Dragon Lord':[cloth(.80,.38,.22,.32,.024),cloth(.87,.83,.20,.16,.026),guard(.17,.28,.17,.21,.006)],
  'Clock Goblin':[cloth(.74,.58),guard(.18,.65,.18,.28,.021),hair(.57,.13,.25,.18,.011)],
  'Lord Sprocket':[cloth(.84,.66),hair(.46,.17),hair(.85,.19,.17,.24,.015),guard(.20,.52)],
  'Baron Revus Veln':[cloth(.82,.62),hair(.47,.15),guard(.18,.73,.20,.25,.013)],
  'Dawn Gate Sentinel':[cloth(.80,.64),hair(.51,.12,.20,.23,.022),guard(.10,.47,.13,.44,.009)],
  'Shade':[cloth(.84,.59,.21,.33,.034),hair(.33,.22,.16,.18,.017),guard(.19,.64,.21,.22,.021),guard(.85,.72,.15,.20,.015)],
  'Nyx Vael':[hair(.71,.25,.23,.31,.026),cloth(.72,.81,.24,.16,.022),guard(.09,.42,.13,.21,.014)],
  'Jory Bellwick':[hair(.47,.15,.30,.21,.024),cloth(.86,.62),guard(.20,.50,.20,.22,.011)],
  'Rava':[hair(.57,.19,.27,.25,.024),cloth(.88,.71,.15,.24,.025),guard(.10,.46,.13,.37,.012)],
  'Tja':[hair(.47,.14,.28,.23,.028),cloth(.81,.67,.25,.29,.036),guard(.21,.35,.15,.20,.008)],
  'King Maeric':[cloth(.80,.63),hair(.37,.36,.18,.24,.013),guard(.18,.68,.19,.30,.012)],
  'Angry Gnome Mob':[guard(.09,.22,.13,.27,.023),guard(.45,.11,.18,.24,.017),hair(.79,.36,.20,.18,.014),cloth(.83,.76,.15,.18,.017)],
  'Ash Quarter Thugg':[hair(.43,.20),cloth(.77,.53),guard(.19,.39,.23,.22,.017)],
  'Tibby':[hair(.48,.18,.27,.24,.027),cloth(.83,.65,.24,.30,.036),guard(.13,.50,.19,.20,.015)],
  'Berend Blimpstone':[hair(.35,.40,.21,.23,.014),guard(.13,.46,.16,.26,.020),cloth(.67,.82,.23,.18,.020)],
  'Marla':[hair(.70,.19,.23,.23,.018),cloth(.65,.80,.28,.20,.024),guard(.13,.42,.20,.25,.020)],
  'Prince Lucan Cindralis':[hair(.47,.13,.27,.23,.023),cloth(.82,.70),guard(.18,.48,.21,.27,.014)],
  'Frostmile Wyrm':[cloth(.79,.28,.24,.28,.025),cloth(.89,.78,.18,.19,.023),guard(.15,.35,.17,.22,.007)],
  'Ember Leviathan':[hair(.63,.12,.30,.24,.021),cloth(.83,.45,.21,.31,.029),cloth(.80,.83,.23,.17,.019)],
  'Solinar':[hair(.81,.27,.19,.31,.027),cloth(.82,.65,.21,.30,.035),guard(.17,.60,.15,.38,.010)],
  'Sir Reginald':[hair(.64,.19,.25,.25,.023),cloth(.82,.62,.25,.32,.037),guard(.16,.71,.20,.26,.016)],
  'Concierge Veyr':[hair(.50,.13,.26,.23,.023),cloth(.81,.68),guard(.20,.50,.18,.24,.010)],
  'Sister Maelin':[hair(.72,.31,.23,.31,.023),cloth(.79,.76,.23,.23,.031),guard(.14,.49,.17,.37,.011)],
  'Guild Inspector Voss':[cloth(.80,.65),hair(.55,.18),guard(.15,.62,.18,.31,.013)],
  'Draconic Guide':[cloth(.83,.60,.24,.32,.031),cloth(.86,.85,.20,.13,.020),guard(.10,.37,.15,.40,.011)],
  'Memory Root Guardian':[cloth(.81,.18,.26,.25,.026),cloth(.84,.80,.22,.19,.020),guard(.12,.44,.16,.24,.007)],
  'Malkhius':[hair(.72,.23,.24,.30,.030),cloth(.82,.63,.23,.30,.037),guard(.18,.65,.17,.24,.016)],
  'Lady Morvanna':[hair(.71,.24,.22,.30,.026),cloth(.82,.70,.23,.25,.034),cloth(.18,.62,.21,.28,.022)],
  'Koru-Vak, the Iron Oathkeeper':[cloth(.82,.69,.23,.24,.023),hair(.61,.22,.22,.21,.016),guard(.14,.55,.18,.32,.008)],
  'Selyra Quill, the Grand Cantor':[hair(.79,.23,.22,.29,.028),cloth(.84,.65,.19,.31,.034),guard(.15,.42,.17,.31,.011)],
  'Ilyss Vanthe, the First Archivist':[cloth(.86,.49,.16,.36,.034),cloth(.53,.81,.28,.18,.022),guard(.15,.40,.16,.28,.015)],
  'Solinar Enraged':[hair(.81,.26,.19,.29,.033),cloth(.81,.65,.22,.30,.041),guard(.16,.62,.15,.36,.013)]
 };
 const hash=name=>[...name].reduce((value,ch)=>(value*31+ch.charCodeAt(0))>>>0,7);
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 function normalHall(){return Boolean(battle?.hallStage>=1&&battle.hallStage<=60&&!battle.riftEncounter&&!battle.shadowDuel&&!battle.whirlpoolEncounter);}
 function offset(config,regions,u,v,phase){
  // The stance, face and torso are pins, not a whole-body scale or sway.
  const footPin=1-smooth(.86,.98,v);
  const facePin=u>.20&&u<.62&&v>.20&&v<.40;
  const corePin=u>.34&&u<.65&&v>.43&&v<.72;
  if(facePin||corePin||v>=.98)return[0,0];
  let dx=0,dy=0;
  regions.forEach(([cx,cy,rx,ry,ax,ay,kind],index)=>{
   const radius=((u-cx)/rx)**2+((v-cy)/ry)**2;if(radius>=1)return;
   const weight=(1-radius)**2*footPin;
   const wave=Math.sin(phase+index*.83)+.22*Math.sin(phase*2+index*1.17);
   const drift=kind===2?Math.sin(phase+index*.83):wave;
   dx+=weight*ax*config.referenceHeight*drift;
   dy+=weight*ay*config.referenceHeight*Math.sin(phase+(kind===1?.8:1.5)+index*.83);
  });
  return[dx,dy];
 }
 function triangle(image,s0,s1,s2,d0,d1,d2,padding){
  const determinant=s0[0]*(s1[1]-s2[1])+s1[0]*(s2[1]-s0[1])+s2[0]*(s0[1]-s1[1]);
  const coefficients=axis=>[(d0[axis]*(s1[1]-s2[1])+d1[axis]*(s2[1]-s0[1])+d2[axis]*(s0[1]-s1[1]))/determinant,
   (d0[axis]*(s2[0]-s1[0])+d1[axis]*(s0[0]-s2[0])+d2[axis]*(s1[0]-s0[0]))/determinant,
   (d0[axis]*(s1[0]*s2[1]-s2[0]*s1[1])+d1[axis]*(s2[0]*s0[1]-s0[0]*s2[1])+d2[axis]*(s0[0]*s1[1]-s1[0]*s0[1]))/determinant];
  const [a,c,e]=coefficients(0),[b,d,f]=coefficients(1);
  ctx.save();ctx.beginPath();
  const centre=[(d0[0]+d1[0]+d2[0])/3,(d0[1]+d1[1]+d2[1])/3];
  [d0,d1,d2].forEach((point,index)=>{const length=Math.hypot(point[0]-centre[0],point[1]-centre[1])||1;
   const x=point[0]+(point[0]-centre[0])/length*padding,y=point[1]+(point[1]-centre[1])/length*padding;
   if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
  ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
 }
 function draw(sheet,regions,anchorX,baseline,targetHeight,phase){
  const scale=Math.min(targetHeight/sheet.referenceHeight,(baseline-24)/sheet.baseline,(LOGICAL_WIDTH-10)/sheet.width);
  const left=Math.max(5,Math.min(LOGICAL_WIDTH-sheet.width*scale-5,anchorX-sheet.anchorX*scale));
  ctx.save();ctx.translate(left,baseline-sheet.baseline*scale);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=true;
  const columns=8,rows=10,vertices=[];
  for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
   const sx=x/columns*sheet.width,sy=y/rows*sheet.height;
   const delta=offset(sheet,regions,(sx-sheet.body.x)/sheet.body.width,(sy-sheet.body.y)/sheet.body.height,phase);
   vertices.push({s:[sx,sy],d:[sx+delta[0],sy+delta[1]]});
  }
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
   const i=y*(columns+1)+x,a=vertices[i],b=vertices[i+1],c=vertices[i+columns+1],d=vertices[i+columns+2];
   if([a,b,c,d].every(vertex=>vertex.s[0]===vertex.d[0]&&vertex.s[1]===vertex.d[1])){
    const w=b.s[0]-a.s[0],h=c.s[1]-a.s[1];
    ctx.drawImage(sheet.image,a.s[0],a.s[1],w,h,a.s[0],a.s[1],w,h);continue;
   }
   triangle(sheet.image,a.s,b.s,d.s,a.d,b.d,d.d,.8/scale);triangle(sheet.image,a.s,d.s,c.s,a.d,d.d,c.d,.8/scale);
  }
  ctx.restore();
 }
 const ready=(async()=>{
  const response=await fetch('assets/sprites/hall-idle-229/manifest.json?v=229');if(!response.ok)throw Error('Hall idle manifest unavailable');
  const manifest=await response.json();
  await Promise.all(Object.entries(manifest).map(async([key,config])=>{
   const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Hall idle '+key));image.src='assets/sprites/hall-idle-229/'+config.file;});
   if(!profiles[key])throw Error('Missing Hall motion profile '+key);
   sheets.set(key,{...config,image,cycleMs:5600+hash(key)%1800});
  }));
 })();ready.catch(error=>console.error(error));
 const original=drawAnimatedEnemy;
 drawAnimatedEnemy=function(unit,px,py){
  const key=enemyAnimationKey(unit),sheet=sheets.get(key);
  if(!normalHall()||!sheet||unit.hp<=0||['attack','death'].includes(unit.anim))return original(unit,px,py);
  const now=performance.now();
  if(!clocks.has(unit))clocks.set(unit,now-(hash(key)%1000+(battle.enemies.indexOf(unit)+1)*337));
  const phase=(now-clocks.get(unit))/sheet.cycleMs*TAU;
  draw(sheet,profiles[key],px+8,py+31,(enemyAnimationHeights[key]||46)*enemyBattleScale(key)*BATTLE_COMPOSITION_SCALE,phase);
  return true;
 };
 window.HallEnemyIdle={ready,normalHall,profiles,offset,preview(key,x,y,phase,height=76){
  const sheet=sheets.get(key);if(sheet)draw(sheet,profiles[key],x,y,height,phase);
 },get manifest(){return Object.fromEntries(sheets);}};
})();
