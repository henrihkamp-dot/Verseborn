from pathlib import Path
from PIL import Image
import numpy as np,json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/game/assets/sprites/hall-duels';OUT.mkdir(parents=True,exist_ok=True)
SPRITES={'Seerin':('f2ad0a0b-8dd4-480a-8c0b-d9dcf17ca745',[255,526,804,1114]),'Sparky':('b6b872f4-8d1a-4260-9f01-ff3cde58f3d3',[254,509,784,1083]),'Glimmer':('f614ad41-9bea-421a-b9f7-bb729485d581',[261,518,800,1080]),'Torren':('9502f1fc-2480-4d02-9ad0-f320dd2627b7',[259,494,781,1082]),'Mira':('c1e6188e-e768-4271-9aa9-c9c3406ef341',[273,513,785,1082]),'Verseborn':('7fc7a650-da0e-4040-ad42-84cfd0057f44',[258,517,801,1097]),'Kael':('fe8901e5-6a84-4ab7-ae61-66a6e4cc2b39',[272,508,797,1085])}
VFX={'Seerin':'d5a56775-db0b-47ab-a39d-e580783c8844','Sparky':'3f39bd30-a237-499d-ae41-d8cf15a334a4','Mira':'fe9f7899-7556-46a1-9f58-79ea80c380f3','Verseborn':'e8299239-1101-42d5-a35f-3d1fa39edc04','Glimmer':'8b5cd2a4-9139-4310-acce-b56792e34473','Torren':'0c98b9c0-994b-4df9-8015-d8c24382ad23','Kael':'9b92822b-0935-475c-8f1e-40b034b2b7db'}
def components(alpha):
 mask=alpha>80;parent=[];runs=[];prev=[]
 def find(n):
  while parent[n]!=n:parent[n]=parent[parent[n]];n=parent[n]
  return n
 for y,row in enumerate(mask):
  d=np.diff(np.r_[False,row,False].astype(np.int8));starts=np.where(d==1)[0];ends=np.where(d==-1)[0];curr=[];j=0
  for x,z in zip(starts,ends):
   n=len(parent);parent.append(n);runs.append((y,int(x),int(z)));curr.append((int(x),int(z),n))
   while j<len(prev) and prev[j][1]<x:j+=1
   for px,pz,pn in prev[j:]:
    if px>z:break
    q=find(pn);r=find(n)
    if q!=r:parent[q]=r
  prev=curr
 labels=np.full(mask.shape,-1,np.int32);stats={}
 for i,(y,x,z) in enumerate(runs):
  n=find(i);labels[y,x:z]=n
  if n not in stats:stats[n]=[0,x,y,z,y+1]
  b=stats[n];b[0]+=z-x;b[1]=min(b[1],x);b[2]=min(b[2],y);b[3]=max(b[3],z);b[4]=max(b[4],y+1)
 return labels,stats

def seam(alpha,boundary,vertical=True):
 a=alpha if vertical else alpha.T;w=a.shape[1];lo=max(1,int(boundary-75));hi=min(w-1,int(boundary+75));cost=(a[:,lo:hi].astype(float)/255)**3*100;back=np.zeros(cost.shape,np.int16);v=cost[0]
 for y in range(1,len(cost)):
  choices=np.stack([np.r_[1e9,v[:-1]],v,np.r_[v[1:],1e9]]);d=choices.argmin(axis=0);back[y]=d-1;v=cost[y]+choices.min(axis=0)+abs(np.arange(hi-lo)+lo-boundary)*.002
 x=int(v.argmin());out=np.empty(len(cost),np.int32)
 for y in range(len(cost)-1,-1,-1):out[y]=x+lo;x+=int(back[y,x])
 return out

