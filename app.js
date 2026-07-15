import { DEFAULT_SAMPLE_NAMES, CONFETTI_COLORS, CONFETTI_PARTICLES } from './constants.js';
import { drawWheel, spinWheel } from './games/wheel.js';
import { resetSlots, setupSlots, spinSlots } from './games/slots.js';
import { drawClawPreview, runClawMachine } from './games/claw.js';
import { drawRacePreview, runRace } from './games/race.js';
import { drawBattlePreview, runBattleArena } from './games/battle.js';
import { drawSpotlightPreview, runSpotlight } from './games/spotlight.js';

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.loops = new Map();
        this.buffers = {};
        this.loading = {};
    }

    /**
     * Lazily create/resume the audio context. Call from user gesture handlers.
     */
    resume() {
        if (!window.AudioContext && !window.webkitAudioContext) return;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    stopAllLoops() {
        this.loops.forEach(handle => clearTimeout(handle));
        this.loops.clear();
    }

    async loadBuffer(key, url) {
        if (this.buffers[key]) return this.buffers[key];
        if (this.loading[key]) return this.loading[key];
        this.resume();
        if (!this.ctx) return null;

        const fetchPromise = fetch(url)
            .then(resp => resp.arrayBuffer())
            .then(data => new Promise((resolve, reject) => {
                this.ctx.decodeAudioData(data, resolve, reject);
            }))
            .then(buffer => {
                this.buffers[key] = buffer;
                return buffer;
            })
            .catch(() => null);

        this.loading[key] = fetchPromise;
        const buffer = await fetchPromise;
        delete this.loading[key];
        return buffer;
    }

    playBuffer(buffer, { volume = 0.6, playbackRate = 1 } = {}) {
        if (!this.ctx || !buffer) return;
        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        src.buffer = buffer;
        src.playbackRate.value = playbackRate;
        gain.gain.value = volume;
        src.connect(gain).connect(this.ctx.destination);
        src.start();
    }

    playTone({ frequency = 440, duration = 0.15, type = 'sine', volume = 0.1, attack = 0.01, release = 0.06, delay = 0 }) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + attack);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration + release);
    }

    playNoise({ duration = 0.3, volume = 0.1, band = null, delay = 0 }) {
        if (!this.ctx) return;
        const sampleCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
        const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < sampleCount; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const now = this.ctx.currentTime + delay;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        let tail = source;
        if (band) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = band;
            filter.Q.value = 6;
            tail = tail.connect(filter);
        }

        tail.connect(gain).connect(this.ctx.destination);
        source.start(now);
        source.stop(now + duration + 0.05);
    }

    playTick(pitch = 900) {
        this.playTone({ frequency: pitch, duration: 0.08, type: 'square', volume: 0.08 });
    }

    playThunk(pitch = 180) {
        this.playTone({ frequency: pitch, duration: 0.12, type: 'sawtooth', volume: 0.12 });
    }

    playHit() {
        this.playNoise({ duration: 0.12, volume: 0.12, band: 900 });
        this.playTone({ frequency: 520, duration: 0.08, type: 'triangle', volume: 0.08 });
    }

    playCountdown(count) {
        const base = count > 0 ? 360 : 760;
        this.playTone({ frequency: base, duration: 0.18, type: 'sine', volume: 0.16 });
        if (count === 0) {
            this.playTone({ frequency: 1040, duration: 0.24, type: 'triangle', volume: 0.14, delay: 0.05 });
        }
    }

    playSweepPad() {
        this.playNoise({ duration: 0.8, volume: 0.08, band: 400 });
        this.playTone({ frequency: 220, duration: 0.7, type: 'sawtooth', volume: 0.05 });
    }

    playReveal() {
        [880, 1320, 1760].forEach((f, i) => {
            this.playTone({ frequency: f, duration: 0.35, type: 'sine', volume: 0.12, delay: i * 0.05 });
        });
    }

    playWin() {
        // One-armed-bandit payout style: 5 identical, metallic "Ching" sounds.
        const rootFrequency = 2000; // Bright, piercing chime frequency
        const interval = 0.16;      // Steady, mechanical delay between strikes

        Array.from({ length: 5 }).forEach((_, i) => {
            const burstDelay = i * interval;

            // 1. The "Ch-" (Crisp, high-frequency noise attack for the coin strike)
            this.playNoise({
                duration: 0.02, 
                volume: 0.075, 
                band: 3500, // High band for a clean silver/metal click
                delay: burstDelay
            });

            // 2. The "-ing" metallic body (Main strike)
            this.playTone({
                frequency: rootFrequency,
                duration: 0.12,
                type: 'triangle',
                volume: 0.15,
                attack: 0.002,
                release: 0.07,
                delay: burstDelay,
            });

            // 3. The Metallic Overtone (Inharmonic 1.414x multiplier for the "metal" clang)
            this.playTone({
                frequency: Math.round(rootFrequency * 1.414), 
                duration: 0.09,
                type: 'sine',
                volume: 0.09,
                attack: 0.002,
                release: 0.05,
                delay: burstDelay + 0.005,
            });

            // 4. High Silver Shimmer (1.8x multiplier)
            this.playTone({
                frequency: Math.round(rootFrequency * 1.8), 
                duration: 0.06,
                type: 'sine',
                volume: 0.045,
                attack: 0.001,
                release: 0.03,
                delay: burstDelay + 0.01,
            });
        });
    }

    playWrong() {
        // "Uh-uhhhh" Wrong Answer Buzzer
        this.playTone({
            frequency: 75,
            duration: 0.15,
            type: 'sawtooth',
            volume: 0.25,
            attack: 0.005,
            release: 0.05,
            delay: 0.0,
        });
        
        // Slighly lower pitch than beat 1 for that deflating, disappointed drop
        this.playTone({
            frequency: 65,
            duration: 0.45,
            type: 'sawtooth',
            volume: 0.25,
            attack: 0.01,
            release: 0.15, // Longer fade out
            delay: 0.22,
        });
    }

    async playSadTrombone() {
        this.resume();
        if (!this.ctx) return;

        try {
            const buffer = await this.loadBuffer('sad-trombone', 'sounds/womp_womp.mp3');
            if (buffer) {
                this.playBuffer(buffer, { volume: 0.7 });
                return;
            }
        } catch (_) {
            // Fall through to synthesized fallback
        }

        // Fallback: synthesized sad trombone if file is missing
        this.playTone({ frequency: 220, duration: 0.22, type: 'sawtooth', volume: 0.14 });
        this.playTone({ frequency: 196, duration: 0.24, type: 'sawtooth', volume: 0.14, delay: 0.18 });
        this.playTone({ frequency: 174, duration: 0.28, type: 'sawtooth', volume: 0.14, delay: 0.38 });
        this.playTone({ frequency: 146, duration: 0.45, type: 'sawtooth', volume: 0.16, delay: 0.62 });
    }

    async playApplause() {
        this.resume();
        if (!this.ctx) return;

        try {
            const buffer = await this.loadBuffer('applause', 'sounds/applause.m4a');
            if (buffer) {
                this.playBuffer(buffer, { volume: 0.7 });
                return;
            }
        } catch (_) {
            // Fall through to synthesized fallback
        }

        // Fallback: synthesized claps if the file is missing
        for (let i = 0; i < 9; i++) {
            const delay = 0.08 * i + Math.random() * 0.04;
            this.playNoise({ duration: 0.12, volume: 0.16, band: 800 + Math.random() * 600, delay });
        }
        this.playNoise({ duration: 0.9, volume: 0.05, band: 400, delay: 0.1 });
    }

}

