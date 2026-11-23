#!/usr/bin/env python3
"""Render the 拾光 app icon (public/icon.svg) into PNG sizes required by iOS/Android.

The SVG uses only rects, round-capped strokes, a cubic-bezier 4-point star and two
circles, so it can be reproduced 1:1 with Pillow at a high supersample factor.
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")

CREAM = "#F7F5F0"
CARD = "#FFFFFF"
CARD_BORDER = "#E8E1D5"
INK = "#24221F"
MUTED = "#D5CCC0"
TERRACOTTA = "#B85D3B"

SS = 4  # supersample factor


def bezier(p0, c1, c2, p3, n=64):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def star_points():
    p = [(362, 110), (406, 154), (362, 198), (318, 154)]
    ctrl = [
        ((365.5, 138.5), (377.5, 150.5)),
        ((377.5, 157.5), (365.5, 169.5)),
        ((358.5, 169.5), (346.5, 157.5)),
        ((346.5, 150.5), (358.5, 138.5)),
    ]
    pts = []
    for i in range(4):
        a = p[i]
        b = p[(i + 1) % 4]
        c1, c2 = ctrl[i]
        pts += bezier(a, c1, c2, b)
    return pts


def rounded_line(draw, x1, y1, x2, y2, width, color, s):
    w = width * s
    draw.line([(x1 * s, y1 * s), (x2 * s, y2 * s)], fill=color, width=round(w))
    r = w / 2
    for (x, y) in ((x1, y1), (x2, y2)):
        draw.ellipse([x * s - r, y * s - r, x * s + r, y * s + r], fill=color)


def render_artwork(size_px: int, *, maskable: bool = False) -> Image.Image:
    """Draw the icon artwork at the given size."""
    w = size_px * SS
    k = w / 512.0  # svg units -> pixels
    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        d.rectangle([0, 0, w, w], fill=CREAM)
        # keep all content inside the 80% diameter safe circle
        scale = 0.62
        off = w * (1 - scale) / 2
        local = Image.new("RGBA", (w, w), (0, 0, 0, 0))
        ld = ImageDraw.Draw(local)
        x0, y0, r, bw, lw = 28, 28, 92, 4, 18
        ld.rounded_rectangle(
            [x0 * k, y0 * k, (x0 + 456) * k, (y0 + 456) * k],
            radius=r * k, fill=CARD, outline=CARD_BORDER, width=round(bw * k),
        )
        rounded_line(ld, 132, 164, 300, 164, lw, MUTED, k)
        rounded_line(ld, 132, 232, 364, 232, 20, INK, k)
        rounded_line(ld, 132, 296, 316, 296, 20, INK, k)
        rounded_line(ld, 132, 360, 236, 360, lw, MUTED, k)
        ld.polygon([(x * k, y * k) for x, y in star_points()], fill=TERRACOTTA)
        halo = Image.new("RGBA", (w, w), (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo)
        cx, cy, rr = 384, 348, 24
        hd.ellipse([cx * k - rr * k, cy * k - rr * k, cx * k + rr * k, cy * k + rr * k], fill=(184, 93, 59, 41))
        local = Image.alpha_composite(local, halo)
        ld = ImageDraw.Draw(local)
        rr2 = 10
        ld.ellipse([cx * k - rr2 * k, cy * k - rr2 * k, cx * k + rr2 * k, cy * k + rr2 * k], fill=TERRACOTTA)
        local = local.resize((round(w * scale), round(w * scale)), Image.LANCZOS)
        img.alpha_composite(local, (round(off), round(off)))
        return img

    d.rounded_rectangle([0, 0, w - 1, w - 1], radius=116 * k, fill=CREAM)
    d.rounded_rectangle(
        [28 * k, 28 * k, 484 * k, 484 * k],
        radius=92 * k, fill=CARD, outline=CARD_BORDER, width=round(4 * k),
    )
    rounded_line(d, 132, 164, 300, 164, 18, MUTED, k)
    rounded_line(d, 132, 232, 364, 232, 20, INK, k)
    rounded_line(d, 132, 296, 316, 296, 20, INK, k)
    rounded_line(d, 132, 360, 236, 360, 18, MUTED, k)

    star = [(x * k, y * k) for x, y in star_points()]
    d.polygon(star, fill=TERRACOTTA)

    halo = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([(384 - 24) * k, (348 - 24) * k, (384 + 24) * k, (348 + 24) * k], fill=(184, 93, 59, 41))
    img = Image.alpha_composite(img, halo)
    d = ImageDraw.Draw(img)
    d.ellipse([(384 - 10) * k, (348 - 10) * k, (384 + 10) * k, (348 + 10) * k], fill=TERRACOTTA)
    return img


def save(img: Image.Image, name: str, size: int, *, opaque_bg: str | None = None):
    out = img.resize((size, size), Image.LANCZOS)
    if opaque_bg:
        bg = Image.new("RGBA", out.size, opaque_bg)
        bg.alpha_composite(out)
        out = bg
    path = os.path.join(OUT_DIR, name)
    out.save(path, "PNG")
    print(f"wrote {path} ({size}x{size})")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    standard = render_artwork(512)
    maskable = render_artwork(512, maskable=True)

    save(standard, "icon-192.png", 192)
    save(standard, "icon-512.png", 512)
    save(maskable, "icon-maskable-512.png", 512)
    # iOS home-screen icon must be an opaque PNG
    save(standard, "apple-touch-icon-180.png", 180, opaque_bg=CREAM)


if __name__ == "__main__":
    main()
