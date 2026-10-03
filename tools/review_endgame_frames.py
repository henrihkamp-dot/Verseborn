import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
assets = root / 'public/game/assets/sprites/enemies-battle'
manifest = json.loads((assets / 'manifest.json').read_text())
report = json.loads((root / '.sites-artifacts/endgame-sprite-report.json').read_text())
checked = 0
for item in report:
    entry = manifest[item['name']]
    atlas = Image.open(assets / entry['file']).convert('RGBA')
    cw, ch = entry['cellWidth'], entry['cellHeight']
    review = Image.new('RGB', (1000, 1250), '#302b39')
    draw = ImageDraw.Draw(review)
    for row in range(5):
        for col in range(4):
            frame = atlas.crop((col*cw, row*ch, (col+1)*cw, (row+1)*ch))
            box = frame.getbbox()
            assert box and min(box[0], box[1], cw-box[2], ch-box[3]) >= 5, (item['name'], row, col, box)
            frame.thumbnail((240, 220), Image.Resampling.LANCZOS)
            review.paste(frame, (col*250+(250-frame.width)//2, row*250+10), frame)
            draw.text((col*250+10, row*250+235), f'{item["name"]} {row}/{col}', fill='white')
            checked += 1
    review.save(root / '.sites-artifacts' / ('frames-' + entry['file'].replace('.webp', '.png')))
print(json.dumps({'checkedFrames': checked, 'transparentMargins': 'passed'}))
