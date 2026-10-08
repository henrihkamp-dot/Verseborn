from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "game" / "assets" / "sprites" / "battle-v2"
EXPECTED = {
    "Verseborn",
    "Mira",
    "Seerin",
    "Torren",
    "Glimmer",
    "GlimmerMech",
    "Kael",
    "KaelShadow",
    "Sparky",
}
ANIMATIONS = {"idle", "melee", "magic", "ultimate", "death"}


manifest = json.loads((SPRITES / "manifest.json").read_text(encoding="utf-8"))
assert set(manifest) == EXPECTED

summary: dict[str, object] = {}
for name, config in manifest.items():
    assert config["columns"] == 4
    assert config["rows"] == 5
    assert config["directFrames"] is True
    assert ANIMATIONS.issubset(config["rowMap"])
    image = Image.open(SPRITES / config["file"]).convert("RGBA")
    cell_width = config["cellWidth"]
    cell_height = config["cellHeight"]
    assert image.size == (cell_width * 4, cell_height * 5)
    minimum_margin = 10_000
    idle_centers: list[float] = []
    for row in range(5):
        for column in range(4):
            cell = image.crop(
                (
                    column * cell_width,
                    row * cell_height,
                    (column + 1) * cell_width,
                    (row + 1) * cell_height,
                )
            )
            bounds = cell.getchannel("A").getbbox()
            assert bounds is not None, f"{name} row {row} frame {column} is empty"
            margins = (bounds[0], bounds[1], cell_width - bounds[2], cell_height - bounds[3])
            minimum_margin = min(minimum_margin, *margins)
            assert min(margins) >= 20, f"{name} row {row} frame {column} margin {margins}"
            if row == config["rowMap"]["idle"]:
                idle_centers.append((bounds[0] + bounds[2]) / 2)
    idle_center_range = max(idle_centers) - min(idle_centers)
    assert idle_center_range <= 1.5, f"{name} Idle slides horizontally by {idle_center_range}px"
    summary[name] = {
        "cell": [cell_width, cell_height],
        "minimumTransparentMargin": minimum_margin,
        "referenceHeight": config["referenceHeight"],
        "idleCenterRange": idle_center_range,
    }

mech = manifest["GlimmerMech"]
mech_image = Image.open(SPRITES / mech["file"]).convert("RGBA")
magic_row = mech["rowMap"]["magic"]
magic_frames = [
    mech_image.crop(
        (
            column * mech["cellWidth"],
            magic_row * mech["cellHeight"],
            (column + 1) * mech["cellWidth"],
            (magic_row + 1) * mech["cellHeight"],
        )
    ).tobytes()
    for column in range(4)
]
assert len(set(magic_frames)) == 1, "Glimmer Mech Magic must use only the intact source pose"

print(json.dumps(summary, indent=2))