def extract(im,bounds):
 arr=np.array(im);alpha=arr[:,:,3];h,w=alpha.shape;ys=[0,*bounds,h];cy=np.array([(ys[r]+ys[r+1])/2 for r in range(len(ys)-1)]);cx=np.array([(c+.5)*w/4 for c in range(4)]);labels,stats=components(alpha);major={k:v for k,v in stats.items() if v[0]>2500};owner=np.full((h,w),-1,np.int16);Y,X=np.indices((h,w));vs=[seam(alpha,w*c/4) for c in range(1,4)];hs=[seam(alpha,b,False) for b in bounds]
 gridcol=sum(X>=s[:,None] for s in vs);gridrow=sum(Y>=s[None,:] for s in hs);grid=gridrow*4+gridcol
 for k,b in stats.items():
  _,x,y,z,t=b;row=int(np.argmin(abs(cy-(y+t)/2)));col=int(np.argmin(abs(cx-(x+z)/2)));frame=row*4+col
  idx=labels==k
  if z-x>w/4*1.48 or t-y>(ys[row+1]-ys[row])*1.5:owner[idx]=grid[idx]
  else:owner[idx]=frame
 # Restore antialias and detached glow pixels to their neighboring object, without rectangular clipping.
 for _ in range(8):
  missing=(owner<0)&(alpha>0);new=owner.copy()
  for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
   rolled=np.roll(owner,(dy,dx),(0,1));valid=missing&(rolled>=0);new[valid]=rolled[valid]
  owner=new
 owner[(owner<0)&(alpha>0)]=grid[(owner<0)&(alpha>0)]
 frames=[]
 for i in range(len(cy)*4):
  pix=arr.copy();pix[:,:,3]=np.where(owner==i,alpha,0);lab,groups=components(pix[:,:,3]);main=max(groups.values(),key=lambda g:g[0]);_,left,top,right,bottom=main;mx=(left+right)/2;my=(top+bottom)/2;parts=[g for g in groups.values() if g[0]>200 and abs((g[1]+g[3])/2-mx)<w/4*.65 and abs((g[2]+g[4])/2-my)<h/len(cy)*.65];left=min([left]+[g[1] for g in parts]);top=min([top]+[g[2] for g in parts]);right=max([right]+[g[3] for g in parts]);bottom=max([bottom]+[g[4] for g in parts]);left=max(0,left-18);top=max(0,top-18);right=min(w,right+18);bottom=min(h,bottom+18);frame=Image.fromarray(pix).crop((left,top,right,bottom));box=frame.getbbox();assert box,(i,im.size);frames.append(frame.crop(box))
 return frames

def pack(name,frames,effects=False):
 cw,ch=(192,208) if not effects else (208,208);pad=8;scale=min((cw-pad*2)/max(f.width for f in frames),(ch-pad*2)/max(f.height for f in frames));sheet=Image.new('RGBA',(cw*4,ch*(3 if effects else 5)));heights=[]
 for i,f in enumerate(frames):
  # Small source fragments are retained; the canvas adds transparent breathing room to every frame.
  a=np.asarray(f)[:,:,3];pts=np.argwhere(a>100);b=int(pts[:,0].max());foot=pts[pts[:,0]>=b-7];anchor=(int(foot[:,1].min())+int(foot[:,1].max()))/2
  size=(max(1,round(f.width*scale)),max(1,round(f.height*scale)));small=f.resize(size,Image.Resampling.LANCZOS)
  x=round(cw/2-anchor*scale) if not effects else (cw-size[0])//2;y=round(196-b*scale) if not effects else (ch-size[1])//2;x=max(pad,min(cw-pad-size[0],x));y=max(pad,min(ch-pad-size[1],y));sheet.alpha_composite(small,(i%4*cw+x,i//4*ch+y));heights.append(size[1])
 file=name.lower()+('-vfx' if effects else '')+'.webp';sheet.save(OUT/file,quality=79,method=4)
 if not effects:sheet.crop((0,0,cw,ch)).save(OUT/(name.lower()+'-portrait.webp'),quality=82,method=4)
 return {'file':file,'columns':4,'rows':3 if effects else 5,'cellWidth':cw,'cellHeight':ch,'baseline':196,'referenceHeight':max(heights[:4]),'rowMap':{'projectile':0,'magic':1,'ultimate':2} if effects else {'idle':0,'melee':1,'magic':2,'ultimate':3,'death':4}}
manifest={};preview=ROOT.parent/'duel-frame-previews';preview.mkdir(exist_ok=True)
for name,(file,bounds) in SPRITES.items():
 im=Image.open(Path.home()/'AppData/Local/Temp'/('codex-clipboard-'+file+'.png')).convert('RGBA');frames=extract(im,bounds);meta=pack(name,frames);effectim=Image.open(Path.home()/'AppData/Local/Temp'/('codex-clipboard-'+VFX[name]+'.png')).convert('RGBA');meta['vfx']=pack(name,extract(effectim,[round(effectim.height/3),round(effectim.height*2/3)]),True);manifest[name]=meta
 Image.open(OUT/meta['file']).save(preview/(name.lower()+'.png'));Image.open(OUT/meta['vfx']['file']).save(preview/(name.lower()+'-vfx.png'));print(name,'ready',flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print('TOTAL',sum(p.stat().st_size for p in OUT.iterdir()),flush=True)
