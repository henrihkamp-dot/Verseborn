"""Compact the title fallback when packaging the expanded equipment art set."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
source = root / 'public/game/assets/maps/runtime/title-screen.png'
target = root / 'dist/client/game/assets/maps/runtime/title-screen.webp'
with Image.open(source) as artwork:
    artwork.save(target, 'WEBP', quality=88, method=6)
print('Title fallback encoded:', target.stat().st_size)
