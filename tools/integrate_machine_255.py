from pathlib import Path
p=Path('public/game/hall-opening.js');s=p.read_text(encoding='utf-8').replace("load('lab','assets/hall/glimmer-lab-v244.webp')","load('assemblies','assets/hall/glimmer-repair-props-v244.webp'),load('lab','assets/hall/glimmer-lab-v244.webp')")
s=s.replace('window.HallOpening={ready,start,next,finish,drawMachine,','window.HallOpening={ready,start,next,finish,drawMachine,workStops,get glimmer(){return scene?glimmerPosition(performance.now()):null;},')
p.write_text(s,encoding='utf-8')
p=Path('public/game/game.js');s=p.read_text(encoding='utf-8').replace('''    if (stageSelectorImage) {
      const sourceWidth''','''    if (stageSelectorImage) {
      if(window.ResonanceMachine?.ready){ResonanceMachine.draw(ctx,stageSelectorImage,px+8,baseline,43,43);return;}
      const sourceWidth''');p.write_text(s,encoding='utf-8')
p=Path('public/game/index.html');s=p.read_text(encoding='utf-8').replace('game.js?v=opening-254','game.js?v=machine-255').replace('<script src="hall-opening.js?v=254"></script>','<script src="resonance-machine.js?v=255"></script>\n<script src="hall-opening.js?v=255"></script>');p.write_text(s,encoding='utf-8')
