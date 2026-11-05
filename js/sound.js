const SoundFX = {
    ctx: null,
    enabled: true,
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },
    playTone(freq, type, duration, delay = 0, gainLevel = 0.15) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        setTimeout(() => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                console.error(e);
            }
        }, delay * 1000);
    },
    click() {
        this.playTone(600, 'sine', 0.04, 0, 0.08);
    },
    step() {
        this.playTone(320, 'triangle', 0.06, 0, 0.1);
    },
    coin() {
        this.playTone(987, 'sine', 0.08, 0, 0.12);
        this.playTone(1318, 'sine', 0.18, 0.07, 0.12);
    },
    diceRoll() {
        if (!this.enabled) return;
        for (let i = 0; i < 5; i++) {
            const freq = 200 + Math.random() * 250;
            this.playTone(freq, 'square', 0.03, i * 0.06, 0.06);
        }
    },
    hit() {
        this.playTone(180, 'sawtooth', 0.15, 0, 0.2);
        this.playTone(90, 'triangle', 0.25, 0.05, 0.25);
    },
    weaknessHit() {
        this.playTone(220, 'sawtooth', 0.12, 0, 0.2);
        this.playTone(440, 'sine', 0.15, 0.08, 0.2);
        this.playTone(880, 'triangle', 0.3, 0.16, 0.25);
    },
    captureSuccess() {
        this.playTone(523, 'sine', 0.1, 0, 0.15);
        this.playTone(659, 'sine', 0.1, 0.1, 0.15);
        this.playTone(783, 'sine', 0.12, 0.2, 0.15);
        this.playTone(1046, 'sine', 0.35, 0.3, 0.2);
    },
    faint() {
        this.playTone(300, 'sawtooth', 0.15, 0, 0.15);
        this.playTone(220, 'sawtooth', 0.2, 0.1, 0.15);
        this.playTone(150, 'sawtooth', 0.35, 0.22, 0.2);
    },
    victory() {
        const notes = [523, 659, 783, 1046];
        notes.forEach((n, i) => {
            this.playTone(n, 'triangle', 0.25, i * 0.12, 0.2);
        });
    }
};

window.SoundFX = SoundFX;
