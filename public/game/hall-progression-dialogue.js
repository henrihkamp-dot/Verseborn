// Resident voices change after real story milestones, without altering services or saves.
(() => {
  'use strict';
  const cleared=()=>Array.from({length:60},(_,i)=>i+1).every(n=>hallBattleProgress().clearedStages.includes(n));
  const awake=()=>Boolean(window.EmberRift?.progress().awakeningSeen);
  const greetings={
    Marla:[
      [['Marla','Torren offered to carry a lady over a puddle.'],['Verseborn','Chivalry lives.'],['Marla','Then explained his A-rank classification until the puddle dried.']],
      [['Marla','Kael has drawn up a washing-up rota.'],['Verseborn','Has anyone signed it?'],['Marla','Glimmer drew a machine on hers. He handed her a sponge.']],
      [['Marla','Glimmer says the kettle can now detect lies.'],['Verseborn','Can it?'],['Marla','It whistles whenever she says the repairs are finished.']],
      [['Marla','Mira and Seerin insist Sparky needs a cushion.'],['Verseborn','He does look comfortable.'],['Marla','That is my good cushion. I have apparently lost the vote.']],
      [['Marla','Sixty stages. Very impressive. The washing-up has reached stage sixty-one.'],['Verseborn','Does it have a weakness?'],['Marla','Soap. Your least practised element.']]
    ],
    Mira:[
      [['Mira','Father sent another letter addressed to Miri. In pink ink.'],['Verseborn','Diplomatic code?'],['Mira','If you repeat that name, we shall have a diplomatic incident.']],
      [['Mira','Glimmer has proposed another harmless spar.'],['Verseborn','You agreed?'],['Mira','I sent her an estimate for my coat first.']],
      [['Mira','Torren says his charm is A-rank.'],['Verseborn','And your assessment?'],['Mira','He asked for a second opinion. I gave him the same one more slowly.']],
      [['Mira','Seerin confiscated an old Fiery Tornado poster.'],['Verseborn','For historical preservation?'],['Mira','She folded it face inward and threatened the fireplace. Draw your own conclusions.']],
      [['Verseborn','People have been whispering about me.'],['Mira','You rehearsed a compliment to a coat rack.'],['Verseborn','It looked supportive.'],['Mira','It was wearing my coat.']]
    ],
    Torren:[
      [['Torren','A lady asked about my classification. Naturally, I explained.'],['Verseborn','Was she asking which bin the empty bottles go in?'],['Torren','She stayed for the first three sentences.']],
      [['Torren','Kael insists fried bread cannot absolve anything.'],['Verseborn','And you disagree?'],['Torren','He took a second slice. I respect a man who tests his convictions.']],
      [['Torren','Glimmer offered to improve my soup pot.'],['Verseborn','You refused?'],['Torren','It already makes dinner. I do not need it to win a siege.']],
      [['Torren','Sparky has learned that a small chirp earns a small portion.'],['Verseborn','And a large chirp?'],['Torren','He brings Seerin. I bring the larger bowl.']],
      [['Torren','I heard you called retreat a tactical interval.'],['Verseborn','We came back and won.'],['Torren','Aye. After your tactical sandwich. Packed two this time.']]
    ],
    Glimmer:[
      [['Glimmer','Mira has introduced a coat-damage deposit for sparring.'],['Verseborn','That sounds fair.'],['Glimmer','She has seen the prototype. The deposit is more than the prototype.']],
      [['Glimmer','Seerin asked for something the children could safely practise with.'],['Verseborn','You made something safe?'],['Glimmer','Yes! She keeps asking why the wooden sword has an ignition key.']],
      [['Glimmer','Kael says I must use my assigned bed.'],['Verseborn','A reasonable request.'],['Glimmer','Even when another mattress has much better spring tension! He refuses to look at my findings.']],
      [['Glimmer','Torren claims he once seasoned a mountain-sized enemy.'],['Verseborn','Did you believe him?'],['Glimmer','I asked how much pepper. He has been calculating since breakfast.']],
      [['Glimmer','Stonewake will want a complete report.'],['Verseborn','Leave out the bit where I got tangled in my cloak.'],['Glimmer','That is the diagram on the cover.']]
    ],
    Kael:[
      [['Kael','Everyone found time to celebrate. Nobody found time to sweep.'],['Verseborn','We should organise a team.'],['Kael','We have a team. It is standing around discussing the broom.']],
      [['Kael','Glimmer has repaired three clocks and occupied four beds.'],['Verseborn','Productive week.'],['Kael','Her own bed remains unmade. I have written the instruction in large letters.']],
      [['Kael','Mira left a dagger in the washing-up.'],['Verseborn','At least it was being washed?'],['Kael','It was pointing at a plate. The plate was not resisting.']],
      [['Kael','Seerin offered to help with the rugs.'],['Verseborn','Good of her.'],['Kael','She beat them with such enthusiasm that the dust settled on my clean shelves.']],
      [['Kael','Sixty victories do not exempt you from house rules.'],['Verseborn','What about sixty-one?'],['Kael','Pick up the other end of this table. We may discuss exemptions while carrying it.']]
    ],
    Seerin:[
      [['Seerin','The children want matching training uniforms.'],['Verseborn','Inspired by the Fiery Tornado?'],['Seerin','Inspired by fabric that covers everything it is meant to cover. I have experience.']],
      [['Seerin','Mira says she does not fuss over Sparky.'],['Verseborn','She looks very composed.'],['Seerin','She warmed his blanket inside her coat. Do not spoil this for me.']],
      [['Seerin','Glimmer called her new machine a Cuddle Buster.'],['Verseborn','Sounds friendly.'],['Seerin','I have moved the children behind something load-bearing.']],
      [['Seerin','Torren says he could hold the training stance all afternoon.'],['Verseborn','Could he?'],['Seerin','We will find out. He made the claim in front of the children.']],
      [['Seerin','The children want to know which of your sixty victories was the bravest.'],['Verseborn','There are so many to choose from.'],['Seerin','They voted for speaking to Mira without swallowing a syllable.']]
    ],
    Sparky:[
      [['Sparky','Chrr! Hrrup!'],['Verseborn','Torren said the pantry was secure.'],['Sparky','Brrrup!'],['Verseborn','I see you have completed another inspection.']],
      [['Verseborn','Glimmer made you a mechanical mouse?'],['Sparky','Krrr?'],['Verseborn','No, do not eat the key. That is how she winds it.']],
      [['Verseborn','Seerin has been teaching you to give a paw.'],['Sparky','Prr!'],['Verseborn','Very dignified. She is going to need both hands when you grow.']],
      [['Verseborn','Mira says she is only checking whether your blanket is warm.'],['Sparky','Prrrrrr.'],['Verseborn','Yes. For the fourth time. A thorough investigation.']],
      [['Verseborn','Who has been stealing my warm seat?'],['Sparky','Prrrrrr.'],['Verseborn','An excellent defence. The court is now scratching your chin.']]
    ],
    Tinus:[
      [['Tinus','Torren explained A-rank to me. Twice.'],['Verseborn','Did you ask twice?'],['Tinus','I asked where the milk was.']],
      [['Tinus','Glimmer offered to make my coffee self-stirring.'],['Verseborn','Convenient.'],['Tinus','The spoon followed me upstairs. I have declined further improvements.']],
      [['Tinus','Kael handed me a broom without breaking eye contact.'],['Verseborn','What did you do?'],['Tinus','Swept. I recognise a man who has run out of polite requests.']],
      [['Tinus','Marli knows when I need another cup before I do.'],['Verseborn','Some kind of magic?'],['Tinus','Years of dealing with people who say just one more.']],
      [['Tinus','Sixty stages. Still cannot defeat a fitted bedsheet, I hear.'],['Verseborn','Who told you?'],['Tinus','The screaming carried.']]
    ]
  };
  const ambient={
    kitchen:[
      [['Torren','A lady asked for my signature on the delivery.'],['Sparky','Chrr?'],['Torren','Aye. Wrote A-rank beside it. Saves her asking.']],
      [['Torren','Glimmer wants to automate the biscuit tin.'],['Sparky','Prrr!'],['Torren','You would support anything with faster biscuits.']],
      [['Torren','Kael took fried bread before his lecture today.'],['Sparky','Chrr-chrr!'],['Torren','Still gave the lecture. Just with a happier expression.']],
      [['Torren','Mira says no scraps. Seerin says only a little.'],['Sparky','Hrrup!'],['Torren','You have both of them wrapped round that paw.']],
      [['Torren','Our leader tried to rhyme glorious with more of this.'],['Sparky','Prrr!'],['Torren','Aye. I gave him seconds. A critic must be fair.']]
    ],
    bar:[
      [['Tinus','Torren bought flowers.'],['Marla','For a lady?'],['Tinus','Presumably. He asked whether A-rank should go before or after his name.'],['Marla','After he remembers hers.']],
      [['Marla','Glimmer says she fell asleep testing a mattress.'],['Tinus','A demanding experiment.'],['Marla','Kael has requested she test the same one two nights running.']],
      [['Tinus','Kael has put the chore rota where everyone can see it.'],['Marla','And?'],['Tinus','Everyone has developed a sudden interest in the opposite wall.'],['Marla','I will stop putting clean cups on that side.']],
      [['Marla','Seerin and Mira spent ten minutes teaching Sparky to give a paw.'],['Tinus','Did he learn?'],['Marla','They did. One chirp, and both hands appear.']],
      [['Tinus','Verseborn asked if coffee improves charisma.'],['Marla','Did it?'],['Tinus','He apologised to the cup. We are taking small steps.']]
    ]
  };
  const visits={
    Mira:[
      [['Kael','You signed the chore rota with a drawing of a dagger.'],['Mira','A personal seal.'],['Kael','A personal turn at washing dishes. Tonight.'],['Mira','Your interpretations are becoming inconveniently precise.']],
      [['Mira','Torren says A-rank people should not wash A-rank pans.'],['Kael','Then he may wash the ordinary ones.'],['Mira','He has labelled them all.'],['Kael','I shall fetch an ordinary brush.']],
      [['Kael','Is that Seerin\'s old poster beneath your book?'],['Mira','A bookmark. You dislike the sharp ones.'],['Kael','Does she know you have it?'],['Mira','That would defeat the purpose of hiding it beneath a book.']],
      [['Kael','Glimmer says you encouraged her latest experiment.'],['Mira','I said she could not possibly make it louder.'],['Kael','You must learn not to phrase a complaint as a challenge.'],['Mira','An expensive lesson.']],
      [['Kael','Verseborn asked whether a compliment requires rehearsal.'],['Mira','How many rehearsals?'],['Kael','He requested a timetable.'],['Mira','Tell him I can hear the coat rack from here.']]
    ],
    Seerin:[
      [['Kael','I asked for help moving the benches. Not a training competition.'],['Seerin','They have all been moved.'],['Kael','And stacked.'],['Seerin','The children wanted to see how high. I will put them back.']],
      [['Seerin','The children offered to clean their practice shields.'],['Kael','A sound habit. Our residents might learn from them.'],['Seerin','You are welcome to say that at supper.'],['Kael','I intend to. With examples.']],
      [['Kael','Glimmer has named a weapon after a cuddle.'],['Seerin','I know. I have forbidden demonstrations near the children.'],['Kael','May I suggest near the building as well?'],['Seerin','I will amend the instruction.']],
      [['Seerin','Torren says he once brought down a mountain-sized enemy.'],['Kael','At yesterday\'s supper it was only a hill.'],['Seerin','Should we say something?'],['Kael','Before it obstructs the sun.']],
      [['Seerin','The children want a ballad about our sixty victories.'],['Kael','May it have a quiet version?'],['Seerin','Verseborn has already written a dramatic introduction.'],['Kael','Then may it have an ending?']]
    ],
    Glimmer:[
      [['Kael','I asked you to help wash the cups.'],['Glimmer','And I designed a better sink!'],['Kael','The cups remain dirty.'],['Glimmer','You are very committed to the short term.']],
      [['Kael','Lady Glinda Sprocket von KlikKlak. Your assigned bed. Tonight.'],['Glimmer','The entire name? Before supper?'],['Kael','House rules do not depend upon the time of day.'],['Glimmer','Could the pillows at least file an appeal?']],
      [['Glimmer','Mira sent me another repair bill.'],['Kael','For her coat?'],['Glimmer','And the chair it landed on.'],['Kael','I am adding the chair to your chores.']],
      [['Glimmer','Torren refuses to let my machine season his stew.'],['Kael','Does it distinguish salt from pepper?'],['Glimmer','It distinguishes timid from spectacular.'],['Kael','Leave the stew alone.']],
      [['Kael','Why does this device repeat Verseborn saying I meant to do that?'],['Glimmer','Emergency morale system.'],['Kael','It has repeated it seventeen times.'],['Glimmer','Yes. A normal afternoon.']]
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
