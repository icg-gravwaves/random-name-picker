import { UI_COLORS } from '../constants.js';
import { drawEmojiBadge } from './emoji-badge.js';

export const RACER_EMOJIS = ['🐎', '🚗', '🐢', '🚀', '🏃', '🐇', '🦊', '🐕', '🚲', '🛵'];
export const crowdColors = ['#ff6b6b', '#4ecdc4', '#ffeaa7', '#fd79a8', '#a29bfe', '#fff', '#00b894', '#e17055'];

// Use identical track geometry for the preview and running race.
function getTrackLayout(width, height, count) {
    const laneHeight = Math.min(60, (height - 100) / count);
    const trackHeight = count * laneHeight;
    const remainingSpace = height - trackHeight;
    const skyHeight = remainingSpace * (2 / 3);
    return {
        width, height, laneHeight, trackHeight, skyHeight,
        grassHeight: remainingSpace * (1 / 3),
        trackY: skyHeight,
        startX: 80,
        finishX: width - 100
    };
}

function getOrdinal(n) {
    if (n === 11 || n === 12 || n === 13) return n + "th";
    const lastDigit = n % 10;
    if (lastDigit === 1) return n + "st";
    if (lastDigit === 2) return n + "nd";
    if (lastDigit === 3) return n + "rd";
    return n + "th";
}

