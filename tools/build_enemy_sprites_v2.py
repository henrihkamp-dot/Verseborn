from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

import build_battle_sprites_v2 as party_builder


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools" / "sprite_sources" / "enemies-v2"
OUTPUT = ROOT / "public" / "game" / "assets" / "sprites" / "enemies-battle"
REVIEW = ROOT / ".analysis-battle" / "enemies-v2"
DEFAULT_TITLE_CROP_TOP = 96
TITLE_CROP_TOPS = {
    "Sir Reginald": 136,
    "Berend Blimpstone": 72,
    "Kaeldrin": 76,
    "Shade": 78,
    "Lysra": 76,
    "Jory Bellwick": 74,
    "Nyx Vael": 76,
    "Grumm": 104,
    "Prince Lucan Cindralis": 72,
    "Tibby": 78,
    "Tja": 96,
    "Red Dragon Lord": 80,
    "Corrupt Clergy": 92,
    "King Maeric": 90,
    "Marla": 90,
    "Ash Quarter Thugg": 96,
    "Angry Gnome Mob": 92,
    "Solinar": 96,
    "Solinar Enraged": 96,
    "Frostmile Wyrm": 94,
    "Ember Leviathan": 84,
}

ENEMIES = {
    "Brokk": "brokk.png",
    "Baron Revus Veln": "baron-revus-veln.png",
    "Gorg": "gorg.png",
    "Sir Reginald": "sir-reginald.png",
    "High Administrator Thaddeus": "high-administrator-thaddeus.png",
    "Clock Goblin": "clock-goblin.png",
    "Slobbo": "slobbo.png",
    "Elder Plumpin": "elder-plumpin.png",
    "Lord Sprocket": "lord-sprocket.png",
    "Saint Justin": "saint-justin.png",
    "Berend Blimpstone": "berend-blimpstone.png",
    "Kaeldrin": "kaeldrin.png",
    "Shade": "shade.png",
    "Lysra": "lysra.png",
    "Jory Bellwick": "jory-bellwick.png",
    "Nyx Vael": "nyx-vael.png",
    "Grumm": "grumm.png",
    "Prince Lucan Cindralis": "prince-lucan-cindralis.png",
    "Tibby": "tibby.png",
    "Tja": "tja.png",
    "Red Dragon Lord": "red-dragon-lord.png",
    "Corrupt Clergy": "corrupt-clergy.png",
    "King Maeric": "king-maeric.png",
    "Marla": "marla.png",
    "Ash Quarter Thugg": "ash-quarter-thugg.png",
    "Angry Gnome Mob": "angry-gnome-mob.png",
    "Solinar": "solinar.png",
    "Solinar Enraged": "solinar-enraged.png",
    "Frostmile Wyrm": "frostmile-wyrm.png",
    "Ember Leviathan": "ember-leviathan.png",
}

FRAME_SEQUENCES = {
    "idle": [0, 1, 2, 3, 2, 1],
    "walk": [0, 1, 2, 3, 2, 1],
    "melee": [0, 1, 2, 3, 0],
    "magic": [0, 1, 2, 3, 0],
    "ultimate": [0, 1, 2, 3, 3],
    "death": [0, 1, 2, 3, 3],
}


def slug(name: str) -> str:
    return name.lower().replace(" ", "-")


def build_enemy(name: str, source_name: str) -> tuple[dict[str, object], dict[str, object]]:
    source = Image.open(SOURCE / source_name).convert("RGBA")
    title_crop_top = TITLE_CROP_TOPS.get(name, DEFAULT_TITLE_CROP_TOP)
    source = source.crop((0, title_crop_top, source.width, source.height))
    atlas, config, frames, diagnostics, overlay = party_builder.build_atlas(name, source)
    if name in ("Solinar", "Solinar Enraged"):
        # The ornate title overlaps his two middle idle cells; use the clean adjacent poses.
        for target, clean in ((1, 0), (2, 3)):
            atlas.paste(frames[0][clean], (target * int(config["cellWidth"]), 0))
            frames[0][target] = frames[0][clean].copy()
    if name == "Solinar Enraged":
        # Match the visible boot line of Solinar's normal atlas at the same battle anchor.
        config["baseline"] = int(config["baseline"]) + 27
    file_name = f"{slug(name)}.png"
    atlas.save(OUTPUT / file_name, optimize=True)

    config.update({
        "file": file_name,
        "frameSequences": FRAME_SEQUENCES,
        "battleOnly": True,
        "sourceTitleCrop": title_crop_top,
    })

    proof = party_builder.make_proof(name, frames, int(config["baseline"]))
    proof.save(REVIEW / "proofs" / f"{slug(name)}.png", optimize=True)
    overlay.save(REVIEW / "seams" / f"{slug(name)}.png", optimize=True)
    party_builder.make_animation_previews(name, frames)

    report = {
        "source": source_name,
        "file": file_name,
        "cellWidth": config["cellWidth"],
        "cellHeight": config["cellHeight"],
        "baseline": config["baseline"],
        "referenceHeight": config["referenceHeight"],
        "idleStabilization": config["idleStabilization"],
        "sourceEdgeContacts": config["sourceEdgeContacts"],
        "frames": diagnostics,
    }
    return config, report


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (REVIEW / "proofs").mkdir(parents=True, exist_ok=True)
    (REVIEW / "seams").mkdir(parents=True, exist_ok=True)
    (REVIEW / "motion").mkdir(parents=True, exist_ok=True)
    party_builder.REVIEW = REVIEW

    manifest_path = OUTPUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    report: dict[str, object] = {}
    selected = set(sys.argv[1:]) or set(ENEMIES)
    unknown = selected - ENEMIES.keys()
    if unknown:
        raise ValueError(f"Unknown enemy names: {sorted(unknown)}")
    for name, source_name in ENEMIES.items():
        if name not in selected:
            continue
        config, details = build_enemy(name, source_name)
        manifest[name] = config
        report[name] = details

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    (REVIEW / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="ascii")
    print(json.dumps({name: {
        "cell": [details["cellWidth"], details["cellHeight"]],
        "referenceHeight": details["referenceHeight"],
        "idleStabilization": details["idleStabilization"],
        "sourceEdgeContacts": details["sourceEdgeContacts"],
    } for name, details in report.items()}, indent=2))


if __name__ == "__main__":
    main()
