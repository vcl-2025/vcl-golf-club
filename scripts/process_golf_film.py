#!/usr/bin/env python3
"""Chroma-key magenta golf frames and normalize to fixed canvas."""
from __future__ import annotations
from pathlib import Path
import numpy as np
from PIL import Image

MINT = np.array([95, 191, 171], np.uint8)
HAIR = np.array([224, 130, 168], np.uint8)
SKIN = np.array([242, 180, 200], np.uint8)
WHITE = np.array([255, 255, 255], np.uint8)
CLUB = np.array([58, 130, 115], np.uint8)

CANVAS_W, CANVAS_H = 320, 700
MAX_FIG_H = 640


def chroma_key(arr: np.ndarray) -> np.ndarray:
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    is_bg = (r > 180) & (b > 180) & (g < 130) & (r + b > g * 2.2 + 60)
    is_bg |= (r > 210) & (b > 190) & (g < 90)
    out = arr.copy()
    out[is_bg, 3] = 0
    yy, xx = np.where(out[:, :, 3] > 200)
    for y, x in zip(yy, xx):
        pr, pg, pb = out[y, x, 0], out[y, x, 1], out[y, x, 2]
        if pr > 230 and pg > 230 and pb > 230:
            out[y, x, :3] = WHITE
        elif pg > pr + 10 and pg > 100 and pr < 190:
            out[y, x, :3] = CLUB if pg < 150 and pr < 110 else MINT
        elif pr > 170 and pr >= pg:
            out[y, x, :3] = HAIR if pg < 150 else SKIN
    return out


def normalize(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    fig = img.crop(bbox)
    fig.thumbnail((CANVAS_W - 16, MAX_FIG_H), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    x = (CANVAS_W - fig.width) // 2
    y = CANVAS_H - fig.height - 20  # feet-ish baseline
    canvas.paste(fig, (x, y), fig)
    return canvas


def process_one(src: Path, dst: Path) -> None:
    arr = np.array(Image.open(src).convert("RGBA"), dtype=np.float32)
    out = chroma_key(arr)
    img = Image.fromarray(out.astype(np.uint8), "RGBA")
    normalize(img).save(dst, "PNG", optimize=True)


def main() -> None:
    import sys
    raw = Path(sys.argv[1] if len(sys.argv) > 1 else "tmp_film_raw")
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "vendor/log-lottery/src/assets/images/golf-film")
    out.mkdir(parents=True, exist_ok=True)
    files = sorted(raw.glob("film-*.png"))
    for i, src in enumerate(files, 1):
        dst = out / f"film-{i:02d}.png"
        process_one(src, dst)
        print("ok", dst.name, Image.open(dst).size)
    print("total", len(files))


if __name__ == "__main__":
    main()
