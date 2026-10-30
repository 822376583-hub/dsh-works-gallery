"""Generate the market icon for dsh-works-gallery: 512x512 PNG, a 2x2 thumbnail wall."""
from PIL import Image, ImageDraw, ImageFilter
import math

S = 512
SS = 4  # supersample
W = S * SS

img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# rounded-square backdrop with a vertical gradient
bg = Image.new('RGBA', (W, W), (0, 0, 0, 0))
g = ImageDraw.Draw(bg)
top = (24, 32, 54)
bot = (46, 74, 138)
for y in range(W):
    t = y / (W - 1)
    g.line([(0, y), (W, y)], fill=(
        int(top[0] + (bot[0] - top[0]) * t),
        int(top[1] + (bot[1] - top[1]) * t),
        int(top[2] + (bot[2] - top[2]) * t),
        255,
    ))

radius = int(W * 0.22)
mask = Image.new('L', (W, W), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=radius, fill=255)
img.paste(bg, (0, 0), mask)

# soft glow behind the tiles
glow = Image.new('RGBA', (W, W), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse(
    [int(W * 0.10), int(W * 0.30), int(W * 0.90), int(W * 0.95)],
    fill=(92, 140, 255, 90),
)
img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(int(W * 0.05))))
d = ImageDraw.Draw(img)

# 2x2 tiles
pad = int(W * 0.17)
gap = int(W * 0.045)
size = (W - 2 * pad - gap) // 2
x0, y0 = pad, pad
tile_r = int(size * 0.16)

tiles = [
    (x0, y0, (255, 255, 255, 236)),
    (x0 + size + gap, y0, (255, 255, 255, 176)),
    (x0, y0 + size + gap, (255, 255, 255, 176)),
    (x0 + size + gap, y0 + size + gap, (255, 255, 255, 236)),
]

for tx, ty, fill in tiles:
    d.rounded_rectangle([tx, ty, tx + size, ty + size], radius=tile_r, fill=fill)

# little "photo" glyph inside the two bright tiles
accent = (62, 96, 190, 255)
def photo_glyph(tx, ty):
    ix0, iy0 = tx + int(size * 0.20), ty + int(size * 0.20)
    ix1, iy1 = tx + int(size * 0.80), ty + int(size * 0.80)
    d.rounded_rectangle([ix0, iy0, ix1, iy1], radius=int(size * 0.08), outline=accent, width=int(size * 0.055))
    cx, cy, r = ix0 + int((ix1 - ix0) * 0.28), iy0 + int((iy1 - iy0) * 0.30), int(size * 0.065)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=accent)
    d.line(
        [ix0 + int((ix1 - ix0) * 0.18), iy1 - int((iy1 - iy0) * 0.20),
         ix0 + int((ix1 - ix0) * 0.52), iy0 + int((iy1 - iy0) * 0.50),
         ix1 - int((ix1 - ix0) * 0.08), ix1 - int((iy1 - iy0) * 0.10)],
        fill=accent, width=int(size * 0.055), joint='curve',
    )

photo_glyph(x0, y0)
photo_glyph(x0 + size + gap, y0 + size + gap)

# three dots in the bottom-left tile: "and more of them"
bx, by = x0, y0 + size + gap
bcx, bcy = bx + size // 2, by + size // 2
dr = int(size * 0.055)
for i in (-1, 0, 1):
    cx2 = bcx + i * int(size * 0.17)
    d.ellipse([cx2 - dr, bcy - dr, cx2 + dr, bcy + dr], fill=(62, 96, 190, 255))

# a play triangle in the top-right tile to stand for video
tx, ty = x0 + size + gap, y0
cx, cy = tx + size // 2, ty + size // 2
pr = int(size * 0.18)
d.polygon([(cx - pr * 0.7, cy - pr), (cx - pr * 0.7, cy + pr), (cx + pr, cy)], fill=(62, 96, 190, 255))

img = img.resize((S, S), Image.LANCZOS)
img.save(r'C:\Users\Administrator\Documents\repos\dsh-works-gallery\icon.png')
print('ok', img.size)
