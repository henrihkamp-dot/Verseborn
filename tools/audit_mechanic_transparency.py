import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
assets = root / 'public/game/assets/ui/boss-mechanics'
manifest = json.loads((assets / 'manifest.json').read_text())
review = Image.new('RGB', (1000, 1000), '#302b39')
draw = ImageDraw.Draw(review)
for index, (name, file) in enumerate(manifest.items()):
    im = Image.open(assets / file).convert('RGBA')
    alpha = np.array(im.getchannel('A'))
    assert alpha.min() == 0 and alpha.max() > 0, name
    assert not alpha[:5].any() and not alpha[-5:].any() and not alpha[:,:5].any() and not alpha[:,-5:].any(), name
    if name not in ['detail-panel', 'warning-banner']:
        rgba = np.array(im)
        white = (rgba[:,:,:3].min(axis=2)>245) & (alpha>250)
        # Reject a solid 8x8 white block, not legitimate small light sparkles.
        for y in range(im.height-7):
            for x in range(im.width-7):
                assert not white[y:y+8,x:x+8].all(), (name, x, y)
    im.thumbnail((220, 100), Image.Resampling.LANCZOS)
    x,y=index%4*250,index//4*125
    review.paste(im,(x+(250-im.width)//2,y+5),im)
    draw.text((x+8,y+110),name,fill='white')
review.save(root / '.sites-artifacts/mechanic-transparency-review.png')
print(json.dumps({'assets':len(manifest),'transparentMargins':'passed','opaqueWhiteBlocks':0}))
