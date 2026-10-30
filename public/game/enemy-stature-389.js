/* Visual proportions only. Boss rank is not a species or an age. */
(()=>{
 const rift={
  dragon:['large',100,78],engine:['large',88,70],warden:['large',70,56],brute:['large',68,49],hunter:['large',62,43],stalker:['large',56,43],
  bear:['hybrid',50,49],raccoon:['hybrid',40,43],rabbit:['hybrid',43,43],squirrel:['hybrid',38,43],mushroom:['small',43,43],fae:['small',34,36],
  pippa:['child',40,56],mina:['child',34,36],sella:['child',34,36],pursuer:['adult',55,43],elf:['adult',57,43],collector:['adult',60,43],velourne:['adult',58,56],benji:['adult',58,56]
 };
 const whirlpool={benji:['adult',58,67],demonlord:['large',94,75],'klaas-de-klemmer':['adult',57,62],'revisor-9':['adult',55,67],bill:['adult',64,62],felinus:['hybrid',55,80],'liza-flux':['adult',55,65],satyr:['hybrid',53,73]};
 function profile(u){
  let entry=u.riftKey?rift[u.riftKey]:u.whirlpoolKey?whirlpool[u.whirlpoolKey]:null;
  const key=enemyAnimationKey(u),native=(enemyAnimationHeights[key]||44)*enemyBattleScale(key)*BATTLE_COMPOSITION_SCALE;
  if(!entry&&u.sparringId){const id=u.sparringId,h=(battleSpriteHeights[id]||48)*BATTLE_COMPOSITION_SCALE;entry=[id==='Sparky'||id==='Glimmer'?'small':id==='Torren'?'dwarf':'adult',h*(id==='Torren'?1.10:['Sparky','Glimmer'].includes(id)?1:1.25),h*2];}
  if(!entry){
   if(/Dragon|Wyrm|Leviathan|Solinar|Memory Root Guardian|Koru-Vak|Cracked Pillar/i.test(key))entry=['large',native*1.25,native];
   else if(key==='Gorg')entry=['large',75,native];
   else if(['Brokk','Grumm'].includes(key))entry=['dwarf',52,native];
   else if(['Slobbo','Clock Goblin','Angry Gnome Mob','Lord Sprocket'].includes(key))entry=['small',Math.min(43,native),native];
   else entry=['adult',55,native];
  }
  return {kind:entry[0],targetHeight:entry[1]*(u.summonedBy?(u.encounterSize||.6):1),nativeHeight:entry[2]};
 }
 window.EnemyStature={profile};
})();
