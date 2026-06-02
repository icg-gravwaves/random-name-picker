import { UI_COLORS } from '../constants.js';
import { drawEmojiBadgeWithLabel } from './emoji-badge.js';

const BUGS = ['🪳', '🐜', '🦗', '🪲', '🪰', '🦟', '🕷️', '🐛'];

export function drawSpotlightPreview(picker) {
    if (picker.names.length === 0) return;
    
    const canvas = picker.spotlightCanvas;
    const ctx = picker.spotlightCtx;
    const { width, height } = picker.prepareCanvas(canvas, ctx);
    const colors = UI_COLORS;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    const cols = Math.ceil(Math.sqrt(picker.names.length));
    const rows = Math.ceil(picker.names.length / cols);
    const cellWidth = (width - 60) / cols;
    const cellHeight = (height - 80) / rows;
    
    // All names fully visible before the animation starts
    picker.names.forEach((name, i) => {
        const x = 30 + (i % cols) * cellWidth + cellWidth / 2;
        const y = 40 + Math.floor(i / cols) * cellHeight + cellHeight / 2;
        const weight = picker.weightsEnabled ? (picker.weights[i] || 1) : 1;
        const fontSize = Math.round(16 * (1 + (weight - 1) * 0.3));
        const bugSize = Math.round(fontSize * 2.4);
        const bug = BUGS[i % BUGS.length];
        const color = colors[i % colors.length];
        
        drawEmojiBadgeWithLabel(ctx, {
            x,
            y,
            emoji: bug,
            color,
            emojiSize: bugSize,
            label: name,
            labelFontSize: fontSize,
            labelPosition: 'bottom'
        });
    });
}

