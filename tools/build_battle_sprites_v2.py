from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build_battle_sprites import connected_runs


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools" / "sprite_sources" / "party-v2"
OUTPUT = ROOT / "public" / "game" / "assets" / "sprites" / "battle-v2"
REVIEW = ROOT / ".analysis-battle" / "party-v2"

CHARACTERS = {
    "Verseborn": "verseborn.png",
    "Mira": "mira.png",
    "Seerin": "seerin.png",
    "Torren": "torren.png",
    "Glimmer": "glimmer.png",
    "GlimmerMech": "glimmer-mech.png",
    "Kael": "kael.png",
    "KaelShadow": "kael-shadow.png",
    "Sparky": "sparky.png",
}

COLUMNS = 4
ROWS = 5
FRAME_PADDING = 24
ALPHA_THRESHOLD = 8
ROW_NAMES = ("Idle", "Melee", "Magic", "Ultimate", "Death")
ROW_MAP = {
    "idle": 0,
    "block": 0,
    "melee": 1,
    "magic": 2,
    "ultimate": 3,
    "ultimate1": 3,
    "ultimate2": 3,
    "death": 4,
}

# The source art for Glimmer Mech's middle Magic poses is physically merged:
# their pink spell rings overlap the neighboring character art. Use the two
# complete authored poses so the game never shows a cut ring or adjacent frame.
FRAME_SELECTIONS = {
    "GlimmerMech": {
        "Magic": (0, 0, 0, 0),
    },
}


def grid_edges(size: int, count: int) -> list[int]:
    return [round(index * size / count) for index in range(count + 1)]


def minimum_vertical_seam(alpha: np.ndarray, expected: int, radius: int) -> np.ndarray:
    height, width = alpha.shape
    left = max(1, expected - radius)
    right = min(width - 2, expected + radius)
    xs = np.arange(left, right + 1)
    alpha_cost = alpha[:, left:right + 1].astype(np.float64) / 255.0 * 12000.0
    distance_cost = ((xs - expected) ** 2 * 0.025)[None, :]
    cost = alpha_cost + distance_cost
    accumulated = np.empty_like(cost)
    backtrack = np.zeros(cost.shape, dtype=np.int16)
    accumulated[0] = cost[0]
    for y in range(1, height):
        previous = accumulated[y - 1]
        for local_x in range(len(xs)):
            start = max(0, local_x - 3)
            end = min(len(xs), local_x + 4)
            candidates = previous[start:end] + np.abs(np.arange(start, end) - local_x) * 0.4
            choice = start + int(np.argmin(candidates))
            accumulated[y, local_x] = cost[y, local_x] + candidates[choice - start]
            backtrack[y, local_x] = choice
    seam = np.empty(height, dtype=np.int32)
    local_x = int(np.argmin(accumulated[-1]))
    for y in range(height - 1, -1, -1):
        seam[y] = left + local_x
        if y:
            local_x = int(backtrack[y, local_x])
    return seam


def minimum_horizontal_seam(alpha: np.ndarray, expected: int, radius: int) -> np.ndarray:
    return minimum_vertical_seam(alpha.T, expected, radius)


def visible_bounds(image: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A").point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    return alpha.getbbox()


def remove_detached_edge_bleed(image: Image.Image) -> tuple[Image.Image, dict[str, int]]:
    pixels = np.asarray(image, dtype=np.uint8).copy()
    mask = pixels[:, :, 3] > ALPHA_THRESHOLD
    components = connected_runs(mask)
    if not components:
        return image, {"removedComponents": 0, "removedPixels": 0}

    def area(runs: list[tuple[int, int, int]]) -> int:
        return sum(end - start + 1 for _, start, end in runs)

    primary = max(components, key=area)
    removed_components = 0
    removed_pixels = 0
    for runs in components:
        if runs is primary:
            continue
        min_x = min(start for _, start, _ in runs)
        max_x = max(end for _, _, end in runs)
        min_y = min(y for y, _, _ in runs)
        max_y = max(y for y, _, _ in runs)
        touches_edge = min_x <= 1 or min_y <= 1 or max_x >= image.width - 2 or max_y >= image.height - 2
        if not touches_edge:
            continue
        removed_components += 1
        removed_pixels += area(runs)
        for y, start, end in runs:
            pixels[y, start:end + 1] = 0
    return Image.fromarray(pixels, "RGBA"), {
        "removedComponents": removed_components,
        "removedPixels": removed_pixels,
    }


def checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    image = Image.new("RGBA", size, "#16131c")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, min(size[0], x + tile) - 1, min(size[1], y + tile) - 1), fill="#211d29")
    return image


