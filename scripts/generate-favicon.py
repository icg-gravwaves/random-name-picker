#!/usr/bin/env python3
"""Generate favicon.png from UI_COLORS in constants.js using Pillow."""

import re
import math
from pathlib import Path

from PIL import Image, ImageDraw

repo_root = Path(__file__).parent.parent

# Parse UI_COLORS from constants.js — single source of truth
constants_text = (repo_root / 'constants.js').read_text()
colors_block = constants_text.split('UI_COLORS')[1].split(']')[0]
colors = re.findall(r"'(#[0-9a-fA-F]{6})'", colors_block)

if not colors:
    raise ValueError('No colors found in WHEEL_COLORS in constants.js')

size = 64
center = size / 2
radius = 30
hub_radius = 12
n = len(colors)
slice_deg = 360 / n
start_deg = -90  # top of circle

img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

for i, color in enumerate(colors):
    draw.pieslice(
        [center - radius, center - radius, center + radius, center + radius],
        start=start_deg + i * slice_deg,
        end=start_deg + (i + 1) * slice_deg,
        fill=color,
    )

# Dark hub circle with indigo outline
draw.ellipse(
    [center - hub_radius, center - hub_radius, center + hub_radius, center + hub_radius],
    fill='#0f172a',
    outline='#6366f1',
    width=2,
)

out = repo_root / 'favicon.png'
img.save(out, 'PNG')
print(f'Written {out}')
