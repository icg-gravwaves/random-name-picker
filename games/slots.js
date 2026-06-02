import { SLOT_ITEM_HEIGHT } from '../constants.js';
import { getSliceAngles } from './wheel.js';

const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '7️⃣', '💎', '⭐', '🍀', 'BAR'];

export function setupSlots(picker) {
    const baseNames = picker.names.length > 0
        ? getSliceAngles(picker).map(slice => slice.name)
        : ['Add names...'];

    populateReel(picker.slotLeftReel, buildRepeatedItems(SLOT_SYMBOLS, 36), 'slot-item-symbol');
    populateReel(picker.slotCenterReel, buildRepeatedItems(baseNames, 60), 'slot-item-name');
    populateReel(picker.slotRightReel, buildRepeatedItems(SLOT_SYMBOLS, 36), 'slot-item-symbol');

    resetSlots(picker);
}

export function resetSlots(picker) {
    [picker.slotLeftReel, picker.slotCenterReel, picker.slotRightReel].forEach(reel => {
        if (!reel) {
            return;
        }

        setReelToInitialPosition(reel);

        const slotWindow = reel.parentElement;
        if (slotWindow) {
            slotWindow.classList.remove('stopped');
        }

        reel.querySelectorAll('.slot-item').forEach(el => el.classList.remove('center'));
    });
}

function buildRepeatedItems(items, minimumCount) {
    const repeated = [];
    const repeats = Math.max(1, Math.ceil(minimumCount / items.length));

    for (let repeat = 0; repeat < repeats; repeat++) {
        repeated.push(...items);
    }

    return repeated;
}

function populateReel(reel, items, itemClassName) {
    reel.innerHTML = '';

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `slot-item ${itemClassName}`;
        div.textContent = item;
        reel.appendChild(div);
    });
}

function setReelToInitialPosition(reel) {
    const totalItems = reel.querySelectorAll('.slot-item').length;
    const offset = Math.floor(totalItems / 4) * SLOT_ITEM_HEIGHT;
    reel.style.transform = `translateY(-${offset}px)`;
}

function highlightCenterSlot(reel) {
    reel.querySelectorAll('.slot-item').forEach(el => el.classList.remove('center'));

    const transform = reel.style.transform;
    const match = transform.match(/translateY\(-?([\d.]+)px\)/);
    if (match) {
        const offset = parseFloat(match[1]);
        const itemHeight = SLOT_ITEM_HEIGHT;
        const centerIndex = Math.round(offset / itemHeight) + 1;
        const items = reel.querySelectorAll('.slot-item');
        if (items[centerIndex]) {
            items[centerIndex].classList.add('center');
        }
    }
}

export function spinSlots(picker, winner) {
    return new Promise(async resolve => {
        const symbol = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        const baseDuration = 1400 * picker.durationMultiplier;

        resetSlots(picker);

        const leftSpin = spinSingleReel(picker, picker.slotLeftReel, symbol, baseDuration);
        const rightSpin = spinSingleReel(picker, picker.slotRightReel, symbol, baseDuration * 1.25);
        const centerSpin = spinSingleReel(picker, picker.slotCenterReel, winner, baseDuration * 1.65);

        await leftSpin;
        if (picker.animationCancelled) {
            resolve();
            return;
        }

        await rightSpin;
        if (picker.animationCancelled) {
            resolve();
            return;
        }

        await centerSpin;
        resolve();
    });
}

function spinSingleReel(picker, reel, targetValue, duration) {
    return new Promise(resolve => {
        const itemHeight = SLOT_ITEM_HEIGHT;
        const items = Array.from(reel.querySelectorAll('.slot-item'));
        const totalItems = items.length;
        const transform = reel.style.transform;
        const match = transform.match(/translateY\(-?([\d.]+)px\)/);
        const startPosition = match ? parseFloat(match[1]) : Math.floor(totalItems / 4) * itemHeight;
        let targetIndex = findTargetIndex(items, targetValue, totalItems);
        let targetPosition = (targetIndex - 1) * itemHeight;
        const minimumTravel = Math.min(
            totalItems * itemHeight * 0.55 * picker.durationMultiplier,
            Math.max(0, (totalItems - 4) * itemHeight - startPosition)
        );
        let travelDistance = targetPosition - startPosition;

        while (travelDistance < minimumTravel) {
            const nextTargetOffset = items
                .slice(targetIndex + 1)
                .findIndex(item => item.textContent === targetValue);

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

function findTargetIndex(items, targetValue, totalItems) {
    const midpoint = Math.floor(totalItems / 2);
    let targetIndex = items
        .slice(midpoint)
        .findIndex(item => item.textContent === targetValue);

    if (targetIndex !== -1) {
        return midpoint + targetIndex;
    }

    return items.findIndex(item => item.textContent === targetValue);
}