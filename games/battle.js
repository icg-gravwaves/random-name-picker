import { UI_COLORS } from '../constants.js';

const FIGHTER_EMOJIS = ['🥷', '🦸', '🧟', '🧛', '🧙', '🧝', '🧞', '🤺', '🤼', '🥊', '🥋', '🤖', '👾', '👹', '👺'];

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
    
    const cx = width / 2;
    const cy = height / 2 + 20;
    const num = picker.names.length;
    const maxR = Math.min(width, height - 60) / 2 - 20;
    const ratio = Math.min(1, Math.max(0.1, num / 20));
    const R = Math.max(80, maxR * Math.sqrt(ratio));
    
    // Draw Arena
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    
    const maxRadius = Math.max(15, Math.min(35, (R * Math.PI) / num * 0.8));
    
    picker.names.forEach((name, i) => {
        const angle = (i / num) * Math.PI * 2;
        const x = cx + (R - maxRadius - 10) * Math.cos(angle);
        const y = cy + (R - maxRadius - 10) * Math.sin(angle);
        const emoji = FIGHTER_EMOJIS[i % FIGHTER_EMOJIS.length];
        
        ctx.font = `${maxRadius * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y);
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(8, maxRadius * 0.4)}px Poppins`;
        ctx.fillText(name, x, y + maxRadius + 5);
    });
}

