from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageDraw
root=Path('C:/Users/Henri/Documents/Codex/2026-08-22/ku/work/verseborn-world-site-3/public/comics/og')
out=Path('../../outputs/vortex-script-references');out.mkdir(parents=True,exist_ok=True)
for issue in [0,12,13,14,15]:
 r=PdfReader(root/f'Verseborn-Original-Issue-{issue:02d}.pdf'); ims=[]
 for n,p in enumerate(r.pages):
  if not p.images: continue
  im=max(p.images,key=lambda v:len(v.data)).image.convert('RGB');im.save(out/f'issue-{issue}-page-{n+1}.jpg');im.thumbnail((175,235));t=Image.new('RGB',(185,260),'white');t.paste(im,((185-im.width)//2,20));ImageDraw.Draw(t).text((3,3),f'Issue {issue} p{n+1}',fill='black');ims.append(t)
 for start in range(0,len(ims),20):
  sheet=Image.new('RGB',(925,1040),'#aaa')
  for j,im in enumerate(ims[start:start+20]):sheet.paste(im,((j%5)*185,(j//5)*260))
  sheet.save(out/f'issue-{issue}-contact-{start//20}.jpg')
 print(issue,len(ims))
