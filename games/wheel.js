import { UI_COLORS } from '../constants.js';

export function getSliceAngles(picker) {
    if (picker.names.length === 0) return [];
    
    const personCounts = picker.names.map((name, i) => {
        const weight = picker.weightsEnabled ? (picker.weights[i] || 1) : 1;
        return { name, index: i, weight };
    });
    
    let finalSegments = picker.names.map((name, i) => ({ name, index: i }));
    
    personCounts.forEach((p, i) => {
        let extra = p.weight - 1;
        let currentPos = i;
        for (let n = 1; n <= extra; n++) {
            currentPos += 2;
            if (currentPos > finalSegments.length) {
                currentPos = currentPos % finalSegments.length;
            }
            finalSegments.splice(currentPos, 0, { name: p.name, index: p.index });
        }
    });
    
    const minSegments = 8;
    if (finalSegments.length > 0 && finalSegments.length < minSegments) {
        const originalSegments = [...finalSegments];
        while (finalSegments.length < minSegments) {
            finalSegments.push(...originalSegments);
        }
    }

    const angles = [];
    const sliceAngle = (2 * Math.PI) / finalSegments.length;
    let currentAngle = 0;
    
    finalSegments.forEach(seg => {
        angles.push({
            start: currentAngle,
            end: currentAngle + sliceAngle,
            name: seg.name,
            index: seg.index
        });
        currentAngle += sliceAngle;
    });

    return angles;
}

export function drawWheel(picker, rotation = 0) {
    const canvas = picker.wheelCanvas;
    const ctx = picker.wheelCtx;
    const dpr = window.devicePixelRatio || 1;
    const size = picker.wheelSize || 400;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = centerX - 10;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (picker.names.length === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#334155';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Add names to spin!', centerX, centerY);
        ctx.restore();
        return;
    }

    const sliceAngles = getSliceAngles(picker);
    const colors = UI_COLORS;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);

    sliceAngles.forEach((slice) => {
        const startAngle = slice.start;
        const endAngle = slice.end;
        const sliceAngle = endAngle - startAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[slice.index % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Poppins';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(slice.name, radius - 25, 0);
        ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.restore();
}

export function spinWheel(picker) {
    return new Promise(resolve => {
        const sliceAngles = getSliceAngles(picker);
        const spins = 5 + Math.random() * 3;
        const randomExtra = Math.random() * 2 * Math.PI;
        const totalRotation = spins * 2 * Math.PI + randomExtra;
        
        const duration = 4000 * picker.durationMultiplier;
        const startTime = Date.now();
        
        const animate = () => {
            if (picker.animationCancelled) {
                resolve(null);
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentRotation = totalRotation * eased;
            
            drawWheel(picker, currentRotation);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                let pointerAngle = (-Math.PI / 2 - totalRotation) % (2 * Math.PI);
                if (pointerAngle < 0) pointerAngle += 2 * Math.PI;
                
                let winner = picker.names[0];
                for (const slice of sliceAngles) {
                    if (pointerAngle >= slice.start && pointerAngle < slice.end) {
                        winner = slice.name;
                        break;
                    }
                }
                resolve(winner);
            }
        };
        
        animate();
    });
}