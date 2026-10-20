from pathlib import Path
from PIL import Image
import numpy as np,json
base=Path('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2')
out=Path('public/game/assets/hall/refresh-311');out.mkdir(exist_ok=True)
manifest=json.loads(Path('public/game/assets/hall/refresh-309/frames.json').read_text())
def silhouettes(mask,count):
 parents=[];segments=[];previous=[]
 def root(a):
  while parents[a]!=a:parents[a]=parents[parents[a]];a=parents[a]
  return a
 for y,row in enumerate(mask):
  delta=np.diff(np.r_[False,row,False].astype(int));current=[]
  for left,right in zip(np.where(delta==1)[0],np.where(delta==-1)[0]):
   matches=[root(label) for a,b,label in previous if left<=b and right>=a]
   if matches:
    label=matches[0]
    for other in matches:parents[root(other)]=root(label)
   else:label=len(parents);parents.append(label)
   current.append((int(left),int(right),label));segments.append((label,int(left),int(right),y))
  previous=current
 boxes={}
 for label,left,right,y in segments:
  label=root(label)
  if label not in boxes:boxes[label]=[left,y,right,y+1,0]
  box=boxes[label];box[0]=min(box[0],left);box[1]=min(box[1],y);box[2]=max(box[2],right);box[3]=max(box[3],y+1);box[4]+=right-left
 chosen=sorted(boxes.values(),key=lambda a:a[4],reverse=True)[:count];assert len(chosen)==count
 return sorted(chosen,key=lambda a:(a[1]+a[3])/2)
def atlas(name,filename,cols,rows,width,fileout,rowAliases=None):
 im=Image.open(base/filename).convert('RGBA');im.thumbnail((width,10000),Image.Resampling.LANCZOS);im.save(out/fileout,quality=80,method=6) if fileout=='sparky-angry-reactions.webp' or not (out/fileout).exists() else None
 allframes=[];heights=[];mask=np.array(im.getchannel('A'))>80;boxes=silhouettes(mask,cols*rows)
 ordered=[]
 for row in range(rows):ordered+=sorted(boxes[row*cols:(row+1)*cols],key=lambda a:a[0])
 for left,top,right,bottom,area in ordered:
  x0=max(0,left-1);y0=max(0,top-1);x1=min(im.width,right+1);y1=min(im.height,bottom+1);body=mask[y0:y1,x0:x1];h,w=body.shape
  if name and name.endswith('Walk'):
   yy,xx=np.where(body[int(h*.12):int(h*.34)]);anchor=float(xx.mean())
  else:
   center=body[:,int(w*.25):int(w*.8)];foot=int(np.where(center.any(axis=1))[0][-1])+1;yy,xx=np.where(center[max(0,foot-int(h*.04)):foot]);anchor=float(xx.mean()+int(w*.25))
  allframes.append(dict(x=x0,y=y0,w=w,h=h,ax=round(anchor,2),ay=h));heights.append(h)
 if rowAliases:
  for row,id in enumerate(rowAliases):manifest[id]=dict(cols=cols,rows=1,unitHeight=round(float(np.mean(heights[row*cols:(row+1)*cols])),2),frames=allframes[row*cols:(row+1)*cols])
 else:manifest[name]=dict(cols=cols,rows=rows,unitHeight=round(float(np.mean(heights[:cols])),2),frames=allframes)
 print(fileout,(out/fileout).stat().st_size)
atlas('Revus','exec-7a81544d-8a03-47de-b800-bd6bb7efc5c8.png',2,2,480,'revus.webp')
atlas('MiraTalk','exec-cab74232-e2d8-4294-8935-87f1442ca918.png',4,2,800,'mira-talk.webp')
atlas('MiraWalk','exec-2934ebe4-7d12-48da-b763-3a192ccebc02.png',4,2,800,'mira-walk.webp')
atlas('SeerinWalk','exec-3816d45a-d97a-479e-b236-260c6aee45e6.png',4,2,800,'seerin-walk.webp')
atlas(None,'exec-24305e7c-62de-4897-9504-1b0fe067f6c8.png',4,2,800,'sparky-cute-reactions.webp',['MiraCute','SeerinCute'])
atlas(None,'exec-98e254d2-1572-4383-bcb0-72370499e62b.png',4,2,800,'sparky-angry-reactions.webp',['MiraDemon','SeerinDemon'])
atlas(None,'exec-d6fd6576-975c-4c1d-adfc-1489652302e4.png',4,3,800,'sparky-fear-reactions.webp',['TorrenFear','VersebornFear','SparkyFear'])
panic=Image.open(base/'exec-c1d7113c-4067-4615-8a1e-d5a53afe6d0a.png');panic.thumbnail((720,480));panic.save(out/'sparky-panic.webp',quality=79,method=6)
# Whole seated poses fit the established body bounds and foot baselines uniformly.
im=Image.open(base/'exec-062d92c4-ea91-4f17-9217-fc3fc3fcd3ae.png').convert('RGBA');im.thumbnail((1536,10000),Image.Resampling.LANCZOS);im.save(out/'verseborn-mount.webp',quality=80,method=6) if not (out/'verseborn-mount.webp').exists() else None
old=Image.open('public/game/assets/hall/opening-291/verseborn-mount.webp').convert('RGBA');xs=[488,493,498,501,501,501];ys=[158,155,152,150,149,149];frames=[]
for i in range(6):
 x0=int(i*im.width/6);x1=int((i+1)*im.width/6);cell=im.crop((x0,0,x1,im.height));box=cell.getchannel('A').point(lambda a:255 if a>180 else 0).getbbox();b=old.crop((i*128,0,(i+1)*128,128)).getchannel('A').point(lambda a:255 if a>180 else 0).getbbox()
 dh=(b[3]-b[1])*44/128;dw=dh*(box[2]-box[0])/(box[3]-box[1]);cx=xs[i]-24+(b[0]+b[2])/2*48/128;bottom=ys[i]+b[3]*44/128
 frames.append(dict(x=x0+box[0],y=box[1],w=box[2]-box[0],h=box[3]-box[1],dx=round(cx-dw/2,3),dy=round(bottom-dh,3),dw=round(dw,3),dh=round(dh,3)))
manifest['VerseSeat']={'frames':frames}
(out/'frames.json').write_text(json.dumps(manifest,indent=2))
