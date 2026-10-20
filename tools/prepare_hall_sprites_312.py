from pathlib import Path
from PIL import Image
import numpy as np,json
base=Path('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2')
out=Path('public/game/assets/hall/refresh-312');out.mkdir(exist_ok=True)
manifest=json.loads(Path('public/game/assets/hall/refresh-311/frames.json').read_text())
script=Path('tools/prepare_hall_sprites_311.py').read_text();exec(script[script.index('def silhouettes('):script.index('def atlas(')])
def encode(file,name,width,count):
 im=Image.open(base/file).convert('RGBA');im.thumbnail((width,10000),Image.Resampling.LANCZOS);im.save(out/name,quality=80,method=6)
 boxes=sorted(silhouettes(np.array(im.getchannel('A'))>80,count),key=lambda b:b[0]);return im,boxes
im,boxes=encode('exec-678c58bf-f73e-4f12-9bad-13eb221d61f4.png','verseborn-mount.webp',1536,6)
old=Image.open('public/game/assets/hall/refresh-311/verseborn-mount.webp').convert('RGBA')
def head(im,box):
 l,t,r,b=box[:4];mask=np.array(im.getchannel('A'))[t:t+int((b-t)*.23),l:r]>100;yy,xx=np.where(mask);return float(xx.max()-xx.min()+1),float((xx.max()+xx.min())/2)
frames=[]
for f,b in zip(manifest['VerseSeat']['frames'],boxes):
 ow,oc=head(old,[f['x'],f['y'],f['x']+f['w'],f['y']+f['h']]);nw,nc=head(im,b);scale=f['dw']/f['w']*ow/nw
 l,t,r,bot=b[:4];frames.append(dict(x=l,y=t,w=r-l,h=bot-t,dx=round(f['dx']+oc*f['dw']/f['w']-nc*scale,3),dy=f['dy'],dw=round((r-l)*scale,3),dh=round((bot-t)*scale,3)))
manifest['VerseSeat']={'frames':frames}
im,boxes=encode('exec-052f84ef-d9bd-48d4-aab8-6df5fffa5abf.png','sparky-paws.webp',800,4)
frames=[dict(x=l,y=t,w=r-l,h=b-t,ax=(r-l)/2,ay=b-t) for l,t,r,b,_ in boxes]
manifest['SparkyCute']=dict(cols=4,rows=1,unitHeight=round(sum(f['h'] for f in frames)/4,2),frames=frames)
(out/'frames.json').write_text(json.dumps(manifest,indent=2))
print(manifest['VerseSeat'])