export function runSpotlight(picker) {
    return new Promise(resolve => {
        const canvas = picker.spotlightCanvas;
        const ctx = picker.spotlightCtx;
        const { width, height } = picker.prepareCanvas(canvas, ctx);
        
        const winnerIndex = picker.getWeightedRandomIndex();
        const winner = picker.names[winnerIndex];
        const colors = UI_COLORS;
        
        const BASE_SPEED = 2.5;
        const AWARENESS_RADIUS = 160;
        const SPOTLIGHT_RADIUS = 115;
        
        const cols = Math.ceil(Math.sqrt(picker.names.length));
        const rows = Math.ceil(picker.names.length / cols);
        const cellWidth = (width - 80) / cols;
        const cellHeight = (height - 80) / rows;
        
        // Each name gets a position, velocity, and speed derived from weight
        const namePositions = picker.names.map((name, i) => {
            const weight = picker.weightsEnabled ? (picker.weights[i] || 1) : 1;
            const fontScale = 1 + (weight - 1) * 0.3;
            const fontSize = Math.round(16 * fontScale);
            // Heavier names are slower — easier to catch, reflecting higher selection probability
            const speed = BASE_SPEED / Math.sqrt(weight);
            const angle = Math.random() * Math.PI * 2;
            
            return {
                name,
                x: 40 + (i % cols) * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 20,
                y: 40 + Math.floor(i / cols) * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed * 0.5,
                vy: Math.sin(angle) * speed * 0.5,
                speed,
                isWinner: name === winner,
                fontSize,
                color: colors[i % colors.length],
                bug: BUGS[i % BUGS.length],
                // Cockroach reaction: how long the light must be on them before they flee
                reactionDelay: 150 + Math.random() * 300,
                scaredSince: null,
            };
        });
        
        const winnerPos = namePositions.find(p => p.isWinner);
        
        let spotlightX = width / 2;
        let spotlightY = height / 2;
        // Spotlight chases a name object directly — never wastes time on blank space
        let spotlightTargetPos = namePositions[Math.floor(Math.random() * namePositions.length)];
        let nextRetargetTime = 0;
        
        const sweepDuration = (4000 + Math.random() * 3000) * picker.durationMultiplier;
        const catchDuration = 1500 * picker.durationMultiplier;
        
        const startTime = Date.now();
        const presentDuration = 900 * picker.durationMultiplier;
        let phase = 'sweeping';
        let catchStart = 0;
        let lockedTime = 0;
        let presentStart = 0;
        let winnerStartX = 0;
        let winnerStartY = 0;
        let announced = false;
        
        const animate = () => {
            if (picker.animationCancelled) {
                resolve(null);
                return;
            }
            
            const now = Date.now();
            const elapsed = now - startTime;
            
            // --- Update spotlight position ---
            if (phase === 'sweeping') {
                if (now > nextRetargetTime) {
                    // Pick a different name to chase each time
                    const others = namePositions.filter(p => p !== spotlightTargetPos);
                    spotlightTargetPos = others.length > 0
                        ? others[Math.floor(Math.random() * others.length)]
                        : namePositions[0];
                    nextRetargetTime = now + 1000 + Math.random() * 1500;
                }
                // Track the target name's live position each frame
                spotlightX += (spotlightTargetPos.x - spotlightX) * 0.04;
                spotlightY += (spotlightTargetPos.y - spotlightY) * 0.04;
                
                if (elapsed > sweepDuration) {
                    phase = 'catching';
                    catchStart = now;
                }
            } else if (phase === 'catching') {
                const catchProgress = Math.min(1, (now - catchStart) / catchDuration);
                const t = 0.05 + catchProgress * 0.12;
                spotlightX += (winnerPos.x - spotlightX) * t;
                spotlightY += (winnerPos.y - spotlightY) * t;
                
                if (now - catchStart > catchDuration) {
                    phase = 'locked';
                    lockedTime = now;
                    spotlightX = winnerPos.x;
                    spotlightY = winnerPos.y;
                }
            } else if (phase === 'locked') {
                spotlightX = winnerPos.x;
                spotlightY = winnerPos.y;
                if (now - lockedTime > 500) {
                    phase = 'presenting';
                    presentStart = now;
                    winnerStartX = winnerPos.x;
                    winnerStartY = winnerPos.y;
                }
            } else if (phase === 'presenting') {
                const pp = Math.min(1, (now - presentStart) / presentDuration);
                const eased = 1 - Math.pow(1 - pp, 3);
                winnerPos.x = winnerStartX + (width / 2 - winnerStartX) * eased;
                winnerPos.y = winnerStartY + (height / 2 - winnerStartY) * eased;
                spotlightX = winnerPos.x;
                spotlightY = winnerPos.y;
            }
            
            // --- Update name positions (flee behaviour) ---
            namePositions.forEach(pos => {
                if ((phase === 'locked' || phase === 'presenting') && pos.isWinner) return;
                
                const catchProgress = phase === 'catching'
                    ? Math.min(1, (now - catchStart) / catchDuration)
                    : (phase === 'locked' ? 1 : 0);
                
                // Winner gradually stops fleeing as spotlight homes in
                const fleeMultiplier = pos.isWinner ? Math.max(0, 1 - catchProgress * 1.5) : 1;
                
                if (fleeMultiplier > 0) {
                    const dx = pos.x - spotlightX;
                    const dy = pos.y - spotlightY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < AWARENESS_RADIUS) {
                        // Cockroach reaction delay: start timer when light first touches awareness zone
                        if (pos.scaredSince === null) pos.scaredSince = now;
                        const reacted = (now - pos.scaredSince) > pos.reactionDelay;
                        if (reacted && dist > 1) {
                            const strength = (1 - dist / AWARENESS_RADIUS) * 4 * fleeMultiplier;
                            pos.vx += (dx / dist) * strength;
                            pos.vy += (dy / dist) * strength;
                        }
                    } else {
                        // Light has moved away — reset reaction timer
                        pos.scaredSince = null;
                    }
                    
                    // Random wander so names keep moving even when safe
                    pos.vx += (Math.random() - 0.5) * 0.4;
                    pos.vy += (Math.random() - 0.5) * 0.4;
                    
                    // Enforce speed limit (heavier names have lower cap)
                    const spd = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy);
                    const maxSpd = pos.speed * fleeMultiplier;
                    if (spd > maxSpd && spd > 0) {
                        pos.vx = (pos.vx / spd) * maxSpd;
                        pos.vy = (pos.vy / spd) * maxSpd;
                    }
                }
                
                // Damping — winner decelerates naturally when fleeMultiplier reaches 0
                pos.vx *= 0.94;
                pos.vy *= 0.94;
                
                pos.x += pos.vx;
                pos.y += pos.vy;
                
                // Bounce off walls
                const margin = 35;
                if (pos.x < margin)          { pos.x = margin;          pos.vx =  Math.abs(pos.vx) * 0.8; }
                if (pos.x > width - margin)  { pos.x = width - margin;  pos.vx = -Math.abs(pos.vx) * 0.8; }
                if (pos.y < margin)          { pos.y = margin;          pos.vy =  Math.abs(pos.vy) * 0.8; }
                if (pos.y > height - margin) { pos.y = height - margin; pos.vy = -Math.abs(pos.vy) * 0.8; }
            });
            
            // --- Draw ---
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, width, height);
            
            if (phase === 'presenting') {
                const pp = Math.min(1, (now - presentStart) / presentDuration);
                
                if (pp < 1) {
                    // Other names visible in background — overlay fades to black as winner travels
                    namePositions.forEach(pos => {
                        if (pos.isWinner) return;
                        const bugSize = Math.round(pos.fontSize * 2.4);
                        drawEmojiBadgeWithLabel(ctx, {
                            x: pos.x,
                            y: pos.y,
                            emoji: pos.bug,
                            color: pos.color,
                            emojiSize: bugSize,
                            label: pos.name,
                            labelFontSize: pos.fontSize,
                            labelPosition: 'bottom'
                        });
                    });
                    
                    const overlayAlpha = 0.72 + pp * 0.28;
                    ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
                    ctx.fillRect(0, 0, width, height);
                    
                    // Winner drawn bright on top, growing as it moves to centre
                    const winnerFontSize = winnerPos.fontSize;
                    const winnerBugSize = Math.round(winnerFontSize * 2.4);
                    drawEmojiBadgeWithLabel(ctx, {
                        x: winnerPos.x,
                        y: winnerPos.y,
                        emoji: winnerPos.bug,
                        color: '#ffd700',
                        emojiSize: winnerBugSize,
                        label: winner,
                        labelFontSize: winnerFontSize,
                        labelPosition: 'bottom'
                    });
                } else {
                    // Presenting complete: winner centred large, announcement below
                    const finalFontSize = winnerPos.fontSize;
                    const finalBugSize = Math.round(finalFontSize * 2.4);
                    const nameCY = height / 2;
                    const labelMetrics = drawEmojiBadgeWithLabel(ctx, {
                        x: width / 2,
                        y: nameCY,
                        emoji: winnerPos.bug,
                        color: '#ffd700',
                        emojiSize: finalBugSize,
                        label: winner,
                        labelFontSize: finalFontSize,
                        labelPosition: 'bottom'
                    });
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 22px Poppins';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🎉 CAUGHT! 🎉', width / 2, labelMetrics.labelBottom + 22);
                    
                    if (!announced) {
                        announced = true;
                        setTimeout(() => {
                            resolve(winner);
                        }, 1000);
                    }
                }
            } else {
                // sweeping / catching / locked — names at full color, overlay provides dimming
                namePositions.forEach(pos => {
                    const bugSize = Math.round(pos.fontSize * 2.4);
                    drawEmojiBadgeWithLabel(ctx, {
                        x: pos.x,
                        y: pos.y,
                        emoji: pos.bug,
                        color: pos.color,
                        emojiSize: bugSize,
                        label: pos.name,
                        labelFontSize: pos.fontSize,
                        labelPosition: 'bottom'
                    });
                });
                
                // Dim overlay with spotlight hole
                const currentRadius = phase === 'locked' ? 75 : SPOTLIGHT_RADIUS;
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, width, height);
                ctx.arc(spotlightX, spotlightY, currentRadius, 0, Math.PI * 2, true);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
                ctx.fill('evenodd');
                ctx.restore();
                
                // Subtle warm glow inside spotlight
                ctx.save();
                ctx.beginPath();
                ctx.arc(spotlightX, spotlightY, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 200, 0.07)';
                ctx.fill();
                ctx.restore();
                
                // Bright names inside spotlight (clipped to circle)
                ctx.save();
                ctx.beginPath();
                ctx.arc(spotlightX, spotlightY, currentRadius, 0, Math.PI * 2);
                ctx.clip();
                namePositions.forEach(pos => {
                    const bugSize = Math.round(pos.fontSize * 2.4);
                    drawEmojiBadgeWithLabel(ctx, {
                        x: pos.x,
                        y: pos.y,
                        emoji: pos.bug,
                        color: pos.color,
                        emojiSize: bugSize,
                        label: pos.name,
                        labelFontSize: pos.fontSize,
                        labelPosition: 'bottom'
                    });
                });
                ctx.restore();
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    });
}