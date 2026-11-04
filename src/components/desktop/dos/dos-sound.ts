// JackDOS's sound: radio-style interference while 2026 glitches out, the PC
// startup sound when the CRT comes on, and the hum of the fan underneath,
// looped without a gap. The two recordings live in public/sounds/dos/ (see
// the README there); the interference is made up on the spot from noise.
//
// Everything goes through Web Audio: an <audio> element can't loop without a
// small gap, and one shared context means one master volume for muting.

const STARTUP_URL = '/sounds/dos/PC-startup.mp3';
const HUM_URL = '/sounds/dos/PC-humming-looped.wav';
const PREF_KEY = 'jackdos-sound';

const STARTUP_VOLUME = 0.8;
const HUM_VOLUME = 0.3;
// The hum fades in over the last moment of the startup sound, so there's no gap.
const HUM_OVERLAP = 0.15;
const INTERFERENCE_VOLUME = 0.22;

// The DOS music player's "cheap sound card": no deep bass, nothing above
// about 3.2 kHz, and 5-bit volume steps.
const LOFI_LOW_CUT = 280;
const LOFI_HIGH_CUT = 3200;
const LOFI_BITS = 5;
const LOFI_VOLUME = 0.85;

/** A wave-shaper curve that snaps the signal to 2^bits levels, after a little overdrive. */
function bitCrushCurve(bits: number): Float32Array<ArrayBuffer> {
  const steps = 2 ** (bits - 1);
  const curve = new Float32Array(4096);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.round(Math.tanh(1.6 * x) * steps) / steps;
  }
  return curve;
}

let shared: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

/**
 * Creates (or wakes) the audio context. Call it from the click that starts
 * the trip to 1997: Safari only lets a page make sound from inside a click.
 */
export function unlockDosAudio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!shared || shared.state === 'closed') shared = new AudioContext();
  shared.resume().catch(() => {});
  return shared;
}

/** Visitors can mute JackDOS (SOUND OFF); remembered in this browser. */
export function dosSoundEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveDosSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered, but still applied for this visit.
  }
}

