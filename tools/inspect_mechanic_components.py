from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque
im=Image.open(Path.home()/'Downloads/a_clean_transparent_background_png_style_illustrat_1_batch_1.png').convert('RGBA')
alpha=np.array(im.getchannel('A'))
mask=alpha>8
seen=np.zeros(mask.shape,dtype=bool)
components=[]
for y,x in np.argwhere(mask):
    if seen[y,x]:continue
    pending=deque([(int(x),int(y))]);seen[y,x]=True;points=[]
    while pending:
        px,py=pending.popleft();points.append((px,py))
        for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
            if 0<=nx<im.width and 0<=ny<im.height and mask[ny,nx] and not seen[ny,nx]:
                seen[ny,nx]=True;pending.append((nx,ny))
    if len(points)>1000:
        a=np.array(points)
        components.append({'pixels':len(points),'box':[int(a[:,0].min()),int(a[:,1].min()),int(a[:,0].max()+1),int(a[:,1].max()+1)]})
print(im.size, sorted(components,key=lambda c:-c['pixels']))
