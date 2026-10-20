// Resident voices change after real story milestones, without altering services or saves.
(() => {
  'use strict';
  const cleared=()=>Array.from({length:60},(_,i)=>i+1).every(n=>hallBattleProgress().clearedStages.includes(n));
  const awake=()=>Boolean(window.EmberRift?.progress().awakeningSeen);
  const greetings={
    Marla:[
      [['Marla','Sixty stages. Very impressive. The washing-up has reached stage sixty-one.'],['Verseborn','Does it have a weakness?'],['Marla','Soap. Your least practised element.']],
      [['Marla','Someone asked whether you were the famous Verseborn.'],['Verseborn','What did you say?'],['Marla','That depends. Are you here about the singing or the unpaid pudding?']],
      [['Marla','The Hall sounds different with everyone home.'],['Verseborn','Better?'],['Marla','Louder. But yes. Better.']]
    ],
    Mira:[
      [['Mira','Sixty stages, and you still trip over the same rug.'],['Verseborn','A formidable recurring enemy.'],['Mira','I watched you apologise to it.']],
      [['Mira','Father asked whether our celebrated leader had acquired a proper title.'],['Verseborn','What did you tell him?'],['Mira','Mostly House-Trained. Do not make me retract it.']],
      [['Verseborn','People have been whispering about me.'],['Mira','You rehearsed a compliment to a coat rack.'],['Verseborn','It looked supportive.'],['Mira','It was wearing my coat.']]
    ],
    Torren:[
      [['Torren','Sixty stages. A-rank provisions. Coincidence?'],['Verseborn','You labelled the salt A-rank.'],['Torren','Standards start somewhere.']],
      [['Torren','A lady asked about my classification. Naturally, I explained.'],['Verseborn','Was she asking which bin the empty bottles go in?'],['Torren','She stayed for the first three sentences.']],
      [['Torren','I heard you called retreat a tactical interval.'],['Verseborn','We came back and won.'],['Torren','Aye. After your tactical sandwich. Packed two this time.']]
    ],
    Glimmer:[
      [['Glimmer','Sixty stages! The machine survived your entire repertoire.'],['Verseborn','A triumph of music.'],['Glimmer','Insulation. But let us both have this.']],
      [['Glimmer','I am building a gossip filter. It keeps pointing at you.'],['Verseborn','Is it broken?'],['Glimmer','No. That is the upsetting part.']],
      [['Glimmer','Stonewake will want a complete report.'],['Verseborn','Leave out the bit where I got tangled in my cloak.'],['Glimmer','That is the diagram on the cover.']]
    ],
    Kael:[
      [['Kael','Sixty victories do not exempt you from house rules.'],['Verseborn','What about sixty-one?'],['Kael','I have added an appendix.']],
      [['Kael','There is a rumour you meditate with your eyes open.'],['Verseborn','A rare discipline.'],['Kael','You were staring at the pudding.']],
      [['Verseborn','Does the Hall finally feel orderly?'],['Kael','No. It feels worth keeping safe. There is a distinction.'],['Verseborn','Even with the singing?'],['Kael','I am exercising considerable faith.']]
    ],
    Seerin:[
      [['Seerin','The children want to know which of your sixty victories was the bravest.'],['Verseborn','There are so many to choose from.'],['Seerin','They voted for speaking to Mira without swallowing a syllable.']],
      [['Verseborn','Could the Fiery Tornado give us a victory demonstration?'],['Seerin','Could our celebrated bard survive ten laps?'],['Verseborn','The costume remains a treasured historical mystery.']],
      [['Seerin','Sixty stages. You stand a little straighter now.'],['Verseborn','Finally noticed my heroic posture?'],['Seerin','Yes. Keep it when somebody praises you, too.']]
    ],
    Sparky:[
      [['Sparky','Prrr! Chrr-chrr!'],['Verseborn','Yes, sixty victories. You were magnificent.'],['Sparky','Brrrup!'],['Verseborn','The pantry incident is still a separate investigation.']],
      [['Verseborn','Who has been stealing my warm seat?'],['Sparky','Prrrrrr.'],['Verseborn','An excellent defence. The court is now scratching your chin.']],
      [['Verseborn','Everyone has an embarrassing story about me. You would not tell, would you?'],['Sparky','Chrrp!'],['Verseborn','That was an alarmingly prompt answer.']]
    ],
    Tinus:[
      [['Tinus','Sixty stages. Still cannot defeat a fitted bedsheet, I hear.'],['Verseborn','Who told you?'],['Tinus','The screaming carried.']],
      [['Tinus','Marli says you have developed leadership qualities.'],['Verseborn','Really?'],['Tinus','You now ask before opening suspicious doors. Occasionally.']],
      [['Verseborn','Do the others gossip about me while I am away?'],['Tinus','No. We do it while you are here. Coffee?']]
    ]
  };
  const ambient={
    kitchen:[
      [['Torren','Sixty stages and he still asks if stew counts as a potion.'],['Sparky','Chrr?'],['Torren','Not you. You appreciate craftsmanship.'],['Sparky','Brrrup!']],
      [['Torren','Our leader tried to rhyme glorious with more of this.'],['Sparky','Prrr!'],['Torren','Aye. I gave him seconds. A critic must be fair.']],
      [['Torren','A-rank chef. A-rank shield. Yet apparently the apron is funny.'],['Sparky','Chrr-chrr!'],['Torren','Do not encourage Verseborn. He has written a chorus.']]
    ],
    bar:[
      [['Tinus','Has he always practised heroic entrances outside the door?'],['Marla','Only since the door stopped applauding.'],['Tinus','Harsh audience.'],['Marla','He pulled when it said push.']],
      [['Marla','Sixty stages, and they still all come back hungry.'],['Tinus','A powerful endorsement of your cooking.'],['Marla','And of my rule against bleeding on the chairs.']],
      [['Tinus','Verseborn asked if coffee improves charisma.'],['Marla','Did it?'],['Tinus','He apologised to the cup. We are taking small steps.']]
    ]
  };
  const visits={
    Mira:[
      [['Kael','Verseborn asked whether a compliment requires rehearsal.'],['Mira','How many rehearsals?'],['Kael','He requested a timetable.'],['Mira','Tell him I can hear the coat rack from here.']],
      [['Kael','Someone hid a love rhyme inside my book of regulations.'],['Mira','Was it any good?'],['Kael','It rhymed dagger with swagger.'],['Mira','Burn the evidence. Gently.']]
    ],
    Seerin:[
      [['Seerin','The children want a ballad about our sixty victories.'],['Kael','May it have a quiet version?'],['Seerin','Verseborn has already written a dramatic introduction.'],['Kael','Then may it have an ending?']],
      [['Kael','Verseborn says your old title is forbidden history.'],['Seerin','The Fiery Tornado had an unfortunate wardrobe.'],['Kael','He has drawn a reconstruction.'],['Seerin','Then he has chosen extra training.']]
    ],
    Glimmer:[
      [['Kael','Why does this device repeat Verseborn saying I meant to do that?'],['Glimmer','Emergency morale system.'],['Kael','It has repeated it seventeen times.'],['Glimmer','Yes. A normal afternoon.']],
      [['Glimmer','Sixty stages and not one catastrophic failure!'],['Kael','The smoking cupboard?'],['Glimmer','A domestic incident. Different ledger.'],['Kael','You and Verseborn share a troubling talent for definitions.']]
    ]
  };
  const brothers={
    merchant:{
      greeting:[['Orivell','Our mountain has joined the conversation! I have moved the fragile stock away from his nostrils.'],['Verseborn','He remembered things the world forgot.'],['Orivell','Yes. We should listen carefully. Preferably from the non-sneeze end.']],
      origins:[['Orivell','You heard him. A shared hearth, many voices. Not one enormous voice ordering the rest to harmonise.'],['Verseborn','He made the old world sound alive.'],['Orivell','People tend to do that when you let them be people. Dragons too. Even brothers who label the teaspoons.']],
      prince:[['Orivell','I was preparing a tiny coronation cushion. Aethren confiscated it.'],['Verseborn','The Sleeper said Sparky must be his own person.'],['Orivell','Quite right. No crown before consent. He may still have the cushion. It squeaks.']],
      rifts:[['Orivell','The Sleeper is awake, but the echoes have not politely packed up.'],['Orivell','Keep practising. Knowing the old song is not the same as helping everyone sing freely again.'],['Verseborn','And your cup?'],['Orivell','Still missing. Apparently awakening an elder does not solve everything.']]
    },
    guide:{
      greeting:[['Aethren','You have heard the elder speak. Treat what he entrusted to you with care.'],['Verseborn','No pressure, then.'],['Aethren','Responsibility. Pressure is what my brother applies to an overfilled kettle.']],
      origins:[['Aethren','His memories confirm the principle, not every detail of our old accounts. We must distinguish the two.'],['Aethren','Harmony allowed difference. Any restoration that demands obedience has already lost its purpose.'],['Verseborn','We keep listening.'],['Aethren','Precisely. Even when the answer unsettles us.']],
      prince:[['Aethren','The elder cautioned us against mistaking inheritance for command. My brother has been reminded.'],['Verseborn','And Sparky?'],['Aethren','Remains Sparky. Our hope must never become a burden we place upon him without consent.'],['Aethren','The ceremonial cushion is currently under review.']],
      rifts:[['Aethren','Awakening the Sleeper did not repair every fracture. The trials remain dangerous.'],['Aethren','His testimony gives our work direction: recover what was erased without silencing those who live now.'],['Verseborn','A little harder than winning an argument.'],['Aethren','Substantially. My brother is still practising the latter.']]
    }
  };
  const brotherAmbient=[
    [['Orivell','Should I offer him tea?'],['Aethren','You do not own a cup of sufficient size.'],['Orivell','The bath?'],['Aethren','Absolutely not.']],
    [['Aethren','An awakened elder deserves dignified company.'],['Orivell','I put on my dignified socks.'],['Aethren','Those are oven mitts.'],['Orivell','Warm dignity.']],
    [['Orivell','He remembered an entire age. I cannot remember where I put the sugar.'],['Aethren','You sold it as crystallised patience.'],['Orivell','Ah. An excellent vintage.']],
    [['Aethren','No more announcements about the chosen prince. We have discussed this.'],['Orivell','May I announce that he is adorable?'],['Aethren','That is an observation.'],['Orivell','A remarkably well-supported one.']]
  ];
  window.HallProgressionDialogue={cleared,awake,greetings,ambient,visits,brothers,brotherAmbient,
    greeting:(id,fallback)=>cleared()&&greetings[id]||fallback,
    visit:(id,fallback)=>cleared()&&visits[id]||fallback,
    resident:(key,topic,fallback)=>awake()&&brothers[key]?.[topic]||fallback,
    chatter:(key,fallback)=>key==='rift-brothers'?(awake()?brotherAmbient:fallback):(cleared()&&ambient[key]||fallback)
  };
})();