/** Fetches and decodes a sound once. A missing file just means silence. */
function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  if (!buffers.has(url)) {
    buffers.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} ${url}`))))
        .then((data) => ctx.decodeAudioData(data))
        .catch((err) => {
          console.info(`JackDOS: no sound at ${url}, carrying on without it.`, err);
          buffers.delete(url);
          return null;
        }),
    );
  }
  return buffers.get(url)!;
}

export class DosSound {
  private ctx: AudioContext | null;
  private master: GainNode | null = null;
  private hum: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private startup: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  enabled = dosSoundEnabled();

  constructor() {
    this.ctx = unlockDosAudio();
    if (!this.ctx) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(this.ctx.destination);
    // Start downloading straight away, so they're ready when the CRT comes on.
    void loadBuffer(this.ctx, STARTUP_URL);
    void loadBuffer(this.ctx, HUM_URL);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    saveDosSoundEnabled(on);
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  /** A burst of radio interference: filtered noise that crackles and cuts out. */
  interference(seconds: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // White noise, chopped into bursts so it crackles rather than hisses.
    let level = 1;
    for (let i = 0; i < length; i++) {
      if (i % 512 === 0) level = Math.random() < 0.25 ? 0.15 : 0.6 + Math.random() * 0.4;
      data[i] = (Math.random() * 2 - 1) * level;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.8;
    const now = ctx.currentTime;
    // The "tuning" sweeps about, like a radio between stations.
    band.frequency.setValueAtTime(1800, now);
    band.frequency.linearRampToValueAtTime(600, now + seconds * 0.5);
    band.frequency.linearRampToValueAtTime(3200, now + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(INTERFERENCE_VOLUME * 0.4, now + seconds * 0.3);
    gain.gain.linearRampToValueAtTime(INTERFERENCE_VOLUME, now + seconds * 0.9);
    gain.gain.linearRampToValueAtTime(0, now + seconds);
    source.connect(band).connect(gain).connect(this.master);
    source.start();
  }

  /**
   * The startup sound, then the hum looping once it has finished. Resolves
   * with the startup sound's length in seconds (null if there isn't one), so
   * the boot messages can be paced to end with it.
   */
  async powerOn(): Promise<number | null> {
    const ctx = this.ctx;
    if (!ctx || !this.master) return null;
    const [startup, hum] = await Promise.all([loadBuffer(ctx, STARTUP_URL), loadBuffer(ctx, HUM_URL)]);
    if (this.ctx !== ctx || ctx.state === 'closed' || !this.master) return null;
    const now = ctx.currentTime;
    if (startup) {
      const source = ctx.createBufferSource();
      source.buffer = startup;
      const gain = ctx.createGain();
      gain.gain.value = STARTUP_VOLUME;
      source.connect(gain).connect(this.master);
      source.start(now);
      this.startup = { source, gain };
      source.onended = () => {
        if (this.startup?.source === source) this.startup = null;
      };
    }
    if (hum && !this.hum) {
      // In as the startup sound finishes, with a short overlap so there's no gap.
      const at = now + Math.max(0, (startup?.duration ?? 0) - HUM_OVERLAP);
      const source = ctx.createBufferSource();
      source.buffer = hum;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(HUM_VOLUME, at + HUM_OVERLAP * 2);
      source.connect(gain).connect(this.master);
      source.start(at);
      this.hum = { source, gain };
    }
    return startup?.duration ?? null;
  }

  /** The fan spinning down: the hum drops in pitch as it fades out. */
  powerOff(seconds = 0.45) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    // Leaving before the startup sound has finished: fade it out too.
    if (this.startup) {
      const { source, gain } = this.startup;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + seconds);
      source.stop(now + seconds + 0.05);
      this.startup = null;
    }
    if (!this.hum) return;
    const { source, gain } = this.hum;
    source.playbackRate.setValueAtTime(1, now);
    source.playbackRate.exponentialRampToValueAtTime(0.35, now + seconds);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + seconds);
    source.stop(now + seconds + 0.05);
    this.hum = null;
  }

  /**
   * Plays an <audio> element through a cheap 1997 sound card: mono, the top
   * and bottom of the sound cut off, and the volume steps made coarse (fewer
   * bits), so it crunches. Returns a function that unplugs it, or null if Web
   * Audio can't take this element (then it plays as normal).
   *
   * The element needs crossOrigin="anonymous" and a file served with CORS
   * headers; without them, Web Audio would only hear silence.
   */
  lofi(audio: HTMLAudioElement): (() => void) | null {
    const ctx = this.ctx;
    if (!ctx || !this.master) return null;
    try {
      const source = ctx.createMediaElementSource(audio);
      // Down to one channel, as a mono sound card would.
      const mono = ctx.createGain();
      mono.channelCount = 1;
      mono.channelCountMode = 'explicit';
      mono.channelInterpretation = 'speakers';
      const low = ctx.createBiquadFilter();
      low.type = 'highpass';
      low.frequency.value = LOFI_LOW_CUT;
      const high = ctx.createBiquadFilter();
      high.type = 'lowpass';
      high.frequency.value = LOFI_HIGH_CUT;
      const crush = ctx.createWaveShaper();
      crush.curve = bitCrushCurve(LOFI_BITS);
      const gain = ctx.createGain();
      gain.gain.value = LOFI_VOLUME;
      // Crunch first, then cut the treble: like a real card's output filter, this keeps
      // the grit but takes away the hiss the coarse steps would add up top.
      source.connect(mono).connect(low).connect(crush).connect(high).connect(gain).connect(this.master);
      return () => source.disconnect();
    } catch (err) {
      console.info('JackDOS: no lo-fi for this track, playing it as it is.', err);
      return null;
    }
  }

  /** Stops everything at once (DOS closed). The shared context stays for next time. */
  dispose() {
    this.startup?.source.stop();
    this.startup = null;
    this.hum?.source.stop();
    this.hum = null;
    this.master?.disconnect();
    this.master = null;
    this.ctx = null;
  }
}