class RandomNamePicker {
    constructor() {
        this.names = [];
        this.weights = []; // Weight for each name (1-4)
        this.weightsEnabled = false;
        this.currentAnimation = 'wheel';
        this.isSpinning = false;
        this.animationCancelled = false;
        this.firstClawGame = true; // First claw game of the session always succeeds
        this.durationMultiplier = 1; // Animation speed multiplier (higher = slower)
        this.sound = new SoundEngine();

        this.initElements();
        this.initEventListeners();
        this.loadFromStorage();
        this.initAnimations();
    }

    /**
     * Prepare a canvas for high-DPI drawing and return logical dimensions.
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     * @returns {{width:number,height:number,dpr:number}}
     */
    prepareCanvas(canvas, ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        return { width: rect.width, height: rect.height, dpr };
    }

    /**
     * Build a weighted array where each name is repeated per its weight.
     * @template T
     * @param {(name:string,index:number,weight:number)=>T} mapper
     * @returns {T[]}
     */
    buildWeightedArray(mapper) {
        const items = [];
        this.names.forEach((name, index) => {
            const weight = this.weightsEnabled ? (this.weights[index] || 1) : 1;
            for (let w = 0; w < weight; w++) {
                items.push(mapper(name, index, weight));
            }
        });
        return items;
    }

