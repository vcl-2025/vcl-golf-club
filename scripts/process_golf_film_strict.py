#!/usr/bin/env python3
"""Strict chroma-key matching the quality of the original 11 poses."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

MINT = np.array([95, 191, 171], np.uint8)
HAIR = np.array([224, 130, 168], np.uint8)
SKIN = np.array([242, 180, 200], np.uint8)
WHITE = np.array([255, 255, 255], np.uint8)
CLUB = np.array([58, 130, 115], np.uint8)

CANVAS_W, CANVAS_H = 320, 700
MAX_FIG_H = 640


def process_one(src: Path, dst: Path) -> None:
    arr = np.array(Image.open(src).convert("RGBA")).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # Same magenta key used for original 11 poses
    is_bg = (r > 180) & (b > 180) & (g < 130) & (r + b > g * 2.2 + 60)
    is_bg |= (r > 210) & (b > 190) & (g < 90)

    figure = ~is_bg
    # Fill holes (hair spray) + remove crumbs — keep edges clean
    figure = ndimage.binary_closing(figure, iterations=2)
    figure = ndimage.binary_fill_holes(figure)
    figure = ndimage.binary_opening(figure, iterations=1)
    figure = ndimage.binary_fill_holes(figure)

    out = np.zeros_like(arr)
    out[figure] = arr[figure]
    out[figure, 3] = 255

    # Soft-ish edge: one-pixel dilate for anti-alias sample then hard solid body
    # Palette snap only on solid figure (like original pipeline)
    yy, xx = np.where(figure)
    for y, x in zip(yy, xx):
        pr, pg, pb = out[y, x, 0], out[y, x, 1], out[y, x, 2]
        # kill residual magenta
        if pr > 180 and pb > 160 and pg < 130:
            out[y, x, 3] = 0
            continue
        if pr > 230 and pg > 230 and pb > 230:
            out[y, x, :3] = WHITE
        elif pg > pr + 10 and pg > 100 and pr < 190:
            out[y, x, :3] = CLUB if pg < 150 and pr < 110 else MINT
        elif pr > 170 and pr >= pg:
            out[y, x, :3] = HAIR if pg < 150 else SKIN
        elif pg > pr and pg > 70:
            out[y, x, :3] = CLUB
        else:
            out[y, x, :3] = SKIN

    # Drop any leftover low alpha
    out[out[:, :, 3] < 200, 3] = 0
    out[out[:, :, 3] >= 200, 3] = 255

    img = Image.fromarray(out.astype(np.uint8), "RGBA")
    bbox = img.getbbox()
    if not bbox:
        Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0)).save(dst)
        return
    fig = img.crop(bbox)
    fig.thumbnail((CANVAS_W - 20, MAX_FIG_H), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    x = (CANVAS_W - fig.width) // 2
    y = CANVAS_H - fig.height - 20
    canvas.paste(fig, (x, y), fig)
    canvas.save(dst, "PNG", optimize=True)


if __name__ == "__main__":
    import sys

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    process_one(src, dst)
    print("ok", dst, Image.open(dst).size)
