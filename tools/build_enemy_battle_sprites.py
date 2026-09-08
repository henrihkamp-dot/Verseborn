from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / "AppData" / "Local" / "Temp"
OUTPUT = ROOT / "public" / "game" / "assets" / "sprites" / "enemies-battle"
FRAME_COLUMNS = 5
CELL_WIDTH = 352
CELL_HEIGHT = 304
BASELINE = 286


@dataclass(frozen=True)
class Row:
    start: int
    end: int
    centers: tuple[int, ...]
    hide_after: int | None = None
    alpha_threshold: int = 20


def rows_1086() -> tuple[Row, ...]:
    return (
        Row(185, 425, (215, 385, 555, 725), 830),
        Row(430, 650, (220, 390, 560, 730, 900, 1045)),
        Row(655, 905, (215, 420, 625, 830, 1025)),
        Row(910, 1195, (215, 420, 625, 830, 1025)),
        Row(1200, 1448, (215, 420, 625, 830, 1025)),
    )


def rows_1122() -> tuple[Row, ...]:
    return (
        Row(185, 390, (215, 390, 565, 740), 830),
        Row(395, 575, (220, 385, 550, 715, 875, 1035)),
        Row(580, 775, (215, 420, 625, 835, 1030)),
        Row(780, 975, (215, 420, 625, 835, 1030)),
        Row(980, 1195, (215, 420, 625, 835, 1030)),
        Row(1200, 1402, (215, 420, 625, 835, 1030)),
    )


def rows_from_cuts(cuts: tuple[tuple[int, int], ...], width: int) -> tuple[Row, ...]:
    if width == 1086:
        centers = (
            (215, 385, 555, 725),
            (220, 390, 560, 730, 900, 1045),
            (215, 420, 625, 830, 1025),
            (215, 420, 625, 830, 1025),
            (215, 420, 625, 830, 1025),
        )
        hide_after = 830
    else:
        centers = (
            (215, 390, 565, 740),
            (220, 385, 550, 715, 875, 1035),
            (215, 420, 625, 835, 1030),
            (215, 420, 625, 835, 1030),
            (215, 420, 625, 835, 1030),
            (215, 420, 625, 835, 1030),
        )
        hide_after = 835
    return tuple(Row(start, end, centers[index], hide_after if index == 0 else None) for index, (start, end) in enumerate(cuts))


SHEETS = {
    "Inkbound Auditor": ("inkbond_auditor_pixel_sprite_sheet.png", "inkbound-auditor.png", rows_from_cuts(((190, 410), (420, 630), (640, 890), (895, 1200), (1220, 1448)), 1086)),
    "King Maeric": ("left_facing_king_maeric_sprite_sheet.png", "king-maeric.png", rows_from_cuts(((195, 425), (430, 605), (605, 775), (775, 990), (990, 1215), (1215, 1402)), 1122)),
    "Grumm": ("left_facing_grumm_sprite_sheet.png", "grumm.png", rows_from_cuts(((190, 395), (395, 575), (575, 775), (775, 985), (985, 1190), (1190, 1402)), 1122)),
    "Kaeldrin": ("kaeldrin_left_facing_sprite_sheet.png", "kaeldrin.png", rows_from_cuts(((190, 395), (395, 560), (560, 760), (760, 965), (965, 1175), (1175, 1402)), 1122)),
    "Marla": ("marli_left_facing_sprite_sheet.png", "marla.png", rows_from_cuts(((180, 385), (385, 570), (570, 790), (790, 990), (990, 1195), (1195, 1402)), 1122)),
    "Lyrsa": ("left_facing_lysra_sprite_sheet.png", "lyrsa.png", rows_from_cuts(((185, 405), (405, 590), (590, 765), (765, 965), (965, 1200), (1200, 1402)), 1122)),
    "Nyx": ("nyx_vael_left_facing_sprite_sheet.png", "nyx.png", rows_from_cuts(((195, 425), (425, 615), (610, 805), (805, 1005), (1005, 1200), (1200, 1402)), 1122)),
    "Rava": ("rava_cinderhorn_left_facing_sprite_sheet.png", "rava.png", rows_from_cuts(((190, 390), (390, 565), (565, 735), (735, 920), (920, 1135), (1135, 1402)), 1122)),
    "Shade": ("shade_left_facing_rogue_sprite_sheet.png", "shade.png", rows_from_cuts(((190, 390), (390, 580), (580, 780), (780, 975), (975, 1165), (1165, 1402)), 1122)),
    "Tja": ("tja_frost_dandy_left_facing_sprite_sheet.png", "tja.png", rows_from_cuts(((190, 405), (405, 595), (595, 790), (790, 990), (990, 1185), (1185, 1402)), 1122)),
    "Archive Custodian": ("archive_custodian_sprite_sheet.png", "archive-custodian.png", rows_from_cuts(((190, 420), (430, 650), (660, 890), (895, 1180), (1190, 1448)), 1086)),
    "Ash Wyrm": ("16_bit_dark_dragon_sprite_sheet.png", "ash-wyrm.png", rows_from_cuts(((195, 425), (435, 625), (640, 890), (900, 1180), (1190, 1448)), 1086)),
    "Cracked Pillar": ("cracked_armory_pillar_sprite_sheet.png", "cracked-armory-pillar.png", rows_from_cuts(((190, 430), (440, 665), (665, 915), (910, 1190), (1190, 1448)), 1086)),
    "Seal Bearer": ("clergy_seal_patrol_sprite_sheet.png", "clergy-seal-patrol.png", rows_from_cuts(((185, 430), (440, 665), (665, 925), (925, 1200), (1210, 1448)), 1086)),
    "Dock Foreman": ("dock_foreman_corrupted_sprite_sheet.png", "dock-foreman.png", rows_from_cuts(((190, 450), (450, 665), (665, 910), (905, 1210), (1215, 1448)), 1086)),
    "Dawn Gate Sentinel": ("dawn_gate_sentinel_sprite_sheet.png", "dawn-gate-sentinel.png", rows_from_cuts(((180, 435), (440, 670), (680, 920), (920, 1210), (1220, 1448)), 1086)),
    "Jory": ("jory_bellwick_left_facing_bard_sprite_sheet.png", "jory.png", rows_from_cuts(((195, 420), (420, 610), (605, 790), (790, 990), (990, 1190), (1190, 1402)), 1122)),
}


