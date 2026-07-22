type SoundName = 'attack' | 'ultimate' | 'hit' | 'block' | 'victory' | 'defeat' | 'turn_tick' | 'button_click' | 'countdown_warning';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  setVolume(v: number) { this.volume = Math.max(0, Math.min(1, v)); }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volumeMod = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(this.volume * volumeMod, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  private playNoise(duration: number, volumeMod = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.volume * volumeMod * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  }

  play(name: SoundName) {
    switch (name) {
      case 'attack':
        this.playTone(400, 0.1, 'square', 1);
        setTimeout(() => this.playTone(600, 0.08, 'square', 0.7), 50);
        this.playNoise(0.1, 0.5);
        break;
      case 'ultimate':
        this.playTone(200, 0.3, 'sawtooth', 0.8);
        setTimeout(() => this.playTone(300, 0.25, 'sawtooth', 0.6), 100);
        setTimeout(() => this.playTone(500, 0.2, 'sawtooth', 0.5), 200);
        this.playNoise(0.3, 0.6);
        break;
      case 'hit':
        this.playNoise(0.08, 0.8);
        this.playTone(150, 0.08, 'square', 0.6);
        break;
      case 'block':
        this.playTone(800, 0.06, 'sine', 0.4);
        setTimeout(() => this.playTone(1200, 0.08, 'sine', 0.3), 60);
        break;
      case 'victory':
        this.playTone(523, 0.15, 'square', 0.6);
        setTimeout(() => this.playTone(659, 0.15, 'square', 0.6), 150);
        setTimeout(() => this.playTone(784, 0.3, 'square', 0.6), 300);
        break;
      case 'defeat':
        this.playTone(400, 0.2, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(350, 0.2, 'sawtooth', 0.5), 200);
        setTimeout(() => this.playTone(300, 0.4, 'sawtooth', 0.5), 400);
        break;
      case 'turn_tick':
        this.playTone(1000, 0.03, 'sine', 0.2);
        break;
      case 'button_click':
        this.playTone(1200, 0.03, 'sine', 0.15);
        break;
      case 'countdown_warning':
        this.playTone(800, 0.1, 'square', 0.3);
        break;
    }
  }
}

export const soundManager = new SoundManager();
