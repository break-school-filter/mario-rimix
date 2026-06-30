/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private currentBgm: {
    stop: () => void;
    intervalId: any;
  } | null = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime); // keep volume comfortable
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  private resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.15, this.ctx.currentTime);
    }
  }

  getMuted() {
    return this.isMuted;
  }

  // General helper to create basic retro synth notes
  private playTone(freq: number, duration: number, type: OscillatorType = 'square', sweepFreq?: number, delay: number = 0) {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

    if (sweepFreq) {
      osc.frequency.exponentialRampToValueAtTime(sweepFreq, this.ctx.currentTime + delay + duration);
    }

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + duration);

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);
  }

  playJump() {
    // Classic rapid pitch sweep upwards
    this.playTone(150, 0.15, 'triangle', 650);
  }

  playCoin() {
    // Double tone chime: B5 (987Hz) then E6 (1318Hz)
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // First tone (B5)
    this.playTone(987, 0.08, 'square', undefined, 0);
    // Second tone (E6) after a tiny delay
    this.playTone(1318, 0.25, 'square', undefined, 0.08);
  }

  playStomp() {
    // Low frequency crunch
    this.playTone(120, 0.12, 'sawtooth', 30);
  }

  playBreakBrick() {
    // Noise/low explosion-like sound
    this.resume();
    if (!this.ctx || this.isMuted || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 0.15; // 0.15s duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.15);
  }

  playPowerupAppears() {
    // Rapid arpeggio of rising clean notes
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.06, 'triangle', undefined, idx * 0.05);
    });
  }

  playPowerupCollect() {
    // Beautiful upward scale
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const notes = [330, 392, 659, 523, 587, 784, 1047];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.08, 'square', undefined, idx * 0.04);
    });
  }

  playHurt() {
    // Pain sound: retro metallic pitch buzz
    this.playTone(220, 0.2, 'sawtooth', 80);
  }

  playFireball() {
    // Fireball throwing sound: small high-pitched chirp
    this.playTone(600, 0.08, 'triangle', 200);
  }

  playDeath() {
    // Sad chromatic scale descending, then game over motif
    this.resume();
    if (!this.ctx || this.isMuted) return;

    // Stop current music
    this.stopBgm();

    const notes = [494, 466, 440, 392, 349, 293, 220];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.15, 'square', undefined, idx * 0.12);
    });
  }

  playVictory() {
    // Joyful classic victory theme
    this.resume();
    if (!this.ctx || this.isMuted) return;

    this.stopBgm();

    const notes = [
      { f: 523, d: 0.1 }, // C5
      { f: 659, d: 0.1 }, // E5
      { f: 784, d: 0.1 }, // G5
      { f: 1047, d: 0.15 }, // C6
      { f: 1318, d: 0.15 }, // E6
      { f: 1568, d: 0.3 }, // G6 (long)
      { f: 1568, d: 0.15 }, // G6
      { f: 1760, d: 0.3 }, // A6 (long)
    ];

    let currentDelay = 0;
    notes.forEach((note) => {
      this.playTone(note.f, note.d, 'square', undefined, currentDelay);
      currentDelay += note.d + 0.02;
    });
  }

  playBgm(type: 'overworld' | 'underworld' | 'castle') {
    this.resume();
    if (!this.ctx) return;

    // Stop any currently running background music
    this.stopBgm();

    if (this.isMuted) return;

    // Define retro melody note sequences (notes and step lengths)
    // C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
    // C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00
    let notes: number[] = [];
    let beatTime = 0.16; // 16th note speed

    if (type === 'overworld') {
      // Bouncing, happy 8-bit theme
      notes = [
        659, 659, 0, 659, 0, 523, 659, 0,
        784, 0, 0, 0, 392, 0, 0, 0,
        523, 0, 0, 392, 0, 0, 330, 0,
        0, 440, 0, 494, 0, 466, 440, 0,
        392, 659, 784, 880, 0, 698, 784, 0,
        659, 0, 523, 587, 494, 0, 0, 0
      ];
    } else if (type === 'underworld') {
      // Heavy, mysterious cave theme
      beatTime = 0.22;
      notes = [
        261, 523, 440, 880, 466, 932, 0, 0,
        261, 523, 440, 880, 466, 932, 0, 0,
        349, 698, 587, 1174, 622, 1244, 0, 0,
        349, 698, 587, 1174, 622, 1244, 0, 0,
        196, 392, 330, 659, 349, 698, 0, 0,
        196, 196, 220, 246, 261, 0, 0, 0
      ];
    } else {
      // Intense, suspenseful castle theme
      beatTime = 0.15;
      notes = [
        220, 293, 311, 329, 349, 0, 349, 0,
        349, 329, 311, 293, 220, 0, 0, 0,
        220, 293, 311, 329, 349, 0, 349, 0,
        440, 415, 392, 369, 329, 0, 0, 0,
        329, 392, 440, 523, 587, 0, 587, 0,
        587, 523, 494, 440, 392, 0, 0, 0
      ];
    }

    let currentStep = 0;

    const playStep = () => {
      if (!this.ctx || this.isMuted) return;
      const freq = notes[currentStep];
      if (freq > 0) {
        // Play small retro sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Overworld is bright (square), Underworld is bassy (triangle/sine), Castle is aggressive (sawtooth)
        osc.type = type === 'overworld' ? 'square' : (type === 'underworld' ? 'triangle' : 'triangle');
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime); // keep BGM very background
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beatTime - 0.02);

        osc.connect(gain);
        if (this.masterGain) {
          gain.connect(this.masterGain);
        }

        osc.start();
        osc.stop(this.ctx.currentTime + beatTime - 0.01);
      }
      currentStep = (currentStep + 1) % notes.length;
    };

    // Run interval
    const intervalId = setInterval(playStep, beatTime * 1000);

    this.currentBgm = {
      stop: () => {
        clearInterval(intervalId);
      },
      intervalId
    };
  }

  stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm = null;
    }
  }
}

export const audio = new AudioSynth();
