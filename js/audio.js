/* ============================================
   AUDIO SYSTEM - Procedural Sound Generation
   All sounds generated via Web Audio API
   No external audio files needed
   ============================================ */

const AudioManager = {
    ctx: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    initialized: false,
    currentMusic: null,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    muted: false,

    // Initialize the audio context
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
            console.log('[Audio] Initialized');
        } catch (e) {
            console.warn('[Audio] Web Audio not supported:', e);
        }
    },

    // Resume context if suspended (needed for user gesture requirement)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Set music volume (0-1)
    setMusicVolume(v) {
        this.musicVolume = v;
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
        }
    },

    // Set SFX volume (0-1)
    setSfxVolume(v) {
        this.sfxVolume = v;
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
        }
    },

    // --- NOISE GENERATORS ---
    createNoiseBuffer(duration, type) {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < length; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                b6 = white * 0.115926;
            }
        }
        return buffer;
    },

    // --- SOUND EFFECTS ---

    // Sword swing sound
    playSwordSwing() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Whoosh - filtered noise sweep
        const noiseBuffer = this.createNoiseBuffer(0.2, 'white');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.08);
        filter.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        filter.Q.value = 2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.2);
    },

    // Sword impact / hit
    playSwordHit() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Impact thud
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);

        // Metallic ring
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1200, now);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.1);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(now);
        osc2.stop(now + 0.12);

        // Noise burst
        const noiseBuffer = this.createNoiseBuffer(0.1, 'white');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.2, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = 2000;

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.1);
    },

    // Heavy sword impact
    playHeavyHit() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Deep boom
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);

        // Impact clang
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(600, now);
        osc2.frequency.exponentialRampToValueAtTime(200, now + 0.2);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1500;

        osc2.connect(filter);
        filter.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(now);
        osc2.stop(now + 0.2);

        // Noise crash
        const noiseBuffer = this.createNoiseBuffer(0.15, 'white');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.3, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        noise.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.15);
    },

    // Footstep sound
    playFootstep() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const noiseBuffer = this.createNoiseBuffer(0.08, 'pink');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600 + Math.random() * 200;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.08);
    },

    // Dodge / dash sound
    playDodge() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const noiseBuffer = this.createNoiseBuffer(0.15, 'white');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.12);
        filter.Q.value = 1;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.15);
    },

    // Block / shield sound
    playBlock() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.12);

        // Metal clank
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(2000, now);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.05);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(now);
        osc2.stop(now + 0.06);
    },

    // Enemy attack sound
    playEnemyAttack() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const noiseBuffer = this.createNoiseBuffer(0.15, 'white');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        filter.Q.value = 3;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.15);
    },

    // Player hurt sound
    playHurt() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    },

    // Enemy defeated sound
    playEnemyDefeat() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Falling tone
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.5);
    },

    // Pickup / heal sound
    playPickup() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Rising chime
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
        });
    },

    // Checkpoint sound
    playCheckpoint() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Ascending chord
        const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.6);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.6);
        });
    },

    // Arrow / projectile sound
    playArrow() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const noiseBuffer = this.createNoiseBuffer(0.3, 'white');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
        filter.Q.value = 5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.3);
    },

    // UI click sound
    playUIClick() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 600;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    },

    // UI hover sound
    playUIHover() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
    },

    // Cinematic transition whoosh
    playCinematicTransition() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const noiseBuffer = this.createNoiseBuffer(1.0, 'pink');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.9);
        filter.Q.value = 1;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 1.0);
    },

    // --- AMBIENT SOUNDS ---

    // Wind ambient loop
    windNode: null,
    startWind() {
        if (!this.ctx || this.windNode) return;
        this.resume();

        const noiseBuffer = this.createNoiseBuffer(3, 'pink');
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 150;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        const gain = this.ctx.createGain();
        gain.gain.value = 0.06;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        noise.start();

        this.windNode = { noise, filter, gain, lfo, lfoGain };
    },

    stopWind() {
        if (this.windNode) {
            try {
                this.windNode.noise.stop();
                this.windNode.lfo.stop();
            } catch (e) {}
            this.windNode = null;
        }
    },

    // --- MUSIC SYSTEM ---
    // Procedural ambient music using oscillators and scheduled notes

    musicNodes: [],
    musicInterval: null,

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        this.musicNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch (e) {}
        });
        this.musicNodes = [];
        this.currentMusic = null;
    },

    // Play a single music note
    playMusicNote(freq, duration, startTime, type, vol) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = type || 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol || 0.06, startTime + 0.1);
        gain.gain.setValueAtTime(vol || 0.06, startTime + duration - 0.2);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(startTime);
        osc.stop(startTime + duration);

        this.musicNodes.push(osc);
    },

    // Title screen music - dark, atmospheric
    playTitleMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        this.currentMusic = 'title';

        const playPhrase = () => {
            if (this.currentMusic !== 'title') return;
            const now = this.ctx.currentTime;

            // Dark drone
            const drone = this.ctx.createOscillator();
            drone.type = 'sine';
            drone.frequency.value = 65; // C2
            const droneGain = this.ctx.createGain();
            droneGain.gain.setValueAtTime(0, now);
            droneGain.gain.linearRampToValueAtTime(0.08, now + 2);
            droneGain.gain.setValueAtTime(0.08, now + 12);
            droneGain.gain.linearRampToValueAtTime(0, now + 16);
            drone.connect(droneGain);
            droneGain.connect(this.musicGain);
            drone.start(now);
            drone.stop(now + 16);
            this.musicNodes.push(drone);

            // Second drone (fifth)
            const drone2 = this.ctx.createOscillator();
            drone2.type = 'sine';
            drone2.frequency.value = 98; // G2
            const droneGain2 = this.ctx.createGain();
            droneGain2.gain.setValueAtTime(0, now);
            droneGain2.gain.linearRampToValueAtTime(0.05, now + 3);
            droneGain2.gain.setValueAtTime(0.05, now + 11);
            droneGain2.gain.linearRampToValueAtTime(0, now + 16);
            drone2.connect(droneGain2);
            droneGain2.connect(this.musicGain);
            drone2.start(now);
            drone2.stop(now + 16);
            this.musicNodes.push(drone2);

            // Melody notes (minor key, sparse)
            const melodyNotes = [
                { f: 262, t: 2, d: 2 },     // C4
                { f: 311, t: 4.5, d: 1.5 },  // Eb4
                { f: 294, t: 6.5, d: 2 },     // D4
                { f: 262, t: 9, d: 1.5 },     // C4
                { f: 247, t: 11, d: 2.5 },    // B3
            ];

            melodyNotes.forEach(note => {
                this.playMusicNote(note.f, note.d, now + note.t, 'sine', 0.04);
            });
        };

        playPhrase();
        this.musicInterval = setInterval(() => {
            if (this.currentMusic === 'title') {
                playPhrase();
            }
        }, 16000);
    },

    // Exploration / chapter music - mysterious, atmospheric
    playExplorationMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        this.currentMusic = 'exploration';

        const scales = {
            aeolian: [130.81, 146.83, 155.56, 174.61, 196, 207.65, 233.08, 261.63],
        };
        const scale = scales.aeolian;

        const playPhrase = () => {
            if (this.currentMusic !== 'exploration') return;
            const now = this.ctx.currentTime;

            // Low drone
            const drone = this.ctx.createOscillator();
            drone.type = 'sine';
            drone.frequency.value = 65.41;
            const dg = this.ctx.createGain();
            dg.gain.setValueAtTime(0, now);
            dg.gain.linearRampToValueAtTime(0.06, now + 2);
            dg.gain.setValueAtTime(0.06, now + 18);
            dg.gain.linearRampToValueAtTime(0, now + 20);
            drone.connect(dg);
            dg.connect(this.musicGain);
            drone.start(now);
            drone.stop(now + 20);
            this.musicNodes.push(drone);

            // Random sparse notes from scale
            for (let i = 0; i < 6; i++) {
                const noteFreq = scale[Math.floor(Math.random() * scale.length)];
                const octave = Math.random() > 0.5 ? 2 : 1;
                const startT = now + 1 + Math.random() * 16;
                const dur = 1.5 + Math.random() * 2;
                this.playMusicNote(noteFreq * octave, dur, startT, 'sine', 0.03 + Math.random() * 0.02);
            }
        };

        playPhrase();
        this.musicInterval = setInterval(() => {
            if (this.currentMusic === 'exploration') {
                playPhrase();
            }
        }, 20000);
    },

    // Combat music - more intense, rhythmic
    playCombatMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        this.currentMusic = 'combat';

        const playPhrase = () => {
            if (this.currentMusic !== 'combat') return;
            const now = this.ctx.currentTime;
            const bpm = 120;
            const beatLen = 60 / bpm;

            // Bass drum pattern
            for (let i = 0; i < 16; i++) {
                const t = now + i * beatLen;
                if (i % 4 === 0 || i % 4 === 3) {
                    const osc = this.ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(80, t);
                    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
                    const g = this.ctx.createGain();
                    g.gain.setValueAtTime(0.15, t);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                    osc.connect(g);
                    g.connect(this.musicGain);
                    osc.start(t);
                    osc.stop(t + 0.15);
                    this.musicNodes.push(osc);
                }
            }

            // Dark chord stabs
            const chords = [
                [130.81, 155.56, 196],    // Cm
                [116.54, 146.83, 174.61], // Bb
                [123.47, 155.56, 185],    // B diminished-ish
                [130.81, 155.56, 196],    // Cm
            ];

            chords.forEach((chord, ci) => {
                const t = now + ci * beatLen * 4;
                chord.forEach(freq => {
                    this.playMusicNote(freq, beatLen * 3, t, 'sawtooth', 0.02);
                });
            });

            // Tension notes
            const tensions = [392, 466, 523, 466, 392, 349, 392, 466];
            tensions.forEach((freq, i) => {
                const t = now + i * beatLen * 2;
                this.playMusicNote(freq, beatLen * 1.5, t, 'triangle', 0.025);
            });
        };

        playPhrase();
        const phraseDur = (60 / 120) * 16 * 1000;
        this.musicInterval = setInterval(() => {
            if (this.currentMusic === 'combat') {
                playPhrase();
            }
        }, phraseDur);
    },

    // Boss music - intense, dramatic
    playBossMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        this.currentMusic = 'boss';

        const playPhrase = () => {
            if (this.currentMusic !== 'boss') return;
            const now = this.ctx.currentTime;
            const bpm = 140;
            const beatLen = 60 / bpm;

            // Driving bass
            const bassNotes = [65.41, 65.41, 73.42, 65.41, 61.74, 65.41, 73.42, 82.41];
            bassNotes.forEach((freq, i) => {
                const t = now + i * beatLen * 2;
                this.playMusicNote(freq, beatLen * 1.8, t, 'sawtooth', 0.05);
            });

            // Fast percussive hits
            for (let i = 0; i < 32; i++) {
                const t = now + i * beatLen;
                if (i % 2 === 0) {
                    const osc = this.ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(i % 8 === 0 ? 100 : 60, t);
                    osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);
                    const g = this.ctx.createGain();
                    g.gain.setValueAtTime(i % 8 === 0 ? 0.2 : 0.1, t);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                    osc.connect(g);
                    g.connect(this.musicGain);
                    osc.start(t);
                    osc.stop(t + 0.1);
                    this.musicNodes.push(osc);
                }
            }

            // High tension melody
            const melNotes = [784, 740, 659, 622, 587, 622, 659, 784];
            melNotes.forEach((freq, i) => {
                const t = now + i * beatLen * 2;
                this.playMusicNote(freq, beatLen * 1.5, t, 'triangle', 0.03);
            });

            // Dissonant accents
            [0, 6, 10, 14].forEach(beat => {
                const t = now + beat * beatLen;
                this.playMusicNote(233.08, beatLen, t, 'square', 0.015);
                this.playMusicNote(246.94, beatLen, t, 'square', 0.015);
            });
        };

        playPhrase();
        const phraseDur = (60 / 140) * 32 * 1000;
        this.musicInterval = setInterval(() => {
            if (this.currentMusic === 'boss') {
                playPhrase();
            }
        }, phraseDur);
    },

    // Cinematic music - slow, emotional
    playCinematicMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        this.currentMusic = 'cinematic';

        const playPhrase = () => {
            if (this.currentMusic !== 'cinematic') return;
            const now = this.ctx.currentTime;

            // Pad chord (Am)
            [220, 261.63, 329.63].forEach(freq => {
                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0, now);
                g.gain.linearRampToValueAtTime(0.04, now + 3);
                g.gain.setValueAtTime(0.04, now + 17);
                g.gain.linearRampToValueAtTime(0, now + 20);
                osc.connect(g);
                g.connect(this.musicGain);
                osc.start(now);
                osc.stop(now + 20);
                this.musicNodes.push(osc);
            });

            // Slow melody
            const melody = [
                { f: 440, t: 2, d: 3 },
                { f: 523.25, t: 5.5, d: 2.5 },
                { f: 494, t: 8.5, d: 2 },
                { f: 440, t: 11, d: 3 },
                { f: 392, t: 14.5, d: 3 },
            ];
            melody.forEach(n => {
                this.playMusicNote(n.f, n.d, now + n.t, 'sine', 0.035);
            });
        };

        playPhrase();
        this.musicInterval = setInterval(() => {
            if (this.currentMusic === 'cinematic') {
                playPhrase();
            }
        }, 20000);
    },

    // Victory music
    playVictoryMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        this.currentMusic = 'victory';
        const now = this.ctx.currentTime;

        // Major chord arpeggio
        const notes = [262, 330, 392, 523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this.playMusicNote(freq, 2.0, now + i * 0.15, 'sine', 0.06);
        });

        // Sustain chord
        setTimeout(() => {
            if (this.currentMusic !== 'victory') return;
            const now2 = this.ctx.currentTime;
            [262, 330, 392, 523].forEach(freq => {
                this.playMusicNote(freq, 4, now2, 'sine', 0.04);
            });
        }, 1200);
    },

    // Game over music
    playGameOverMusic() {
        if (!this.ctx) return;
        this.stopMusic();
        this.resume();
        this.currentMusic = 'gameover';
        const now = this.ctx.currentTime;

        // Descending minor tones
        const notes = [392, 349, 311, 262, 247, 220, 196];
        notes.forEach((freq, i) => {
            this.playMusicNote(freq, 1.5, now + i * 0.4, 'sine', 0.05);
        });

        // Low drone
        const drone = this.ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 55;
        const dg = this.ctx.createGain();
        dg.gain.setValueAtTime(0, now);
        dg.gain.linearRampToValueAtTime(0.08, now + 1);
        dg.gain.setValueAtTime(0.08, now + 4);
        dg.gain.linearRampToValueAtTime(0, now + 6);
        drone.connect(dg);
        dg.connect(this.musicGain);
        drone.start(now);
        drone.stop(now + 6);
        this.musicNodes.push(drone);
    }
};