    initElements() {
        // Sidebar elements
        this.nameInput = document.getElementById('nameInput');
        this.addNameBtn = document.getElementById('addNameBtn');
        this.namesList = document.getElementById('namesList');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.loadSampleBtn = document.getElementById('loadSampleBtn');
        this.weightsToggle = document.getElementById('weightsToggle');

        // Animation elements
        this.animationBtns = document.querySelectorAll('.animation-btn');
        this.animationDisplays = document.querySelectorAll('.animation-display');
        
        // Wheel
        this.wheelCanvas = document.getElementById('wheelCanvas');
        this.wheelCtx = this.wheelCanvas.getContext('2d');
        this.initWheelCanvas();
        
        // Slots
        this.slotLeftReel = document.getElementById('slotLeftReel');
        this.slotCenterReel = document.getElementById('slotCenterReel');
        this.slotRightReel = document.getElementById('slotRightReel');

        // Claw Machine
        this.clawCanvas = document.getElementById('clawCanvas');
        this.clawCtx = this.clawCanvas.getContext('2d');

        // Race
        this.raceCanvas = document.getElementById('raceCanvas');
        this.raceCtx = this.raceCanvas.getContext('2d');

        // Battle Arena
        this.battleCanvas = document.getElementById('battleCanvas');
        this.battleCtx = this.battleCanvas.getContext('2d');

        // Spotlight
        this.spotlightCanvas = document.getElementById('spotlightCanvas');
        this.spotlightCtx = this.spotlightCanvas.getContext('2d');

        // Main elements
        this.pickBtn = document.getElementById('pickBtn');
        this.stopBtn = document.getElementById('stopBtn');
        
        // Modal elements
        this.winnerModal = document.getElementById('winnerModal');
        this.winnerName = document.getElementById('winnerName');
        this.removeWinnerBtn = document.getElementById('removeWinnerBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.lastWinner = null;
        
        // Confetti
        this.confettiCanvas = document.getElementById('confettiCanvas');
        this.confettiCtx = this.confettiCanvas.getContext('2d');
        this.resizeConfetti();

        // Duration slider
        this.durationSlider = document.getElementById('durationSlider');
        this.durationValue = document.getElementById('durationValue');
    }

    initEventListeners() {
        // Add name
        this.addNameBtn.addEventListener('click', () => this.addName());
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addName();
        });

        // Clear and sample
        this.clearAllBtn.addEventListener('click', () => this.clearAllNames());
        this.loadSampleBtn.addEventListener('click', () => this.loadSampleNames());

        // Animation selection
        this.animationBtns.forEach(btn => {
            btn.addEventListener('click', () => this.selectAnimation(btn.dataset.type));
        });

        // Pick button
        this.pickBtn.addEventListener('click', () => this.pickName());

        // Stop button
        this.stopBtn.addEventListener('click', () => this.stopAnimation());

        // Remove winner button
        this.removeWinnerBtn.addEventListener('click', () => this.removeLastWinner());
        
        // Close modal button
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        
        // Close modal on background click
        this.winnerModal.addEventListener('click', (e) => {
            if (e.target === this.winnerModal) this.closeModal();
        });

        // Resize handler
        window.addEventListener('resize', () => {
            this.resizeConfetti();
            this.initWheelCanvas();
            drawWheel(this);
        });

        // Duration slider
        this.durationSlider.addEventListener('input', () => this.updateDuration());

