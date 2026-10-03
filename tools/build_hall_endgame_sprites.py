"""Import only the ten supplied 4x5 boss sheets; leave existing atlases intact."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/game/assets/sprites/enemies-battle'
SOURCES = [
    ('Malkhius', 'malkhius', 'a_clean_transparent_background_sprite_sheet_image_1.png'),
    ('Draconic Guide', 'draconic-guide', 'a_high_detail_game_sprite_sheet_illustration_a_tr_2_batch_1.png'),
    ('Memory Root Guardian', 'memory-root-guardian', 'a_high_resolution_sprite_sheet_on_a_transparent_ba_3_batch_2.png'),
    ('Sister Maelin', 'sister-maelin', 'a_clean_transparent_background_sprite_sheet_in_the_4_batch_3.png'),
    ('Guild Inspector Voss', 'guild-inspector-voss', 'a_detailed_sprite_sheet_style_illustration_on_a_tr_5_batch_4.png'),
    ('Concierge Veyr', 'concierge-veyr', 'a_transparent_background_sprite_sheet_illustration_6_batch_5.png'),
    ('Lady Morvanna', 'lady-morvanna', 'a_detailed_sprite_sheet_style_illustration_on_a_tr_7_batch_6.png'),
    ('Koru-Vak, the Iron Oathkeeper', 'koru-vak', 'a_clean_transparent_background_sprite_sheet_game_8_batch_7.png'),
    ('Selyra Quill, the Grand Cantor', 'selyra-quill', 'a_high_resolution_transparent_background_sprite_sh_9_batch_8.png'),
    ('Ilyss Vanthe, the First Archivist', 'ilyss-vanthe', 'a_clean_sprite_sheet_style_illustration_on_a_trans_10_batch_9.png'),
]

def quiet_cut(alpha, expected, radius, axis):
    start, end = max(1, expected-radius), min(alpha.shape[axis]-1, expected+radius)
    occupancy = (alpha > 0).sum(axis=1-axis)
    values = occupancy[start:end+1]
    minimum = values.min()
    candidates = np.flatnonzero(values == minimum) + start
    return int(min(candidates, key=lambda x: abs(x-expected)))

def transparent_seam(alpha, expected, radius):
    start, end = max(1, expected-radius), min(alpha.shape[1]-1, expected+radius)
    band = alpha[:, start:end+1]
    cost = (band > 0).astype(float)*10000 + np.abs(np.arange(start,end+1)-expected)*.01
    previous = cost[0].copy()
    parents = np.zeros(band.shape, dtype=np.int16)
    for y in range(1, len(band)):
        choices = np.stack([np.r_[np.inf, previous[:-1]], previous, np.r_[previous[1:], np.inf]])
        move = choices.argmin(axis=0)-1
        parents[y] = np.arange(band.shape[1])+move
        previous = choices.min(axis=0)+cost[y]
    seam = np.zeros(len(band), dtype=int)
    seam[-1] = previous.argmin()
    for y in range(len(band)-1,0,-1):
        seam[y-1] = parents[y,seam[y]]
    return seam+start

def restore_whole_components(alpha, owners):
    seen = np.zeros(alpha.shape, dtype=bool)
    for y,x in np.argwhere(alpha > 0):
        if seen[y,x]:
            continue
        pending = deque([(int(x),int(y))])
        seen[y,x] = True
        points = []
        while pending:
            px,py = pending.popleft()
            points.append((px,py))
            for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                if 0<=nx<alpha.shape[1] and 0<=ny<alpha.shape[0] and alpha[ny,nx]>0 and not seen[ny,nx]:
                    seen[ny,nx]=True
                    pending.append((nx,ny))
        points=np.array(points)
        counts=np.bincount(owners[points[:,1],points[:,0]],minlength=20)
        winner=int(counts.argmax())
        # Preserve complete connected weapons/robes/effects when the transparent
        # seam only caught a protrusion. Never merge two touching full poses.
        if counts[winner]/len(points)>=.85 and np.ptp(points[:,0])<alpha.shape[1]*.38 and np.ptp(points[:,1])<alpha.shape[0]*.32:
            owners[points[:,1],points[:,0]]=winner
    return owners

def main():
    manifest = json.loads((OUT / 'manifest.json').read_text())
    reports = []
    for name, slug, source in SOURCES:
        im = Image.open(Path.home() / 'Downloads' / source).convert('RGBA')
        alpha = np.array(im.getchannel('A'))
        # The supplied Ultimate rows are taller than Idle/Melee/Magic rows.
        cuts = [0] + [quiet_cut(alpha, y, 22, 0) for y in (282, 558, 838, 1165)] + [im.height]
        horizontal = [np.zeros(im.width,dtype=int)] + [transparent_seam(alpha.T,y,45) for y in cuts[1:-1]] + [np.full(im.width,im.height,dtype=int)]
        owners = np.zeros(alpha.shape,dtype=np.uint8)
        for row in range(5):
            row_mask = (np.arange(im.height)[:,None]>=horizontal[row][None,:]) & (np.arange(im.height)[:,None]<horizontal[row+1][None,:])
            row_alpha = np.where(row_mask,alpha,0)
            vertical = [np.zeros(im.height,dtype=int)] + [transparent_seam(row_alpha,round(im.width*x/4),75) for x in (1,2,3)] + [np.full(im.height,im.width,dtype=int)]
            for col in range(4):
                # Split cells before independently trimming their transparent bounds.
                mask = row_mask & (np.arange(im.width)[None,:]>=vertical[col][:,None]) & (np.arange(im.width)[None,:]<vertical[col+1][:,None])
                owners[mask]=row*4+col
        owners=restore_whole_components(alpha,owners)
        frames = []
        for row in range(5):
            for col in range(4):
                mask=owners==row*4+col
                rgba = np.array(im)
                rgba[:,:,3][~mask] = 0
                cell = Image.fromarray(rgba)
                box = cell.getbbox()
                if not box:
                    raise ValueError(f'Empty frame: {name} {row}/{col}')
                crop = cell.crop(box)
                center = im.width*(col+.5)/4-box[0]
                # Row-local ground line keeps full falling/death poses, without
                # independently scaling the visible art in each frame.
                ground = cuts[row+1]-box[1]
                frames.append((crop, center, ground, row, col))
        left = max(center for crop,center,ground,row,col in frames)
        right = max(crop.width-center for crop,center,ground,row,col in frames)
        above = max(ground for crop,center,ground,row,col in frames)
        below = max(crop.height-ground for crop,center,ground,row,col in frames)
        padding = 16
        cw, ch = int(np.ceil(left+right))+padding*2, int(np.ceil(above+max(0,below)))+padding*2
        baseline = int(np.ceil(above))+padding
        atlas = Image.new('RGBA',(cw*4,ch*5))
        boxes = []
        for crop,center,ground,row,col in frames:
            x,y = round(left+padding-center),round(baseline-ground)
            assert x>=padding-1 and y>=padding-1
            assert x+crop.width<=cw-padding+1 and y+crop.height<=ch-padding+1
            atlas.alpha_composite(crop,(col*cw+x,row*ch+y))
            boxes.append([x,y,crop.width,crop.height])
        # One scale for all 20 frames, preserving body/effect proportions.
        scale = min(1, 320/max(cw,ch))
        if scale<1:
            ncw,nch=round(cw*scale),round(ch*scale)
            packed=Image.new('RGBA',(ncw*4,nch*5))
            for row in range(5):
                for col in range(4):
                    packed.alpha_composite(atlas.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch)).resize((ncw,nch),Image.Resampling.LANCZOS),(col*ncw,row*nch))
            atlas=packed
            cw,ch=ncw,nch
        file=slug+'.webp'
        atlas.save(OUT/file,'WEBP',quality=82,method=6,exact=True)
        reference = np.median([frame[0].height for frame in frames[:4]])*scale
        manifest[name]={'file':file,'columns':4,'rows':5,'cellWidth':cw,'cellHeight':ch,'baseline':round(baseline*scale),'referenceHeight':round(reference),'rowMap':{'idle':0,'melee':1,'magic':2,'ultimate':3,'death':4},'frameSequences':{k:[0,1,2,3] for k in ['idle','melee','magic','ultimate','death']},'battleOnly':True,'facing':'left'}
        reports.append({'name':name,'bytes':(OUT/file).stat().st_size,'frames':20,'source':source,'rowCuts':cuts,'padding':padding,'uniformScale':scale})
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'.sites-artifacts/endgame-sprite-report.json').write_text(json.dumps(reports,indent=2)+'\n')
    print(json.dumps({'bosses':len(reports),'frames':200,'totalBytes':sum(r['bytes'] for r in reports)}))

if __name__=='__main__':
    main()
