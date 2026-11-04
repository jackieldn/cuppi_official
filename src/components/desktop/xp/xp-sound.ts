// Poot XP's sounds, made on the spot with Web Audio (no files): a warm
// start-up chime, a shut-down chime and the "ding" of a message box.
// They share JackDOS's audio context and its mute setting.

import { dosSoundEnabled, unlockDosAudio } from '../dos/dos-sound';

interface Note {
  /** Frequency in Hz. */
  f: number;
  /** Start, seconds from now. */
  at: number;
  /** Length in seconds. */
  len: number;
  gain?: number;
}

function play(notes: Note[], volume = 0.18) {
  if (!dosSoundEnabled()) return;
  const ctx = unlockDosAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.05;

  // A soft room: two short feedback delays, a little filtered.
  const out = ctx.createGain();
  out.gain.value = volume;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  out.connect(tone).connect(ctx.destination);
  for (const [time, fb] of [
    [0.13, 0.32],
    [0.21, 0.25],
  ] as const) {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = time;
    const feedback = ctx.createGain();
    feedback.gain.value = fb;
    out.connect(delay).connect(feedback).connect(delay);
    feedback.connect(tone);
  }

  for (const n of notes) {
    for (const [type, detune, level] of [
      ['sine', 0, 1],
      ['triangle', 7, 0.35],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = n.f;
      osc.detune.value = detune;
      const env = ctx.createGain();
      const start = t0 + n.at;
      const peak = (n.gain ?? 1) * level;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(peak, start + 0.06);
      env.gain.setTargetAtTime(0, start + n.len * 0.55, n.len * 0.3);
      osc.connect(env).connect(out);
      osc.start(start);
      osc.stop(start + n.len + 1.5);
    }
  }
}

// E flat major, rising: a pad underneath and a little tune on top.
export function playStartup() {
  play([
    { f: 155.56, at: 0, len: 3.2, gain: 0.5 },
    { f: 233.08, at: 0, len: 3.2, gain: 0.35 },
    { f: 311.13, at: 0.05, len: 3, gain: 0.35 },
    { f: 622.25, at: 0.1, len: 0.9, gain: 0.55 },
    { f: 466.16, at: 0.45, len: 0.8, gain: 0.5 },
    { f: 698.46, at: 0.8, len: 0.8, gain: 0.5 },
    { f: 622.25, at: 1.15, len: 0.9, gain: 0.5 },
    { f: 932.33, at: 1.5, len: 1.8, gain: 0.45 },
    { f: 783.99, at: 1.5, len: 1.8, gain: 0.3 },
  ]);
}

// The same chord, falling away.
export function playShutdown() {
  play([
    { f: 932.33, at: 0, len: 0.7, gain: 0.45 },
    { f: 698.46, at: 0.28, len: 0.7, gain: 0.45 },
    { f: 466.16, at: 0.56, len: 0.8, gain: 0.45 },
    { f: 311.13, at: 0.84, len: 1.6, gain: 0.45 },
    { f: 155.56, at: 0.84, len: 1.8, gain: 0.4 },
  ]);
}

export function playDing() {
  play(
    [
      { f: 1046.5, at: 0, len: 0.45, gain: 0.6 },
      { f: 1318.5, at: 0, len: 0.45, gain: 0.3 },
    ],
    0.14,
  );
}