def extract_source_cells(source: Image.Image) -> tuple[list[list[dict[str, object]]], list[dict[str, object]], Image.Image]:
    source_pixels = np.asarray(source, dtype=np.uint8)
    source_alpha = source_pixels[:, :, 3]
    source_mask = source_alpha > ALPHA_THRESHOLD
    nominal_x_edges = grid_edges(source.width, COLUMNS)
    nominal_y_edges = grid_edges(source.height, ROWS)
    horizontal_seams = [
        minimum_horizontal_seam(source_alpha, nominal_y_edges[index], max(70, source.height // 16))
        for index in range(1, ROWS)
    ]
    overlay = source.copy()
    overlay_draw = ImageDraw.Draw(overlay)
    for seam in horizontal_seams:
        overlay_draw.line([(x, int(seam[x])) for x in range(source.width)], fill="#29ff7a", width=2)
    cells: list[list[dict[str, object]]] = []
    diagnostics: list[dict[str, object]] = []
    for row in range(ROWS):
        top_seam = np.zeros(source.width, dtype=np.int32) if row == 0 else horizontal_seams[row - 1]
        bottom_seam = np.full(source.width, source.height, dtype=np.int32) if row == ROWS - 1 else horizontal_seams[row]
        row_top = max(0, int(np.min(top_seam)) - 4)
        row_bottom = min(source.height, int(np.max(bottom_seam)) + 5)
        vertical_seams = [
            minimum_vertical_seam(
                source_alpha[row_top:row_bottom],
                nominal_x_edges[index],
                max(70, source.width // 13),
            )
            for index in range(1, COLUMNS)
        ]
        for seam in vertical_seams:
            overlay_draw.line(
                [(int(seam[y - row_top]), y) for y in range(row_top, row_bottom)],
                fill="#35b9ff",
                width=2,
            )
        row_cells: list[dict[str, object]] = []
        for column in range(COLUMNS):
            region = np.zeros(source_mask.shape, dtype=bool)
            for y in range(row_top, row_bottom):
                valid_x = np.arange(source.width)
                within_row = (y >= top_seam) & (y < bottom_seam)
                if column == 0:
                    left_edge = np.zeros(source.width, dtype=np.int32)
                else:
                    left_edge = np.full(source.width, int(vertical_seams[column - 1][y - row_top]), dtype=np.int32)
                if column == COLUMNS - 1:
                    right_edge = np.full(source.width, source.width, dtype=np.int32)
                else:
                    right_edge = np.full(source.width, int(vertical_seams[column][y - row_top]), dtype=np.int32)
                region[y] = within_row & (valid_x >= left_edge) & (valid_x < right_edge)
            frame_pixels = source_pixels.copy()
            frame_pixels[~region] = 0
            full_frame = Image.fromarray(frame_pixels, "RGBA")
            full_bounds = visible_bounds(full_frame)
            if full_bounds is None:
                raise ValueError(f"Empty source frame at row {row}, column {column}")
            cell = full_frame.crop(full_bounds)
            bounds = visible_bounds(cell)
            if bounds is None:
                raise ValueError(f"Empty source frame at row {row}, column {column}")
            margins = {
                "left": bounds[0],
                "right": cell.width - bounds[2],
                "top": bounds[1],
                "bottom": cell.height - bounds[3],
            }
            diagnostics.append({
                "animation": ROW_NAMES[row],
                "frame": column + 1,
                "sourceCell": list(full_bounds),
                "visibleBounds": list(full_bounds),
                "sourceMargins": margins,
                "touchesSourceEdge": (
                    full_bounds[0] == 0
                    or full_bounds[1] == 0
                    or full_bounds[2] == source.width
                    or full_bounds[3] == source.height
                ),
            })
            anchor_global = round((column + .5) * source.width / COLUMNS)
            baseline_global = nominal_y_edges[row + 1]
            row_cells.append({
                "image": cell,
                "anchorX": anchor_global - full_bounds[0],
                "baseline": baseline_global - full_bounds[1],
            })
        cells.append(row_cells)
    return cells, diagnostics, overlay


def apply_frame_selections(name: str, cells: list[list[dict[str, object]]]) -> None:
    for row_name, selection in FRAME_SELECTIONS.get(name, {}).items():
        row_index = ROW_NAMES.index(row_name)
        original = cells[row_index]
        cells[row_index] = [original[index] for index in selection]


def stabilize_idle_frames(cells: list[list[dict[str, object]]]) -> list[int]:
    idle_records = cells[ROW_NAMES.index("Idle")]
    reference = idle_records[0]
    reference_center = float(reference["image"].width) / 2 - float(reference["anchorX"])
    offsets: list[int] = []
    for record in idle_records:
        frame_center = float(record["image"].width) / 2 - float(record["anchorX"])
        shift_x = round(reference_center - frame_center)
        record["packShiftX"] = shift_x
        offsets.append(shift_x)
    return offsets


def build_atlas(name: str, source: Image.Image) -> tuple[Image.Image, dict[str, object], list[list[Image.Image]], list[dict[str, object]], Image.Image]:
    source_cells, diagnostics, overlay = extract_source_cells(source)
    apply_frame_selections(name, source_cells)
    idle_stabilization = stabilize_idle_frames(source_cells)
    records = [record for row in source_cells for record in row]
    max_left = max(int(record["anchorX"]) - int(record.get("packShiftX", 0)) for record in records)
    max_right = max(
        record["image"].width - int(record["anchorX"]) + int(record.get("packShiftX", 0))
        for record in records
    )
    max_top = max(int(record["baseline"]) for record in records)
    max_bottom = max(record["image"].height - int(record["baseline"]) for record in records)
    atlas_cell_width = max_left + max_right + FRAME_PADDING * 2
    atlas_cell_height = max_top + max_bottom + FRAME_PADDING * 2
    anchor_x = FRAME_PADDING + max_left
    baseline = FRAME_PADDING + max_top
    atlas = Image.new("RGBA", (atlas_cell_width * COLUMNS, atlas_cell_height * ROWS))

    idle_heights: list[int] = []
    packed_frames: list[list[Image.Image]] = []
    for row, row_cells in enumerate(source_cells):
        packed_row: list[Image.Image] = []
        for column, record in enumerate(row_cells):
            source_cell = record["image"]
            bounds = visible_bounds(source_cell)
            assert bounds is not None
            if row == 0:
                idle_heights.append(bounds[3] - bounds[1])

            # Preserve the authored grid anchor instead of recentring on effects.
            # This keeps bodies steady when an arc, shield or spell changes width.
            offset_x = anchor_x - int(record["anchorX"]) + int(record.get("packShiftX", 0))
            offset_y = baseline - int(record["baseline"])
            x = column * atlas_cell_width + offset_x
            y = row * atlas_cell_height + offset_y
            atlas.alpha_composite(source_cell, (x, y))

            packed = Image.new("RGBA", (atlas_cell_width, atlas_cell_height))
            packed.alpha_composite(source_cell, (offset_x, offset_y))
            packed_row.append(packed)
        packed_frames.append(packed_row)

    config = {
        "columns": COLUMNS,
        "rows": ROWS,
        "cellWidth": atlas_cell_width,
        "cellHeight": atlas_cell_height,
        "baseline": baseline,
        "referenceHeight": round(sum(idle_heights) / len(idle_heights)),
        "idleAnchorOffsets": [0] * COLUMNS,
        "rowMap": ROW_MAP,
        "directFrames": True,
        "sourceGrid": [COLUMNS, ROWS],
        "sourceEdgeContacts": sum(1 for item in diagnostics if item["touchesSourceEdge"]),
        "anchorX": anchor_x,
        "idleStabilization": idle_stabilization,
    }
    return atlas, config, packed_frames, diagnostics, overlay


def make_proof(name: str, frames: list[list[Image.Image]], baseline: int) -> Image.Image:
    cell_width = frames[0][0].width
    cell_height = frames[0][0].height
    label_width = 94
    header_height = 30
    proof = Image.new("RGBA", (label_width + cell_width * COLUMNS, header_height + cell_height * ROWS), "#0d0b11")
    draw = ImageDraw.Draw(proof)
    draw.text((10, 9), name, fill="#f4d99a")
    for column in range(COLUMNS):
        draw.text((label_width + column * cell_width + 8, 9), f"Frame {column + 1}", fill="#d5c9e5")
    for row, row_frames in enumerate(frames):
        top = header_height + row * cell_height
        draw.text((10, top + 12), ROW_NAMES[row], fill="#f4d99a")
        for column, frame in enumerate(row_frames):
            left = label_width + column * cell_width
            proof.alpha_composite(checkerboard((cell_width, cell_height)), (left, top))
            proof.alpha_composite(frame, (left, top))
            draw.rectangle((left, top, left + cell_width - 1, top + cell_height - 1), outline="#69577c")
            draw.line((left, top + baseline, left + cell_width - 1, top + baseline), fill="#efb04f", width=2)
    return proof


def make_motion_preview(name: str, frames: list[list[Image.Image]], reference_height: int) -> None:
    panel_width = 440
    panel_height = 176
    label_width = 86
    scale = min(1.0, 126 / max(1, reference_height))
    pages: list[Image.Image] = []
    for frame_index in range(COLUMNS):
        page = Image.new("RGBA", (label_width + panel_width, panel_height * ROWS), "#0d0b11")
        draw = ImageDraw.Draw(page)
        for row in range(ROWS):
            top = row * panel_height
            draw.text((10, top + 12), ROW_NAMES[row], fill="#f4d99a")
            panel = checkerboard((panel_width, panel_height))
            source = frames[row][frame_index]
            resized = source.resize((max(1, round(source.width * scale)), max(1, round(source.height * scale))), Image.Resampling.LANCZOS)
            panel.alpha_composite(resized, ((panel_width - resized.width) // 2, (panel_height - resized.height) // 2))
            page.alpha_composite(panel, (label_width, top))
            draw.rectangle((label_width, top, label_width + panel_width - 1, top + panel_height - 1), outline="#69577c")
        draw.text((10, panel_height * ROWS - 20), name, fill="#d5c9e5")
        pages.append(page.convert("P", palette=Image.Palette.ADAPTIVE, colors=255))
    pages[0].save(
        REVIEW / "motion" / f"{name.lower().replace(' ', '-')}.gif",
        save_all=True,
        append_images=pages[1:],
        duration=[520, 180, 210, 320],
        loop=0,
        disposal=2,
    )


def preview_page(name: str, animation: str, frame: Image.Image, size: tuple[int, int] = (520, 420)) -> Image.Image:
    page = checkerboard(size, tile=16)
    draw = ImageDraw.Draw(page)
    draw.rectangle((0, 0, size[0], 36), fill="#0d0b11")
    draw.text((12, 12), f"{name} - {animation}", fill="#f4d99a")
    available_width = size[0] - 36
    available_height = size[1] - 54
    scale = min(1.0, available_width / frame.width, available_height / frame.height)
    resized = frame.resize(
        (max(1, round(frame.width * scale)), max(1, round(frame.height * scale))),
        Image.Resampling.LANCZOS,
    )
    page.alpha_composite(resized, ((size[0] - resized.width) // 2, 40 + (available_height - resized.height) // 2))
    return page


def make_animation_previews(name: str, frames: list[list[Image.Image]]) -> None:
    durations = {
        "Idle": [560, 560, 560, 560],
        "Melee": [240, 120, 150, 280],
        "Magic": [280, 170, 210, 340],
        "Ultimate": [320, 210, 260, 440],
        "Death": [280, 220, 260, 680],
    }
    output = REVIEW / "motion" / name.lower().replace(" ", "-")
    output.mkdir(parents=True, exist_ok=True)
    for row_index, animation in enumerate(ROW_NAMES):
        pages = [
            preview_page(name, animation, frame).convert("P", palette=Image.Palette.ADAPTIVE, colors=255)
            for frame in frames[row_index]
        ]
        pages[0].save(
            output / f"{animation.lower()}.gif",
            save_all=True,
            append_images=pages[1:],
            duration=durations[animation],
            loop=0,
            disposal=2,
        )


def make_transformation_preview(
    name: str,
    base_frames: list[list[Image.Image]],
    form_name: str,
    form_frames: list[list[Image.Image]],
) -> None:
    sequence = base_frames[3] + [form_frames[0][0], form_frames[0][1], form_frames[0][2]]
    labels = [f"{name} Ultimate"] * COLUMNS + [form_name] * 3
    pages = [
        preview_page(name, label, frame).convert("P", palette=Image.Palette.ADAPTIVE, colors=255)
        for label, frame in zip(labels, sequence)
    ]
    pages[0].save(
        REVIEW / "motion" / f"{name.lower()}-transformation.gif",
        save_all=True,
        append_images=pages[1:],
        duration=[300, 190, 230, 420, 420, 420, 520],
        loop=0,
        disposal=2,
    )


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (REVIEW / "proof").mkdir(parents=True, exist_ok=True)
    (REVIEW / "motion").mkdir(parents=True, exist_ok=True)

    manifest: dict[str, object] = {}
    report: dict[str, object] = {"grid": [COLUMNS, ROWS], "animations": list(ROW_NAMES), "characters": {}}
    all_frames: dict[str, list[list[Image.Image]]] = {}
    for name, filename in CHARACTERS.items():
        source_path = SOURCE / filename
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        source = Image.open(source_path).convert("RGBA")
        atlas, config, frames, diagnostics, overlay = build_atlas(name, source)
        atlas.save(OUTPUT / filename, optimize=True)
        manifest[name] = {"file": filename, **config}
        make_proof(name, frames, int(config["baseline"])).save(REVIEW / "proof" / f"{Path(filename).stem}-proof.png", optimize=True)
        make_motion_preview(name, frames, int(config["referenceHeight"]))
        make_animation_previews(name, frames)
        overlay.save(REVIEW / "proof" / f"{Path(filename).stem}-seams.png", optimize=True)
        all_frames[name] = frames
        report["characters"][name] = {
            "source": filename,
            "sourceSize": list(source.size),
            "atlasSize": list(atlas.size),
            "referenceHeight": config["referenceHeight"],
            "sourceEdgeContacts": config["sourceEdgeContacts"],
            "frames": diagnostics,
        }

    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    (REVIEW / "extraction-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="ascii")
    make_transformation_preview("Kael", all_frames["Kael"], "Kael Shadow Form", all_frames["KaelShadow"])
    make_transformation_preview("Glimmer", all_frames["Glimmer"], "Glimmer Mech Form", all_frames["GlimmerMech"])
    summary = {name: {"referenceHeight": config["referenceHeight"], "sourceEdgeContacts": config["sourceEdgeContacts"]} for name, config in manifest.items()}
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
