// Kael's occasional household inspections use the Hall's collision-tested routes.
(() => {
  'use strict';
  const conversations = {
    Mira: [
      [['Kael','Mira. A dagger beneath my reading chair is not a bookmark.'],['Mira','Did it keep your place?'],['Kael','It nearly kept my foot. Put it in its sheath.'],['Mira','Fine. You may keep the bookmark.']],
      [['Kael','There are throwing knives beside the clean cups.'],['Mira','Clean knives. I am not an animal.'],['Kael','The distinction will comfort whoever reaches for a teaspoon.'],['Mira','I will move them. You are very attached to your teaspoons.']],
      [['Kael','Who left a crossbow on the stairs?'],['Mira','Unloaded. Mostly decorative.'],['Kael','Stairs are for walking. Not for testing the meaning of mostly.'],['Mira','You could have just asked me to move it.']],
      [['Kael','A garrote does not belong in the laundry basket.'],['Mira','It needed washing.'],['Kael','So do the towels. They have not attempted to strangle me.'],['Mira','Give them time. They live with Verseborn.']],
      [['Kael','Your spare sword is leaning against the library door.'],['Mira','Keeps unwanted visitors out.'],['Kael','It is my library. I should qualify as a wanted visitor.'],['Mira','An excellent point. I will find another door.']]
    ],
    Seerin: [
      [['Kael','Must every shield strike be announced to the entire Hall?'],['Seerin','The enemy should know I am coming.'],['Kael','The enemy is a wooden dummy. I am trying to read.'],['Seerin','Then I shall warn the dummy more quietly.']],
      [['Kael','I have read the same sentence seven times.'],['Seerin','Good. Repetition builds discipline.'],['Kael','Your sword is striking a shield between every word.'],['Seerin','Eight times, then. We both improve.']],
      [['Kael','The floor is not your opponent. Stop challenging it.'],['Seerin','Footwork, Kael. The foundation of a sound defense.'],['Kael','It is also the foundation beneath my shaking inkpot.'],['Seerin','I will move the drill away from the library wall.']],
      [['Kael','That battle cry has interrupted three consecutive meditations.'],['Seerin','Was the fourth one successful?'],['Kael','There has not been a fourth. I came here.'],['Seerin','Then I owe you one quiet round.']],
      [['Kael','The bell means supper. It is not a training signal.'],['Seerin','A shield raised quickly saves lives.'],['Kael','A shield lowered occasionally saves my concentration.'],['Seerin','Very well. Supper first. We can both recover.']]
    ],
    Glimmer: [
      [['Kael','Lady Glinda Sprocket von KlikKlak. This Hall has rules.'],['Glimmer','Oh no. You brought the entire name.'],['Kael','A proper lady does not sleep in a different bed every night.'],['Glimmer','Then call me Glimmer. Much easier on both of us.']],
      [['Kael','Glinda Sprocket von KlikKlak, you have been assigned a bed.'],['Glimmer','And I am comparing it with the other beds. For science.'],['Kael','The house rules do not contain a scientific exemption.'],['Glimmer','Your edition does not. Mine is still in development.']],
      [['Kael','Were those your goggles on someone else\'s pillow?'],['Glimmer','An overnight pressure test. Extremely technical.'],['Kael','A proper lady asks before conducting tests in another bed.'],['Glimmer','Fine. May I conduct an extremely technical nap?']],
      [['Kael','Lady Glinda, we discussed sleeping arrangements yesterday.'],['Glimmer','Then the discussion is practically an antique.'],['Kael','House Rules Are Sacred. They do not expire overnight.'],['Glimmer','Neither do I. That is why I need a comfortable bed.']],
      [['Kael','You cannot change beds every time a prototype starts ticking.'],['Glimmer','You would prefer I sleep beside the ticking?'],['Kael','I would prefer you stop storing prototypes under mattresses.'],['Glimmer','Now that is a much more useful rule.']]
    ]
  };
  conversations.Tinus = [
    [['Kael','All eight encounters settled. Can we now settle the matter of your volume?'],['Tinus','That was my indoor voice.'],['Kael','The library is two rooms away. I heard your entire victory speech.'],['Marla','Kael, buy a drink or go bother someone else. My bar is not your pulpit.'],['Tinus','I like this establishment.'],['Kael','I gathered. Everyone gathered.']],
    [['Kael','Must every story end with you explaining how loudly you won?'],['Tinus','No. Some begin that way.'],['Kael','A little restraint would improve the atmosphere.'],['Marla','So would you stopping at the door with your complaints. Drink, help wash up, or get out.'],['Tinus','Put his tea on my tab.'],['Kael','That does not purchase my approval.'],['Marla','Good. It purchases tea. Sit down.']],
    [['Kael','People can hear you without the running commentary.'],['Tinus','Then my system is working.'],['Kael','I had hoped the Whirlpool might exhaust you.'],['Marla','Try exhausting the washing-up instead, both of you.'],['Tinus','He started it.'],['Kael','I came here for quiet.'],['Marla','Then you took a spectacular wrong turn.']]
  ];
  const whirlpoolComplete = () => Array.from({length:8},(_,i)=>i+1).every(n=>hallBattleProgress().whirlpool?.cleared?.includes(n));
  const destinations = { Mira:{x:124,y:310}, Seerin:{x:120,y:188}, Glimmer:{x:448,y:86}, Tinus:{x:446,y:193} };
  const order=Object.keys(conversations),variants={Mira:0,Seerin:0,Glimmer:0,Tinus:0};
  let visit=null,home=null,wait=15000,last=null,cursor=0,loaded=false,savedProgress=null;
  const walkImage=new Image();
  const ready=new Promise((resolve,reject)=>{walkImage.onload=()=>{loaded=true;resolve();};walkImage.onerror=()=>reject(Error('Kael walk sheet unavailable'));});
  walkImage.src='assets/hall/kael-walk-v237.webp';
  function actor(){return window.emberHallWorld?.actors.find(a=>a.id==='Kael');}
  function facing(dx,dy){const ax=Math.abs(dx),ay=Math.abs(dy);if(Math.min(ax,ay)>Math.max(ax,ay)*.4142)return dy>0?(dx>0?4:5):(dx>0?6:7);return ax>ay?dx>0?2:3:dy>0?0:1;}
  function beginVisit(id){
    const world=window.emberHallWorld,kael=actor();
    if(id==='Tinus'&&(!whirlpoolComplete()||window.TinusRecruitment?.resident()?.pose!=='seated'))return false;
    if(visit||!loaded||!world||!state.party.includes('Kael')||!state.party.includes(id)||!conversations[id])return false;
    if(!home)home={x:kael.x,y:kael.y,approach:{...kael.approach}};
    const path=world.findPath(kael,destinations[id].x,destinations[id].y);
    if(!path?.length)return false;
    const target=id==='Tinus'?window.TinusRecruitment.resident():world.actors.find(a=>a.id===id),pool=window.HallProgressionDialogue?.visit(id,conversations[id])||conversations[id],lines=pool[variants[id]++%pool.length];
    visit={id,target,lines,phase:'outbound',path,index:0,elapsed:0,walkPhase:0};
    kael.visiting=true;kael.walking=false;
    return true;
  }
  function finish(){const kael=actor();Object.assign(kael,{x:home.x,y:home.y,approach:{...home.approach},visiting:false,walking:false});visit=null;wait=45000;window.emberHallWorld.hideAmbientChat('kael-visit');}
  function tick(now){
    const dt=last===null?0:Math.min(50,Math.max(0,now-last));last=now;
    const world=window.emberHallWorld,kael=actor();if(!world||!kael)return;
    const progress=hallBattleProgress();if(savedProgress!==progress){if(savedProgress&&home){Object.assign(kael,{x:home.x,y:home.y,approach:{...home.approach},visiting:false,walking:false});visit=null;wait=15000;cursor=0;Object.keys(variants).forEach(id=>variants[id]=0);world.hideAmbientChat('kael-visit');}savedProgress=progress;}
    const busy=mode!=='walk'||activeRecruitScene||window.TinusRecruitment?.replaying||(world.scene&&now-world.scene.started<world.scene.duration);
    if(busy){kael.walking=false;world.hideAmbientChat('kael-visit');return;}
    if(!visit){
      world.hideAmbientChat('kael-visit');if(!state.party.includes('Kael')||!loaded)return;
      wait-=dt;if(wait>0)return;
      for(let i=0;i<order.length;i++){const id=order[cursor++%order.length];if(beginVisit(id))break;}
      if(!visit)wait=15000;return;
    }
    if(visit.phase==='talk'){
      kael.walking=false;visit.elapsed+=dt;
      world.ambientChat('kael-visit',[visit.lines],[kael,visit.target,world.actors.find(a=>a.id==='Marla')].filter(Boolean),world.camera,visit.elapsed,72000,600);
      if(visit.elapsed>=600+visit.lines.length*5200-1000+800){
        world.hideAmbientChat('kael-visit');visit.path=world.findPath(kael,home.x,home.y);visit.index=0;visit.phase='returning';
        if(!visit.path?.length)visit.phase='retry-return';
      }
      return;
    }
    if(visit.phase==='retry-return'){visit.path=world.findPath(kael,home.x,home.y);visit.index=0;if(visit.path?.length)visit.phase='returning';return;}
    let distance=42*dt/1000,moved=0;
    while(distance>0&&visit.index<visit.path.length){
      const point=visit.path[visit.index],dx=point.x-kael.x,dy=point.y-kael.y,length=Math.hypot(dx,dy);
      if(length<.001){visit.index++;continue;}
      const step=Math.min(distance,length,.65),x=kael.x+dx/length*step,y=kael.y+dy/length*step;
      if(world.collision(x,y)){kael.walking=false;return;}
      kael.x=x;kael.y=y;kael.facing=facing(dx,dy);distance-=step;moved+=step;
      if(length<=step+.001)visit.index++;
    }
    kael.walking=moved>0;visit.walkPhase+=moved/5;kael.walkPhase=visit.walkPhase;
    kael.approach={x:kael.x,y:kael.y};
    if(visit.index>=visit.path.length){
      kael.walking=false;
      if(visit.phase==='returning'){finish();return;}
      visit.phase='talk';visit.elapsed=0;kael.facing=facing(visit.target.x-kael.x,visit.target.y-kael.y);
      world.resetAmbientChat('kael-visit');
    }
  }
  window.KaelHallVisits={ready,walkImage,tick,beginVisit,conversations,destinations,whirlpoolComplete,get visit(){return visit;},get wait(){return wait;}};
})();
