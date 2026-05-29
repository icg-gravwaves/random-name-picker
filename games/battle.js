import { UI_COLORS } from '../constants.js';

export function drawBattlePreview(picker) {
    if (picker.names.length === 0) return;
    
    const canvas = picker.battleCanvas;
    const ctx = picker.battleCtx;
    const { width, height } = picker.prepareCanvas(canvas, ctx);
    const colors = UI_COLORS;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 24px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText(`⚔️ BATTLE ROYALE - ${picker.names.length} Contestants ⚔️`, width / 2, 30);
    
    const cols = Math.ceil(Math.sqrt(picker.names.length));
    const rows = Math.ceil(picker.names.length / cols);
    const cellWidth = (width - 40) / cols;
    const cellHeight = (height - 100) / rows;
    
    picker.names.forEach((name, i) => {
        const x = 20 + (i % cols) * cellWidth + cellWidth / 2;
        const y = 50 + Math.floor(i / cols) * cellHeight + cellHeight / 2;
        
        const lives = picker.weightsEnabled ? (picker.weights[i] || 1) : 1;
        
        ctx.save();
        ctx.translate(x, y);
        
        const boxWidth = cellWidth - 10;
        const boxHeight = cellHeight - 10;
        ctx.fillStyle = colors[i % colors.length];
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 8);
        ctx.fill();
        ctx.stroke();
        
        if (lives > 0) {
            const heartSize = Math.min(12, cellWidth / 8);
            const heartsX = boxWidth/2 - 4;
            const heartsY = -boxHeight/2 + 4;
            
            ctx.font = `${heartSize}px Arial`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            
            let heartStr = '';
            for (let h = 0; h < lives; h++) {
                heartStr = '❤️' + heartStr;
            }
            ctx.fillText(heartStr, heartsX, heartsY);
        }
        
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.min(16, cellWidth / 6)}px Poppins`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 0, 0);
        
        ctx.restore();
    });
}

export function runBattleRoyale(picker) {
    return new Promise(resolve => {
        const canvas = picker.battleCanvas;
        const ctx = picker.battleCtx;
        const { width, height } = picker.prepareCanvas(canvas, ctx);
        
        const winnerIndex = picker.getWeightedRandomIndex();
        const winner = picker.names[winnerIndex];
        
        const cols = Math.ceil(Math.sqrt(picker.names.length));
        const rows = Math.ceil(picker.names.length / cols);
        const cellWidth = (width - 40) / cols;
        const cellHeight = (height - 100) / rows;
        
        const contestants = picker.names.map((name, i) => {
            const lives = picker.weightsEnabled ? (picker.weights[i] || 1) : 1;
            
            return {
                name,
                x: 20 + (i % cols) * cellWidth + cellWidth / 2,
                y: 50 + Math.floor(i / cols) * cellHeight + cellHeight / 2,
                alive: true,
                opacity: 1,
                scale: 1,
                maxLives: lives,
                lives: lives,
                eliminated: false,
                eliminationTime: 0,
                lastHitTime: 0,
                isWinner: name === winner
            };
        });
        
        let lastHitTime = 0;
        let baseInterval = 600 * picker.durationMultiplier;
        const startTime = Date.now();
        
        const colors = UI_COLORS;
        
        const animate = () => {
            if (picker.animationCancelled) {
                resolve(null);
                return;
            }
            
            const elapsed = Date.now() - startTime;
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 24px Poppins';
            ctx.textAlign = 'center';
            const aliveCount = contestants.filter(c => c.alive).length;
            ctx.fillText(`⚔️ BATTLE ROYALE - ${aliveCount} Remaining ⚔️`, width / 2, 30);
            
            const aliveTargets = contestants.filter(c => c.alive && !c.isWinner);
            
            if (aliveTargets.length > 0) {
                const progress = 1 - (aliveTargets.length / (contestants.length - 1));
                const interval = Math.max(80, baseInterval * (1 - progress * 0.85));
                
                if (elapsed - lastHitTime > interval) {
                    const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
                    target.lives--;
                    target.lastHitTime = elapsed;
                    
                    if (target.lives <= 0) {
                        target.alive = false;
                        target.eliminated = true;
                        target.eliminationTime = elapsed;
                    }
                    
                    lastHitTime = elapsed;
                }
            }
            
            contestants.forEach((c, i) => {
                if (c.eliminated) {
                    const timeSinceElim = elapsed - c.eliminationTime;
                    c.opacity = Math.max(0, 1 - timeSinceElim / 500);
                    c.scale = Math.max(0, 1 - timeSinceElim / 500);
                }
                
                if (c.opacity <= 0) return;
                
                ctx.save();
                // ... similarly adapted inner loop omitting identical standard canvas rendering setup
                ctx.restore();
            });
            
            if (aliveCount === 1) {
                const winnerContestant = contestants.find(c => c.isWinner);
                
                ctx.save();
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 30;
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 28px Poppins';
                ctx.textAlign = 'center';
                ctx.fillText('👑 SURVIVOR! 👑', width / 2, height - 40);
                ctx.restore();
                setTimeout(() => resolve(winner), 1500);
                return;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    });
}