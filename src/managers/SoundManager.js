import { zzfx, zzfxX } from "../lib/zzfx.js";

export class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.muted = false;
        this.context = zzfxX; // Expose for resume logic

        // Pre-defined ZzFX sound parameters
        // [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]
        this.sounds = {
            shoot: [1.03, 0, 246, 0.02, 0.04, 0.16, 0, 0, -5.6, 0, 0, 0, 0, 0, 0, 0, 0, 0.76, 0.08, 0], // Pew
            hit: [1.1, 0, 110, 0, 0.07, 0.14, 3, 0.8, -4.7, -4.3, 0, 0, 0, 2, 0, 0, 0, 0.57, 0.06, 0], // Thud/Crash
            explosion: [1.6, 0, 48, 0, 0.32, 0.81, 3, 1.8, 0.6, 0, 0, 0, 0, 1.6, 0, 0.5, 0.08, 0.77, 0.05, 0], // Boom
            powerup: [1.02, 0, 397, 0.1, 0.28, 0.34, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0.52, 0.05, 0], // Ching
            jump: [0.7, 0, 280, 0.01, 0.05, 0.1, 0, 0, 3.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.08, 0], // Jump
            gameover: [1.1, 0, 222, 0.09, 0.66, 0.77, 1, 2.7, 0, 0, 0, 0, 0, 0.3, 0, 0, 0.23, 0.56, 0.02, 0], // Lose
            win: [1.02, 0, 437, 0.08, 0.23, 0.46, 0, 0, 0.1, 0, 0, 0, 0.07, 0, 0, 0, 0.05, 0.59, 0.05, 0], // Win fanfare
            shield: [1.0, 0, 220, 0.1, 0.5, 0.5, 2, 1, 1, 0, 0, 0, 0, 0.1, 15, 0, 0.1, 0.8, 0.2, 0] // Shield activation
        };
    }

    play(key) {
        if (this.muted) return;
        const params = this.sounds[key];
        if (params) {
            zzfx(...params);
        } else {
            console.warn(`Sound '${key}' not found.`);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    ensureAudioContext() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    // --- BGM System ---

    initBGM() {
        if (this.bgmGain) return;
        this.bgmGain = this.context.createGain();
        this.bgmGain.gain.value = 0.3; // Lower volume for BGM
        this.bgmGain.connect(this.context.destination);
    }

    playBGM(key) {
        if (this.currentBgmKey === key) return;
        this.stopBGM();
        this.currentBgmKey = key;
        this.bgmNoteIndex = 0;
        this.bgmNextNoteTime = this.context.currentTime;
        this.initBGM();

        this.bgmTimer = setInterval(() => this.scheduler(), 100);
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.currentBgmKey = null;
    }

    scheduler() {
        // Simple lookahead scheduler
        while (this.bgmNextNoteTime < this.context.currentTime + 0.2) {
            this.scheduleNote();
        }
    }

    scheduleNote() {
        const melodies = {
            "main": [
                // Pentatonic Arpeggio (C D E G A)
                { f: 261.63, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 392.00, d: 0.2 }, { f: 523.25, d: 0.4 },
                { f: 392.00, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 293.66, d: 0.4 },
                { f: 261.63, d: 0.2 }, { f: 293.66, d: 0.2 }, { f: 329.63, d: 0.2 }, { f: 261.63, d: 0.4 }
            ],
            "boss": [
                // Fast Tension
                { f: 110, d: 0.1 }, { f: 0, d: 0.1 }, { f: 110, d: 0.1 }, { f: 123, d: 0.1 },
                { f: 110, d: 0.1 }, { f: 0, d: 0.1 }, { f: 82, d: 0.2 },
                { f: 110, d: 0.1 }, { f: 0, d: 0.1 }, { f: 110, d: 0.1 }, { f: 130, d: 0.1 },
            ]
        };

        const sequence = melodies[this.currentBgmKey];
        if (!sequence) return;

        const note = sequence[this.bgmNoteIndex % sequence.length];
        if (note.f > 0 && !this.muted) {
            this.playTone(note.f, note.d, this.bgmNextNoteTime);
        }

        this.bgmNextNoteTime += note.d;
        this.bgmNoteIndex++;
    }

    playTone(freq, duration, time) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // Instrument Type
        osc.type = this.currentBgmKey === "boss" ? "sawtooth" : "sine";

        // Envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.frequency.value = freq;

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + duration);
    }
}
