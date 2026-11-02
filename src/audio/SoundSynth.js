export class SoundSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq = 440, duration = 0.12, type = 'sine', gain = 0.035) {
    if (this.muted) return;
    this.init();
    const oscillator = this.ctx.createOscillator();
    const volume = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);
    volume.gain.setValueAtTime(gain, this.ctx.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    oscillator.connect(volume).connect(this.ctx.destination);
    oscillator.start();
    oscillator.stop(this.ctx.currentTime + duration);
  }

  play(name) {
    const sounds = {
      decoy: [620, 0.24, 'sine', 0.05],
      jam: [150, 0.35, 'sawtooth', 0.035],
      hack: [480, 0.1, 'square', 0.018],
      alert: [230, 0.32, 'triangle', 0.035],
      success: [760, 0.35, 'sine', 0.04],
      boss: [92, 0.75, 'sawtooth', 0.045],
      fail: [100, 0.5, 'sawtooth', 0.04]
    };
    const sound = sounds[name];
    if (sound) this.tone(...sound);
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
}
