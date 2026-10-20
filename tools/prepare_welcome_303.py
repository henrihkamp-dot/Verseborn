from PIL import Image
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1];out=root/'public/game/assets/hall/welcome-303';out.mkdir(exist_ok=True)
originals=root.parent.parent/'outputs/welcome-cinematic-assets/source';src=Path('C:/Users/Henri/.codex/generated_images/01a135c6-b1ee-7121-9142-424b666459d2')
path=src/'exec-ec66b2b7-4fad-4845-87f3-9c2e18bfa878.png';shutil.copy2(path,originals/'revus-chibi-303.png');im=Image.open(path).convert('RGBA');im.thumbnail((700,540),Image.Resampling.LANCZOS);im.save(out/'revus-chibi.webp',quality=88)
# One unchanged character drawing is the art source for a runtime joint rig.
# The rejected sheet is NOT played as an animation.
path=src/'exec-484ff9fd-e1f1-42d8-a8dd-d4d6365a5afd.png';shutil.copy2(path,originals/'revus-walk-rejected-303.png');im=Image.open(path).convert('RGBA');cell=im.crop((0,0,round(im.width/4),round(im.height/2))).resize((128,128),Image.Resampling.LANCZOS);cell.save(out/'revus-rig.webp',quality=94)
cell.resize((512,512),Image.Resampling.NEAREST).save(root.parent.parent/'outputs/revus-rig-source-303.png')
print('Saved reaction and rig source; rejected cycle is not a runtime sheet.')
