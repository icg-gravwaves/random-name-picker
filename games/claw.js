import { UI_COLORS } from '../constants.js';
import { drawEmojiBadge } from './emoji-badge.js';

export const ANIMAL_EMOJIS = ['🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🐰', '🦊', '🐶', '🐱', '🐮', '🐔', '🐧', '🐺', '🐹', '🦉', '🐦', '🐤', '🐙', '🐝', '🐢'];

const CLAW_GAME_BADGE_SIZE = 46;
const CLAW_GAME_LABEL_SIZE = 13;
const CLAW_PREVIEW_BADGE_SIZE = CLAW_GAME_BADGE_SIZE;
const CLAW_PREVIEW_LABEL_SIZE = CLAW_GAME_LABEL_SIZE;

export function drawClawPreview(picker) {
    if (picker.names.length === 0) return;
    
    const canvas = picker.clawCanvas;
    const ctx = picker.clawCtx;
    const { width, height } = picker.prepareCanvas(canvas, ctx);
    
    ctx.fillStyle = '#2d1f3d';
    ctx.fillRect(0, 0, width, 80);
    ctx.fillStyle = '#3d2f4d';
    ctx.fillRect(0, height - 150, width, 150);
    
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(10, 85, width - 20, height - 240);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(width - 120, 80);
    ctx.lineTo(width - 40, 80);
    ctx.lineTo(width - 60, height - 30);
    ctx.lineTo(width - 100, height - 30);
    ctx.closePath();
    ctx.fill();
    
    const weightedAnimals = picker.buildWeightedArray((name, i) => ({
        name,
        emoji: ANIMAL_EMOJIS[i % ANIMAL_EMOJIS.length],
        color: UI_COLORS[i % UI_COLORS.length]
    }));
    
    const pitWidth = width - 160;
    const animalSize = 45;
    const maxPerRow = Math.floor(pitWidth / animalSize);
    const totalAnimals = weightedAnimals.length;
    const numRows = Math.ceil(totalAnimals / maxPerRow);
    
    weightedAnimals.forEach((animal, i) => {
        const rowIndex = Math.floor(i / maxPerRow);
        const colIndex = i % maxPerRow;
        const itemsInRow = rowIndex < numRows - 1 ? maxPerRow : ((totalAnimals - 1) % maxPerRow) + 1;
        const rowSpacing = pitWidth / itemsInRow;
        
        const x = 40 + colIndex * rowSpacing + rowSpacing / 2;
        const y = height - 70 - rowIndex * 45;
        
        ctx.save();
        ctx.translate(x, y);
        drawEmojiBadge(ctx, 0, 0, animal.emoji, animal.color, CLAW_PREVIEW_BADGE_SIZE, {
            label: animal.name,
            labelFontSize: CLAW_PREVIEW_LABEL_SIZE,
            labelPosition: 'bottom'
        });
        
        ctx.restore();
    });
    
    const clawX = width / 2;
    const clawY = 50;
    
    ctx.beginPath();
    ctx.moveTo(clawX, 0);
    ctx.lineTo(clawX, clawY - 50);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(clawX, clawY);
    ctx.fillStyle = '#888';
    ctx.fillRect(-8, -50, 16, 50);
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.save();
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 35);
    ctx.lineTo(-10, 45);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(0.4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 35);
    ctx.lineTo(10, 45);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    
    ctx.fillStyle = '#444';
    ctx.fillRect(20, 40, width - 40, 8);
}

