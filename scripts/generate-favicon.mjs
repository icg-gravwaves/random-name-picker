#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WHEEL_COLORS } from '../constants.js';

const size = 64;
const center = size / 2;
const radius = 30;
const sliceAngle = (Math.PI * 2) / WHEEL_COLORS.length;
const startAngle = -Math.PI / 2;

function pointAt(angle) {
    return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
    };
}

function slicePath(index) {
    const sliceStart = startAngle + index * sliceAngle;
    const sliceEnd = sliceStart + sliceAngle;
    const start = pointAt(sliceStart);
    const end = pointAt(sliceEnd);
    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    return `M ${center} ${center} L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

const slices = WHEEL_COLORS
    .map((color, index) => `<path d="${slicePath(index)}" fill="${color}"/>`)
    .join('');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
  <title>Random Name Picker</title>
  <g shape-rendering="geometricPrecision">${slices}</g>
  <circle cx="${center}" cy="${center}" r="12" fill="#0f172a" stroke="#6366f1" stroke-width="2"/>
  <circle cx="${center}" cy="${center}" r="30" fill="none" stroke="#0f172a" stroke-width="1"/>
</svg>
`;

writeFileSync(resolve(process.cwd(), 'favicon.svg'), svg);
