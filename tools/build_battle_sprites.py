from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools" / "sprite_sources" / "party"
OUTPUT = ROOT / "public" / "game" / "assets" / "sprites" / "battle"
FRAME_COLUMNS = 5
BASELINE_MARGIN = 14
ALPHA_THRESHOLD = 12
SOURCE_CROP_MARGIN = 6
ATLAS_EDGE_MARGIN = 8


@dataclass(frozen=True)
class Row:
    start: int
    end: int
    centers: tuple[int, ...]
    left: int = 0
    right: int | None = None
    trim_top: int = 42


def rows(*values: Row) -> tuple[Row, ...]:
    return values


SHEETS = {
    "Mira": {
        "source": "mira.png",
        "file": "mira.png",
        "rows": rows(
            Row(240, 405, (101, 249, 406, 558), right=660),
            Row(455, 600, (122, 421, 692, 956)),
            Row(655, 820, (102, 330, 562, 790, 990)),
            Row(875, 1035, (131, 414, 708, 959)),
            Row(1090, 1265, (126, 407, 695, 952)),
            Row(1320, 1448, (103, 312, 533, 740, 958)),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Sparky": {
        "source": "sparky.png",
        "file": "sparky.png",
        "rows": rows(
            Row(175, 392, (95, 256, 421, 584), right=700, trim_top=90),
            Row(400, 587, (126, 337, 532, 756, 986), trim_top=50),
            Row(595, 802, (121, 340, 560, 760, 973), trim_top=50),
            Row(810, 1020, (138, 420, 800), trim_top=50),
            Row(1028, 1255, (140, 420, 702, 962), trim_top=50),
            Row(1320, 1448, (103, 293, 510, 742, 968)),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Glimmer": {
        "source": "glimmer.png",
        "file": "glimmer.png",
        "rows": rows(
            Row(175, 377, (101, 260, 410, 557), right=700, trim_top=50),
            Row(385, 582, (116, 407, 680, 841, 1001), trim_top=50),
            Row(590, 772, (119, 329, 535, 750, 970), trim_top=50),
            Row(780, 1042, (140, 372, 643, 941), trim_top=50),
            Row(1050, 1278, (145, 332, 552, 761, 982), trim_top=50),
            Row(1318, 1448, (127, 336, 535, 745, 960)),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "GlimmerMech": {
        "source": "glimmer-mech.png",
        "file": "glimmer-mech.png",
        "rows": rows(
            Row(185, 385, (220, 388, 548, 713), left=150, right=820, trim_top=0),
            Row(385, 590, (220, 420, 620, 820, 980), left=150, trim_top=0),
            Row(585, 800, (220, 410, 600, 790, 980), left=150, trim_top=0),
            Row(790, 1045, (220, 450, 680, 930), left=150, trim_top=0),
            Row(1035, 1280, (220, 450, 690, 940), left=150, trim_top=0),
            Row(1265, 1448, (220, 360, 545, 745, 965), left=150, trim_top=60),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Kael": {
        "source": "kael.png",
        "file": "kael.png",
        "rows": rows(
            Row(190, 420, (240, 382, 520, 675), left=175, right=760, trim_top=20),
            Row(405, 620, (240, 420, 610, 790, 980), left=170, trim_top=0),
            Row(610, 875, (240, 430, 610, 790, 980), left=170, trim_top=0),
            Row(860, 1105, (230, 430, 700, 950), left=170, trim_top=0),
            Row(1090, 1300, (210, 400, 580, 770, 970), left=170, trim_top=0),
            Row(1285, 1448, (230, 395, 555, 750, 970), left=170, trim_top=0),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 1, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "KaelShadow": {
        "source": "kael-shadow.png",
        "file": "kael-shadow.png",
        "rows": rows(
            Row(185, 425, (230, 385, 525, 675), left=170, right=760, trim_top=24),
            Row(420, 605, (230, 430, 650, 930), left=170, trim_top=0),
            Row(595, 820, (230, 410, 590, 770, 980), left=170, trim_top=0),
            Row(815, 1040, (230, 470, 680, 940), left=170, trim_top=0),
            Row(1035, 1285, (230, 430, 650, 930), left=170, trim_top=0),
            Row(1278, 1448, (210, 400, 570, 760, 970), left=170, trim_top=0),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Torren": {
        "source": "torren.png",
        "file": "torren.png",
        "rows": rows(
            Row(175, 372, (99, 270, 446, 621), right=740, trim_top=50),
            Row(380, 582, (120, 412, 691, 957), trim_top=50),
            Row(590, 797, (111, 314, 519, 735, 952), trim_top=50),
            Row(805, 1037, (115, 355, 631, 935), trim_top=50),
            Row(1045, 1263, (120, 400, 680, 930), trim_top=50),
            Row(1305, 1448, (112, 311, 532, 755, 977)),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Seerin": {
        "source": "seerin.png",
        "file": "seerin.png",
        "rows": rows(
            Row(175, 377, (103, 237, 382, 520), right=650, trim_top=50),
            Row(385, 587, (115, 380, 680, 950), trim_top=50),
            Row(595, 797, (120, 336, 535, 748, 980), trim_top=50),
            Row(805, 1027, (125, 390, 680, 950), trim_top=50),
            Row(1035, 1285, (125, 390, 675, 950), trim_top=50),
            Row(1315, 1448, (104, 307, 522, 728, 972)),
        ),
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
}


def quiet_boundary(alpha: np.ndarray, left_center: int, right_center: int) -> int:
    midpoint = (left_center + right_center) // 2
    radius = max(18, min(54, (right_center - left_center) // 3))
    left = max(left_center + 8, midpoint - radius)
    right = min(right_center - 8, midpoint + radius)
    occupancy = np.count_nonzero(alpha[:, left:right + 1] > ALPHA_THRESHOLD, axis=0)
    if not occupancy.size:
        return midpoint
    # A three-column window avoids choosing a single transparent hole inside an effect.
    smoothed = np.convolve(occupancy, np.ones(3, dtype=np.int32), mode="same")
    return left + int(np.argmin(smoothed))


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

    grouped: dict[int, list[tuple[int, int, int]]] = {}
    for y, start, end, label in runs:
        grouped.setdefault(dsu.find(label), []).append((y, start, end))
    return list(grouped.values())


def clean_presentation_chrome(frame: Image.Image) -> Image.Image:
    pixels = np.asarray(frame, dtype=np.uint8).copy()
    mask = pixels[:, :, 3] > ALPHA_THRESHOLD
    for runs in connected_runs(mask):
        area = sum(end - start + 1 for _, start, end in runs)
        if area < 40:
            continue
        min_x = min(start for _, start, _ in runs)
        max_x = max(end for _, _, end in runs)
        min_y = min(y for y, _, _ in runs)
        max_y = max(y for y, _, _ in runs)
        width = max_x - min_x + 1
        height = max_y - min_y + 1
        touches_edge = min_x <= 3 or max_x >= frame.width - 4 or min_y <= 3 or max_y >= frame.height - 4
        component_pixels = []
        for y, start, end in runs:
            component_pixels.append(pixels[y, start:end + 1, :3])
        colors = np.concatenate(component_pixels, axis=0)
        gold = (colors[:, 0] > 105) & (colors[:, 1] > 48) & (colors[:, 2] < 105) & (colors[:, 0] > colors[:, 1] * 1.2)
        gold_ratio = float(np.count_nonzero(gold)) / max(1, len(colors))
        looks_like_rule = height <= 22 and width >= 36 and width >= height * 4
        looks_like_label = height <= 66 and width >= 110 and width >= height * 3
        if gold_ratio < 0.14 or not (looks_like_rule or looks_like_label):
            continue
        for y, start, end in runs:
            pixels[y, start:end + 1] = 0

    cleaned = Image.fromarray(pixels)
    bounds = cleaned.getbbox()
    return cleaned.crop(bounds) if bounds else Image.new("RGBA", (1, 1))


def extract_frames(image: Image.Image, row: Row) -> list[Image.Image]:
    pixels = np.asarray(image, dtype=np.uint8)
    top = min(row.end - 1, row.start + row.trim_top)
    alpha = pixels[top:row.end, :, 3]
    boundaries = [row.left]
    boundaries.extend(
        quiet_boundary(alpha, left_center, right_center)
        for left_center, right_center in zip(row.centers, row.centers[1:])
    )
    boundaries.append(row.right or image.width)

    frames: list[Image.Image] = []
    for index in range(len(row.centers)):
        left = boundaries[index]
        right = boundaries[index + 1]
        visible = alpha[:, left:right] > ALPHA_THRESHOLD
        ys, xs = np.nonzero(visible)
        if not len(xs):
            raise ValueError(f"No artwork found in row {row} frame {index}")
        min_x = max(0, int(xs.min()) - SOURCE_CROP_MARGIN)
        max_x = min(right - left - 1, int(xs.max()) + SOURCE_CROP_MARGIN)
        min_y = max(0, int(ys.min()) - SOURCE_CROP_MARGIN)
        max_y = min(row.end - top - 1, int(ys.max()) + SOURCE_CROP_MARGIN)
        frame = image.crop((left + min_x, top + min_y, left + max_x + 1, top + max_y + 1))
        if row.end < image.height:
            frame = clean_presentation_chrome(frame)
        else:
            bounds = frame.getbbox()
            frame = frame.crop(bounds) if bounds else Image.new("RGBA", (1, 1))
        frames.append(frame)
    return frames


def next_multiple(value: int, size: int = 32) -> int:
    return ((value + size - 1) // size) * size


def packed_order(frame_count: int, is_idle: bool) -> list[int]:
    if frame_count >= FRAME_COLUMNS:
        return list(range(FRAME_COLUMNS))
    order = list(range(frame_count))
    while len(order) < FRAME_COLUMNS:
        order.append(0 if is_idle else frame_count - 1)
    return order


def validate_atlas_margins(atlas: Image.Image, cell_width: int, cell_height: int, rows: int, name: str) -> None:
    alpha = np.asarray(atlas, dtype=np.uint8)[:, :, 3]
    for row in range(rows):
        for column in range(FRAME_COLUMNS):
            cell = alpha[
                row * cell_height:(row + 1) * cell_height,
                column * cell_width:(column + 1) * cell_width,
            ]
            ys, xs = np.nonzero(cell > ALPHA_THRESHOLD)
            if not len(xs):
                raise ValueError(f"{name} row {row} frame {column} is empty")
            margins = (int(xs.min()), cell_width - 1 - int(xs.max()), int(ys.min()), cell_height - 1 - int(ys.max()))
            if min(margins) < ATLAS_EDGE_MARGIN:
                raise ValueError(f"{name} row {row} frame {column} touches its cell edge: {margins}")


def build_sheet(name: str, config: dict[str, object]) -> dict[str, object]:
    source = SOURCE / str(config["source"])
    if not source.exists():
        raise FileNotFoundError(source)
    image = Image.open(source).convert("RGBA")
    configured_rows: tuple[Row, ...] = config["rows"]
    extracted = [extract_frames(image, row) for row in configured_rows]

    widest = max(frame.width for frames in extracted for frame in frames)
    tallest = max(frame.height for frames in extracted for frame in frames)
    cell_width = next_multiple(widest + 24)
    cell_height = next_multiple(tallest + BASELINE_MARGIN + 10)
    baseline = cell_height - BASELINE_MARGIN
    atlas = Image.new("RGBA", (cell_width * FRAME_COLUMNS, cell_height * len(extracted)))

    idle_heights = [frame.height for frame in extracted[0]]
    idle_anchor_offsets: list[float] = []
    for row_index, frames in enumerate(extracted):
        order = packed_order(len(frames), row_index == 0)
        for column, frame_index in enumerate(order):
            frame = frames[frame_index]
            x = column * cell_width + (cell_width - frame.width) // 2
            y = row_index * cell_height + baseline - frame.height
            atlas.alpha_composite(frame, (x, y))
            if row_index == 0:
                idle_anchor_offsets.append(0)

    validate_atlas_margins(atlas, cell_width, cell_height, len(extracted), name)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / str(config["file"]), optimize=True)
    return {
        "file": config["file"],
        "columns": FRAME_COLUMNS,
        "rows": len(extracted),
        "cellWidth": cell_width,
        "cellHeight": cell_height,
        "baseline": baseline,
        "referenceHeight": int(np.median(idle_heights)),
        "idleAnchorOffsets": idle_anchor_offsets,
        "rowMap": config["row_map"],
        "directFrames": True,
    }


def build_verseborn() -> dict[str, object]:
    source = Image.open(SOURCE / "verseborn-derived.png").convert("RGBA")
    source_cell_width = source.width // FRAME_COLUMNS
    source_cell_height = source.height // 6
    source_orders = (
        (1, 2, 1, 2, 1),
        (1, 1, 2, 3, 4),
        (1, 1, 2, 3, 4),
        (1, 1, 2, 3, 4),
        (1, 1, 2, 3, 4),
        (1, 1, 2, 3, 4),
    )
    extracted: list[list[Image.Image]] = []
    for row, order in enumerate(source_orders):
        frames: list[Image.Image] = []
        for column in order:
            frame = source.crop((
                column * source_cell_width,
                row * source_cell_height,
                (column + 1) * source_cell_width,
                (row + 1) * source_cell_height,
            ))
            frame = clean_presentation_chrome(frame)
            frames.append(frame)
        populated = [index for index, frame in enumerate(frames) if frame.getbbox()]
        if not populated:
            raise ValueError(f"Verseborn row {row} contains no artwork")
        for index, frame in enumerate(frames):
            if frame.getbbox():
                continue
            nearest = min(populated, key=lambda candidate: abs(candidate - index))
            frames[index] = frames[nearest].copy()
        extracted.append(frames)

    widest = max(frame.width for frames in extracted for frame in frames)
    tallest = max(frame.height for frames in extracted for frame in frames)
    cell_width = next_multiple(widest + 24)
    cell_height = next_multiple(tallest + BASELINE_MARGIN + 10)
    baseline = cell_height - BASELINE_MARGIN
    atlas = Image.new("RGBA", (cell_width * FRAME_COLUMNS, cell_height * 6))
    for row, frames in enumerate(extracted):
        for column, frame in enumerate(frames):
            x = column * cell_width + (cell_width - frame.width) // 2
            y = row * cell_height + baseline - frame.height
            atlas.alpha_composite(frame, (x, y))
    validate_atlas_margins(atlas, cell_width, cell_height, 6, "Verseborn")
    atlas.save(OUTPUT / "verseborn.png", optimize=True)
    return {
        "file": "verseborn.png",
        "columns": FRAME_COLUMNS,
        "rows": 6,
        "cellWidth": cell_width,
        "cellHeight": cell_height,
        "baseline": baseline,
        "referenceHeight": int(np.median([frame.height for frame in extracted[0]])),
        "idleAnchorOffsets": [0] * FRAME_COLUMNS,
        "rowMap": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
        "directFrames": True,
    }


def main() -> None:
    manifest_path = OUTPUT / "manifest.json"
    manifest = {"Verseborn": build_verseborn()}
    manifest.update({name: build_sheet(name, config) for name, config in SHEETS.items()})
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
