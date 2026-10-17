from pathlib import Path
p=Path('public/game/game.js');s=p.read_text(encoding='utf-8')
s=s.replace('if (needsStartingParty) openHallStartingPartySelection();\n  else if (needsStartingWelcome) playHallStartingWelcomeSequence(progress.startingCompanions);', '''if (needsStartingParty) {
    if (!progress.openingComplete && window.HallOpening) HallOpening.start({ after: openHallStartingPartySelection });
    else openHallStartingPartySelection();
  } else if (needsStartingWelcome) {
    if (!progress.openingComplete && window.HallOpening) HallOpening.start({ after: () => playHallStartingWelcomeSequence(progress.startingCompanions) });
    else playHallStartingWelcomeSequence(progress.startingCompanions);
  }''')
s=s.replace('const sourceFrame = Math.floor(frame / 10) % STAGE_SELECTOR_FRAMES;','const sourceFrame = 0;')
s=s.replace('title: "Welcome to Ember Hall", room:', 'title: "The Song of the City", room:')
p.write_text(s,encoding='utf-8')
p=Path('public/game/hall-world.js');s=p.read_text(encoding='utf-8')
old='''    if(stageSelectorImage){const frame=Math.floor(performance.now()/220)%3,cw=stageSelectorImage.width/4;
      ctx.drawImage(stageSelectorImage,frame*cw,0,cw,stageSelectorImage.height,resonance.x-resonance.width/2,resonance.y-resonance.height,resonance.width,resonance.height);
    }'''
new='''    if(stageSelectorImage){
      if(window.HallOpening)HallOpening.drawMachine(ctx,stageSelectorImage,resonance.x,resonance.y,resonance.width,resonance.height);
      else ctx.drawImage(stageSelectorImage,0,0,stageSelectorImage.width/4,stageSelectorImage.height,resonance.x-resonance.width/2,resonance.y-resonance.height,resonance.width,resonance.height);
    }'''
assert old in s;s=s.replace(old,new)
old='if(image){const cw=image.width/4,frame=Math.floor(now/220)%3;ctx.drawImage(image,frame*cw,0,cw,image.height,actor.x-camera.x-actor.width/2,actor.y-camera.y-actor.height,actor.width,actor.height);}'
new='if(image){if(window.HallOpening)HallOpening.drawMachine(ctx,image,actor.x-camera.x,actor.y-camera.y,actor.width,actor.height,now);else ctx.drawImage(image,0,0,image.width/4,image.height,actor.x-camera.x-actor.width/2,actor.y-camera.y-actor.height,actor.width,actor.height);}'
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf-8')
p=Path('public/game/index.html');s=p.read_text(encoding='utf-8').replace('game.js?v=memories-252','game.js?v=opening-254');import re
s=re.sub(r'hall-world.js\?v=[^"\s]+','hall-world.js?v=opening-254',s)
s=s.replace('</body>','<script src="hall-opening.js?v=254"></script>\n</body>');p.write_text(s,encoding='utf-8')
