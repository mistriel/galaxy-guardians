/** Tiny WebAudio bleeps. No audio files, no network. */

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }

  blip({ freq = 440, dur = 0.08, type = 'square', vol = 0.2, slide = 0 }) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(48, freq + slide), t + dur);
    }
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur = 0.28, vol = 0.45, cutoff = 900) {
    if (this.muted || !this.ctx) return;
    const rate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * dur));
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  shoot() {
    this.blip({
      freq: 680 + Math.random() * 90,
      dur: 0.045,
      type: 'square',
      vol: 0.07,
      slide: -360,
    });
  }

  allyShot() {
    this.blip({
      freq: 920 + Math.random() * 70,
      dur: 0.03,
      type: 'square',
      vol: 0.025,
      slide: -240,
    });
  }

  enemyShot() {
    this.blip({ freq: 210, dur: 0.07, type: 'sawtooth', vol: 0.05, slide: -80 });
  }

  maulWind() {
    this.blip({ freq: 92, dur: 0.2, type: 'sawtooth', vol: 0.06, slide: 50 });
  }

  maul() {
    this.noise(0.18, 0.55, 220);
    this.blip({ freq: 64, dur: 0.22, type: 'square', vol: 0.11, slide: -28 });
  }

  explode() {
    this.noise(0.22, 0.42, 780);
    this.blip({ freq: 130, dur: 0.16, type: 'sawtooth', vol: 0.08, slide: -70 });
  }

  bigBoom() {
    this.noise(0.42, 0.6, 520);
    this.blip({ freq: 70, dur: 0.32, type: 'sawtooth', vol: 0.12, slide: -40 });
  }

  pop() {
    this.blip({ freq: 220, dur: 0.06, type: 'square', vol: 0.06, slide: 280 });
  }

  hurt() {
    this.blip({ freq: 150, dur: 0.1, type: 'square', vol: 0.1, slide: -90 });
  }

  pickup() {
    this.blip({ freq: 520, dur: 0.07, type: 'triangle', vol: 0.08 });
    this.blip({ freq: 780, dur: 0.1, type: 'triangle', vol: 0.07 });
  }

  wave() {
    this.blip({ freq: 392, dur: 0.08, type: 'square', vol: 0.06 });
    this.blip({ freq: 523, dur: 0.1, type: 'square', vol: 0.06 });
    this.blip({ freq: 659, dur: 0.12, type: 'triangle', vol: 0.05 });
  }

  ui() {
    this.blip({ freq: 660, dur: 0.04, type: 'square', vol: 0.05 });
  }
}
