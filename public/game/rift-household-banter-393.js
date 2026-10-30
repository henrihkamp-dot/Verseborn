// Ambient conversations advance only while the player is actually in the vault.
(() => {
  'use strict';
  const dragon='Stone Sleeper';
  const escalating=[
    [['Orivell','Tea, brother?'],['Aethren','You have asked four times.'],[dragon,'And I have heard all four.'],['Orivell','Excellent. Three cups, then.']],
    [['Aethren','Stop tapping the spoon.'],['Orivell','I am checking the porcelain.'],[dragon,'I can hear it through the mountain.'],['Orivell','Sound craftsmanship.'],[dragon,'Put. It. Down.']],
    [['Orivell','Does an elder prefer one lump or two?'],['Aethren','He prefers silence.'],[dragon,'A preference I have expressed with remarkable patience.'],['Orivell','No sugar, then.'],[dragon,'NO SPOON, EITHER.']],
    [['Aethren','Perhaps we should take our discussion elsewhere.'],['Orivell','The acoustics are lovely here.'],[dragon,'I AM THE ACOUSTICS.'],['Orivell','And very well maintained.'],[dragon,'You are testing a patience older than your bloodline.']],
    [['Orivell','The kettle sounds angry.'],['Aethren','That is not the kettle.'],[dragon,'ONE MORE WORD ABOUT TEA.'],['Orivell','Would biscuits be safer?'],['Aethren','Orivell.'],[dragon,'How do you make silence sound so difficult?']],
    [['Aethren','We really should stop.'],['Orivell','Agreed. After this cup.'],[dragon,'I could remain furious for a thousand years.'],['Orivell','We would keep the kettle on.'],[dragon,'Yes. You would. That is the problem.'],[dragon,'Very well. Talk. I refuse to spend another age arguing with a teapot.']]
  ];
  const resigned=[
    [['Orivell','I think he is getting used to us.'],['Aethren','That is resignation, brother.'],[dragon,'A distinction I would appreciate you remembering.'],['Orivell','Tea helps with that.'],[dragon,'Of course it does.']],
    [['Aethren','The cups are clean.'],['Orivell','Then our work here is done.'],[dragon,'Astonishing. An entire afternoon survived through crockery.'],['Orivell','Same time tomorrow?'],[dragon,'Apparently.']]
  ];
  const inspections=[
    [['Kael','If you intend to stay in our secret underground tavern, you can pull your weight.'],['Orivell','We provide atmosphere.'],['Kael','You consume tea. At a rate the accounts describe as alarming.'],['Aethren','I did suggest a rota.'],['Kael','Then start with the cups. Both of you.']],
    [['Kael','Sixty stages behind us, and somehow this tea bill remains undefeated.'],['Orivell','A formidable opponent.'],['Kael','So is a broom, apparently. Neither of you has approached one.'],['Aethren','I will take the floor.'],['Orivell','I shall supervise the kettle.'],['Kael','You shall wash it.']]
  ];
  const duration=lines=>lines.length*5200+1000;
  const escalationLength=escalating.reduce((n,c)=>n+duration(c),0);
  let saved=null,last=null,clock=0,wait=30000,visitor=null,inspection=0,speech=null,wasAwake=false;
  function sample(time){
    let pool=escalating,t=Math.max(0,time);
    if(t>=escalationLength){pool=resigned;t=(t-escalationLength)%resigned.reduce((n,c)=>n+duration(c),0);}
    for(const lines of pool){if(t<duration(lines))return {lines,time:t};t-=duration(lines);}
    return {lines:pool[0],time:0};
  }
  // Use the vault's real collision mask; never send Kael through a counter.
  function route(from,to){
    const step=4,key=(x,y)=>x+','+y,start={x:Math.round(from.x/step)*step,y:Math.round(from.y/step)*step};
    const queue=[start],seen=new Map([[key(start.x,start.y),null]]);
    for(let i=0;i<queue.length;i++){
      const p=queue[i];if(Math.hypot(p.x-to.x,p.y-to.y)<=5){const path=[];let q=p;while(q){path.unshift(q);q=seen.get(key(q.x,q.y));}return path;}
      for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(x<8||x>632||y<150||y>336||seen.has(k)||EmberRift.collision(x,y))continue;seen.set(k,p);queue.push({x,y});}
    }
    return null;
  }
  const eligible=()=>state.party.includes('Kael')&&Array.from({length:60},(_,i)=>i+1).every(n=>hallBattleProgress().clearedStages.includes(n));
  function tick(now){
    const p=hallBattleProgress();if(saved!==p){saved=p;clock=0;wait=30000;visitor=null;inspection=0;last=now;wasAwake=false;}
    const dt=last===null?0:Math.min(50,Math.max(0,now-last));last=now;speech=null;
    if(state.map!=='emberRiftVault'||mode!=='walk'||window.RiftAwakening?.active||activeRecruitScene)return;
    const awake=Boolean(EmberRift.progress().awakeningSeen);if(awake!==wasAwake){clock=0;wasAwake=awake;}
    if(!visitor){clock+=dt;if(!eligible())return;wait-=dt;if(wait>0)return;
      const path=route({x:320,y:328},{x:320,y:225});if(!path){wait=15000;return;}
      visitor={id:'Kael',size:40,x:320,y:328,visiting:true,walking:true,facing:1,walkPhase:0,path,index:0,phase:'out',elapsed:0,lines:inspections[inspection++%inspections.length]};
    }
    if(visitor.phase==='talk'){visitor.walking=false;visitor.elapsed+=dt;if(visitor.elapsed>=duration(visitor.lines)){visitor.path=route(visitor,{x:320,y:328});visitor.index=0;visitor.phase='back';if(!visitor.path){visitor=null;wait=120000;}}return;}
    let left=42*dt/1000;
    while(left>0&&visitor.index<visitor.path.length){const q=visitor.path[visitor.index],dx=q.x-visitor.x,dy=q.y-visitor.y,d=Math.hypot(dx,dy);if(d<.01){visitor.index++;continue;}const move=Math.min(left,d),x=visitor.x+dx/d*move,y=visitor.y+dy/d*move;if(EmberRift.collision(x,y)){visitor=null;wait=15000;return;}visitor.x=x;visitor.y=y;visitor.facing=Math.abs(dx)>Math.abs(dy)?dx>0?2:3:dy>0?0:1;visitor.walkPhase+=move/5;left-=move;}
    if(visitor.index>=visitor.path.length){if(visitor.phase==='back'){visitor=null;wait=120000;}else{visitor.phase='talk';visitor.elapsed=0;visitor.walking=false;}}
  }
  function draw(now,camera){
    const world=window.emberHallWorld;if(!world)return;
    if(mode!=='walk'||window.RiftAwakening?.active){world.hideAmbientChat('rift-brothers');world.hideAmbientChat('rift-inspection');world.hideAmbientChat('rift-awake-banter');return;}
    const participants=[EmberRift.merchant,EmberRift.guide,{...EmberRift.dragon,size:60}];
    if(visitor?.phase==='talk'){
      world.hideAmbientChat('rift-brothers');world.hideAmbientChat('rift-awake-banter');world.resetAmbientChat('rift-inspection');world.ambientChat('rift-inspection',[visitor.lines],[visitor,...participants],camera,visitor.elapsed,10400,-visitor.elapsed);return;
    }
    world.hideAmbientChat('rift-inspection');
    if(!EmberRift.progress().awakeningSeen){world.hideAmbientChat('rift-awake-banter');world.ambientChat('rift-brothers',EmberRift.brotherBanter,participants,camera,clock,11400,800);return;}
    const current=sample(Math.max(0,clock-800));
    // A separate key bypasses the old post-awakening pool without resetting other chats.
    world.hideAmbientChat('rift-brothers');world.resetAmbientChat('rift-awake-banter');
    const speaker=world.ambientChat('rift-awake-banter',[current.lines],participants,camera,current.time,10400,-current.time);
    const index=Math.floor(current.time/5200);speech=speaker===dragon?current.lines[index]?.[1]:null;
  }
  function entities(camera){return visitor?[{id:'kael-inspection',y:visitor.y,draw:()=>window.emberHallWorld.drawActor(visitor,visitor.facing,0,camera)}]:[];}
  window.RiftHouseholdBanter={tick,draw,entities,sample,route,eligible,escalating,resigned,inspections,get speech(){return speech;},get visitor(){return visitor;}};
})();
