from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def intervals(values: np.ndarray, minimum: int) -> list[tuple[int, int, int]]:
    active = values >= minimum
    result: list[tuple[int, int, int]] = []
    start: int | None = None
    for index, enabled in enumerate(active):
        if enabled and start is None:
            start = index
        elif not enabled and start is not None:
            result.append((start, index - 1, int(values[start:index].max())))
            start = None
    if start is not None:
        result.append((start, len(values) - 1, int(values[start:].max())))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("images", nargs="+", type=Path)
    args = parser.parse_args()
    for path in args.images:
        alpha = np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)[:, :, 3]
        row_counts = np.count_nonzero(alpha > 12, axis=1)
        col_counts = np.count_nonzero(alpha > 12, axis=0)
        print(f"\n{path.name} {alpha.shape[1]}x{alpha.shape[0]}")
        print("row bands >= 80:", intervals(row_counts, 80))
        print("row bands >= 240:", intervals(row_counts, 240))
        print("column bands >= 80:", intervals(col_counts, 80))


if __name__ == "__main__":
    main()
