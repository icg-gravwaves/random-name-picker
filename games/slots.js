import { SLOT_ITEM_HEIGHT } from '../constants.js';

export function setupSlots(picker) {
    picker.slotReel.innerHTML = '';
    
    let weightedNames = picker.names.length > 0
        ? picker.buildWeightedArray((name) => name)
        : ['Add names...'];
    
    weightedNames = weightedNames.sort(() => Math.random() - 0.5);
    
    const repeats = Math.ceil(50 / weightedNames.length);
    const displayNames = [];
    for (let r = 0; r < repeats; r++) {
        displayNames.push(...weightedNames);
    }
    
    displayNames.forEach(name => {
        const div = document.createElement('div');
        div.className = 'slot-name';
        div.textContent = name;
        picker.slotReel.appendChild(div);
    });
    
    const itemHeight = SLOT_ITEM_HEIGHT;
    const totalItems = displayNames.length;
    picker.slotReel.style.transform = `translateY(-${Math.floor(totalItems / 4) * itemHeight}px)`;
}

export function highlightCenterSlot(picker) {
    picker.slotReel.querySelectorAll('.slot-name').forEach(el => el.classList.remove('center'));
    
    const transform = picker.slotReel.style.transform;
    const match = transform.match(/translateY\(-?(\d+)px\)/);
    if (match) {
        const offset = parseInt(match[1]);
        const itemHeight = SLOT_ITEM_HEIGHT;
        const centerIndex = Math.round(offset / itemHeight) + 1;
        const items = picker.slotReel.querySelectorAll('.slot-name');
        if (items[centerIndex]) {
            items[centerIndex].classList.add('center');
        }
    }
}

export function spinSlots(picker, winner) {
    return new Promise(resolve => {
        const itemHeight = SLOT_ITEM_HEIGHT;
        const duration = 3000 * picker.durationMultiplier;
        const startTime = Date.now();
        
        const totalItems = picker.slotReel.querySelectorAll('.slot-name').length;
        
        const transform = picker.slotReel.style.transform;
        const match = transform.match(/translateY\(-?(\d+)px\)/);
        let startPosition = match ? parseInt(match[1]) : totalItems / 2 * itemHeight;
        
        const items = Array.from(picker.slotReel.querySelectorAll('.slot-name'));
        const midPoint = Math.floor(items.length / 2);
        let targetIndex = -1;
        
        for (let i = midPoint; i < items.length - 2; i++) {
            if (items[i].textContent === winner) {
                targetIndex = i;
                break;
            }
        }
        
        if (targetIndex === -1) {
            targetIndex = items.findIndex(item => item.textContent === winner);
        }
        
        let targetPosition = (targetIndex - 1) * itemHeight;
        
        const minSpinDistance = Math.min(
            (totalItems / 5) * itemHeight * picker.durationMultiplier,
            Math.max(0, (totalItems - 4) * itemHeight - startPosition)
        );
        let spinDistance = targetPosition - startPosition;
        
        while (spinDistance < minSpinDistance) {
            let nextWinnerOffset = items.slice(targetIndex + 1).findIndex(item => item.textContent === winner);
            if (nextWinnerOffset !== -1) {
                targetIndex = targetIndex + 1 + nextWinnerOffset;
                targetPosition = (targetIndex - 1) * itemHeight;
                spinDistance = targetPosition - startPosition;
            } else {
                spinDistance += totalItems / 2 * itemHeight;
            }
        }

        const maxSpinDistance = Math.max(0, (totalItems - 3) * itemHeight - startPosition);
        spinDistance = Math.min(spinDistance, maxSpinDistance);
        
        const finalPosition = startPosition + spinDistance;
        
        const slotWindow = picker.slotReel.parentElement;
        slotWindow.classList.remove('stopped');
        
        const animate = () => {
            if (picker.animationCancelled) {
                resolve();
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentPosition = startPosition + spinDistance * eased;
            
            picker.slotReel.style.transform = `translateY(-${currentPosition}px)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                picker.slotReel.style.transform = `translateY(-${finalPosition}px)`;
                slotWindow.classList.add('stopped');
                highlightCenterSlot(picker);
                resolve();
            }
        };
        
        animate();
    });
}