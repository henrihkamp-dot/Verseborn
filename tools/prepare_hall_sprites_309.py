from pathlib import Path
from PIL import Image
import numpy as np,json

base=Path('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2')
out=Path('public/game/assets/hall/refresh-309');out.mkdir(exist_ok=True)
jobs={
 'Mira':('exec-6b4be281-af36-4592-9884-16078f75fb8a.png',4,4,640),
 'Revus':('exec-c48430af-0aea-4043-94cf-c7750779b52c.png',2,2,480),
 'Seerin':('exec-6de2ab7f-c6c3-476d-9b76-10422c5774f1.png',4,4,640),
 'Nyx':('exec-294d2cf6-8816-4e5b-8e42-696b5af1b547.png',4,1,800),
 'Rava':('exec-1fb67899-e856-4087-8d11-63791e72a838.png',4,1,800),
 'Jory':('exec-20717e4f-daec-45a0-a7b4-ec2dbeefeeb9.png',4,1,800),
}
# This step only resizes/encodes complete generated atlases and measures anchors.
# Every runtime pose is one intact character image; no body-part compositing.
manifest={}
for name,(filename,cols,rows,width) in jobs.items():
 im=Image.open(base/filename).convert('RGBA');im.thumbnail((width,10000),Image.Resampling.LANCZOS)
 im.save(out/(name.lower()+'.webp'),quality=80,method=6)
 frames=[];heights=[]
 for i in range(cols*rows):
  x0=int(i%cols*im.width/cols);y0=int(i//cols*im.height/rows);x1=int((i%cols+1)*im.width/cols);y1=int((i//cols+1)*im.height/rows)
  a=np.array(im.crop((x0,y0,x1,y1)).getchannel('A'));h,w=a.shape;mask=a>200
  ys,xs=np.where(mask);bbox=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
  center=mask[:,int(w*.23):int(w*.8)];bottom=int(np.where(center.any(axis=1))[0][-1])+1
  yband=max(0,bottom-int(h*.045));ys2,xs2=np.where(center[yband:bottom]);anchor=float(xs2.mean()+int(w*.23))
  frames.append(dict(x=x0,y=y0,w=w,h=h,ax=round(anchor,2),ay=bottom))
  if i<cols:heights.append(bottom-bbox[1])
 manifest[name]=dict(cols=cols,rows=rows,unitHeight=round(sum(heights)/len(heights),2),frames=frames)
 print(name,im.size,(out/(name.lower()+'.webp')).stat().st_size)
im=Image.open(base/'exec-e80f376a-1b25-45dc-8495-e29a79ea1152.png');im=im.resize((1152,640),Image.Resampling.LANCZOS);im.save(out/'verseborn-walk.webp',quality=80,method=6)
# Generated atlas spacing varies: measure each complete silhouette, never assume 128px columns.
walk=np.array(im.convert('RGBA'))[:,:,3];walkFrames=[];walkHeights=[]
for row in range(5):
 mask=walk[row*128:(row+1)*128]>80;delta=np.diff(np.r_[False,mask.any(axis=0),False].astype(int))
 runs=list(zip(np.where(delta==1)[0],np.where(delta==-1)[0]));assert len(runs)==9
 for left,right in runs:
  x0=max(0,int(left)-3);x1=min(im.width,int(right)+3);ys,xs=np.where(mask[:,left:right]);top=int(ys.min());bottom=int(ys.max()+1)
  walkFrames.append(dict(x=x0,y=row*128,w=x1-x0,h=128,ax=float((left+right)/2-x0),ay=bottom))
  walkHeights.append(bottom-top)
manifest['Verseborn']=dict(cols=9,rows=5,unitHeight=round(float(np.median(walkHeights)),2),frames=walkFrames)
im=Image.open(base/'exec-771fc729-265f-48ff-b37f-33bb6dde0614.png');im.thumbnail((680,454));im.save(out/'sparky-intimidated.webp',quality=79,method=6)
(out/'frames.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