export function runBattleRoyale(picker) {
    return new Promise(resolve => {
        const canvas = picker.battleCanvas;
        const ctx = picker.battleCtx;
        const { width, height } = picker.prepareCanvas(canvas, ctx);
        
        const winnerIndex = picker.getWeightedRandomIndex();
        const winner = picker.names[winnerIndex];
        
        const cx = width / 2;
        const cy = height / 2 + 20;
        const num = picker.names.length;
        const maxR = Math.min(width, height - 60) / 2 - 20;
        const initialRatio = Math.min(1, Math.max(0.1, num / 20));
        let currentR = Math.max(80, maxR * Math.sqrt(initialRatio));
        
        const maxRadius = Math.max(15, Math.min(35, (currentR * Math.PI) / num * 0.8));
        const TARGET_SPEED = 5 / (picker.durationMultiplier || 1);
        
        const contestants = picker.names.map((name, i) => {
            const angle = (i / num) * Math.PI * 2;
            const rAngle = Math.random() * Math.PI * 2;
            
            return {
                name,
                isWinner: name === winner,
                emoji: FIGHTER_EMOJIS[i % FIGHTER_EMOJIS.length],
                radius: maxRadius,
                originalRadius: maxRadius,
                health: 100,
                x: cx + (currentR - maxRadius - 10) * Math.cos(angle),
                y: cy + (currentR - maxRadius - 10) * Math.sin(angle),
                vx: Math.cos(rAngle) * TARGET_SPEED,
                vy: Math.sin(rAngle) * TARGET_SPEED,
                alive: true,
                deathTime: null
            };
        });
        
        const animate = () => {
            if (picker.animationCancelled) {
                resolve(null);
                return;
            }
            
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, width, height);
            
            const active = contestants.filter(c => c.alive);
            
            // Shrink circle based on active combatants
            const targetR = Math.max(60, maxR * Math.sqrt(initialRatio * (active.length / num)));
            currentR += (targetR - currentR) * 0.02; // Smoothly close in
            
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 24px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(`⚔️ BATTLE ARENA - ${active.length} Remaining ⚔️`, width / 2, 30);
            
            // Draw Arena
            ctx.beginPath();
            ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fill();
            
            const takeDamage = (c) => {
                if (c.isWinner && c.health <= 20) {
                    // Keep winner at minimum 2 hits of health so they can outlive the final opponent
                    c.health = 20;
                    return;
                }
                c.health -= 10;
                if (c.health <= 0 && c.alive) {
                    c.alive = false;
                    c.deathTime = Date.now();
                }
            };
            
            // Apply physics: Move, Collide, Resolve
            active.forEach(c => {
                c.x += c.vx;
                c.y += c.vy;
                
                // Constant speed enforcement
                const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
                if (speed > 0.001) {
                    c.vx = (c.vx / speed) * TARGET_SPEED;
                    c.vy = (c.vy / speed) * TARGET_SPEED;
                } else {
                    const rAngle = Math.random() * Math.PI * 2;
                    c.vx = Math.cos(rAngle) * TARGET_SPEED;
                    c.vy = Math.sin(rAngle) * TARGET_SPEED;
                }
                
                // Wall collisions
                const dx = c.x - cx;
                const dy = c.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist + c.radius > currentR) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    
                    // Push inside
                    c.x = cx + (currentR - c.radius) * nx;
                    c.y = cy + (currentR - c.radius) * ny;
                    
                    // Reflect velocity
                    const dot = c.vx * nx + c.vy * ny;
                    if (dot > 0) {
                        c.vx = c.vx - 2 * dot * nx;
                        c.vy = c.vy - 2 * dot * ny;
                        c.vx += (Math.random() - 0.5) * 0.5; // add noise
                        c.vy += (Math.random() - 0.5) * 0.5;
                    }
                }
            });
            
            // Inter-particle collisions
            for (let i = 0; i < active.length; i++) {
                for (let j = i + 1; j < active.length; j++) {
                    const c1 = active[i];
                    const c2 = active[j];
                    
                    const dx = c2.x - c1.x;
                    const dy = c2.y - c1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = c1.radius + c2.radius;
                    
                    if (dist < minDist && dist > 0.001) {
                        // Resolve overlap
                        const overlap = minDist - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        
                        c1.x -= nx * overlap / 2;
                        c1.y -= ny * overlap / 2;
                        c2.x += nx * overlap / 2;
                        c2.y += ny * overlap / 2;
                        
                        // Elastic bounce
                        const rvx = c2.vx - c1.vx;
                        const rvy = c2.vy - c1.vy;
                        const velAlongNormal = rvx * nx + rvy * ny;
                        
                        if (velAlongNormal < 0) {
                            const jImpulse = -velAlongNormal; // Assuming equal mass
                            const impulseX = jImpulse * nx;
                            const impulseY = jImpulse * ny;
                            
                            c1.vx -= impulseX;
                            c1.vy -= impulseY;
                            c2.vx += impulseX;
                            c2.vy += impulseY;
                            
                            c1.vx += (Math.random() - 0.5) * 0.5; // add noise
                            c1.vy += (Math.random() - 0.5) * 0.5;
                        }
                        
                        takeDamage(c1);
                        takeDamage(c2);
                    }
                }
            }
            
            // Render Draw
            contestants.filter(c => !c.alive).forEach(c => {
                if (!c.deathTime) return;
                const timeSinceDeath = Date.now() - c.deathTime;
                if (timeSinceDeath > 2000) return;
                
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.globalAlpha = 0.5 * (1 - timeSinceDeath / 2000);
                
                ctx.font = `${c.radius * 1.5}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💀', 0, 0);
                
                ctx.fillStyle = '#fff';
                const fontSize = Math.max(8, c.originalRadius * 0.4);
                ctx.font = `bold ${fontSize}px Poppins`;
                ctx.fillText(c.name, 0, c.radius + 5);
                
                ctx.restore();
            });
            
            active.forEach(c => {
                ctx.save();
                ctx.translate(c.x, c.y);
                
                ctx.font = `${c.radius * 1.5}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.emoji, 0, 0);
                
                ctx.fillStyle = '#fff';
                const fontSize = Math.max(8, c.originalRadius * 0.4);
                ctx.font = `bold ${fontSize}px Poppins`;
                ctx.fillText(c.name, 0, c.radius + 5);
                
                const barWidth = c.radius * 1.5;
                const barHeight = 4;
                const barY = c.radius + fontSize / 2 + 8;
                
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
                
                const healthRatio = Math.max(0, c.health) / 100;
                if (healthRatio > 0.5) ctx.fillStyle = '#2ecc71';
                else if (healthRatio > 0.25) ctx.fillStyle = '#f1c40f';
                else ctx.fillStyle = '#e74c3c';
                
                ctx.fillRect(-barWidth / 2, barY, barWidth * healthRatio, barHeight);
                
                ctx.restore();
            });
            
            if (active.length <= 1) {
                const winnerContestant = active[0] || contestants.find(c => c.isWinner);
                
                ctx.save();
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 30;
                ctx.fillStyle = '#ffd700';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 36px Poppins';
                ctx.fillText('👑 SURVIVOR! 👑', cx, cy - 60);
                ctx.font = '64px Arial';
                ctx.fillText(winnerContestant.emoji, cx, cy);
                ctx.font = 'bold 28px Poppins';
                ctx.fillText(winnerContestant.name, cx, cy + 60);
                ctx.restore();
                setTimeout(() => resolve(winner), 2000);
                return;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    });
}