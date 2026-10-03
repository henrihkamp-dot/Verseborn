"""Import the ten supplied battle-action sheets as transparent runtime atlases."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from build_hall_endgame_sprites import SOURCES, transparent_seam, restore_whole_components

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/game/assets/effects/endgame-bosses'
TEMP = Path.home() / 'AppData/Local/Temp'
FILES = [
    '6caed4ba-e7c2-4076-88a9-b4508e2acd16',
    '38eebf29-adc3-47f2-b107-5d5d5a01eb70',
    '8480f71e-50fe-4168-b7e2-853cd41b4d35',
    '4a6aeaf0-b204-44d7-897d-64a65b683dc5',
    '36a8466d-2bef-4e89-a925-e049ce58d337',
    '0bd3eef1-357f-4292-b651-938e85301ed6',
    '7627e5a4-e4da-4ee2-9576-a5cb60e4aa7b',
    'a4eba1bc-661e-456d-8c6d-b71693c0cfc5',
    '6675a069-9624-4d0e-bf96-3702e90791fd',
    'f3fb8864-cf0c-45fd-9e1e-a888c57d07f8',
]

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for (name, slug, _), source in zip(SOURCES, FILES):
        image = Image.open(TEMP / ('codex-clipboard-' + source + '.png')).convert('RGBA')
        rgba = np.array(image)
        alpha = rgba[:, :, 3]
        if alpha.min() != 0:
            raise ValueError('Nontransparent source: ' + name)
        cuts = [0, round(image.height*.255), round(image.height*.51), round(image.height*.715), image.height]
        horizontal = [np.zeros(image.width, dtype=int)] + [transparent_seam(alpha.T, cut, 50) for cut in cuts[1:-1]] + [np.full(image.width, image.height, dtype=int)]
        owners = np.zeros(alpha.shape, dtype=np.uint8)
        yy, xx = np.arange(image.height)[:,None], np.arange(image.width)[None,:]
        for row in range(4):
            row_mask = (yy >= horizontal[row][None,:]) & (yy < horizontal[row+1][None,:])
            row_alpha = np.where(row_mask, alpha, 0)
            expected = [round(image.width*c/4) for c in (1,2,3)]
            if row == 2 and slug in ('sister-maelin', 'concierge-veyr'):
                expected = [300,600,935]
            if slug == 'draconic-guide':
                expected = [295,580,900] if row == 2 else [295,600,950]
            vertical = [np.zeros(image.height, dtype=int)] + [transparent_seam(row_alpha, x, 20 if slug == 'draconic-guide' else 65) for x in expected] + [np.full(image.height, image.width, dtype=int)]
            for col in range(4):
                owners[row_mask & (xx >= vertical[col][:,None]) & (xx < vertical[col+1][:,None])] = row*4+col
        owners = restore_whole_components(alpha, owners)
        frames = []
        for row in range(4):
            for col in range(4):
                cell = rgba.copy()
                cell[:,:,3][owners != row*4+col] = 0
                isolated = Image.fromarray(cell)
                box = isolated.getbbox()
                if not box:
                    raise ValueError('Empty frame: ' + name)
                frames.append((isolated.crop(box), image.width*(col+.5)/4-box[0], (cuts[row]+cuts[row+1])/2-box[1]))
        left = max(x for frame,x,y in frames)
        right = max(frame.width-x for frame,x,y in frames)
        above = max(y for frame,x,y in frames)
        below = max(frame.height-y for frame,x,y in frames)
        scale = min(1, 240 / max(left+right+24, above+below+24))
        cw, ch = round((left+right+24)*scale), round((above+below+24)*scale)
        atlas = Image.new('RGBA', (cw*4,ch*4))
        for index,(frame,x,y) in enumerate(frames):
            frame = frame.resize((max(1,round(frame.width*scale)),max(1,round(frame.height*scale))), Image.Resampling.LANCZOS)
            dx,dy = round((left+12-x)*scale), round((above+12-y)*scale)
            atlas.alpha_composite(frame, (index%4*cw+dx,index//4*ch+dy))
        file = slug+'.webp'
        atlas.save(OUT/file, 'WEBP', quality=90, method=6, exact=True)
        manifest[name] = {'file':file,'cellWidth':cw,'cellHeight':ch,'anchorX':(left+12)*scale,'anchorY':(above+12)*scale,'columns':4,'rows':4,'rowMap':{'melee':0,'support':1,'magic':2,'ultimate':3}}
        review = Image.new('RGB',(1000,1000),'#302b39')
        draw = ImageDraw.Draw(review)
        loaded = Image.open(OUT/file).convert('RGBA')
        for index in range(16):
            frame = loaded.crop((index%4*cw,index//4*ch,(index%4+1)*cw,(index//4+1)*ch))
            a = np.array(frame.getchannel('A'))
            assert not a[:4].any() and not a[-4:].any() and not a[:,:4].any() and not a[:,-4:].any(), name
            frame.thumbnail((230,220))
            review.paste(frame,(index%4*250+(250-frame.width)//2,index//4*250+8),frame)
            draw.text((index%4*250+8,index//4*250+235),f'{name} {index//4}/{index%4}',fill='white')
        review.save(ROOT/'.sites-artifacts'/('vfx-'+slug+'.png'))
        print(name, (OUT/file).stat().st_size, flush=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'frames':160,'bytes':sum((OUT/e['file']).stat().st_size for e in manifest.values())}))

if __name__ == '__main__':
    main()
