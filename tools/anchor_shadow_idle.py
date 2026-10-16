"""Register drawn frames to a planted boot/paw, excluding the moving aura."""
import json
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
output = root.parent.parent / 'outputs' / 'shadow-idle-231'
manifest_path = root / 'public/game/assets/sprites/shadow-idle-231/manifest.json'
manifest = json.loads(manifest_path.read_text())
boots = {'Seerin': (126,270,311,290), 'Sparky': (50,270,241,290),
         'Glimmer': (90,270,210,290), 'Torren': (90,270,246,290),
         'Mira': (145,270,265,290), 'Verseborn': (158,270,341,290),
         'Kael': (145,270,305,290)}
report = {}
for key, rect in boots.items():
    frames = [np.array(Image.open(output / f'{key.lower()}-{i}.png').convert('RGBA'), dtype=np.float32) for i in range(8)]
    x0,y0,x1,y1 = rect
    ref = frames[0][y0:y1,x0:x1]
    mask = ref[:,:,3] > 200
    assert mask.sum() > 100, key
    offsets, scores = [], []
    for frame in frames:
        best = None
        for dy in range(-18,19):
            for dx in range(-80,81):
                patch = frame[y0+dy:y1+dy,x0+dx:x1+dx]
                if patch.shape != ref.shape: continue
                color = np.abs(patch[:,:,:3] - ref[:,:,:3]).mean(axis=2)
                alpha = np.abs(patch[:,:,3] - ref[:,:,3])
                score = float(color[mask].mean() + alpha.mean()*.8 + dx*dx*.005 + dy*dy*.01)
                if best is None or score < best[0]: best = (score,dx,dy)
        score,dx,dy = best
        assert abs(dx) < 80 and abs(dy) < 18, (key,best)
        offsets.append([-dx,-dy]);scores.append(round(score,3))
    manifest[key]['frameOffsets'] = offsets
    manifest[key]['registration'] = {'kind':'planted-foot','referenceRect':list(rect)}
    report[key] = {'offsets':offsets,'scores':scores}
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
report_path = root.parent.parent / 'outputs/shadow-idle-232'
report_path.mkdir(exist_ok=True)
(report_path/'registration.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))

