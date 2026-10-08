"""Extract the user-supplied role/rarity sheets without shipping source PNGs."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFilter
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / 'Downloads'
OUT = ROOT / 'public/game/assets/ui/gear-visuals'
QA = ROOT / '.sites-artifacts/gear-visuals-qa'
RARITIES = ['rare', 'epic', 'legendary', 'mythic', 'artifact']
SHEETS = [
    ('fantasy_rpg_armor_icon_collection.png', [('dps', 'armour'), ('utility', 'armour')]),
    ('rpg_kerstharnas_in_hemels_licht.png', [('heal', 'armour'), ('tank', 'armour')]),
    ('betoverend_wapen_en_magie_assetblad.png', [('dps', 'weapon'), ('utility', 'weapon')]),
    ('magische_rpg_wapeninventaris_in_10_delen.png', [('heal', 'weapon'), ('tank', 'weapon')]),
    ('fantasy_helmeniconen_voor_rpg_ui.png', [('dps', 'helmet'), ('utility', 'helmet')]),
    ('fantasyhelmen_van_eenvoudig_tot_goddelijk.png', [('heal', 'helmet'), ('tank', 'helmet')]),
    ('fantastische_juwelen_voor_een_rpg_inventaris.png', [('dps', 'ring'), ('dps', 'necklace'), ('utility', 'ring'), ('utility', 'necklace')]),
    ('magische_rpg_sieraden_collectie.png', [('heal', 'ring'), ('heal', 'necklace'), ('tank', 'ring'), ('tank', 'necklace')]),
]

OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
manifest = []
def isolate(cell):
    # Keep the main opaque object; reject disconnected pieces of adjacent cells.
    alpha = cell.getchannel('A')
    pixels = alpha.load()
    seen = set()
    components = []
    for y in range(cell.height):
        for x in range(cell.width):
            if pixels[x, y] < 100 or (x, y) in seen:
                continue
            points = []
            queue = deque([(x, y)])
            seen.add((x, y))
            while queue:
                px, py = queue.popleft()
                points.append((px, py))
                for nx, ny in [(px-1, py), (px+1, py), (px, py-1), (px, py+1)]:
                    if 0 <= nx < cell.width and 0 <= ny < cell.height and (nx, ny) not in seen and pixels[nx, ny] >= 100:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            components.append(points)
    main = max(components, key=len)
    mask = Image.new('L', cell.size)
    mp = mask.load()
    for x, y in main:
        mp[x, y] = 255
    # Retain antialiasing and nearby glow without reconnecting neighbor fragments.
    mask = mask.filter(ImageFilter.MaxFilter(21))
    from PIL import ImageChops
    cell.putalpha(ImageChops.multiply(alpha, mask))
    return cell

for source, rows in SHEETS:
    sheet = Image.open(SOURCE / source).convert('RGBA')
    for row, (role, slot) in enumerate(rows):
        for col, rarity in enumerate(RARITIES):
            xs = [0, 324, 648, 972, 1296, 1619] if sheet.width == 1619 else [0, 280, 560, 840, 1120, 1402]
            if source == 'rpg_kerstharnas_in_hemels_licht.png':
                xs = [0, 310, 603, 915, 1240, 1619]
            ys = [0, 485, 971] if len(rows) == 2 else [0, 270, 555, 795, 1122]
            box = (xs[col], ys[row], xs[col + 1], ys[row + 1])
            cell = isolate(sheet.crop(box))
            bounds = cell.getchannel('A').getbbox()
            if not bounds:
                raise ValueError(f'Empty cell: {source} {row} {col}')
            art = cell.crop(bounds)
            size = {'weapon': 210, 'helmet': 218, 'armour': 228, 'necklace': 234, 'ring': 236}[slot]
            art.thumbnail((size, size), Image.Resampling.LANCZOS)
            canvas = Image.new('RGBA', (256, 256))
            canvas.alpha_composite(art, ((256 - art.width) // 2, (256 - art.height) // 2))
            filename = f'{role}-{rarity}-{slot}.webp'
            canvas.save(OUT / filename, 'WEBP', quality=78, method=4)
            manifest.append({'file': filename, 'source': source, 'row': row, 'column': col,
                             'source_box': box, 'alpha_bounds': bounds,
                             'source_edge_contact': bounds[0] == 0 or bounds[1] == 0 or bounds[2] == cell.width or bounds[3] == cell.height})

contact = Image.new('RGB', (1000, 20 * 120), '#221b2c')
draw = ImageDraw.Draw(contact)
for i, entry in enumerate(manifest):
    x, y = (i % 5) * 200, (i // 5) * 120
    icon = Image.open(OUT / entry['file']).convert('RGBA')
    icon.thumbnail((100, 100))
    contact.paste(icon, (x + 50, y), icon)
    draw.text((x + 4, y + 101), entry['file'].removesuffix('.webp'), fill='white')
contact.save(QA / 'contact-sheet.jpg', quality=90)
(QA / 'extraction.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps({'count': len(manifest), 'bytes': sum(p.stat().st_size for p in OUT.glob('*.webp')),
                  'edge_contacts': [e['file'] for e in manifest if e['source_edge_contact']]}))
