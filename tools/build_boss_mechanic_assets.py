"""Extract only the supplied compact mechanic art; original PNG sheets stay outside runtime."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/game/assets/ui/boss-mechanics'
DOWNLOADS = Path.home() / 'Downloads'
NAMES = ['protectedGuest', 'sanctuary', 'inspectionOrder', 'violationStamp', 'guidanceMark', 'rootBind', 'memoryAdaptation', 'memoryCore', 'echoSigil', 'beguilingVeil', 'oathguard', 'brokenOath', 'harmonicRings', 'buffRecord', 'skillRecord', 'memoryRecord']
manifest = {}

def quiet_cut(alpha, expected, radius, axis):
    occupancy = (alpha > 0).sum(axis=1-axis)
    start, end = max(1, expected-radius), min(alpha.shape[axis]-1, expected+radius)
    minimum = occupancy[start:end+1].min()
    return min((i for i in range(start,end+1) if occupancy[i] == minimum), key=lambda i: abs(i-expected))

def isolate_icon(cell):
    rgba = np.array(cell)
    # Disconnect hairline bridges to neighboring ornaments, then restore the
    # original alpha around the full main icon rather than cutting its outline.
    core = cell.getchannel('A').point(lambda value: 255 if value > 128 else 0).filter(ImageFilter.MinFilter(5))
    mask = np.array(core) > 0
    seen = np.zeros(mask.shape,dtype=bool)
    components = []
    for y,x in np.argwhere(mask):
        if seen[y,x]:
            continue
        pending = deque([(int(x),int(y))])
        seen[y,x] = True
        points = []
        while pending:
            px,py = pending.popleft()
            points.append((px,py))
            for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                if 0<=nx<cell.width and 0<=ny<cell.height and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx] = True
                    pending.append((nx,ny))
        components.append(points)
    main = max(components,key=len)
    keep = np.zeros(mask.shape,dtype=bool)
    points = np.array(main)
    keep[points[:,1],points[:,0]] = True
    expanded = Image.fromarray(keep.astype('uint8')*255).filter(ImageFilter.MaxFilter(17))
    rgba[:,:,3][np.array(expanded)==0] = 0
    return Image.fromarray(rgba)

def extract(im, box, name, limit, clean=False):
    cell = im.crop(box)
    if clean:
        cell = isolate_icon(cell)
    bounds = cell.getbbox()
    if not bounds:
        raise ValueError(name)
    crop = cell.crop(bounds)
    crop.thumbnail((limit-12, limit-12), Image.Resampling.LANCZOS)
    result = Image.new('RGBA', (crop.width+12, crop.height+12))
    result.alpha_composite(crop, (6,6))
    file = name + '.webp'
    result.save(OUT/file, 'WEBP', quality=78, method=6, exact=True)
    manifest[name] = file
    return result

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    icons = Image.open(DOWNLOADS/'a_clean_transparent_background_png_style_illustrat_1_batch_1.png').convert('RGBA')
    alpha = np.array(icons.getchannel('A'))
    ys = [0] + [quiet_cut(alpha, y, 26, 0) for y in (335,634,940)] + [icons.height]
    for row in range(4):
        xs = [0] + [quiet_cut(alpha[ys[row]:ys[row+1]], x, 24, 1) for x in (335,660,958)] + [icons.width]
        for col in range(4):
            extract(icons, (xs[col],ys[row],xs[col+1],ys[row+1]), NAMES[row*4+col], 96, clean=True)
    overlays = Image.open(DOWNLOADS/'a_clean_png_style_game_ui_asset_sheet_on_a_transpa_4_batch_4.png').convert('RGBA')
    for index, name in enumerate(['guidance', 'sanctuary', 'roots', 'violation', 'echo', 'veil', 'lock', 'brokenShield', 'rings', 'core', 'aura', 'impact']):
        col, row = index % 3, index // 3
        extract(overlays, (round(col*overlays.width/3), round(row*overlays.height/4), round((col+1)*overlays.width/3), round((row+1)*overlays.height/4)), 'effect-'+name, 176)
    panels = Image.open(DOWNLOADS/'a_clean_transparent_png_asset_sheet_ui_overlay_3_batch_3.png').convert('RGBA')
    extract(panels, (545,375,panels.width,668), 'detail-panel', 640)
    extract(panels, (0,670,panels.width,956), 'warning-banner', 768)
    states = Image.open(DOWNLOADS/'a_clean_transparent_png_style_game_ui_asset_sheet_2_batch_2.png').convert('RGBA')
    extract(states, (0,0,round(states.width/4),350), 'normal-frame', 100)
    extract(states, (round(states.width/4),0,round(states.width/2),350), 'active-frame', 100)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    # A review montage is not included in runtime.
    review = Image.new('RGB',(640,560),'#29222e')
    draw = ImageDraw.Draw(review)
    for index,name in enumerate(NAMES):
        im=Image.open(OUT/manifest[name]);im.thumbnail((110,105))
        x,y=(index%4)*160,(index//4)*140
        review.paste(im,(x+25,y+5),im)
        draw.text((x+6,y+115),name,fill='white')
    review.save(ROOT/'.sites-artifacts/mechanic-icons-review.png')
    print(json.dumps({'files':len(manifest),'bytes':sum((OUT/file).stat().st_size for file in manifest.values())}))

if __name__=='__main__':
    main()