        // Weights toggle
        this.weightsToggle.addEventListener('change', () => this.toggleWeights());
    }

    /**
     * Enable or disable weighted selection and persist the choice.
     */
    toggleWeights() {
        this.weightsEnabled = this.weightsToggle.checked;
        this.namesList.classList.toggle('weights-enabled', this.weightsEnabled);
        this.saveToStorage();
        this.updateAnimations();
    }

    /**
     * Persist a new weight for a given name index.
     * @param {number} index
     * @param {number|string} weight
     */
    updateWeight(index, weight) {
        const parsedWeight = parseInt(weight) || 1;
        this.weights[index] = Math.max(1, parsedWeight); // Ensure minimum of 1
        this.saveToStorage();
        this.updateAnimations(); // Refresh previews to show new weights
    }

    /**
     * Get an index using weighted randomness when enabled.
     * @returns {number}
     */
    getWeightedRandomIndex() {
        const weightedIndices = this.buildWeightedArray((_, index) => index);
        return weightedIndices[Math.floor(Math.random() * weightedIndices.length)];
    }

    /**
     * Sync animation speed multiplier from slider input.
     */
    updateDuration() {
        this.durationMultiplier = parseFloat(this.durationSlider.value);
        this.durationValue.textContent = `${this.durationMultiplier.toFixed(2)}x`;
    }

    /**
     * Add a single unique name from the input field.
     */
    addName() {
        if (this.isSpinning) return;
        const name = this.nameInput.value.trim();
        if (name && !this.names.includes(name)) {
            this.names.push(name);
            this.weights.push(1); // Default weight of 1
            this.nameInput.value = '';
            this.updateNamesList();
            this.saveToStorage();
            this.updateAnimations();
        }
    }

    /**
     * Remove a name and its weight by index.
     * @param {number} index
     */
    removeName(index) {
        if (this.isSpinning) return;
        this.names.splice(index, 1);
        this.weights.splice(index, 1);
        this.updateNamesList();
        this.saveToStorage();
        this.updateAnimations();
    }

    /**
     * Clear all stored names after user confirmation.
     */
    clearAllNames() {
        if (this.isSpinning) return;
        if (this.names.length === 0 || confirm('Clear all names?')) {
            this.names = [];
            this.weights = [];
            this.updateNamesList();
            this.saveToStorage();
            this.updateAnimations();
        }
    }

    /**
     * Populate the list with the preset sample names.
     */
    loadSampleNames() {
        if (this.isSpinning) return;
        DEFAULT_SAMPLE_NAMES.forEach(name => {
            if (!this.names.includes(name)) {
                this.names.push(name);
                this.weights.push(1); // Default weight of 1
            }
        });
        this.updateNamesList();
        this.saveToStorage();
        this.updateAnimations();
    }

    /**
     * Re-render the sidebar list, including weight inputs and remove buttons.
     */
    updateNamesList() {
        this.namesList.innerHTML = '';
        this.names.forEach((name, index) => {
            const item = document.createElement('div');
            item.className = 'name-item';
            const currentWeight = this.weights[index] || 1;
            item.innerHTML = `
                <span class="name-text">${name}</span>
                <div class="weight-selector">
                    <span class="weight-label">×</span>
                    <input type="number" min="1" value="${currentWeight}" data-index="${index}">
                </div>
                <button class="remove-btn" data-index="${index}">×</button>
            `;
            item.querySelector('.remove-btn').addEventListener('click', () => this.removeName(index));
            item.querySelector('input').addEventListener('change', (e) => this.updateWeight(index, e.target.value));
            this.namesList.appendChild(item);
        });
    }

    /**
     * Persist names, weights, and weighting preference to localStorage.
     */
    saveToStorage() {
        localStorage.setItem('randomNamePicker_names', JSON.stringify(this.names));
        localStorage.setItem('randomNamePicker_weights', JSON.stringify(this.weights));
        localStorage.setItem('randomNamePicker_weightsEnabled', JSON.stringify(this.weightsEnabled));
    }

    /**
     * Load saved names, weights, and weighting preference from localStorage.
     */
    loadFromStorage() {
        const savedNames = localStorage.getItem('randomNamePicker_names');
        if (savedNames) {
            this.names = JSON.parse(savedNames);
        }
        
        const savedWeights = localStorage.getItem('randomNamePicker_weights');
        if (savedWeights) {
            this.weights = JSON.parse(savedWeights);
        }
        // Ensure weights array matches names array length
        while (this.weights.length < this.names.length) {
            this.weights.push(1);
        }
        
        const savedWeightsEnabled = localStorage.getItem('randomNamePicker_weightsEnabled');
        if (savedWeightsEnabled) {
            this.weightsEnabled = JSON.parse(savedWeightsEnabled);
            this.weightsToggle.checked = this.weightsEnabled;
            this.namesList.classList.toggle('weights-enabled', this.weightsEnabled);
        }
        
        this.updateNamesList();
    }

    /**
     * Switch the active animation and refresh previews.
     * @param {string} type
     */
    selectAnimation(type) {
        this.currentAnimation = type;
        
        // Update buttons
        this.animationBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        // Update displays
        this.animationDisplays.forEach(display => {
            display.classList.remove('active');
        });
        document.getElementById(`${type}Display`).classList.add('active');
        
        this.updateAnimations();
    }

    /**
     * Initialize preview canvases for all animations.
     */
    initAnimations() {
        this.updateAnimations();
    }

    /**
     * Redraw all previews to reflect current names and weights.
     */
    updateAnimations() {
        drawWheel(this);
        setupSlots(this);
        drawClawPreview(this);
        drawRacePreview(this);
        drawBattlePreview(this);
        drawSpotlightPreview(this);
    }

    /**
     * Run the currently selected animation and resolve a winner.
     */
    async pickName() {
        if (this.names.length < 2) {
            alert('Please add at least 2 names!');
            return;
        }
        if (this.isSpinning) return;

        this.sound.resume();
        this.sound.stopAllLoops();

        this.isSpinning = true;
        this.animationCancelled = false;
        this.pickBtn.disabled = true;
        this.pickBtn.classList.add('spinning');
        this.stopBtn.style.display = 'inline-flex';

        let winner;

        // Run the selected animation
        switch (this.currentAnimation) {
            case 'wheel':
                winner = await spinWheel(this);
                break;
            case 'slots':
                const winnerIndex = this.getWeightedRandomIndex();
                winner = this.names[winnerIndex];
                await spinSlots(this, winner);
                break;
            case 'claw':
                winner = await runClawMachine(this);
                break;
            case 'race':
                winner = await runRace(this);
                break;
            case 'battle':
                winner = await runBattleArena(this);
                break;
            case 'spotlight':
                winner = await runSpotlight(this);
                break;
        }

        this.stopBtn.style.display = 'none';
        this.sound.stopAllLoops();

        // Only show winner if animation wasn't cancelled
        if (!this.animationCancelled) {
            this.winnerName.textContent = winner;
            this.lastWinner = winner;
            if (this.currentAnimation === 'race' || this.currentAnimation === 'spotlight') {
                this.sound.playSadTrombone();
            } else {
                this.sound.playApplause();
            }
            this.showModal();
            this.launchConfetti();
        } else {
            // Reset animations to their initial state
            this.updateAnimations();
        }

        this.isSpinning = false;
        this.animationCancelled = false;
        this.pickBtn.disabled = false;
        this.pickBtn.classList.remove('spinning');
    }

    /**
     * Signal the active animation loop to halt.
     */
    stopAnimation() {
        this.animationCancelled = true;
        this.sound.stopAllLoops();
    }

    /**
     * Size the wheel canvas according to CSS dimensions and device pixel ratio.
     */
    initWheelCanvas() {
        const canvas = this.wheelCanvas;
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate size based on CSS computed size
        const computedStyle = getComputedStyle(canvas);
        const cssWidth = parseFloat(computedStyle.width);
        const cssHeight = parseFloat(computedStyle.height);
        const size = Math.min(cssWidth, cssHeight) || 650;
        
        // Set the canvas internal size scaled by device pixel ratio
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        
        // Reset and scale the context
        this.wheelCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.wheelCtx.scale(dpr, dpr);
        
        // Store the logical size for drawing calculations
        this.wheelSize = size;
    }

    /**
     * Remove the most recent winner from the name list and reset UI state.
     */
    removeLastWinner() {
        if (this.lastWinner) {
            const index = this.names.indexOf(this.lastWinner);
            if (index > -1) {
                this.names.splice(index, 1);
                this.weights.splice(index, 1);
                this.updateNamesList();
                this.saveToStorage();
                this.updateAnimations();
            }
            this.lastWinner = null;
            this.closeModal();
        }
    }
    
    /**
     * Display the winner modal.
     */
    showModal() {
        this.winnerModal.classList.add('show');
    }
    
    /**
     * Hide the winner modal and reset slot visuals.
     */
    closeModal() {
        this.winnerModal.classList.remove('show');
        // Reset slot machine position for next spin
        this.resetSlotPosition();
    }

    /**
     * Reset slot reel position and remove highlight markers.
     */
    resetSlotPosition() {
        resetSlots(this);
    }

    /**
     * Fit the confetti canvas to the viewport.
     */
    resizeConfetti() {
        this.confettiCanvas.width = window.innerWidth;
        this.confettiCanvas.height = window.innerHeight;
    }

    /**
     * Launch a short confetti burst.
     */
    launchConfetti() {
        const particles = [];
        const colors = CONFETTI_COLORS;
        
        for (let i = 0; i < CONFETTI_PARTICLES; i++) {
            particles.push({
                x: Math.random() * this.confettiCanvas.width,
                y: -20,
                vx: (Math.random() - 0.5) * 10,
                vy: Math.random() * 5 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 10 + 5,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }
        
        const animate = () => {
            this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
            
            let activeParticles = 0;
            particles.forEach(p => {
                if (p.y < this.confettiCanvas.height) {
                    activeParticles++;
                    p.vy += 0.2;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.rotation += p.rotationSpeed;
                    
                    this.confettiCtx.save();
                    this.confettiCtx.translate(p.x, p.y);
                    this.confettiCtx.rotate(p.rotation * Math.PI / 180);
                    this.confettiCtx.fillStyle = p.color;
                    this.confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                    this.confettiCtx.restore();
                }
            });
            
            if (activeParticles > 0) {
                requestAnimationFrame(animate);
            } else {
                this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
            }
        };
        
        animate();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new RandomNamePicker();
});
