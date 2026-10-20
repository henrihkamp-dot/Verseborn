"""Prepare generated recruitment artwork without changing the source images."""
from pathlib import Path
from PIL import Image
import json, shutil
from collections import deque
def largest_piece_bounds(im):
    # A neighbouring atlas cell can leave a disconnected sliver at an edge.
    w,h=im.size;mask=bytearray(im.getchannel('A').point(lambda p:1 if p>40 else 0).tobytes());best=(0,(0,0,w,h))
    for start in range(len(mask)):
        if not mask[start]:continue
        mask[start]=0;q=deque([start]);count=0;loX=w;loY=h;hiX=hiY=0
        while q:
            n=q.popleft();x=n%w;y=n//w;count+=1;loX=min(loX,x);loY=min(loY,y);hiX=max(hiX,x);hiY=max(hiY,y)
            for v in ([n-1] if x else [])+([n+1] if x<w-1 else [])+([n-w] if y else [])+([n+w] if y<h-1 else []):
                if mask[v]:mask[v]=0;q.append(v)
        if count>best[0]:best=(count,(max(0,loX-4),max(0,loY-4),min(w,hiX+5),min(h,hiY+5)))
    return best[1]
root=Path(__file__).resolve().parents[1]
out=root/'public/game/assets/hall/welcome-302'
originals=root.parent.parent/'outputs/welcome-cinematic-assets/source'
out.mkdir(parents=True,exist_ok=True);originals.mkdir(parents=True,exist_ok=True)
generated=Path('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2')
sources={'Revus':'3fcbf388-fbd2-4e9a-977a-b77f1992eea6','Nyx':'8820d491-6db8-425a-bef4-fc1641f7769f','Rava':'ec38e44a-6a38-4b1d-9e50-d603c494de14','Jory':'ee4b1e48-bc29-4e16-ae58-5ef0140b8370','gym':'6134d3e6-c63e-4f40-b889-2949c4ec2852','chibi':'48089576-4d79-4ff0-a0a7-515f6c5b6d3b','props':'2bf41be1-b990-4253-b72b-4259e033acd7','Verseborn':'9c542b01-767d-4563-9c4a-08408686481b','Mira':'dd6b37b4-2134-44f2-a2ed-e430d6d82b4a','Torren':'f819067d-abd2-4304-b858-a0bfc330addc','Seerin':'4bb856da-b3d4-4b1a-ba9d-c8c7e679ba0e','Kael':'0536fa02-7e4d-4dcc-9679-1d0900702ede','Sparky':'0ba70415-1fa2-4121-8da0-7e52160fe4ac'}
sources['Marli']='a8766cc3-ab9e-43ae-92c2-71597de6c91a'
manifest={'version':302,'guests':{},'props':['register','badge','bandages','ribbon','ledger','stew','blanket','provisions']}
for name,uid in sources.items():
    path=generated/f'exec-{uid}.png';shutil.copy2(path,originals/f'{name}.png');im=Image.open(path).convert('RGBA')
    if name=='gym':
        im.convert('RGB').resize((1152,648),Image.Resampling.LANCZOS).save(out/'gym.webp',quality=87);continue
    if name=='chibi':
        for index in range(3):
            cell=im.crop((round(index*im.width/3),0,round((index+1)*im.width/3),im.height))
            bounds=cell.getchannel('A').point(lambda p:255 if p>35 else 0).getbbox();cell=cell.crop(bounds);cell.thumbnail((640,440),Image.Resampling.LANCZOS);cell.save(out/f'chibi-{index}.webp',quality=88)
        continue
    if name=='props':
        for index,key in enumerate(manifest['props']):
            cell=im.crop((round(index%4*im.width/4),round(index//4*im.height/2),round((index%4+1)*im.width/4),round((index//4+1)*im.height/2)))
            if key=='stew':cell=cell.crop(largest_piece_bounds(cell))
            bounds=cell.getchannel('A').point(lambda p:255 if p>40 else 0).getbbox();cell=cell.crop(bounds);cell.thumbnail((220,180),Image.Resampling.LANCZOS);cell.save(out/f'{key}.webp',quality=88)
        continue
    cells=[];bounds=[]
    for i in range(6):
        cell=im.crop((round(i%3*im.width/3),round(i//3*im.height/2),round((i%3+1)*im.width/3),round((i//3+1)*im.height/2)))
        bbox=cell.getchannel('A').point(lambda p:255 if p>45 else 0).getbbox();cells.append(cell.crop(bbox));bounds.append(bbox)
    # One scale per character preserves body size through changes of pose.
    scale=min(224/max(c.height for c in cells),242/max(c.width for c in cells))
    atlas=Image.new('RGBA',(768,512))
    for i,c in enumerate(cells):
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
        atlas.alpha_composite(c,(i%3*256+(256-c.width)//2,i//3*256+244-c.height))
    atlas.save(out/f'{name.lower()}.webp',quality=88)
    head=cells[0];head=head.crop((0,0,head.width,round(head.height*.43)));head.thumbnail((256,256),Image.Resampling.LANCZOS);head.save(out/f'{name.lower()}-portrait.webp',quality=90)
    manifest['guests'][name]={'file':name.lower()+'.webp','portrait':name.lower()+'-portrait.webp','columns':3,'rows':2,'cell':256,'baseline':244,'sourceBounds':bounds}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Prepared',len(list(out.iterdir())),'assets;',sum(p.stat().st_size for p in out.iterdir()),'bytes')
