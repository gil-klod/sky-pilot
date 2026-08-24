export class SoundManager {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.windGain = null;
    this.windNode = null;
    this.started = false;
  }

  ensureStarted() {
    if (this.started) return;
    this.started = true;

    this.ctx = new AudioContext();
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 80;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 400;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineOsc.start();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = noiseBuffer;
    this.windNode.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 500;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.windNode.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windNode.start();
  }

  resume() {
    this.ensureStarted();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  update({ aircraftType, throttle, speed, onGround, stallWarning }) {
    if (!this.ctx) return;

    const baseFreq = aircraftType === "jet" ? 120 : aircraftType === "helicopter" ? 90 : 70;
    const freq = baseFreq + throttle * (aircraftType === "jet" ? 180 : 100);
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(onGround ? throttle * 0.04 : 0.025 + throttle * 0.05, this.ctx.currentTime, 0.1);

    const windVol = Math.min(0.08, speed * 0.0012);
    this.windGain.gain.setTargetAtTime(windVol, this.ctx.currentTime, 0.15);

    if (stallWarning && Math.floor(this.ctx.currentTime * 2) % 2 === 0) {
      this.engineGain.gain.setTargetAtTime(0.09, this.ctx.currentTime, 0.02);
    }
  }

  playTone(freq, duration, type = "sine", volume = 0.15) {
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playRing() {
    this.playTone(880, 0.12, "sine", 0.12);
    setTimeout(() => this.playTone(1175, 0.15, "sine", 0.1), 80);
  }

  playCoin() {
    this.playTone(1318, 0.08, "triangle", 0.1);
    setTimeout(() => this.playTone(1760, 0.1, "sine", 0.08), 50);
  }

  playWaypoint() {
    this.playTone(660, 0.1, "triangle", 0.1);
    setTimeout(() => this.playTone(990, 0.12, "triangle", 0.08), 70);
  }

  playMissionComplete() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.playTone(f, 0.2, "sine", 0.12), i * 120));
  }

  playAutopilot(on) {
    this.playTone(on ? 440 : 330, 0.08, "square", 0.06);
  }

  playCrash() {
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }
}
