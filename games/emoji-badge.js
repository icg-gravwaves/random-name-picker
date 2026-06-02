const BADGE_SPRITE_CACHE = new Map();

function getLabelFont(labelFontSize) {
    return `bold ${labelFontSize}px 'Poppins', sans-serif`;
}

function isLabelFontReady(labelFontSize) {
    if (!document.fonts || !document.fonts.check) return true;
    return document.fonts.check(getLabelFont(labelFontSize));
}

function getBadgeSprite(emoji, color, emojiSize, options = {}) {
    const {
        label = null,
        labelFontSize = 10,
        labelPosition = 'bottom',
        flipEmoji = false
    } = options;

    const cacheKey = JSON.stringify({
        emoji,
        color,
        emojiSize,
        label,
        labelFontSize,
        labelPosition,
        flipEmoji
    });
    const canCache = isLabelFontReady(labelFontSize);
    const cached = canCache ? BADGE_SPRITE_CACHE.get(cacheKey) : null;
    if (cached) return cached;

    const radius = Math.max(14, Math.round(emojiSize * 0.5));
    const emojiDrawSize = Math.max(12, Math.round(emojiSize * 0.82));
    const strokeWidth = Math.max(2, Math.round(radius * 0.14));
    const pad = strokeWidth + 2;

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = getLabelFont(labelFontSize);
    const textWidth = label !== null && label !== undefined ? measureCtx.measureText(label).width : 0;

    const labelWidth = Math.max(28, Math.ceil(textWidth + 12));
    const labelHeight = Math.max(12, Math.ceil(labelFontSize + 4));
    const gap = 4;
    const hasLabel = label !== null && label !== undefined;

    const spriteWidth = hasLabel ? Math.max(radius * 2, labelWidth) + pad * 2 : radius * 2 + pad * 2;
    const spriteHeight = hasLabel ? radius * 2 + gap + labelHeight + pad * 2 : radius * 2 + pad * 2;

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(spriteWidth);
    canvas.height = Math.ceil(spriteHeight);
    const sctx = canvas.getContext('2d');

    const cx = canvas.width / 2;
    const cy = hasLabel && labelPosition === 'top'
        ? pad + labelHeight + gap + radius
        : pad + radius;

    sctx.beginPath();
    sctx.arc(cx, cy, radius, 0, Math.PI * 2);
    sctx.fillStyle = '#fff';
    sctx.fill();
    sctx.strokeStyle = color;
    sctx.lineWidth = strokeWidth;
    sctx.stroke();

    sctx.fillStyle = '#000';
    sctx.font = `${emojiDrawSize}px Arial`;
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    if (flipEmoji) {
        sctx.save();
        sctx.translate(cx, cy + 1);
        sctx.scale(-1, 1);
        sctx.fillText(emoji, 0, 0);
        sctx.restore();
    } else {
        sctx.fillText(emoji, cx, cy + 1);
    }

    let labelTop = null;
    let labelBottom = null;
    if (hasLabel) {
        const labelCenterY = labelPosition === 'top'
            ? pad + labelHeight / 2
            : pad + radius * 2 + gap + labelHeight / 2;

        sctx.fillStyle = color;
        sctx.fillRect(cx - labelWidth / 2, labelCenterY - labelHeight / 2, labelWidth, labelHeight);

        sctx.fillStyle = '#000';
        sctx.font = getLabelFont(labelFontSize);
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillText(label, cx, labelCenterY);

        labelTop = labelCenterY - labelHeight / 2;
        labelBottom = labelCenterY + labelHeight / 2;
    }

    const sprite = {
        canvas,
        cx,
        cy,
        hasLabel,
        labelTop,
        labelBottom,
        labelHeight
    };
    if (canCache) {
        BADGE_SPRITE_CACHE.set(cacheKey, sprite);
    }
    return sprite;
}

export function drawEmojiBadge(ctx, x, y, emoji, color, emojiSize, options = {}) {
    const sprite = getBadgeSprite(emoji, color, emojiSize, options);
    ctx.drawImage(sprite.canvas, x - sprite.cx, y - sprite.cy);

    if (sprite.hasLabel) {
        return {
            labelTop: y - sprite.cy + sprite.labelTop,
            labelBottom: y - sprite.cy + sprite.labelBottom,
            labelHeight: sprite.labelHeight
        };
    }

    return null;
}

export function drawEmojiBadgeWithLabel(ctx, {
    x,
    y,
    emoji,
    color,
    emojiSize,
    label,
    labelFontSize,
    labelPosition = 'bottom',
    flipEmoji = false
}) {
    return drawEmojiBadge(ctx, x, y, emoji, color, emojiSize, {
        label,
        labelFontSize,
        labelPosition,
        flipEmoji
    });
}