function drawTrack(ctx, layout, count, elapsed = 0, raceStarted = false) {
    const { width, skyHeight, trackY, trackHeight, grassHeight, laneHeight, startX, finishX } = layout;
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, width, skyHeight);

    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, trackY + trackHeight, width, grassHeight);

    // Draw Crowd & Grandstand
    const grandstandY = trackY - 60;
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, grandstandY, width, 30);

    // Draw Barrier
    ctx.fillStyle = '#718096';
    ctx.fillRect(0, trackY - 30, width, 30);
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, trackY - 30, width, 2);
    ctx.fillRect(0, trackY - 2, width, 2);

    for (let i = 0; i < width; i += 12) {
        const personIdx = i / 12;
        const bounce1 = raceStarted ? Math.max(0, Math.sin(elapsed / 100 + i * 0.1) * 3) : 0;
        const bounce2 = raceStarted ? Math.max(0, Math.sin(elapsed / 120 + i * 0.2) * 3) : 0;
        const bounce3 = raceStarted ? Math.max(0, Math.sin(elapsed / 110 + i * 0.15) * 3) : 0;

        ctx.fillStyle = crowdColors[personIdx % crowdColors.length];
        ctx.beginPath(); ctx.arc(i + 6, grandstandY + 6 - bounce1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = crowdColors[(personIdx + 3) % crowdColors.length];
        ctx.beginPath(); ctx.arc(i + 12, grandstandY + 15 - bounce2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = crowdColors[(personIdx + 6) % crowdColors.length];
        ctx.beginPath(); ctx.arc(i + 6, grandstandY + 24 - bounce3, 3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, trackY, width, trackHeight);

    for (let i = 1; i < count; i++) {
        const y = trackY + i * laneHeight;
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(startX - 5, trackY, 10, trackHeight);

    for (let i = 0; i < Math.ceil(trackHeight / 15); i++) {
        for (let j = 0; j < 3; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? '#000' : '#fff';
            ctx.fillRect(finishX + j * 15, trackY + i * 15, 15, 15);
        }
    }
}

function drawRacer(ctx, racer, weightsEnabled) {
    ctx.save();
    ctx.translate(racer.x, racer.y);

    if (weightsEnabled && racer.weight > 1) {
        const numBalls = racer.weight - 1;
        const ballRadius = 8;

        for (let b = 0; b < numBalls; b++) {
            const ballX = -30 - (b * (ballRadius * 2 + 5));

            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b === 0 ? -22 : ballX + ballRadius * 2 + 5, 0);
            ctx.lineTo(ballX + ballRadius, 0);
            ctx.stroke();

            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(ballX, 0, ballRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px Poppins';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('W', ballX, 0);
        }
    }

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    drawEmojiBadge(ctx, 0, 0, racer.emoji, racer.color, 34, {
        label: racer.name,
        labelFontSize: 12,
        labelPosition: 'bottom',
        flipEmoji: racer.emoji !== '🚀'
    });

    if (racer.finished && racer.finishOrder > 0) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Poppins';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(getOrdinal(racer.finishOrder), 55, 0);
        ctx.restore();
    }

    ctx.restore();
}

export function drawRacePreview(picker) {
    if (picker.names.length === 0) return;
    const ctx = picker.raceCtx;
    const { width, height } = picker.prepareCanvas(picker.raceCanvas, ctx);
    const layout = getTrackLayout(width, height, picker.names.length);
    drawTrack(ctx, layout, picker.names.length);
    picker.names.forEach((name, i) => drawRacer(ctx, {
        name,
        x: layout.startX,
        y: layout.trackY + i * layout.laneHeight + layout.laneHeight / 2,
        weight: picker.weightsEnabled ? (picker.weights[i] || 1) : 1,
        emoji: RACER_EMOJIS[i % RACER_EMOJIS.length],
        color: UI_COLORS[i % UI_COLORS.length]
    }, picker.weightsEnabled));
}

export function runRace(picker) {
    return new Promise(resolve => {
        const canvas = picker.raceCanvas;
        const ctx = picker.raceCtx;
        const { width, height } = picker.prepareCanvas(canvas, ctx);
        const racerEmojis = RACER_EMOJIS;
        const colors = UI_COLORS;
        
        const layout = getTrackLayout(width, height, picker.names.length);
        const { laneHeight, trackY, startX, finishX } = layout;
        const raceDistance = finishX - startX;
        
        const pickedIndex = picker.getWeightedRandomIndex();
        const picked = picker.names[pickedIndex];
        
        const racers = picker.names.map((name, i) => {
            const isPicked = i === pickedIndex;
            const baseSpeed = isPicked ? 0.38 : 0.40 + Math.random() * 0.03;

            const weight = picker.weightsEnabled ? (picker.weights[i] || 1) : 1;
            
            return {
                name,
                x: startX,
                y: trackY + i * laneHeight + laneHeight / 2,
                baseSpeed,
                currentSpeed: 0,
                emoji: racerEmojis[i % racerEmojis.length],
                color: colors[i % colors.length],
                finished: false,
                finishOrder: 0,
                weight: weight,
                speedVariations: Array.from({length: 30}, () => 0.95 + Math.random() * 0.1)
            };
        });
        
        let raceStarted = false;
        let countdown = 4;
        let raceFinished = false;
        let finishCounter = 0;
        let resolveQueued = false;
        let resultComplete = false;
        let resultAnimStarted = false;
        let resultProgress = 0;
        let resultStartX = 0;
        let resultStartY = 0;
        const startTime = Date.now();
        const pickedRacer = racers[pickedIndex];
        
        const animate = () => {
            if (picker.animationCancelled) {
                resolve(null);
                return;
            }
            if (resultComplete) {
                return;
            }
            
            const elapsed = Date.now() - startTime;
            
            ctx.clearRect(0, 0, width, height);
            drawTrack(ctx, layout, racers.length, elapsed, raceStarted);
            
            if (!raceStarted) {
                const countdownElapsed = elapsed / (1000 * picker.durationMultiplier);
                const currentCount = 3 - Math.floor(countdownElapsed);
                
                racers.forEach(racer => drawRacer(ctx, racer, picker.weightsEnabled));
                
                if (currentCount !== countdown && currentCount >= 0) {
                    countdown = currentCount;
                    if (!picker.animationCancelled) {
                        picker.sound.playCountdown(countdown);
                    }
                }
                
                if (currentCount < 0) {
                    raceStarted = true;
                } else {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(0, 0, width, height);
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 120px Poppins';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 10;
                    ctx.fillText(currentCount === 0 ? 'GO!' : currentCount.toString(), width / 2, height / 2);
                    ctx.restore();
                }
            } else {
                const speedFactor = (raceDistance / 100) / picker.durationMultiplier;
                
                racers.forEach((racer) => {
                    if (!racer.finished) {
                        const variationIndex = Math.floor(elapsed / 200) % racer.speedVariations.length;
                        const variation = racer.speedVariations[variationIndex];
                        racer.currentSpeed = racer.baseSpeed * variation * speedFactor;
                        
                        racer.x += racer.currentSpeed;
                        
                        if (racer.x >= finishX) {
                            racer.x = finishX;
                            racer.finished = true;
                            finishCounter++;
                            racer.finishOrder = finishCounter;
                        }
                    }
                    drawRacer(ctx, racer, picker.weightsEnabled);
                });
                
                if (finishCounter >= racers.length) {
                    raceFinished = true;
                }
            }
            
            if (raceFinished) {
                if (!resultAnimStarted) {
                    resultAnimStarted = true;
                    resultStartX = pickedRacer.x;
                    resultStartY = pickedRacer.y;
                }

                resultProgress = Math.min(1, resultProgress + 0.045);
                const easeOut = 1 - Math.pow(1 - resultProgress, 3);

                const centerX = width / 2;
                const centerY = height / 2 + 20;
                const animX = resultStartX + (centerX - resultStartX) * easeOut;
                const animY = resultStartY + (centerY - resultStartY) * easeOut;

                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
                ctx.fillRect(0, 0, width, height);

                // Bring the selected loser to center and turn their style gold.
                const noFlipEmojis = ['🚀'];
                const shouldFlip = !noFlipEmojis.includes(pickedRacer.emoji);
                const scale = 1;

                ctx.translate(animX, animY);
                ctx.scale(scale, scale);

                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.beginPath();
                ctx.ellipse(0, 15, 20, 8, 0, 0, Math.PI * 2);
                ctx.fill();

                const labelMetrics = drawEmojiBadge(ctx, 0, 0, pickedRacer.emoji, '#ffd700', 34, {
                    label: pickedRacer.name,
                    labelFontSize: 12,
                    labelPosition: 'bottom',
                    flipEmoji: shouldFlip
                });

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 48px Poppins';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const bannerY = animY + (labelMetrics.labelBottom + 28) * scale;
                ctx.fillText('🐌 LAST PLACE! 🐌', width / 2, bannerY);
                ctx.restore();

                if (!resolveQueued) {
                    resolveQueued = true;
                    setTimeout(() => {
                        resultComplete = true;
                        resolve(picked);
                    }, 2000);
                }
                requestAnimationFrame(animate);
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    });
}