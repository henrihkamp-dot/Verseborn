// A small exposure lift helps combat silhouettes read without illuminating the scenery.
(()=>{
 const party=drawBattlePartySprite,enemy=drawEnemy;
 drawBattlePartySprite=function(...args){ctx.save();if(mode==='battle')ctx.filter='brightness(1.08) saturate(.97)';try{return party(...args)}finally{ctx.restore()}};
 drawEnemy=function(...args){ctx.save();if(mode==='battle')ctx.filter='brightness(1.06) saturate(.98)';try{return enemy(...args)}finally{ctx.restore()}};
})();
