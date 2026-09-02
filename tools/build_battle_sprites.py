from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "game" / "assets" / "sprites" / "battle"
TEMP = Path.home() / "AppData" / "Local" / "Temp"
FRAME_COLUMNS = 5
BASELINE_MARGIN = 14


@dataclass(frozen=True)
class Row:
    start: int
    end: int
    centers: tuple[int, ...]
    hide_after: int | None = None
    clear_bottom: int = 0
    alpha_threshold: int = 160
    clear_top: int = 48
    clear_left: int = 145
    center_offset: int = 95


SHEETS = {
    "Verseborn": {
        "source": TEMP / "codex-clipboard-06bdd53e-bf0b-4e9b-9d3a-7286a945aff5.png",
        "file": "verseborn.png",
        "rows": [
            Row(165, 390, (105, 270, 435, 600), 720),
            Row(390, 610, (110, 300, 490, 690, 920)),
            Row(605, 815, (105, 300, 500, 705, 930)),
            Row(810, 1080, (120, 365, 625, 890)),
            Row(1075, 1390, (115, 350, 610, 885)),
            Row(1370, 1536, (90, 285, 485, 685, 910)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Mira": {
        "source": TEMP / "codex-clipboard-91b4c59e-860d-4307-9fd7-e9a42f80f02a.png",
        "file": "mira.png",
        "rows": [
            Row(240, 405, (105, 270, 440, 605), 720, clear_top=0, clear_left=0, center_offset=0),
            Row(455, 600, (105, 375, 625, 900), clear_top=0, clear_left=0, center_offset=0),
            Row(655, 820, (105, 330, 570, 815, 1000), clear_top=0, clear_left=0, center_offset=0),
            Row(875, 1035, (110, 365, 625, 900), clear_top=0, clear_left=0, center_offset=0),
            Row(1090, 1265, (110, 375, 660, 925), clear_top=0, clear_left=0, center_offset=0),
            Row(1320, 1448, (95, 300, 515, 735, 970), clear_top=0, clear_left=0, center_offset=0),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Sparky": {
        "source": TEMP / "codex-clipboard-c092a8e9-d2fe-4193-848e-be9bad0a42e5.png",
        "file": "sparky.png",
        "rows": [
            Row(175, 400, (105, 285, 465, 645), 745),
            Row(400, 600, (105, 300, 500, 705, 995)),
            Row(595, 815, (110, 315, 515, 720, 995)),
            Row(810, 1035, (125, 390, 675, 955)),
            Row(1028, 1315, (120, 390, 690, 965)),
            Row(1320, 1448, (85, 300, 520, 745, 970)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Glimmer": {
        "source": TEMP / "codex-clipboard-d50bfe82-989d-4994-9634-b7dfd47d8fbf.png",
        "file": "glimmer.png",
        "rows": [
            Row(170, 390, (105, 275, 445, 615), 735),
            Row(385, 595, (105, 300, 500, 710, 985)),
            Row(590, 790, (105, 300, 500, 710, 985)),
            Row(780, 1060, (120, 375, 660, 950), clear_bottom=16),
            Row(1050, 1325, (120, 380, 675, 960)),
            Row(1318, 1448, (90, 300, 515, 735, 970)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "GlimmerMech": {
        "source": TEMP / "codex-clipboard-5d0a0e17-038f-4706-af04-d511d1483d1f.png",
        "file": "glimmer-mech.png",
        "rows": [
            Row(175, 385, (105, 290, 480, 665), 760),
            Row(550, 745, (110, 315, 520, 730, 990)),
            Row(740, 950, (105, 315, 525, 740, 995)),
            Row(940, 1235, (125, 390, 680, 965)),
            Row(940, 1235, (125, 390, 680, 965)),
            Row(1235, 1448, (90, 305, 525, 745, 970)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Kael": {
        "source": TEMP / "codex-clipboard-a435012b-7209-4964-a82d-fe4ab2e0ebb8.png",
        "file": "kael.png",
        "rows": [
            Row(190, 420, (105, 285, 465, 645), 760),
            Row(405, 620, (105, 300, 500, 710, 985)),
            Row(610, 875, (110, 315, 525, 735, 980)),
            Row(860, 1105, (125, 390, 680, 960)),
            Row(1090, 1300, (120, 325, 515, 700, 885), alpha_threshold=220),
            Row(1285, 1448, (95, 305, 520, 740, 970)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 1, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "KaelShadow": {
        "source": TEMP / "codex-clipboard-6a45bde1-2028-427f-9c45-5b9b43b27774.png",
        "file": "kael-shadow.png",
        "rows": [
            Row(185, 425, (105, 285, 465, 645), 760),
            Row(420, 605, (105, 300, 500, 710, 985)),
            Row(595, 820, (105, 310, 515, 725, 985)),
            Row(815, 1040, (120, 385, 675, 955)),
            Row(1035, 1285, (120, 385, 675, 955)),
            Row(1278, 1448, (90, 305, 520, 740, 970)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Torren": {
        "source": TEMP / "codex-clipboard-ba2f0bfb-2c0f-4503-994f-675a5fda1d19.png",
        "file": "torren.png",
        "rows": [
            Row(175, 390, (105, 285, 465, 645), 750),
            Row(380, 600, (105, 300, 500, 710, 985)),
            Row(590, 815, (105, 305, 510, 720, 985)),
            Row(805, 1055, (120, 385, 675, 955)),
            Row(1045, 1310, (120, 385, 675, 955)),
            Row(1305, 1448, (90, 305, 520, 740, 970)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
    "Seerin": {
        "source": TEMP / "codex-clipboard-bd0bc8aa-ccb1-47e7-8ed3-82a718efd997.png",
        "file": "seerin.png",
        "rows": [
            Row(175, 390, (105, 285, 465, 645), 750),
            Row(385, 605, (105, 300, 500, 710, 985)),
            Row(595, 815, (105, 305, 510, 720, 985)),
            Row(805, 1045, (120, 385, 675, 955)),
            Row(1035, 1325, (120, 385, 675, 955)),
            Row(1315, 1448, (90, 305, 520, 740, 970)),
        ],
        "row_map": {"idle": 0, "melee": 1, "block": 2, "magic": 2, "ultimate1": 3, "ultimate2": 4, "death": 5},
    },
}


class DisjointSet:
    def __init__(self) -> None:
        self.parent: list[int] = []

    def add(self) -> int:
        index = len(self.parent)
        self.parent.append(index)
        return index

    def find(self, value: int) -> int:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root != right_root:
            self.parent[right_root] = left_root


def connected_runs(mask: np.ndarray) -> list[list[tuple[int, int, int]]]:
    dsu = DisjointSet()
    runs: list[tuple[int, int, int, int]] = []
    previous: list[tuple[int, int, int]] = []
    for y, row in enumerate(mask):
        padded = np.pad(row.astype(np.int8), (1, 1))
        changes = np.diff(padded)
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


def component_metrics(runs: list[tuple[int, int, int]]) -> dict[str, float]:
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


def row_groups(image: Image.Image, row: Row) -> list[dict[str, object]]:
    pixels = np.asarray(image, dtype=np.uint8)
    # A firm alpha threshold separates neighbouring presentation poses whose
    # anti-aliased glow fringes touch, while retaining the solid pixel artwork.
    alpha = pixels[row.start:row.end, :, 3] > row.alpha_threshold
    # These are presentation sheets rather than uniform atlases. Each labelled row
    # still lays its animation beats left-to-right, so split only the usable artwork
    # area. Masking the label strip prevents headings and divider bars becoming
    # sprites; keeping every frame on a larger destination canvas prevents clipping.
    if row.clear_top:
        alpha[:row.clear_top, :] = False
    if row.clear_left:
        alpha[:, :row.clear_left] = False
    if row.clear_bottom:
        alpha[-row.clear_bottom:, :] = False
    if row.hide_after is not None:
        alpha[:, row.hide_after:] = False
    centers = tuple(min(center + row.center_offset, image.width - 48) for center in row.centers)
    components: list[dict[str, object]] = []
    for runs in connected_runs(alpha):
        metrics = component_metrics(runs)
        if metrics["area"] < 8:
            continue
        if row.clear_top == 0 and metrics["max_y"] < 32:
            continue
        # The presentation sheets contain long ornamental row dividers. Some
        # begin just below the label mask and are otherwise close enough to a
        # pose to be assigned to it. They are UI chrome, never animation art.
        if metrics["width"] > 240 and metrics["height"] < 45:
            continue
        frame_index = min(range(len(centers)), key=lambda index: abs(metrics["center_x"] - centers[index]))
        if abs(metrics["center_x"] - centers[frame_index]) <= 280:
            components.append({"runs": runs, "metrics": metrics, "frame": frame_index})

    groups: list[dict[str, object]] = []
    for frame_index, center in enumerate(centers):
        frame_components = [component for component in components if component["frame"] == frame_index]
        if not frame_components:
            groups.append({"components": [], "center": center, "bounds": (center, row.end - row.start, center, 0)})
            continue
        min_x = min(component["metrics"]["min_x"] for component in frame_components)
        max_x = max(component["metrics"]["max_x"] for component in frame_components)
        min_y = min(component["metrics"]["min_y"] for component in frame_components)
        max_y = max(component["metrics"]["max_y"] for component in frame_components)
        groups.append({"components": frame_components, "center": center, "bounds": (min_x, min_y, max_x, max_y)})
    return groups


def next_multiple(value: int, size: int = 32) -> int:
    return ((value + size - 1) // size) * size


def build_sheet(name: str, config: dict[str, object]) -> dict[str, object]:
    source = Path(config["source"])
    if not source.exists():
        raise FileNotFoundError(source)
    image = Image.open(source).convert("RGBA")
    rows: list[Row] = config["rows"]
    grouped_rows = [row_groups(image, row) for row in rows]

    idle_groups = grouped_rows[0]
    idle_frame_order = list(range(len(idle_groups)))
    while len(idle_frame_order) < FRAME_COLUMNS:
        idle_frame_order.append(0)
    idle_anchor_offsets = []
    for group_index in idle_frame_order[:FRAME_COLUMNS]:
        group = idle_groups[group_index]
        components = group["components"]
        if not components:
            idle_anchor_offsets.append(0)
            continue
        main_component = max(components, key=lambda component: component["metrics"]["area"])
        idle_anchor_offsets.append(round(main_component["metrics"]["center_x"] - group["center"], 2))

    left_extent = right_extent = top_extent = 0
    idle_heights: list[int] = []
    for row_index, (row, groups) in enumerate(zip(rows, grouped_rows)):
        for group in groups:
            min_x, min_y, max_x, max_y = group["bounds"]
            center = group["center"]
            left_extent = max(left_extent, center - min_x)
            right_extent = max(right_extent, max_x - center)
            top_extent = max(top_extent, (row.end - row.start) - min_y)
            if row_index == 0 and group["components"]:
                idle_heights.append(max_y - min_y + 1)
    cell_width = next_multiple(max(384, int(2 * max(left_extent, right_extent) + 40)))
    cell_height = next_multiple(max(256, int(top_extent + BASELINE_MARGIN + 18)))
    atlas = Image.new("RGBA", (cell_width * FRAME_COLUMNS, cell_height * len(rows)))
    source_pixels = np.asarray(image, dtype=np.uint8)

    for row_index, (row, groups) in enumerate(zip(rows, grouped_rows)):
        frame_order = list(range(len(groups)))
        while len(frame_order) < FRAME_COLUMNS:
            frame_order.append(0 if row_index == 0 else frame_order[-1])
        for column, group_index in enumerate(frame_order[:FRAME_COLUMNS]):
            group = groups[group_index]
            frame = np.zeros((cell_height, cell_width, 4), dtype=np.uint8)
            offset_x = cell_width // 2 - int(group["center"])
            offset_y = cell_height - BASELINE_MARGIN - row.end
            for component in group["components"]:
                for local_y, start, end in component["runs"]:
                    source_y = row.start + local_y
                    dest_y = source_y + offset_y
                    dest_start = start + offset_x
                    dest_end = end + offset_x + 1
                    source_start = start
                    source_end = end + 1
                    if dest_start < 0:
                        source_start -= dest_start
                        dest_start = 0
                    if dest_end > cell_width:
                        source_end -= dest_end - cell_width
                        dest_end = cell_width
                    if 0 <= dest_y < cell_height and dest_start < dest_end:
                        frame[dest_y, dest_start:dest_end] = source_pixels[source_y, source_start:source_end]
            atlas.alpha_composite(Image.fromarray(frame), (column * cell_width, row_index * cell_height))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / config["file"], optimize=True)
    reference_height = int(np.median(idle_heights)) if idle_heights else 170
    return {
        "file": config["file"],
        "columns": FRAME_COLUMNS,
        "rows": len(rows),
        "cellWidth": cell_width,
        "cellHeight": cell_height,
        "baseline": cell_height - BASELINE_MARGIN,
        "referenceHeight": reference_height,
        "idleAnchorOffsets": idle_anchor_offsets,
        "rowMap": config["row_map"],
    }


def main() -> None:
    manifest = {name: build_sheet(name, config) for name, config in SHEETS.items()}
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