export function runClawMachine(picker) {
    return new Promise(resolve => {
        const canvas = picker.clawCanvas;
        const ctx = picker.clawCtx;
        const { width, height } = picker.prepareCanvas(canvas, ctx);
        
        const weightedAnimals = picker.buildWeightedArray((name, i) => ({
            name,
            originalIndex: i,
            emoji: ANIMAL_EMOJIS[i % ANIMAL_EMOJIS.length],
            color: UI_COLORS[i % UI_COLORS.length]
        }));
        
        const pitWidth = width - 160;
        const animalSize = 45;
        const maxPerRow = Math.floor(pitWidth / animalSize);
        
        const totalAnimals = weightedAnimals.length;
        const numRows = Math.ceil(totalAnimals / maxPerRow);
        
        const animals = weightedAnimals.map((animalData, i) => {
            const rowIndex = Math.floor(i / maxPerRow);
            const colIndex = i % maxPerRow;
            const itemsInRow = rowIndex < numRows - 1 ? maxPerRow : ((totalAnimals - 1) % maxPerRow) + 1;
            const rowSpacing = pitWidth / itemsInRow;
            
            const x = 40 + colIndex * rowSpacing + rowSpacing / 2;
            const y = height - 70 - rowIndex * 50;
            
            return {
                name: animalData.name,
                originalIndex: animalData.originalIndex,
                x,
                y,
                radius: 22,
                emoji: animalData.emoji,
                color: animalData.color,
                vx: 0,
                vy: 0
            };
        });
        
        const claw = {
            x: width / 2,
            y: 50,
            openAngle: 0.4,
            state: 'moving',
            targetX: 0,
            grabbedAnimal: null
        };
        
        let targetAnimalIndex = Math.floor(Math.random() * animals.length);
        let targetAnimal = animals[targetAnimalIndex];
        let winner = targetAnimal.name;
        claw.targetX = targetAnimal.x;
        
        if (picker.firstClawGame) {
            picker.firstClawGame = false;
        }
        
        let fumbleCount = 0;
        const fumbleRoll = Math.random();
        if (fumbleRoll < 1/6) {
            fumbleCount = 0;
        } else if (fumbleRoll < 3/6) {
            fumbleCount = 1;
        } else if (fumbleRoll < 5/6) {
            fumbleCount = 2;
        } else {
            fumbleCount = 3;
        }
        const startTime = Date.now();
        let grabQueued = false;
        
        const drawClaw = (x, y, open, holding) => {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, y - 50);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.save();
            ctx.translate(x, y);
            
            ctx.fillStyle = '#888';
            ctx.fillRect(-8, -50, 16, 50);
            
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            
            const angle = open ? 0.5 : 0.15;
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            
            ctx.save();
            ctx.rotate(-angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 35);
            ctx.lineTo(-10, 45);
            ctx.stroke();
            ctx.restore();
            
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 35);
            ctx.lineTo(10, 45);
            ctx.stroke();
            ctx.restore();
            
            ctx.restore();
        };
        
        const animate = () => {
            if (picker.animationCancelled) {
                resolve(null);
                return;
            }
            
            ctx.clearRect(0, 0, width, height);
            
            ctx.fillStyle = '#2d1f3d';
            ctx.fillRect(0, 0, width, 80);
            ctx.fillStyle = '#3d2f4d';
            ctx.fillRect(0, height - 150, width, 150);
            
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(10, 85, width - 20, height - 240);
            
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.moveTo(width - 120, 80);
            ctx.lineTo(width - 40, 80);
            ctx.lineTo(width - 60, height - 30);
            ctx.lineTo(width - 100, height - 30);
            ctx.closePath();
            ctx.fill();
            
            const speedFactor = 1 / picker.durationMultiplier;

            animals.forEach((animal, i) => {
                if (animal !== claw.grabbedAnimal) {
                    ctx.save();
                    ctx.translate(animal.x, animal.y);
                    drawEmojiBadge(ctx, 0, 0, animal.emoji, animal.color, CLAW_GAME_BADGE_SIZE, {
                        label: animal.name,
                        labelFontSize: CLAW_GAME_LABEL_SIZE,
                        labelPosition: 'bottom'
                    });
                    ctx.restore();
                }
            });
            
            switch (claw.state) {
                case 'moving':
                    const moveSpeed = 3 * speedFactor;
                    if (Math.abs(claw.x - claw.targetX) > moveSpeed) {
                        claw.x += claw.targetX > claw.x ? moveSpeed : -moveSpeed;
                    } else {
                        claw.x = claw.targetX;
                        claw.state = 'descending';
                    }
                    break;
                    
                case 'descending':
                    claw.y += 4 * speedFactor;
                    if (claw.y >= targetAnimal.y - 30) {
                        claw.state = 'grabbing';
                        claw.openAngle = 0.5;
                        if (!grabQueued) {
                            grabQueued = true;
                        }
                        setTimeout(() => {
                            claw.openAngle = 0.15;
                            if (fumbleCount > 0) {
                                fumbleCount--;
                                setTimeout(() => {
                                    claw.openAngle = 0.5;
                                    claw.state = 'ascending';
                                }, 300 * picker.durationMultiplier);
                            } else {
                                claw.grabbedAnimal = targetAnimal;
                                claw.state = 'ascending';
                            }
                        }, 400 * picker.durationMultiplier);
                    }
                    break;
                    
                case 'ascending':
                    claw.y -= 6 * speedFactor;
                    if (claw.grabbedAnimal) {
                        claw.grabbedAnimal.x = claw.x;
                        claw.grabbedAnimal.y = claw.y + 50;
                    }
                    if (claw.y <= 50) {
                        claw.y = 50;
                        if (claw.grabbedAnimal) {
                            claw.state = 'moveToChute';
                        } else {
                            targetAnimalIndex = Math.floor(Math.random() * animals.length);
                            targetAnimal = animals[targetAnimalIndex];
                            winner = targetAnimal.name;
                            claw.targetX = targetAnimal.x;
                            claw.openAngle = 0.5;
                            claw.state = 'moving';
                        }
                    }
                    break;
                    
                case 'moveToChute':
                    const chuteX = width - 80;
                    if (claw.x < chuteX) {
                        claw.x += 4 * speedFactor;
                        claw.grabbedAnimal.x = claw.x;
                    } else {
                        claw.state = 'dropping';
                        claw.openAngle = 0.5;
                        claw.grabbedAnimal.vy = 2 * speedFactor;
                    }
                    break;
                    
                case 'dropping':
                    if (claw.grabbedAnimal) {
                        claw.grabbedAnimal.vy += 0.5 * speedFactor;
                        claw.grabbedAnimal.y += claw.grabbedAnimal.vy;
                        
                        if (claw.grabbedAnimal.y > height - 50) {
                            claw.state = 'done';
                        }
                    }
                    break;
            }
            
            if (claw.grabbedAnimal) {
                ctx.save();
                ctx.translate(claw.grabbedAnimal.x, claw.grabbedAnimal.y);
                drawEmojiBadge(ctx, 0, 0, claw.grabbedAnimal.emoji, claw.grabbedAnimal.color, CLAW_GAME_BADGE_SIZE, {
                    label: claw.grabbedAnimal.name,
                    labelFontSize: CLAW_GAME_LABEL_SIZE,
                    labelPosition: 'bottom'
                });
                ctx.restore();
            }
            
            drawClaw(claw.x, claw.y, claw.openAngle > 0.3, claw.grabbedAnimal !== null);
            
            ctx.fillStyle = '#444';
            ctx.fillRect(20, 40, width - 40, 8);
            
            if (claw.state !== 'done') {
                requestAnimationFrame(animate);
            } else {
                setTimeout(() => resolve(winner), 800);
            }
        };
        
        animate();
    });
}