/**
 * BioAcousticAudio.js — Procedural Web Audio API Bio-Acoustic Engine for DinoVerse 3D.
 *
 * - Master bus → soft-knee compressor, with a procedural outdoor convolution reverb send.
 * - 12 species-specific vocalization recipes (infrasonic T. rex boom, bellows, honks, trombone
 *   crest, raptor chirps, hiss-growls, pterosaur screeches, underwater sonar, bird song…)
 *   with a `distance` model (far calls are darker, quieter and wetter) and `intensity`.
 * - Mass-scaled seismic footsteps (single, walk-synced, or sequences), wing-flap whooshes.
 * - Era ambience beds (wind, insects, surf, underwater, volcanic rumble) + distant herd calls.
 * - Narrator: Google Cloud Text-to-Speech **Chirp 3 HD** voices via the same-origin /api/tts proxy
 *   (decoded through Web Audio so playback never trips autoplay rules), with an automatic
 *   fallback to the best available device voice (Web Speech API).
 */

const PREFS_KEY = 'dinoverse.audio.v1';
const DEFAULT_CHIRP_VOICE = 'en-US-Chirp3-HD-Aoede';
const NARRATION_CACHE_LIMIT = 24;

export const CHIRP_VOICE_PRESETS = [
  { id: 'en-US-Chirp3-HD-Aoede', label: 'Aoede — warm storyteller (Chirp 3 HD)' },
  { id: 'en-US-Chirp3-HD-Leda', label: 'Leda — bright & friendly (Chirp 3 HD)' },
  { id: 'en-US-Chirp3-HD-Kore', label: 'Kore — calm teacher (Chirp 3 HD)' },
  { id: 'en-US-Chirp3-HD-Zephyr', label: 'Zephyr — playful (Chirp 3 HD)' },
  { id: 'en-US-Chirp3-HD-Puck', label: 'Puck — energetic guide (Chirp 3 HD)' },
  { id: 'en-US-Chirp3-HD-Charon', label: 'Charon — deep documentary (Chirp 3 HD)' },
  { id: 'en-US-Chirp3-HD-Fenrir', label: 'Fenrir — bold ranger (Chirp 3 HD)' },
  { id: 'en-US-Chirp3-HD-Orus', label: 'Orus — gentle narrator (Chirp 3 HD)' },
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);

