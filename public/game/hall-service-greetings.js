// Brief, rotating resident exchanges before the existing service opens.
(() => {
  'use strict';
  const exchanges={
    Marla:[
      [['Marla','You look as though the city has been singing back at you.'],['Verseborn','Mostly in a threatening key.']],
      [['Verseborn','Anything warm?'],['Marla','Soup. Advice is free, but you have to eat first.']],
      [['Marla','All your companions back in one piece?'],['Verseborn','All the important pieces.']],
      [['Verseborn','The Hall feels a little more like home.'],['Marla','Good. Homes still have washing-up.']],
      [['Marla','No rehearsing over the simmering pot today.'],['Verseborn','One harsh review and suddenly there are rules.']]
    ],
    Mira:[
      [['Mira','Mind your hand. That blade is coated.'],['Verseborn','A warm welcome, as always.']],
      [['Verseborn','How many knives do you actually have?'],['Mira','Enough to discourage that question.']],
      [['Mira','Try looking where you step instead of where I am standing.'],['Verseborn','Excellent tactical advice. Difficult, but excellent.']],
      [['Verseborn','Something for a stubborn enemy?'],['Mira','Most things become less stubborn when they stop being comfortable.']],
      [['Mira','Quiet hands. Quiet feet.'],['Verseborn','The singing is negotiable?'],['Mira','No.']]
    ],
    Torren:[
      [['Torren','Sit. You cannot face a wall on an empty stomach.'],['Verseborn','I was hoping to walk around the wall.']],
      [['Verseborn','Smells good in here.'],['Torren','Then stop talking over it and bring a bowl.']],
      [['Torren','Shield steady. Feet planted. Dinner packed.'],['Verseborn','In that order?'],['Torren','Dinner first, if there is time.']],
      [['Verseborn','Any wisdom for the next fight?'],['Torren','Come back hungry. Means you came back.']],
      [['Torren','Sparky has been investigating the pantry again.'],['Verseborn','Was anything recovered?'],['Torren','A burp.']]
    ],
    Glimmer:[
      [['Glimmer','Do not lean on that. It is either finished or about to be interesting.'],['Verseborn','A distinction I would like established first.']],
      [['Verseborn','Any new inventions?'],['Glimmer','Three! Two of them were even intentional.']],
      [['Glimmer','Hear that rattle?'],['Verseborn','Should I be worried?'],['Glimmer','No. I found the rattle. That is progress.']],
      [['Verseborn','The resonance machine is still listening.'],['Glimmer','Good. Somebody should listen when you sing.']],
      [['Glimmer','I have a brilliant idea.'],['Verseborn','Do I need a helmet?'],['Glimmer','I love how quickly you learn.']]
    ],
    Kael:[
      [['Kael','A moment of quiet before we begin.'],['Verseborn','I can manage a moment. Probably.']],
      [['Verseborn','Still reading?'],['Kael','I reached the same paragraph three times. Seerin is apparently winning an argument with a shield.']],
      [['Kael','Faith demands attention, not merely volume.'],['Verseborn','Was that advice, or a review?']],
      [['Verseborn','How goes the search for answers?'],['Kael','Slowly. The important ones seldom volunteer.']],
      [['Kael','Do try to come back without bringing another curse indoors.'],['Verseborn','I will ask it to wait outside.']]
    ],
    Seerin:[
      [['Seerin','Shoulders back. You look like a defeated question mark.'],['Verseborn','I was saving my heroic posture.']],
      [['Verseborn','How is training?'],['Seerin','The dummy has stopped complaining. Your turn.']],
      [['Seerin','Ready to face yourself?'],['Verseborn','Depends how much he knows about me.']],
      [['Verseborn','The children at the orphanage keeping you busy?'],['Seerin','Always. They deserve somebody who shows up.']],
      [['Seerin','You can be frightened and still stand your ground.'],['Verseborn','Good. I appear to have mastered the first half.']]
    ],
    Sparky:[
      [['Sparky','Prrr... hrrup!'],['Verseborn','I will take that as a promising report.']],
      [['Verseborn','Found anything interesting?'],['Sparky','Chrrp! Krrr... brrup.']],
      [['Sparky','Grrr... prrrr.'],['Verseborn','Yes, you are terrifying. Please leave the boots attached to my feet.']],
      [['Verseborn','That smells suspiciously like Torren’s pantry.'],['Sparky','Hrrm. ...Brrrup!']],
      [['Sparky','Krr? Chrr-chrr!'],['Verseborn','Show me, little one.']]
    ],
    Tinus:[
      [['Tinus','Coffee first. Destiny can queue.'],['Verseborn','Does it usually agree to that?']],
      [['Verseborn','Any trouble between worlds?'],['Tinus','Mostly invoices. Terrible things, invoices.']],
      [['Tinus','You are humming again.'],['Verseborn','Is it helping?'],['Tinus','My coffee is vibrating. Jury is out.']],
      [['Verseborn','Are your acquaintances ready?'],['Tinus','They have been described as ready. Also as a liability.']],
      [['Tinus','Marla says no more portals near the soup.'],['Verseborn','A reasonable rule.'],['Tinus','You would think so. Surprisingly restrictive.']]
    ]
  };
  const counts=new Map();let pending=null;
  function greet(id,after){
    if(!exchanges[id]||pending||mode!=='walk'||state.map!=='emberHallBattles'||activeRecruitScene||window.HallOpening?.active||window.TinusRecruitment?.replaying)return false;
    const index=counts.get(id)||0;counts.set(id,index+1);pending={id,after};activePoint=null;heldDirection=null;fieldDestination=null;emberHallWorld.clearNavigation();emberHallWorld.hideAmbientChat();
    showTalk(exchanges[id][index%exchanges[id].length],{portraits:['Verseborn',id],skippable:true,after:()=>{const current=pending;pending=null;if(current&&state.map==='emberHallBattles'&&!activeRecruitScene)current.after();}});return true;
  }
  const oldService=HallHub.openService;
  HallHub.openService=function(id){if((id==='Marla'||state.party.includes(id))&&greet(id,()=>oldService(id)))return true;return oldService(id);};
  const oldTinus=TinusRecruitment.interact;
  TinusRecruitment.interact=function(){if(state.party.includes('Tinus')&&TinusRecruitment.progress().phase==='resident'&&greet('Tinus',()=>oldTinus()))return true;return oldTinus();};
  window.HallServiceGreetings={exchanges,greet,get pending(){return pending?.id||null;}};
})();

