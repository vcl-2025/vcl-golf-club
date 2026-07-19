#!/usr/bin/env python3
"""Chroma-key magenta golf frames with clean solid edges (no speckled hair)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

MINT = np.array([95, 191, 171], np.uint8)
HAIR = np.array([224, 130, 168], np.uint8)
SKIN = np.array([242, 180, 200], np.uint8)
WHITE = np.array([255, 255, 255], np.uint8)
CLUB = np.array([58, 130, 115], np.uint8)

CANVAS_W, CANVAS_H = 320, 700
MAX_FIG_H = 640


def magenta_bg_mask(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
    """True where pixel is chroma-key magenta / hot pink background."""
    # Primary: bright magenta
    bg = (r > 170) & (b > 150) & (g < 140) & ((r.astype(np.int16) + b) > (g.astype(np.int16) * 2 + 50))
    bg |= (r > 200) & (b > 180) & (g < 100)
    # Near-pure #FF00FF
    bg |= (r > 220) & (b > 200) & (g < 80)
    return bg


def snap_palette(rgb: np.ndarray) -> np.ndarray:
    """Map a single RGB to brand palette (uint8 length-3)."""
    pr, pg, pb = int(rgb[0]), int(rgb[1]), int(rgb[2])
    # white / near-white clothing
    if pr > 220 and pg > 220 and pb > 220:
        return WHITE
    # mint shirt / visor
    if pg > pr + 8 and pg > 100 and pr < 200 and pg > pb - 35:
        if pg < 145 and pr < 105:
            return CLUB
        return MINT
    # pinks: darker → hair, lighter → skin
    if pr > 160 and pr >= pg - 8:
        return HAIR if pg < 158 else SKIN
    # teal club / grey shaft → club
    if pg >= pr and pg > 70:
        return CLUB
    if 80 < pr < 160 and abs(pr - pg) < 40 and abs(pg - pb) < 40:
        return CLUB
    return SKIN


def process_one(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    # Work at higher res for cleaner morphology, then downscale
    w0, h0 = im.size
    if max(w0, h0) < 900:
        scale = 900 / max(w0, h0)
        im = im.resize((int(w0 * scale), int(h0 * scale)), Image.Resampling.LANCZOS)

    arr = np.array(im)
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)

    bg = magenta_bg_mask(r, g, b)
    figure = ~bg

    # Fill holes (esp. speckled hair) and remove stray magenta crumbs
    figure = ndimage.binary_closing(figure, iterations=3)
    figure = ndimage.binary_fill_holes(figure)
    figure = ndimage.binary_opening(figure, iterations=1)
    # Light dilation then erode = smooth silhouette without growing much
    figure = ndimage.binary_closing(figure, structure=np.ones((5, 5)), iterations=1)
    figure = ndimage.binary_fill_holes(figure)

    # Soft edge: blur mask → alpha
    mask_u8 = (figure.astype(np.uint8) * 255)
    mask_img = Image.fromarray(mask_u8, mode="L").filter(ImageFilter.GaussianBlur(radius=0.8))
    alpha = np.array(mask_img)

    out = np.zeros_like(arr)
    # Copy original colors where solid, then snap
    solid = alpha > 200
    out[solid, :3] = arr[solid, :3]
    yy, xx = np.where(solid)
    for y, x in zip(yy, xx):
        out[y, x, :3] = snap_palette(out[y, x, :3])

    # Semi-transparent edge: sample nearest solid color
    edge = (alpha > 0) & (alpha <= 200)
    if edge.any():
        # Distance to solid for color propagate
        dist, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
        ey, ex = np.where(edge)
        out[ey, ex, :3] = out[iy[ey, ex], ix[ey, ex], :3]
        out[ey, ex, 3] = alpha[ey, ex]
    out[solid, 3] = 255
    out[~figure & (alpha == 0), 3] = 0

    # Kill residual magenta inside figure
    rr, gg, bb = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    residual = (out[:, :, 3] > 0) & (rr > 170) & (bb > 150) & (gg < 130)
    out[residual, 3] = 0

    img = Image.fromarray(out, "RGBA")
    bbox = img.getbbox()
    if not bbox:
        Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0)).save(dst)
        return

    fig = img.crop(bbox)
    # Slight feather on final scale
    fig.thumbnail((CANVAS_W - 20, MAX_FIG_H), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    x = (CANVAS_W - fig.width) // 2
    y = CANVAS_H - fig.height - 20
    canvas.paste(fig, (x, y), fig)
    canvas.save(dst, "PNG", optimize=True)


def main() -> None:
    import sys

    raw = Path(sys.argv[1] if len(sys.argv) > 1 else "tmp_film_raw")
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "vendor/log-lottery/src/assets/images/golf-film")
    out.mkdir(parents=True, exist_ok=True)
    files = sorted(raw.glob("film-*.png"))
    for src in files:
        n = int(src.stem.split("-")[1])
        dst = out / f"film-{n:02d}.png"
        process_one(src, dst)
        print("ok", dst.name, Image.open(dst).size)
    print("total", len(files))


if __name__ == "__main__":
    main()
