from pathlib import Path
from PIL import Image,ImageDraw
import json,shutil,numpy as np
root=Path('public/game/assets/hall/resonance-321');inv=json.loads((root/'supplied-inventory.json').read_text());images={i['name']:Image.open(i['file']) for i in inv}
# Atlas extraction only: retain supplied illustration and alpha; no invented replacement art.
def save(name,im,width):
 im=im.convert('RGBA') if im.mode=='RGBA' else im.convert('RGB');im.thumbnail((width,width*2),Image.Resampling.LANCZOS);im.save(root/(name+'.webp'),quality=77,method=6)
for name in ['ashen-march','false-dawn-circuit','broken-ascension','resonance-depths']:save(name,images[name],1440)
save('crownspire',Image.open('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2/exec-c861acb8-927f-4dac-8366-c4cf2289f3b2.png'),1440)
boxes=[[(0,0,355,300),(355,0,720,300)],[(725,0,1090,287),(1090,0,1448,295)],[(0,350,350,660),(355,350,720,660)],[(730,350,1085,660),(1090,350,1448,660)],[(0,710,350,1015),(355,710,720,1015)],[(730,710,1085,1020),(1090,710,1448,1020)]]
for j,pair in enumerate(boxes):
 for state,box in zip(['dormant','awake'],pair):save('boss-'+str((j+1)*10)+'-'+state,images['boss-landmarks'].crop(box),240)
for name,box in {'gate':(0,0,490,550),'brazier':(757,760,930,1060),'banner':(965,477,1070,790),'route-straight':(440,28,835,130),'route-curve':(1030,0,1240,215)}.items():save(name,images['environment'].crop(box),220 if name=='gate' else 140)
for name,box in {'frame':(760,185,1448,825),'divider':(865,905,1430,962)}.items():save(name,images['ornate-ui'].crop(box),640)
# Supplied physical plinths on the cream atlas: remove only the connected cream gutter.
for name,box in {'locked':(15,770,72,850),'available':(76,755,135,850),'selected':(137,751,192,850),'cleared':(194,770,249,850),'elite':(337,766,402,851)}.items():
 im=images['overview-b'].crop(box).convert('RGBA');a=np.array(im);mask=(a[:,:,0]>166)&(a[:,:,1]>151)&(a[:,:,2]>124)&((a[:,:,0].astype(int)-a[:,:,2])<65);a[mask,3]=0;im=Image.fromarray(a);save('fixture-'+name,im,112)
# Keep unused duplicate aliases out of the retained runtime. Canonical stable atlas remains.
base=Path('dist/client/game/assets/sprites/enemies-battle');canonical=base/'ash-wyrm-lava-stable.webp'
for filename in ['ash-wyrm-lava-animated.webp','ash-wyrm-lava-fixed.webp','ash-wyrm-lava.webp']:
 p=base/filename
 if p.exists():
  assert p.resolve().is_relative_to(Path('dist/client').resolve());assert p.read_bytes()==canonical.read_bytes();print('Removed duplicate runtime alias',filename,p.stat().st_size);p.unlink()
out=Path('dist/client/game/assets/hall/resonance-321');out.mkdir(parents=True,exist_ok=True)
for p in root.glob('*.webp'):shutil.copy2(p,out/p.name)
thumbs=Image.new('RGB',(720,480),'#33303a');d=ImageDraw.Draw(thumbs)
for i,p in enumerate(root.glob('boss-*.webp')):
 im=Image.open(p);im.thumbnail((110,180));x=(i%6)*120;y=(i//6)*240;thumbs.paste(im,(x,y),im);d.text((x,y+185),p.stem,fill='white')
thumbs.save('../../outputs/map-boss-crops.png');print('Map assets bytes',sum(p.stat().st_size for p in root.glob('*.webp')))

# Final map compression (full-resolution originals remain in outputs/ember-hall-supplied-assets).
clean={'crownspire':'exec-c861acb8-927f-4dac-8366-c4cf2289f3b2.png','hall-of-echoes':'exec-4a8e9614-fe90-4f47-bf39-983892d27911.png'}
for name in ['ashen-march','crownspire','false-dawn-circuit','hall-of-echoes','broken-ascension','resonance-depths']:
 source=Path('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2')/clean[name] if name in clean else Path(next(v['file'] for v in inv if v['name']==name))
 im=Image.open(source);im.thumbnail((1360,800),Image.Resampling.LANCZOS);im.save(root/(name+'.webp'),quality=73,method=6);shutil.copy2(root/(name+'.webp'),out/(name+'.webp'))