export class BioAcousticAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.narrationBus = null;
    this.reverb = null;
    this.reverbReturn = null;
    this.compressor = null;

    this.muted = false;
    this.volume = 0.9;
    this.ambienceEnabled = true;
    this.unlocked = false;

    this.isSpeaking = false;
    this.narrationMode = 'chirp'; // 'chirp' | 'device'
    this.voiceName = DEFAULT_CHIRP_VOICE;
    this.ttsStatus = null;
    this._ttsStatusPromise = null;
    this._narrationCache = new Map();
    this._narrationAbort = null;
    this._narrationSource = null;
    this._narrationToken = 0;

    this._ambience = null;
    this._idleTimer = null;
    this._idleSpeciesGetter = null;
    this._lastStepAt = -1;
    this._noiseBuffers = new Map();

    /** Hook: (species, durationSeconds, kind) → used for 3D lip-sync. */
    this.onVocalize = null;

    this._loadPrefs();
  }

  // ---------------------------------------------------------------------------
  // Preferences & lifecycle
  // ---------------------------------------------------------------------------
  _loadPrefs() {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (typeof prefs.ambience === 'boolean') this.ambienceEnabled = prefs.ambience;
      if (typeof prefs.voice === 'string' && prefs.voice.length < 64) this.voiceName = prefs.voice;
      if (prefs.mode === 'device' || prefs.mode === 'chirp') this.narrationMode = prefs.mode;
    } catch {
      /* ignore corrupt prefs */
    }
  }

  _savePrefs() {
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ ambience: this.ambienceEnabled, voice: this.voiceName, mode: this.narrationMode })
      );
    } catch {
      /* storage unavailable */
    }
  }

  /** Call from any user gesture to satisfy autoplay policies. */
  unlock() {
    const ctx = this._ensureContext();
    this.unlocked = Boolean(ctx);
    return this.unlocked;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this._buildGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _buildGraph() {
    const ctx = this.ctx;
    // Final safety stage: smooth tanh soft-limiter guarantees |sample| < 1 even for 40-tonne bellows
    this.limiter = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    const drive = 1.35;
    const norm = Math.tanh(drive);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = (Math.tanh(x * drive) / norm) * 0.985;
    }
    this.limiter.curve = curve;
    this.limiter.oversample = '2x';
    this.limiter.connect(ctx.destination);

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.22;
    this.compressor.connect(this.limiter);

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.compressor);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);

    this.narrationBus = ctx.createGain();
    this.narrationBus.gain.value = 1;
    this.narrationBus.connect(this.master);

    // Outdoor valley reverb: procedurally generated stereo impulse response
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._makeImpulseResponse(2.8, 2.4);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.42;
    this.reverb.connect(this.reverbReturn);
    this.reverbReturn.connect(this.sfxBus);
    this._lastStepAt = -1;
  }

  _makeImpulseResponse(seconds, decay) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Early reflections cluster then diffuse tail; slight low-pass via one-pole smoothing
        const white = Math.random() * 2 - 1;
        last = last * 0.72 + white * 0.28;
        const early = i < ctx.sampleRate * 0.08 ? 1.6 : 1.0;
        data[i] = last * Math.pow(1 - t, decay) * early * (ch === 0 ? 1 : 0.92);
      }
    }
    return buffer;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : this.volume, now + 0.12);
    }
    if (this.muted) this.stopNarration();
  }

  setAmbienceEnabled(enabled) {
    this.ambienceEnabled = Boolean(enabled);
    this._savePrefs();
    if (!this.ambienceEnabled) {
      this.stopAmbience();
      this.stopIdleCalls();
    }
  }

  setVoice(voiceId) {
    if (typeof voiceId !== 'string') return;
    if (voiceId === 'device') {
      this.narrationMode = 'device';
    } else {
      this.narrationMode = 'chirp';
      this.voiceName = voiceId;
    }
    this._savePrefs();
  }

  // ---------------------------------------------------------------------------
  // Low-level synthesis helpers
  // ---------------------------------------------------------------------------
  _noise(kind = 'white', seconds = 2.0) {
    const key = `${kind}:${seconds}`;
    if (this._noiseBuffers.has(key)) return this._noiseBuffers.get(key);
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') {
        d[i] = w;
      } else if (kind === 'pink') {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
      } else {
        brown = (brown + 0.02 * w) / 1.02;
        d[i] = brown * 3.2;
      }
    }
    this._noiseBuffers.set(key, buffer);
    return buffer;
  }

  /** Voice bus: distance darkens/attenuates and pushes the sound into the reverb. */
  _bus({ distance = 0, gain = 1 } = {}) {
    const ctx = this.ctx;
    const d = clamp(distance, 0, 1);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 9000 * Math.pow(0.08, d);
    lp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = gain * (1 - 0.72 * d);
    lp.connect(g);
    g.connect(this.sfxBus);
    const send = ctx.createGain();
    send.gain.value = 0.18 + 0.7 * d;
    g.connect(send);
    send.connect(this.reverb);
    return lp;
  }

  _env(param, t0, peak, attack, hold, release, floor = 0.0001) {
    param.cancelScheduledValues(t0);
    param.setValueAtTime(floor, t0);
    param.linearRampToValueAtTime(peak, t0 + attack);
    param.setValueAtTime(peak, t0 + attack + Math.max(0, hold));
    param.exponentialRampToValueAtTime(floor, t0 + attack + Math.max(0, hold) + release);
  }

  _glide(param, t0, points) {
    param.cancelScheduledValues(t0);
    param.setValueAtTime(Math.max(1, points[0][1]), t0);
    for (let i = 1; i < points.length; i++) {
      param.exponentialRampToValueAtTime(Math.max(1, points[i][1]), t0 + points[i][0]);
    }
  }

  _osc({ type = 'sawtooth', freq = 100, t0, dur, out, gain = 1, detune = 0, glide = null }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    if (glide) this._glide(osc.frequency, t0, glide);
    else osc.frequency.setValueAtTime(freq, t0);
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    return { osc, gain: g };
  }

  _lfo({ freq, depth, target, t0, dur, type = 'sine' }) {
    const ctx = this.ctx;
    const lfo = ctx.createOscillator();
    lfo.type = type;
    lfo.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = depth;
    lfo.connect(g);
    g.connect(target);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
    return lfo;
  }

  _formants(source, out, formants) {
    const ctx = this.ctx;
    formants.forEach(({ f, q = 7, g = 1 }) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = g;
      source.connect(bp);
      bp.connect(gg);
      gg.connect(out);
    });
  }

  _noiseBurst({ kind = 'white', t0, dur, out, f = 1200, q = 1.2, peak = 0.3, attack = 0.02, release = null, type = 'bandpass', sweep = null }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noise(kind, 3.0);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    if (sweep) this._glide(filt.frequency, t0, sweep);
    else filt.frequency.setValueAtTime(f, t0);
    const g = ctx.createGain();
    this._env(g.gain, t0, peak, attack, Math.max(0, dur - attack - (release ?? dur * 0.5)), release ?? dur * 0.5);
    src.connect(filt);
    filt.connect(g);
    g.connect(out);
    src.start(t0, Math.random() * 2.5);
    src.stop(t0 + dur + 0.1);
    return { src, filt, gain: g };
  }

  // ---------------------------------------------------------------------------
  // Vocalization recipes (each returns the call duration in seconds)
  // ---------------------------------------------------------------------------
  _recipeTrexInfrasonic(p, bus, t0, I) {
    const base = p.baseFreq || 42;
    const dur = (p.roarDuration || 2.6) * (0.8 + 0.3 * I);
    // Closed-mouth infrasonic boom: fundamental + octave, pulsed like a crocodilian
    const body = this.ctx.createGain();
    this._env(body.gain, t0, 0.6 * I, 0.35, dur * 0.45, dur * 0.4);
    body.connect(bus);
    this._osc({ type: 'sine', t0, dur, out: body, gain: 0.9, glide: [[0, base * 0.9], [dur * 0.4, base * 1.08], [dur, base * 0.8]] });
    this._osc({ type: 'triangle', t0, dur, out: body, gain: 0.45, glide: [[0, base * 1.8], [dur * 0.4, base * 2.1], [dur, base * 1.6]] });
    const pulse = this.ctx.createGain();
    pulse.gain.value = 0.55;
    this._lfo({ freq: 6.5 + 2 * I, depth: 0.45, target: pulse.gain, t0, dur });
    const growl = this._osc({ type: 'sawtooth', t0, dur, out: pulse, gain: 0.3, glide: [[0, base * 1.6], [dur * 0.5, base * 2.2], [dur, base * 1.3]] });
    this._lfo({ freq: 31, depth: base * 0.35, target: growl.osc.frequency, t0, dur });
    const throat = this.ctx.createGain();
    this._formants(pulse, throat, [{ f: 140, q: 4, g: 1.2 }, { f: 320, q: 6, g: 0.7 }, { f: 760, q: 8, g: 0.35 }]);
    throat.connect(bus);
    // Sub rumble and final exhale
    this._noiseBurst({ kind: 'brown', t0, dur, out: bus, f: 90, q: 0.8, type: 'lowpass', peak: 0.3 * I, attack: 0.4 });
    this._noiseBurst({ kind: 'pink', t0: t0 + dur * 0.72, dur: dur * 0.45, out: bus, f: 420, q: 0.9, peak: 0.22 * I, attack: 0.05 });
    return dur + 0.4;
  }

  _recipeRoar(p, bus, t0, I, variant = 'deep') {
    const base = p.baseFreq || (variant === 'deep' ? 68 : 110);
    const dur = (p.roarDuration || 2.0) * (0.85 + 0.25 * I);
    const voice = this.ctx.createGain();
    this._env(voice.gain, t0, 0.8 * I, 0.12, dur * 0.5, dur * 0.42);
    const source = this.ctx.createGain();
    const osc = this._osc({ type: 'sawtooth', t0, dur, out: source, gain: 0.6, glide: [[0, base * 0.8], [dur * 0.25, base * 1.35], [dur * 0.6, base * 1.15], [dur, base * 0.7]] });
    this._osc({ type: 'square', t0, dur, out: source, gain: 0.18, glide: [[0, base * 0.4], [dur * 0.25, base * 0.67], [dur, base * 0.35]] });
    this._lfo({ freq: p.modFreq || 28, depth: base * 0.22, target: osc.osc.frequency, t0, dur });
    const rough = this.ctx.createGain();
    rough.gain.value = 0.6;
    this._lfo({ freq: variant === 'deep' ? 34 : 46, depth: 0.4, target: rough.gain, t0, dur, type: 'square' });
    source.connect(rough);
    this._formants(rough, voice, [
      { f: base * 3.2, q: 5, g: 1.0 },
      { f: base * 6.5, q: 7, g: 0.6 },
      { f: base * 11, q: 9, g: 0.35 },
    ]);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = base * 3;
    rough.connect(lp);
    lp.connect(voice);
    voice.connect(bus);
    this._noiseBurst({ kind: 'pink', t0, dur, out: bus, f: base * 7, q: 1.0, peak: 0.16 * I, attack: 0.08 });
    this._noiseBurst({ kind: 'pink', t0: t0 + dur * 0.8, dur: dur * 0.5, out: bus, f: 600, q: 0.8, peak: 0.12 * I, attack: 0.04 });
    return dur + 0.35;
  }

  _recipeSauropodBellow(p, bus, t0, I) {
    const base = p.baseFreq || 36;
    const dur = (p.roarDuration || 3.2) * (0.9 + 0.2 * I);
    const voice = this.ctx.createGain();
    this._env(voice.gain, t0, 0.5 * I, 0.6, dur * 0.4, dur * 0.5);
    voice.connect(bus);
    this._osc({ type: 'sawtooth', t0, dur, out: voice, gain: 0.3, glide: [[0, base * 0.85], [dur * 0.45, base * 1.15], [dur, base * 0.75]] });
    this._osc({ type: 'triangle', t0, dur, out: voice, gain: 0.55, detune: -8, glide: [[0, base * 1.7], [dur * 0.45, base * 2.25], [dur, base * 1.5]] });
    this._osc({ type: 'sine', t0, dur, out: voice, gain: 0.55, glide: [[0, base * 0.85], [dur * 0.45, base * 1.15], [dur, base * 0.75]] });
    const nasal = this.ctx.createGain();
    const nasalSrc = this._osc({ type: 'sawtooth', t0, dur, out: nasal, gain: 0.3, glide: [[0, base * 1.7], [dur * 0.45, base * 2.25], [dur, base * 1.5]] });
    this._lfo({ freq: 5.2, depth: base * 0.12, target: nasalSrc.osc.frequency, t0, dur });
    this._formants(nasal, voice, [{ f: 210, q: 6, g: 0.9 }, { f: 480, q: 8, g: 0.45 }]);
    this._noiseBurst({ kind: 'brown', t0, dur, out: bus, f: 120, q: 0.7, type: 'lowpass', peak: 0.22 * I, attack: 0.5 });
    return dur + 0.6;
  }

  _recipeWhipBellow(p, bus, t0, I) {
    const dur = this._recipeSauropodBellow({ ...p, baseFreq: p.baseFreq || 40, roarDuration: 1.9 }, bus, t0, I * 0.85);
    // Supersonic tail crack: whoosh → crack → slap echo
    const crackAt = t0 + 1.25;
    this._noiseBurst({ kind: 'white', t0: crackAt - 0.42, dur: 0.42, out: bus, peak: 0.28 * I, attack: 0.25, q: 1.5, sweep: [[0, 350], [0.42, 1900]] });
    this._noiseBurst({ kind: 'white', t0: crackAt, dur: 0.05, out: bus, f: 2600, q: 0.5, peak: 0.7 * I, attack: 0.002, release: 0.045 });
    this._osc({ type: 'triangle', t0: crackAt, dur: 0.2, out: bus, gain: 0.45 * I, glide: [[0, 1900], [0.18, 70]] });
    this._noiseBurst({ kind: 'pink', t0: crackAt + 0.02, dur: 0.35, out: bus, f: 900, q: 0.8, peak: 0.3 * I, attack: 0.005 });
    return Math.max(dur, 1.9);
  }

  _recipeHonk(p, bus, t0, I) {
    const base = p.baseFreq || 180;
    const honks = 2 + Math.round(I);
    let t = t0;
    for (let i = 0; i < honks; i++) {
      const d = rand(0.32, 0.5);
      const voice = this.ctx.createGain();
      this._env(voice.gain, t, 1.6 * I, 0.05, d * 0.55, d * 0.4);
      voice.connect(bus);
      const src = this.ctx.createGain();
      const o = this._osc({ type: 'sawtooth', t0: t, dur: d, out: src, gain: 1.4, glide: [[0, base * 0.92], [d * 0.3, base * 1.1], [d, base * 0.88]] });
      this._lfo({ freq: 24, depth: base * 0.08, target: o.osc.frequency, t0: t, dur: d });
      this._formants(src, voice, [{ f: 620, q: 5, g: 1.4 }, { f: 1450, q: 7, g: 0.8 }, { f: 2500, q: 9, g: 0.35 }]);
      const bodyLp = this.ctx.createBiquadFilter();
      bodyLp.type = 'lowpass';
      bodyLp.frequency.value = base * 4;
      src.connect(bodyLp);
      bodyLp.connect(voice);
      this._noiseBurst({ kind: 'pink', t0: t, dur: d, out: bus, f: 1800, q: 1.2, peak: 0.12 * I, attack: 0.03 });
      t += d + rand(0.12, 0.26);
    }
    return t - t0 + 0.3;
  }

  _recipeTrombone(p, bus, t0, I) {
    const base = p.baseFreq || 148;
    const dur = (p.roarDuration || 2.8) * (0.9 + 0.2 * I);
    const voice = this.ctx.createGain();
    this._env(voice.gain, t0, 0.8 * I, 0.45, dur * 0.45, dur * 0.45);
    voice.connect(bus);
    const src = this.ctx.createGain();
    const o = this._osc({ type: 'sawtooth', t0, dur, out: src, gain: 0.5, glide: [[0, base * 0.97], [dur * 0.35, base * 1.03], [dur, base * 0.84]] });
    this._lfo({ freq: 4.6, depth: base * 0.015, target: o.osc.frequency, t0, dur });
    this._osc({ type: 'sine', t0, dur, out: voice, gain: 0.5, glide: [[0, base * 0.97], [dur * 0.35, base * 1.03], [dur, base * 0.84]] });
    // Hollow 1.8 m tube resonances (odd harmonics)
    this._formants(src, voice, [
      { f: base, q: 12, g: 1.2 },
      { f: base * 3, q: 14, g: 0.7 },
      { f: base * 5, q: 16, g: 0.4 },
      { f: base * 7, q: 18, g: 0.2 },
    ]);
    this._noiseBurst({ kind: 'pink', t0, dur, out: bus, f: base * 3, q: 2.5, peak: 0.1 * I, attack: 0.3 });
    return dur + 0.6;
  }

  _recipeCrestHoot(p, bus, t0, I) {
    const base = p.baseFreq || 260;
    let t = t0;
    for (let i = 0; i < 3; i++) {
      const d = 0.34;
      const voice = this.ctx.createGain();
      this._env(voice.gain, t, 0.65 * I, 0.04, d * 0.5, d * 0.5);
      voice.connect(bus);
      this._osc({ type: 'sine', t0: t, dur: d, out: voice, gain: 0.8, glide: [[0, base * 1.25], [d * 0.6, base * 0.95], [d, base * 0.8]] });
      this._osc({ type: 'triangle', t0: t, dur: d, out: voice, gain: 0.25, glide: [[0, base * 2.5], [d, base * 1.6]] });
      t += d + 0.1;
    }
    const roarDur = this._recipeRoar({ ...p, baseFreq: base * 0.4, roarDuration: 1.3 }, bus, t, I * 0.8, 'mid');
    return t - t0 + roarDur;
  }

  _recipeRaptorChirp(p, bus, t0, I) {
    const base = p.baseFreq || 1500;
    const count = 4 + Math.round(rand(0, 3));
    let t = t0;
    for (let i = 0; i < count; i++) {
      const d = rand(0.06, 0.11);
      const f0 = base * rand(0.8, 1.2);
      const voice = this.ctx.createGain();
      this._env(voice.gain, t, 0.5 * I, 0.008, d * 0.4, d * 0.6);
      voice.connect(bus);
      this._osc({ type: 'sine', t0: t, dur: d, out: voice, gain: 0.8, glide: [[0, f0 * 0.7], [d * 0.5, f0 * 1.35], [d, f0 * 0.9]] });
      this._osc({ type: 'triangle', t0: t, dur: d, out: voice, gain: 0.25, glide: [[0, f0 * 1.4], [d * 0.5, f0 * 2.7], [d, f0 * 1.8]] });
      t += d + rand(0.05, 0.16);
    }
    if (I > 0.9) {
      // Alarm shriek with harsh rattle
      const d = 0.55;
      const voice = this.ctx.createGain();
      this._env(voice.gain, t, 0.55 * I, 0.03, d * 0.5, d * 0.5);
      voice.connect(bus);
      const o = this._osc({ type: 'sawtooth', t0: t, dur: d, out: voice, gain: 0.35, glide: [[0, base * 0.5], [d * 0.3, base * 0.9], [d, base * 0.45]] });
      this._lfo({ freq: 38, depth: base * 0.12, target: o.osc.frequency, t0: t, dur: d });
      this._noiseBurst({ kind: 'white', t0: t, dur: d, out: bus, f: base * 1.6, q: 2.2, peak: 0.12 * I, attack: 0.02 });
      t += d;
    }
    return t - t0 + 0.25;
  }

  _recipeHissGrowl(p, bus, t0, I) {
    const base = p.baseFreq || 85;
    const hissDur = 0.9;
    const hiss = this._noiseBurst({ kind: 'white', t0, dur: hissDur, out: bus, f: 3600, q: 0.9, peak: 0.32 * I, attack: 0.12 });
    this._lfo({ freq: 11, depth: 0.1, target: hiss.gain.gain, t0, dur: hissDur });
    const gT = t0 + 0.55;
    const dur = (p.roarDuration || 1.8) * (0.9 + 0.2 * I);
    const voice = this.ctx.createGain();
    this._env(voice.gain, gT, 0.7 * I, 0.18, dur * 0.45, dur * 0.45);
    voice.connect(bus);
    const src = this.ctx.createGain();
    const o = this._osc({ type: 'sawtooth', t0: gT, dur, out: src, gain: 0.55, glide: [[0, base * 0.9], [dur * 0.4, base * 1.2], [dur, base * 0.7]] });
    this._lfo({ freq: p.modFreq || 14, depth: base * 0.3, target: o.osc.frequency, t0: gT, dur });
    const rough = this.ctx.createGain();
    rough.gain.value = 0.6;
    this._lfo({ freq: 27, depth: 0.4, target: rough.gain, t0: gT, dur, type: 'square' });
    src.connect(rough);
    this._formants(rough, voice, [{ f: base * 3, q: 5, g: 1 }, { f: base * 7, q: 7, g: 0.5 }]);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = base * 2.5;
    rough.connect(lp);
    lp.connect(voice);
    return 0.55 + dur + 0.3;
  }

  _recipePterosaurScreech(p, bus, t0, I) {
    const base = p.baseFreq || 900;
    const dur = (p.roarDuration || 1.3) * (0.9 + 0.2 * I);
    const voice = this.ctx.createGain();
    this._env(voice.gain, t0, 1.5 * I, 0.05, dur * 0.5, dur * 0.45);
    voice.connect(bus);
    const src = this.ctx.createGain();
    const o = this._osc({ type: 'sawtooth', t0, dur, out: src, gain: 1.0, glide: [[0, base * 0.8], [dur * 0.3, base * 1.5], [dur * 0.7, base * 1.2], [dur, base * 0.6]] });
    this._lfo({ freq: 62, depth: base * 0.2, target: o.osc.frequency, t0, dur });
    const rough = this.ctx.createGain();
    rough.gain.value = 0.55;
    this._lfo({ freq: 55, depth: 0.45, target: rough.gain, t0, dur, type: 'square' });
    src.connect(rough);
    this._formants(rough, voice, [{ f: base * 1.5, q: 5, g: 1.4 }, { f: base * 3.2, q: 8, g: 0.7 }]);
    const screechLp = this.ctx.createBiquadFilter();
    screechLp.type = 'lowpass';
    screechLp.frequency.value = base * 3;
    rough.connect(screechLp);
    screechLp.connect(voice);
    this._noiseBurst({ kind: 'white', t0, dur, out: bus, f: base * 2.2, q: 1.8, peak: 0.3 * I, attack: 0.04 });
    // Two wing beats
    [0.1, 0.65].forEach((off) => this.playWingFlap(null, 0.55 * I, t0 + off, bus));
    return dur + 0.3;
  }

  _recipeMarineSonar(p, bus, t0, I) {
    const ctx = this.ctx;
    // Everything underwater: dark low-pass on the whole call
    const water = ctx.createBiquadFilter();
    water.type = 'lowpass';
    water.frequency.value = 1800;
    water.connect(bus);
    // Echolocation click train (decelerating)
    let t = t0;
    for (let i = 0; i < 14; i++) {
      this._noiseBurst({ kind: 'white', t0: t, dur: 0.012, out: water, f: 2400 + i * 60, q: 2.5, peak: 0.45 * I, attack: 0.001, release: 0.01 });
      t += 0.035 + i * 0.012;
    }
    // Whistle sweep with vibrato
    const wT = t0 + 0.45;
    const wD = 0.9;
    const whistle = ctx.createGain();
    this._env(whistle.gain, wT, 0.28 * I, 0.08, wD * 0.5, wD * 0.45);
    whistle.connect(water);
    const w = this._osc({ type: 'sine', t0: wT, dur: wD, out: whistle, gain: 1, glide: [[0, 420], [wD * 0.5, 1250], [wD, 700]] });
    this._lfo({ freq: 9, depth: 40, target: w.osc.frequency, t0: wT, dur: wD });
    // Deep groan
    const gT = t0 + 1.1;
    const gD = (p.roarDuration || 2.2) * 0.8;
    const base = p.baseFreq || 55;
    const groan = ctx.createGain();
    this._env(groan.gain, gT, 0.7 * I, 0.35, gD * 0.4, gD * 0.5);
    groan.connect(water);
    this._osc({ type: 'sine', t0: gT, dur: gD, out: groan, gain: 0.8, glide: [[0, base], [gD * 0.5, base * 1.25], [gD, base * 0.8]] });
    this._osc({ type: 'sawtooth', t0: gT, dur: gD, out: groan, gain: 0.2, glide: [[0, base * 2], [gD * 0.5, base * 2.5], [gD, base * 1.6]] });
    this._noiseBurst({ kind: 'brown', t0: gT, dur: gD, out: water, f: 200, q: 0.7, type: 'lowpass', peak: 0.3 * I, attack: 0.3 });
    return 1.1 + gD + 0.5;
  }

  _recipeBirdCall(p, bus, t0, I) {
    const base = p.baseFreq || 2200;
    let t = t0;
    const phrases = 2 + Math.round(rand(0, 1));
    for (let ph = 0; ph < phrases; ph++) {
      const notes = 2 + Math.round(rand(0, 2));
      for (let n = 0; n < notes; n++) {
        const d = rand(0.09, 0.18);
        const f0 = base * rand(0.75, 1.3);
        const voice = this.ctx.createGain();
        this._env(voice.gain, t, 0.42 * I, 0.012, d * 0.5, d * 0.5);
        voice.connect(bus);
        const o = this._osc({ type: 'sine', t0: t, dur: d, out: voice, gain: 0.9, glide: [[0, f0 * 0.9], [d * 0.4, f0 * 1.15], [d, f0 * 0.85]] });
        this._lfo({ freq: 28, depth: f0 * 0.03, target: o.osc.frequency, t0: t, dur: d });
        t += d + rand(0.03, 0.08);
      }
      t += rand(0.18, 0.32);
    }
    return t - t0 + 0.3;
  }

  /**
   * Synthesizes a species-specific vocalization.
   * @returns {{ duration: number }} estimated call duration (seconds) for lip-sync.
   */
  playRoar(species, { distance = 0, intensity = 1, kind = 'call', startAt = 0 } = {}) {
    if (this.muted || !species) return { duration: 0 };
    const ctx = this._ensureContext();
    if (!ctx) return { duration: 0 };
    const I = clamp(intensity, 0.2, 1.4);
    const profile = species.vocalProfile || { type: 'roar_mid', baseFreq: 110, modFreq: 20, roarDuration: 1.8 };
    const callType = species.rigConfig?.isModernAvian ? 'bird_call' : profile.type;
    const bus = this._bus({ distance, gain: 1 });
    const t0 = ctx.currentTime + 0.02 + startAt;

    let duration;
    switch (callType) {
      case 'trex_infrasonic_roar':
        duration = this._recipeTrexInfrasonic(profile, bus, t0, I);
        break;
      case 'roar_deep':
        duration = this._recipeRoar(profile, bus, t0, I, 'deep');
        break;
      case 'roar_mid':
        duration = this._recipeRoar(profile, bus, t0, I, 'mid');
        break;
      case 'sauropod_bellow':
        duration = this._recipeSauropodBellow(profile, bus, t0, I);
        break;
      case 'whip_bellow':
        duration = this._recipeWhipBellow(profile, bus, t0, I);
        break;
      case 'herbivore_honk':
        duration = this._recipeHonk(profile, bus, t0, I);
        break;
      case 'parasaurolophus_trombone':
        duration = this._recipeTrombone(profile, bus, t0, I);
        break;
      case 'crest_hoot_roar':
        duration = this._recipeCrestHoot(profile, bus, t0, I);
        break;
      case 'raptor_chirp':
        duration = this._recipeRaptorChirp(profile, bus, t0, I);
        break;
      case 'hiss_growl':
        duration = this._recipeHissGrowl(profile, bus, t0, I);
        break;
      case 'pterosaur_screech':
        duration = this._recipePterosaurScreech(profile, bus, t0, I);
        break;
      case 'marine_sonar':
        duration = this._recipeMarineSonar(profile, bus, t0, I);
        break;
      case 'bird_call':
        duration = this._recipeBirdCall(profile, bus, t0, I);
        break;
      default:
        duration = this._recipeRoar(profile, bus, t0, I, 'mid');
    }
    if (this.onVocalize && distance < 0.5) {
      this.onVocalize(species, duration, kind, startAt);
    }
    return { duration };
  }

  /** Softer, shorter "hello" call used when a species is selected. */
  playGreeting(species) {
    return this.playRoar(species, { intensity: 0.6, kind: 'greeting' });
  }

  // ---------------------------------------------------------------------------
  // Locomotion sounds
  // ---------------------------------------------------------------------------
  /** One footfall; mass-scaled thud + ground crunch. */
  playFootstep(species, { intensity = 1, at = 0 } = {}) {
    if (this.muted || !species) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (at === 0 && this._lastStepAt >= 0 && now - this._lastStepAt < 0.09) return;
    if (at === 0) this._lastStepAt = now;
    const kg = species.metrics?.weightKg || 1000;
    const mass = clamp(Math.log10(Math.max(10, kg)) / 4.6, 0.25, 1.1); // 10kg→0.22 … 40t→1.0
    const t0 = now + 0.01 + at;
    const bus = this._bus({ distance: 0, gain: 1 });
    const thud = ctx.createGain();
    const peak = (0.12 + 0.75 * mass) * intensity;
    this._env(thud.gain, t0, peak, 0.006, 0.02, 0.16 + 0.3 * mass);
    thud.connect(bus);
    const f0 = 150 - 110 * mass;
    this._osc({ type: 'sine', t0, dur: 0.5, out: thud, gain: 1, glide: [[0, f0 * 1.6], [0.22 + 0.2 * mass, Math.max(18, f0 * 0.4)]] });
    if (mass > 0.6) {
      this._osc({ type: 'triangle', t0, dur: 0.6, out: thud, gain: 0.35, glide: [[0, f0 * 0.9], [0.45, 16]] });
    }
    this._noiseBurst({ kind: 'pink', t0, dur: 0.18 + 0.12 * mass, out: bus, f: 900 - 500 * mass, q: 0.9, peak: 0.18 * intensity * (0.5 + mass), attack: 0.003 });
    if (mass > 0.75) {
      // Seismic ground rumble for multi-ton animals
      this._noiseBurst({ kind: 'brown', t0: t0 + 0.02, dur: 0.6, out: bus, f: 70, q: 0.8, type: 'lowpass', peak: 0.35 * intensity, attack: 0.02 });
    }
  }

  /** Four rhythmic footfalls spaced by gait. */
  playFootsteps(species) {
    if (this.muted || !species) return;
    const kg = species.metrics?.weightKg || 1000;
    const spacing = kg > 5000 ? 0.62 : kg > 1200 ? 0.46 : kg > 150 ? 0.32 : 0.22;
    for (let step = 0; step < 4; step++) {
      this.playFootstep(species, { intensity: step === 0 ? 1 : 0.85, at: step * spacing });
    }
  }

  playWingFlap(species, intensity = 1, t0 = null, out = null) {
    if (this.muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    const start = t0 ?? ctx.currentTime + 0.01;
    const bus = out || this._bus({ distance: 0, gain: 1 });
    const big = (species?.metrics?.lengthM || 2) > 4 ? 1.3 : 1.0;
    this._noiseBurst({ kind: 'pink', t0: start, dur: 0.28 * big, out: bus, peak: 0.55 * intensity, attack: 0.09 * big, q: 1.1, sweep: [[0, 260 / big], [0.14 * big, 900 / big], [0.28 * big, 320 / big]] });
  }

  // ---------------------------------------------------------------------------
  // Era ambience & idle calls
  // ---------------------------------------------------------------------------
  startAmbience(era, species, neighbours = []) {
    if (!this.ambienceEnabled || this.muted) return;
    const ctx = this._ensureContext();
    if (!ctx || !this.unlocked) return;
    const signature = `${era?.id}|${species?.domain}`;
    if (this._ambience && this._ambience.signature === signature) {
      this._ambience.neighbours = neighbours;
      return;
    }
    this.stopAmbience();

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5);
    out.connect(this.sfxBus);
    const send = ctx.createGain();
    send.gain.value = 0.25;
    out.connect(send);
    send.connect(this.reverb);
    const nodes = [out, send];
    const timers = [];
    const domain = species?.domain || 'Land';

    const loopNoise = (kind, filterType, f, q, gain, lfoFreq = 0, lfoDepth = 0) => {
      const src = ctx.createBufferSource();
      src.buffer = this._noise(kind, 4.0);
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = filterType;
      filt.frequency.value = f;
      filt.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(filt);
      filt.connect(g);
      g.connect(out);
      if (lfoFreq > 0) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = lfoFreq;
        const lg = ctx.createGain();
        lg.gain.value = lfoDepth;
        lfo.connect(lg);
        lg.connect(filt.frequency);
        lfo.start();
        nodes.push(lfo);
      }
      src.start();
      nodes.push(src, filt, g);
      return { src, filt, g };
    };

    if (domain === 'Ocean') {
      loopNoise('brown', 'lowpass', 160, 0.7, 0.16, 0.05, 60);
      loopNoise('pink', 'bandpass', 900, 0.6, 0.025, 0.11, 300);
      const bubbles = () => {
        if (!this._ambience || this.muted) return;
        const t = ctx.currentTime + 0.01;
        const f0 = rand(600, 1900);
        const g = ctx.createGain();
        this._env(g.gain, t, 0.05, 0.004, 0.01, 0.07);
        g.connect(out);
        this._osc({ type: 'sine', t0: t, dur: 0.1, out: g, gain: 1, glide: [[0, f0], [0.08, f0 * 1.6]] });
        timers.push(setTimeout(bubbles, rand(140, 900)));
      };
      timers.push(setTimeout(bubbles, 500));
    } else {
      // Wind bed with slow gusts
      const wind = loopNoise('brown', 'lowpass', 420, 0.8, domain === 'Sky' ? 0.2 : 0.12, 0.06, 260);
      const gustLfo = ctx.createOscillator();
      gustLfo.frequency.value = 0.045;
      const gustGain = ctx.createGain();
      gustGain.gain.value = domain === 'Sky' ? 0.09 : 0.05;
      gustLfo.connect(gustGain);
      gustGain.connect(wind.g.gain);
      gustLfo.start();
      nodes.push(gustLfo, gustGain);
      loopNoise('pink', 'highpass', 2600, 0.7, 0.012);
      if (era?.id === 'permian') {
        loopNoise('brown', 'lowpass', 55, 1.2, 0.22, 0.09, 20); // volcanic rumble
      }
      if (domain === 'Land') {
        const insects = () => {
          if (!this._ambience || this.muted) return;
          const t = ctx.currentTime + 0.01;
          const f0 = rand(3800, 6200);
          const chirps = 2 + Math.floor(rand(0, 4));
          for (let i = 0; i < chirps; i++) {
            const g = ctx.createGain();
            this._env(g.gain, t + i * 0.055, 0.02, 0.004, 0.012, 0.03);
            g.connect(out);
            this._osc({ type: 'sine', t0: t + i * 0.055, dur: 0.06, out: g, gain: 1, freq: f0 });
          }
          timers.push(setTimeout(insects, rand(700, 3200)));
        };
        timers.push(setTimeout(insects, 900));
      }
    }

    // Distant calls from the era's other inhabitants
    const distant = () => {
      if (!this._ambience || this.muted) return;
      const pool = this._ambience.neighbours.filter((s) => s && s.id !== species?.id);
      if (pool.length) {
        const sp = pool[Math.floor(Math.random() * pool.length)];
        this.playRoar(sp, { distance: rand(0.7, 0.95), intensity: rand(0.35, 0.6), kind: 'distant' });
      }
      timers.push(setTimeout(distant, rand(9000, 22000)));
    };
    timers.push(setTimeout(distant, rand(5000, 11000)));

    this._ambience = { signature, out, nodes, timers, neighbours };
  }

  stopAmbience() {
    const amb = this._ambience;
    if (!amb) return;
    this._ambience = null;
    amb.timers.forEach((t) => clearTimeout(t));
    const ctx = this.ctx;
    const now = ctx.currentTime;
    amb.out.gain.cancelScheduledValues(now);
    amb.out.gain.setValueAtTime(Math.max(0.0001, amb.out.gain.value), now);
    amb.out.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    setTimeout(() => {
      amb.nodes.forEach((n) => {
        try {
          if (typeof n.stop === 'function') n.stop();
        } catch {
          /* already stopped */
        }
        try {
          n.disconnect();
        } catch {
          /* detached */
        }
      });
    }, 1000);
  }

  /** Periodic soft calls from the specimen on the turntable. */
  startIdleCalls(getSpecies) {
    this._idleSpeciesGetter = getSpecies;
    if (this._idleTimer) return;
    const tick = () => {
      this._idleTimer = setTimeout(tick, rand(13000, 26000));
      if (!this.ambienceEnabled || this.muted || this.isSpeaking || !this.unlocked) return;
      const sp = this._idleSpeciesGetter ? this._idleSpeciesGetter() : null;
      if (sp && Math.random() < 0.6) {
        this.playRoar(sp, { intensity: rand(0.45, 0.7), kind: 'idle' });
      }
    };
    this._idleTimer = setTimeout(tick, rand(6000, 12000));
  }

  stopIdleCalls() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = null;
  }

  // ---------------------------------------------------------------------------
  // Chicxulub impact
  // ---------------------------------------------------------------------------
  playImpactBoom() {
    if (this.muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    const bus = this._bus({ distance: 0.2, gain: 1 });
    this._noiseBurst({ kind: 'white', t0, dur: 1.4, out: bus, peak: 0.35, attack: 0.9, q: 1.2, sweep: [[0, 300], [1.2, 2600]] }); // entry whistle
    const boomAt = t0 + 1.35;
    this._noiseBurst({ kind: 'white', t0: boomAt, dur: 0.08, out: bus, f: 1800, q: 0.4, peak: 0.8, attack: 0.002, release: 0.07 });
    this._osc({ type: 'sine', t0: boomAt, dur: 3.5, out: bus, gain: 0.7, glide: [[0, 120], [0.4, 32], [3.2, 18]] });
    this._noiseBurst({ kind: 'brown', t0: boomAt, dur: 4.5, out: bus, f: 110, q: 0.7, type: 'lowpass', peak: 0.55, attack: 0.05 });
    this._noiseBurst({ kind: 'pink', t0: boomAt + 0.3, dur: 3.0, out: bus, f: 500, q: 0.6, peak: 0.25, attack: 0.4 });
  }

  // ---------------------------------------------------------------------------
  // Narration — Chirp 3 HD via /api/tts, device voice fallback
  // ---------------------------------------------------------------------------
  async getTtsStatus() {
    if (this.ttsStatus) return this.ttsStatus;
    if (!this._ttsStatusPromise) {
      this._ttsStatusPromise = fetch('/api/tts/status', { headers: { 'X-Requested-With': 'DinoVerse' } })
        .then((r) => (r.ok ? r.json() : { available: false }))
        .catch(() => ({ available: false }))
        .then((status) => {
          this.ttsStatus = status;
          if (status.available && status.voices && !status.voices.includes(this.voiceName)) {
            this.voiceName = status.defaultVoice || DEFAULT_CHIRP_VOICE;
          }
          return status;
        });
    }
    return this._ttsStatusPromise;
  }

  async _fetchChirp(text, signal) {
    const key = `${this.voiceName}|${text}`;
    if (this._narrationCache.has(key)) return this._narrationCache.get(key);
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'DinoVerse' },
      body: JSON.stringify({ text, voice: this.voiceName, rate: 0.95 }),
      signal,
    });
    if (!response.ok || !(response.headers.get('Content-Type') || '').startsWith('audio/')) {
      throw new Error(`tts_${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(bytes.slice(0));
    this._narrationCache.set(key, buffer);
    while (this._narrationCache.size > NARRATION_CACHE_LIMIT) {
      this._narrationCache.delete(this._narrationCache.keys().next().value);
    }
    return buffer;
  }

  _duck(active) {
    if (!this.sfxBus) return;
    const now = this.ctx.currentTime;
    this.sfxBus.gain.cancelScheduledValues(now);
    this.sfxBus.gain.linearRampToValueAtTime(active ? 0.3 : 1.0, now + 0.4);
  }

  /**
   * Speaks kid-friendly text. onStateChange(speaking: boolean, phase: 'loading'|'playing'|'idle', engine: 'chirp'|'device')
   */
  async narrateText(text, onStateChange) {
    if (this.muted || !text) return;
    this.stopNarration();
    const token = ++this._narrationToken;
    const clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 1800);
    const notify = (speaking, phase, engine) => {
      if (token !== this._narrationToken) return;
      this.isSpeaking = speaking;
      if (onStateChange) onStateChange(speaking, phase, engine);
    };

    const ctx = this._ensureContext();
    let status = { available: false };
    if (this.narrationMode === 'chirp' && ctx) {
      notify(true, 'loading', 'chirp');
      status = await this.getTtsStatus();
    }
    if (token !== this._narrationToken) return;

    if (status.available && this.narrationMode === 'chirp' && ctx) {
      const controller = new AbortController();
      this._narrationAbort = controller;
      try {
        const buffer = await this._fetchChirp(clean, controller.signal);
        if (token !== this._narrationToken) return;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.narrationBus);
        source.onended = () => {
          if (this._narrationSource === source) {
            this._narrationSource = null;
            this._duck(false);
            notify(false, 'idle', 'chirp');
          }
        };
        this._narrationSource = source;
        this._duck(true);
        source.start();
        notify(true, 'playing', 'chirp');
        return;
      } catch (err) {
        if (controller.signal.aborted || token !== this._narrationToken) return;
        // Fall through to the device voice
      } finally {
        if (this._narrationAbort === controller) this._narrationAbort = null;
      }
    }

    this._speakWithDevice(clean, notify);
  }

  _pickDeviceVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const prefs = [/Google US English/i, /Samantha/i, /Ava/i, /Allison/i, /Zoe/i, /Natural/i, /Enhanced/i, /Premium/i, /Karen/i, /Moira/i, /Daniel/i];
    const en = voices.filter((v) => /^en[-_]US/i.test(v.lang));
    const anyEn = voices.filter((v) => /^en/i.test(v.lang));
    for (const pool of [en, anyEn]) {
      for (const re of prefs) {
        const hit = pool.find((v) => re.test(v.name));
        if (hit) return hit;
      }
    }
    return en[0] || anyEn[0] || voices[0];
  }

  _speakWithDevice(text, notify) {
    if (!('speechSynthesis' in window)) {
      notify(false, 'idle', 'device');
      return;
    }
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this._pickDeviceVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.onstart = () => {
        this._duck(true);
        notify(true, 'playing', 'device');
      };
      const finish = () => {
        this._duck(false);
        notify(false, 'idle', 'device');
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    if (!window.speechSynthesis.getVoices().length) {
      notify(true, 'loading', 'device');
      let done = false;
      const onVoices = () => {
        if (done) return;
        done = true;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        speak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      setTimeout(onVoices, 600);
    } else {
      speak();
    }
  }

  stopNarration(onStateChange) {
    this._narrationToken++;
    if (this._narrationAbort) {
      this._narrationAbort.abort();
      this._narrationAbort = null;
    }
    if (this._narrationSource) {
      try {
        this._narrationSource.onended = null;
        this._narrationSource.stop();
      } catch {
        /* already stopped */
      }
      this._narrationSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.ctx) this._duck(false);
    this.isSpeaking = false;
    if (onStateChange) onStateChange(false, 'idle');
  }
}
