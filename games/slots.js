import { SLOT_ITEM_HEIGHT, UI_COLORS } from '../constants.js';
import { getSliceAngles } from './wheel.js';

const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '7️⃣', '💎', '⭐', '🍀'];
const MAX_JEOPARDY_MISSES = 3;
// Conditional success chances produce a 20%/30%/30%/20% finish distribution.
const MATCH_PROBABILITIES = [0.2, 0.375, 0.6, 1];

function buildNameVisual(index, name = '') {
    return {
        name,
        nameIndex: index,
        text: SLOT_SYMBOLS[index % SLOT_SYMBOLS.length],
        color: UI_COLORS[index % UI_COLORS.length],
    };
}

export function setupSlots(picker) {
    if (picker.names.length === 0) {
        populateReel(picker.slotLeftReel, buildRepeatedItems(SLOT_SYMBOLS, 36), 'slot-item-symbol');
        populateReel(picker.slotCenterReel, buildRepeatedItems(['Add names...'], 60), 'slot-item-name');
        populateReel(picker.slotRightReel, buildRepeatedItems(SLOT_SYMBOLS, 36), 'slot-item-symbol');
        resetSlots(picker);
        return;
    }

    const slices = getSliceAngles(picker);

    // Center reel: names colored by their original index in picker.names
    const coloredNameItems = slices.map(slice => ({
        text: slice.name,
        color: UI_COLORS[slice.index % UI_COLORS.length],
        nameIndex: slice.index,
    }));

    // Side reels: emoji/color are associated with the originating name index
    const sideVisualItems = slices.map(slice => buildNameVisual(slice.index, slice.name));
    const sideReelCount = Math.max(300, 20 * picker.names.length);

    populateReel(picker.slotLeftReel, buildRepeatedItems(sideVisualItems, sideReelCount), 'slot-item-symbol');
    populateReel(picker.slotCenterReel, buildRepeatedItems(coloredNameItems, 60), 'slot-item-name');
    populateReel(picker.slotRightReel, buildRepeatedItems(sideVisualItems, sideReelCount), 'slot-item-symbol');

    resetSlots(picker);
}

export function resetSlots(picker) {
    [picker.slotLeftReel, picker.slotCenterReel, picker.slotRightReel].forEach(reel => {
        if (!reel) {
            return;
        }

        // Start each reel at a slightly different random position
        setReelToRandomPosition(reel);

        const slotWindow = reel.parentElement;
        if (slotWindow) {
            slotWindow.classList.remove('stopped');
        }

        reel.querySelectorAll('.slot-item').forEach(el => {
            el.classList.remove('center', 'glow-match', 'glow-mismatch');
        });
    });
}

function setReelToRandomPosition(reel) {
    const totalItems = reel.querySelectorAll('.slot-item').length;
    const baseOffset = Math.floor(totalItems / 4) * SLOT_ITEM_HEIGHT;
    // Add a random offset (±2 items) to create variation
    const randomOffset = (Math.random() - 0.5) * 2 * SLOT_ITEM_HEIGHT;
    const finalOffset = Math.max(0, Math.min(baseOffset + randomOffset, (totalItems - 3) * SLOT_ITEM_HEIGHT));
    reel.style.transform = `translateY(-${finalOffset}px)`;
}

function buildRepeatedItems(items, minimumCount) {
    if (items.length === 0) return [];
    const repeated = [];
    const repeats = Math.max(1, Math.ceil(minimumCount / items.length));
    for (let i = 0; i < repeats; i++) repeated.push(...items);
    return repeated;
}

function populateReel(reel, items, itemClassName) {
    reel.innerHTML = '';

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `slot-item ${itemClassName}`;
        if (typeof item === 'object' && item !== null) {
            div.textContent = item.text;
            div.style.backgroundColor = item.color;
            div.dataset.symbolColor = item.color;
            div.dataset.nameIndex = String(item.nameIndex);
            div.dataset.colored = 'true';
        } else {
            div.textContent = item;
        }
        reel.appendChild(div);
    });
}

function highlightCenterSlot(reel) {
    reel.querySelectorAll('.slot-item').forEach(el => el.classList.remove('center'));

    const transform = reel.style.transform;
    const match = transform.match(/translateY\(-?([\d.]+)px\)/);
    if (match) {
        const offset = parseFloat(match[1]);
        const centerIndex = Math.round(offset / SLOT_ITEM_HEIGHT) + 1;
        const items = reel.querySelectorAll('.slot-item');
        if (items[centerIndex]) {
            items[centerIndex].classList.add('center');
        }
    }
}

function pickRandomIndex(indices) {
    return indices[Math.floor(Math.random() * indices.length)];
}

function applyGlow(reel, glowClass) {
    reel.querySelectorAll('.slot-item[data-colored="true"]').forEach(item => {
        item.classList.add(glowClass);
    });
}

