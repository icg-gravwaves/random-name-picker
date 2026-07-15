#!/usr/bin/env python3
"""Generate favicon.png and favicon.svg from UI_COLORS in constants.js."""

import math
import re
from pathlib import Path
from xml.etree import ElementTree as ET

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

# --- SVG ---
slice_rad = 2 * math.pi / n
start_rad = -math.pi / 2

def point_at(angle):
    return center + radius * math.cos(angle), center + radius * math.sin(angle)

def slice_path(index):
    a0 = start_rad + index * slice_rad
    a1 = a0 + slice_rad
    x0, y0 = point_at(a0)
    x1, y1 = point_at(a1)
    large = 1 if slice_rad > math.pi else 0
    return (f'M {center} {center} '
            f'L {x0:.3f} {y0:.3f} '
            f'A {radius} {radius} 0 {large} 1 {x1:.3f} {y1:.3f} Z')

svg = ET.Element('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'viewBox': f'0 0 {size} {size}',
    'width': str(size),
    'height': str(size),
    'aria-hidden': 'true',
})
ET.SubElement(svg, 'title').text = 'Random Name Picker'
g = ET.SubElement(svg, 'g', {'shape-rendering': 'geometricPrecision'})
for i, color in enumerate(colors):
    ET.SubElement(g, 'path', {'d': slice_path(i), 'fill': color})
ET.SubElement(svg, 'circle', {
    'cx': str(center), 'cy': str(center), 'r': str(hub_radius),
    'fill': '#0f172a', 'stroke': '#6366f1', 'stroke-width': '2',
})
ET.SubElement(svg, 'circle', {
    'cx': str(center), 'cy': str(center), 'r': str(radius),
    'fill': 'none', 'stroke': '#0f172a', 'stroke-width': '1',
})

ET.indent(svg)
svg_out = repo_root / 'favicon.svg'
svg_out.write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(svg, encoding='unicode'),
    encoding='utf-8',
)
print(f'Written {svg_out}')
