"""Rasterize pixel TTF fonts (at their native pixel size) into a JSON glyph atlas for the JS renderer."""
import json
import os
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARS = [chr(c) for c in range(32, 127)] + [chr(c) for c in range(0x410, 0x450)] + list("Ёё«»—–…№•’“”©×°→←★")


def build(path, size, name, variation=None):
    font = ImageFont.truetype(path, size)
    if variation:
        try:
            font.set_variation_by_axes(variation)
        except Exception as exc:  # font without the requested axes
            print("variation failed", name, exc)
    cmap = TTFont(path).getBestCmap()
    asc, desc = font.getmetrics()
    glyphs = {}
    for ch in CHARS:
        if ord(ch) not in cmap:
            continue
        box = size * 4
        im = Image.new("1", (box, box), 0)
        draw = ImageDraw.Draw(im)
        draw.fontmode = "1"
        ox, base = size, size * 2
        draw.text((ox, base), ch, fill=1, font=font, anchor="ls")
        pix = im.load()
        pts = [(x, y) for y in range(box) for x in range(box) if pix[x, y]]
        adv = int(round(font.getlength(ch)))
        if not pts:
            glyphs[ch] = {"a": adv, "x": 0, "y": 0, "w": 0, "h": 0, "r": []}
            continue
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        rows = []
        for y in range(y0, y1 + 1):
            rows.append("".join("1" if pix[x, y] else "0" for x in range(x0, x1 + 1)))
        glyphs[ch] = {"a": adv, "x": x0 - ox, "y": y0 - base, "w": x1 - x0 + 1, "h": y1 - y0 + 1, "r": rows}
    return {"name": name, "size": size, "asc": asc, "desc": desc, "glyphs": glyphs}


fonts = {
    "tiny": build(os.path.join(ROOT, "assets/Tiny5.ttf"), 8, "tiny"),
    "press": build(os.path.join(ROOT, "assets/PressStart2P-Regular.ttf"), 8, "press"),
}
with open(os.path.join(ROOT, "assets/fonts.json"), "w", encoding="utf-8") as fh:
    json.dump(fonts, fh, ensure_ascii=False, separators=(",", ":"))
for k, v in fonts.items():
    print(k, "glyphs", len(v["glyphs"]), "asc", v["asc"], "desc", v["desc"], "A:", v["glyphs"]["A"]["y"], v["glyphs"]["A"]["h"], "g:", v["glyphs"]["g"]["y"], v["glyphs"]["g"]["h"])