class DisjointSet:
    def __init__(self) -> None:
        self.parent: list[int] = []

    def add(self) -> int:
        value = len(self.parent)
        self.parent.append(value)
        return value

    def find(self, value: int) -> int:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: int, right: int) -> None:
        left = self.find(left)
        right = self.find(right)
        if left != right:
            self.parent[right] = left


def connected_runs(mask: np.ndarray) -> list[list[tuple[int, int, int]]]:
    dsu = DisjointSet()
    runs: list[tuple[int, int, int, int]] = []
    previous: list[tuple[int, int, int]] = []
    for y, row in enumerate(mask):
        changes = np.diff(np.pad(row.astype(np.int8), (1, 1)))
        starts = np.flatnonzero(changes == 1)
        ends = np.flatnonzero(changes == -1) - 1
        current: list[tuple[int, int, int]] = []
        pointer = 0
        for start, end in zip(starts.tolist(), ends.tolist()):
            label = dsu.add()
            while pointer < len(previous) and previous[pointer][1] < start - 1:
                pointer += 1
            scan = pointer
            while scan < len(previous) and previous[scan][0] <= end + 1:
                dsu.union(label, previous[scan][2])
                scan += 1
            current.append((start, end, label))
            runs.append((y, start, end, label))
        previous = current

    groups: dict[int, list[tuple[int, int, int]]] = {}
    for y, start, end, label in runs:
        groups.setdefault(dsu.find(label), []).append((y, start, end))
    return list(groups.values())


def metrics(runs: list[tuple[int, int, int]]) -> dict[str, float]:
    area = sum(end - start + 1 for _, start, end in runs)
    min_x = min(start for _, start, _ in runs)
    max_x = max(end for _, _, end in runs)
    min_y = min(y for y, _, _ in runs)
    max_y = max(y for y, _, _ in runs)
    weighted_x = sum(((start + end) / 2) * (end - start + 1) for _, start, end in runs)
    return {
        "area": area,
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
        "width": max_x - min_x + 1,
        "height": max_y - min_y + 1,
        "center_x": weighted_x / area,
    }


def quiet_boundary(alpha: np.ndarray, midpoint: int) -> int:
    left = max(166, midpoint - 34)
    right = min(alpha.shape[1] - 1, midpoint + 34)
    occupancy = (alpha[:, left:right + 1] > 20).sum(axis=0)
    return left + int(np.argmin(occupancy))


def remove_neighbour_fragments(frame: Image.Image) -> Image.Image:
    pixels = np.asarray(frame, dtype=np.uint8).copy()
    alpha = pixels[:, :, 3] > 20
    components: list[tuple[list[tuple[int, int, int]], dict[str, float]]] = []
    for runs in connected_runs(alpha):
        info = metrics(runs)
        if info["area"] >= 8:
            components.append((runs, info))
    if not components:
        return frame
    largest = max(info["area"] for _, info in components)
    keep = np.zeros(alpha.shape, dtype=bool)
    for runs, info in components:
        touches_side = info["min_x"] <= 2 or info["max_x"] >= frame.width - 3
        top_strip = info["min_y"] <= 3 and info["height"] < 34
        if top_strip or (touches_side and info["area"] < largest * .32):
            continue
        for y, start, end in runs:
            keep[y, start:end + 1] = True
    pixels[~keep] = 0
    return Image.fromarray(pixels)


