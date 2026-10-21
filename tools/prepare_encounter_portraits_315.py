from pathlib import Path
from PIL import Image,ImageDraw
import json
jobs=json.loads(Path('tools/encounter-315-generation.json').read_text())['portraits'];out=Path('public/game/assets/encounter-portraits-315');out.mkdir(exist_ok=True)
for j in jobs:
 im=Image.open(j['generated']).convert('RGB');im.thumbnail((224,224),Image.Resampling.LANCZOS);im.save(out/(j['id']+'.webp'),quality=54,method=6)
for start in range(0,len(jobs),20):
 group=jobs[start:start+20];im=Image.new('RGB',(1000,240*((len(group)+4)//5)),'#211a28');d=ImageDraw.Draw(im)
 for i,j in enumerate(group):
  a=Image.open(out/(j['id']+'.webp'));a.thumbnail((190,205));x=i%5*200;y=i//5*240;im.paste(a,(x+(200-a.width)//2,y));d.text((x+3,y+208),j['name'][:28],fill='#ffe3b5')
 im.save(Path('../../outputs/encounter-315')/f'portraits-{start}.jpg')
print('assets',len(jobs),'bytes',sum(f.stat().st_size for f in out.glob('*.webp')))

for id in ['verseborn','mira','seerin','kael','torren','glimmer','sparky']:
 source=Path('public/game/assets/hall/welcome-302')/(id+'-portrait.webp');source=source if source.exists() and id!='sparky' else Path('public/game/assets/portraits')/(id+'.png');im=Image.open(source).convert('RGBA');im.thumbnail((224,224),Image.Resampling.LANCZOS);im.save(out/('hero-'+id+'.webp'),quality=72,method=6)
print('all assets bytes',sum(f.stat().st_size for f in out.glob('*.webp')))