export async function spinSlots(picker, winner) {
    const winnerIndex = picker.names.indexOf(winner);
    const winnerVisual = winnerIndex >= 0 ? buildNameVisual(winnerIndex, winner) : null;

    // Build list of other possible name indices (for mismatches)
    const otherNameIndices = picker.names
        .map((_, i) => i)
        .filter(i => i !== winnerIndex);

    const canHaveJeopardy = winnerIndex >= 0 && otherNameIndices.length > 0;

    resetSlots(picker);

    for (let attempt = 0; attempt <= MAX_JEOPARDY_MISSES; attempt++) {
        if (picker.animationCancelled) return;

        const isLastAttempt = attempt === MAX_JEOPARDY_MISSES;
        const isMatch = !canHaveJeopardy || isLastAttempt || Math.random() < MATCH_PROBABILITIES[attempt];

        const baseDuration = 1400 * picker.durationMultiplier;

        let leftVisual;
        let rightVisual;

        if (isMatch) {
            leftVisual = winnerVisual;
            rightVisual = winnerVisual;
        } else {
            const leftIndex = pickRandomIndex(otherNameIndices);
            const rightCandidateIndices = otherNameIndices.length > 1
                ? otherNameIndices.filter(i => i !== leftIndex)
                : otherNameIndices;
            const rightIndex = pickRandomIndex(rightCandidateIndices);

            leftVisual = buildNameVisual(leftIndex, picker.names[leftIndex]);
            rightVisual = buildNameVisual(rightIndex, picker.names[rightIndex]);
        }

        const leftSpin = spinSingleReel(
            picker,
            picker.slotLeftReel,
            leftVisual.text,
            baseDuration,
            leftVisual.color,
            leftVisual.nameIndex
        );
        const rightSpin = spinSingleReel(
            picker,
            picker.slotRightReel,
            rightVisual.text,
            baseDuration * 1.65,
            rightVisual.color,
            rightVisual.nameIndex
        );
        const centerSpin = spinSingleReel(picker, picker.slotCenterReel, winner, baseDuration * 1.25);

        await leftSpin;
        if (picker.animationCancelled) return;
        await centerSpin;
        if (picker.animationCancelled) return;
        await rightSpin;
        if (picker.animationCancelled) return;

        const showResult = (match) => {
            applyGlow(picker.slotLeftReel, match ? 'glow-match' : 'glow-mismatch');
            applyGlow(picker.slotRightReel, match ? 'glow-match' : 'glow-mismatch');
            applyGlow(picker.slotCenterReel, match ? 'glow-match' : 'glow-mismatch');

            const slotMachine = picker.slotLeftReel.closest('.slot-machine');
            if (slotMachine) {
                slotMachine.classList.add(match ? 'match' : 'mismatch');
                slotMachine.addEventListener('animationend', () => slotMachine.classList.remove(match ? 'match' : 'mismatch'), { once: true });
            }

            if (match) picker.sound.playWin();
            else picker.sound.playWrong();
        };

        if (isMatch) {
            showResult(true);

            // Wait to show the glow before revealing the winner
            await new Promise(r => setTimeout(r, 1200));
            if (picker.animationCancelled) return;

            return;
        }

        showResult(false);

        await new Promise(r => setTimeout(r, 2000));
        if (picker.animationCancelled) return;

        resetSlots(picker);
    }
}

function spinSingleReel(picker, reel, targetValue, duration, targetColor = null, targetNameIndex = null) {
    return new Promise(resolve => {
        const itemHeight = SLOT_ITEM_HEIGHT;
        const items = Array.from(reel.querySelectorAll('.slot-item'));
        const totalItems = items.length;
        const transform = reel.style.transform;
        const match = transform.match(/translateY\(-?([\d.]+)px\)/);
        const startPosition = match ? parseFloat(match[1]) : Math.floor(totalItems / 4) * itemHeight;
        let targetIndex = findTargetIndex(items, targetValue, totalItems, targetColor, targetNameIndex);
        let targetPosition = (targetIndex - 1) * itemHeight;
        const minimumTravel = Math.min(
            totalItems * itemHeight * 0.55 * picker.durationMultiplier,
            Math.max(0, (totalItems - 4) * itemHeight - startPosition)
        );
        let travelDistance = targetPosition - startPosition;

        while (travelDistance < minimumTravel) {
            const nextTargetOffset = items
                .slice(targetIndex + 1)
                .findIndex(item => {
                    if (item.textContent !== targetValue) return false;
                    if (targetColor !== null && item.dataset.symbolColor !== targetColor) return false;
                    if (targetNameIndex !== null && item.dataset.nameIndex !== String(targetNameIndex)) return false;
                    return true;
                });

            if (nextTargetOffset === -1) {
                break;
            }

            targetIndex += nextTargetOffset + 1;
            targetPosition = (targetIndex - 1) * itemHeight;
            travelDistance = targetPosition - startPosition;
        }

        const finalPosition = Math.min(
            startPosition + Math.max(travelDistance, 0),
            Math.max(0, (totalItems - 3) * itemHeight)
        );
        const startTime = Date.now();
        const slotWindow = reel.parentElement;

        if (slotWindow) {
            slotWindow.classList.remove('stopped');
        }

        const animate = () => {
            if (picker.animationCancelled) {
                resolve();
                return;
            }

            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentPosition = startPosition + (finalPosition - startPosition) * eased;

            reel.style.transform = `translateY(-${currentPosition}px)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
                return;
            }

            reel.style.transform = `translateY(-${finalPosition}px)`;
            if (slotWindow) {
                slotWindow.classList.add('stopped');
            }
            highlightCenterSlot(reel);
            resolve();
        };

        animate();
    });
}

function findTargetIndex(items, targetValue, totalItems, targetColor = null, targetNameIndex = null) {
    const matches = item => {
        if (item.textContent !== targetValue) return false;
        if (targetColor !== null && item.dataset.symbolColor !== targetColor) return false;
        if (targetNameIndex !== null && item.dataset.nameIndex !== String(targetNameIndex)) return false;
        return true;
    };

    const midpoint = Math.floor(totalItems / 2);
    let targetIndex = items.slice(midpoint).findIndex(matches);

    if (targetIndex !== -1) {
        return midpoint + targetIndex;
    }

    return items.findIndex(matches);
}
