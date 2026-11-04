'use client';

// JackBIOS's power-on self test (POST) screen, laid out like the classic
// late-90s BIOS screen everyone remembers: the text top-left with a small
// icon beside the first lines, a yellow logo top-right, and "Press DEL to
// enter SETUP" with the BIOS ID string along the bottom. It's an homage: the
// logo, name and wording are JackBIOS's own (the real ones are trademarks).
// DosScreen feeds it lines as the test runs, then clears to DOS.

import { blockLetters } from '@/lib/dos-text';
import type { Line, Tone } from './commands';

/** The BIOS ID string along the bottom: date, chipset, board, ID. */
export const BIOS_ID = '07/16/1997-i430TX-JACK-2A5LEF09C-00';

// The company name in block letters, "poot" tucked under the end of "jackie_".
const LOGO = [...blockLetters('jackie_'), '', ...blockLetters('   poot')];
const LOGO_WIDTH = Math.max(...LOGO.map((l) => l.length));
const STRAPLINE = 'MOTION • APPS • WEB';

// A small pixel figure where the BIOS maker's mascot used to stand.
const ICON = ['▄█▄', '▄▀▄'];

interface DosPostProps {
  lines: Line[];
  tones: Record<Tone, string>;
}

const glow = { textShadow: '0 0 2px currentColor, 0 0 10px rgba(170,170,170,0.25)' };

export function DosPost({ lines, tones }: DosPostProps) {
  return (
    <div className="relative flex h-full flex-col whitespace-pre" style={{ color: tones.normal, ...glow }}>
      <div aria-hidden="true" className="absolute left-0 top-0" style={{ color: '#5577ff' }}>
        {ICON.map((row, i) => (
          <div key={i}>{row}</div>
        ))}
      </div>

      {/* Top right, a row down: the name in yellow, the strapline boxed in green under it. */}
      <div aria-label="jackie_poot" className="absolute right-0 top-[1.12em]" style={{ color: tones.warn }}>
        {LOGO.map((row, i) => (
          <div key={i} aria-hidden="true">
            {row.padEnd(LOGO_WIDTH)}
          </div>
        ))}
        <div aria-hidden="true" className="mt-[0.3em]" style={{ color: tones.good }}>
          {STRAPLINE.padStart(Math.floor((LOGO_WIDTH + STRAPLINE.length) / 2)).padEnd(LOGO_WIDTH)}
        </div>
      </div>

      <div>
        {lines.map((line, i) => (
          <div key={i} className="min-h-[1.12em]" style={{ color: tones[line.tone ?? 'normal'] }}>
            {line.text}
          </div>
        ))}
      </div>
      <div className="mt-auto">
        <div>
          Press <span style={{ color: tones.bright }}>DEL</span> to enter SETUP
        </div>
        <div>{BIOS_ID}</div>
      </div>
    </div>
  );
}