def extract_frames(image: Image.Image, row: Row) -> list[tuple[Image.Image, bool]]:
    pixels = np.asarray(image, dtype=np.uint8)
    source_alpha = pixels[row.start:row.end, :, 3]
    boundaries = [166]
    for left_center, right_center in zip(row.centers, row.centers[1:]):
        boundaries.append(quiet_boundary(source_alpha, (left_center + right_center) // 2))
    final_boundary = row.hide_after or image.width
    boundaries.append(final_boundary)
    frames: list[tuple[Image.Image, bool]] = []
    for index, _ in enumerate(row.centers):
        left = boundaries[index]
        right = boundaries[index + 1]
        segment_alpha = source_alpha[:, left:right]
        visible = segment_alpha > row.alpha_threshold
        ys, xs = np.nonzero(visible)
        if not len(xs):
            frames.append((Image.new("RGBA", (1, 1)), False))
            continue
        edge_pixels = int(visible[:, :3].sum() + visible[:, -3:].sum())
        safe = edge_pixels <= max(18, round(len(xs) * .012))
        min_x = max(0, int(xs.min()) - 2)
        max_x = min(right - left - 1, int(xs.max()) + 2)
        min_y = max(0, int(ys.min()) - 2)
        max_y = min(row.end - row.start - 1, int(ys.max()) + 2)
        frame = image.crop((left + min_x, row.start + min_y, left + max_x + 1, row.start + max_y + 1))
        frame = remove_neighbour_fragments(frame)
        trimmed = frame.getbbox()
        if trimmed:
            frame = frame.crop(trimmed)
        max_width = CELL_WIDTH - 24
        max_height = BASELINE - 14
        scale = min(1.0, max_width / frame.width, max_height / frame.height)
        if scale < 1:
            frame = frame.resize((max(1, round(frame.width * scale)), max(1, round(frame.height * scale))), Image.Resampling.LANCZOS)
        frames.append((frame, safe))
    return frames


def playback_sequence(indices: list[int], death: bool = False) -> list[int]:
    if not indices:
        return [0, 0, 0, 0, 0]
    if death:
        positions = np.linspace(0, len(indices) - 1, FRAME_COLUMNS)
        return [indices[round(position)] for position in positions]
    if len(indices) == 1:
        return indices * FRAME_COLUMNS
    forward = [indices[round(position)] for position in np.linspace(0, len(indices) - 1, 4)]
    return [*forward, indices[0]]


def build_sheet(name: str, source_name: str, output_name: str, rows: tuple[Row, ...]) -> dict[str, object]:
    source_path = SOURCE / source_name
    if not source_path.exists():
        raise FileNotFoundError(source_path)
    image = Image.open(source_path).convert("RGBA")
    extracted = [extract_frames(image, row) for row in rows]
    atlas = Image.new("RGBA", (CELL_WIDTH * FRAME_COLUMNS, CELL_HEIGHT * len(rows)))
    idle_heights: list[int] = []
    safe_sequences: dict[str, list[int]] = {}
    animation_names = ["idle", "walk", "melee", "magic", "ultimate", "death"] if len(rows) == 6 else ["idle", "walk", "melee", "magic", "death"]
    for row_index, frames in enumerate(extracted):
        frame_order = list(range(len(frames)))
        while len(frame_order) < FRAME_COLUMNS:
            frame_order.append(0 if row_index == 0 else frame_order[-1])
        packed_sources = frame_order[:FRAME_COLUMNS]
        safe_columns: list[int] = []
        for column, frame_index in enumerate(packed_sources):
            frame, safe = frames[frame_index]
            if safe:
                safe_columns.append(column)
            if row_index == 0 and frame.height > 1:
                idle_heights.append(frame.height)
            x = column * CELL_WIDTH + (CELL_WIDTH - frame.width) // 2
            y = row_index * CELL_HEIGHT + BASELINE - frame.height
            atlas.alpha_composite(frame, (x, y))
        animation_name = animation_names[row_index]
        safe_sequences[animation_name] = playback_sequence(safe_columns, death=animation_name == "death")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / output_name, optimize=True)
    has_ultimate = len(rows) == 6
    row_map = {"idle": 0, "walk": 1, "melee": 2, "magic": 3, "death": len(rows) - 1}
    if has_ultimate:
        row_map["ultimate"] = 4
    return {
        "file": output_name,
        "columns": FRAME_COLUMNS,
        "rows": len(rows),
        "cellWidth": CELL_WIDTH,
        "cellHeight": CELL_HEIGHT,
        "baseline": BASELINE,
        "referenceHeight": int(np.median(idle_heights)) if idle_heights else 170,
        "rowMap": row_map,
        "frameSequences": safe_sequences,
        "battleOnly": True,
    }


def main() -> None:
    manifest = {
        name: build_sheet(name, source_name, output_name, rows)
        for name, (source_name, output_name, rows) in SHEETS.items()
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
