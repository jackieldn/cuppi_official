'use client';

// The Time Machine's 1997: the whole screen becomes a CRT monitor
// running JackDOS. It powers on, runs a BIOS memory check and boots to a
// C:\> prompt. Type HELP for the commands (see ./commands). EXIT, or leaving
// the desktop, powers it off and travels back.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { COLS, toDosText } from '@/lib/dos-text';
import { inYear, eraDateLabel, useDesktop } from '../desktop-context';
import {
  completions,
  runCommand,
  stopAllMusic,
  type DosContext,
  type Line,
  type MenuRequest,
  type Printable,
  type Tone,
} from './commands';
import { DosMenu, MENU_ROWS, type MenuState } from './dos-menu';
import { DosPost } from './dos-post';
import { DosSound } from './dos-sound';
import { GLITCH_MS, TimeGlitch } from './time-glitch';

const PAUSE_MESSAGE = 'Press any key to return to the menu...';
// From the CRT coming on to the C:\> prompt.
const BOOT_SECONDS = 6;
// Typing "1" then "2" within this long picks item 12, not item 2.
const NUMBER_TYPING_MS = 900;

const POWER_ON_MS = 700;
const POWER_OFF_MS = 450;
// Old screens didn't keep much: drop the oldest lines past this.
const SCROLLBACK = 1_000;
const PROMPT = 'C:\\>';
const FONT_URL = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
// VT323's characters are 0.4em wide (measured), so 80 columns are 32em.
const CHAR_EM = 0.4;
const SCREEN_EM = COLS * CHAR_EM;

// The 16-colour text-mode palette, the ones DOS programs actually used.
const TONES: Record<Tone, string> = {
  normal: '#aaaaaa',
  bright: '#ffffff',
  dim: '#7a7a7a',
  accent: '#55ffff',
  good: '#55ff55',
  warn: '#ffff55',
  error: '#ff5555',
};

/** Today in 1997: the Time Machine only goes back in years. */
const now1997 = () => inYear(1997);

const asLines = (out: Printable, tone?: Tone): Line[] =>
  (Array.isArray(out) ? out : [out]).map((l) => {
    const line = typeof l === 'string' ? { text: l, tone } : { tone, ...l };
    // Site content can hold emoji and curly quotes; a 1997 DOS font has neither.
    return { ...line, text: toDosText(line.text) };
  });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The VGA-style font only loads when someone actually travels to 1997.
function useDosFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_URL}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
  }, []);
}

export function DosScreen() {
  useDosFont();
  const firestore = useFirestore();
  const router = useRouter();
  const desktop = useDesktop();

  // 2026 breaks up first ("glitch"), then the CRT comes on. Reduced motion skips the glitch.
  const [power, setPower] = useState<'glitch' | 'on' | 'off'>(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'glitch',
  );
  const startedWithGlitch = useRef(power === 'glitch');
  const soundRef = useRef<DosSound | null>(null);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [caret, setCaret] = useState(0);
  // Lines live in a ref so `print` can hand back an index straight away; the
  // counter re-renders the screen.
  const linesRef = useRef<Line[]>([]);
  const [, setVersion] = useState(0);
  const historyRef = useRef<string[]>([]);
  const historyAt = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const skipBootRef = useRef(false);
  const ctxRef = useRef<DosContext | null>(null);
  // A command waiting on a menu choice, or on "press any key".
  const [menu, setMenu] = useState<(MenuState & { resolve: (choice: number | null) => void }) | null>(null);
  const [pause, setPause] = useState<{ message: string; resolve: () => void } | null>(null);
  const typedNumberRef = useRef({ text: '', at: 0 });
  // The BIOS self-test screen while it's up, and whether DEL was pressed during it.
  const [post, setPost] = useState<Line[] | null>(null);
  const pressedSetupRef = useRef(false);

  const render = () => setVersion((v) => v + 1);

  const print = useCallback((out: Printable, tone?: Tone) => {
    const index = linesRef.current.length;
    linesRef.current.push(...asLines(out, tone));
    const overflow = linesRef.current.length - SCROLLBACK;
    if (overflow > 0) linesRef.current.splice(0, overflow);
    render();
    return Math.max(0, index - Math.max(0, overflow));
  }, []);

  const powerOff = useCallback(
    (then?: () => void) => {
      if (ctxRef.current) stopAllMusic(ctxRef.current);
      soundRef.current?.powerOff(POWER_OFF_MS / 1000);
      setPower('off');
      setTimeout(() => {
        desktop.setEra('now');
        then?.();
      }, POWER_OFF_MS);
    },
    [desktop],
  );

  if (!ctxRef.current) {
    ctxRef.current = {
      firestore,
      print,
      update: (index, line) => {
        if (index < linesRef.current.length) {
          linesRef.current[index] = line;
          render();
        }
      },
      clear: () => {
        linesRef.current = [];
        render();
      },
      exit: () => powerOff(),
      open: (href) =>
        powerOff(() => {
          desktop.open();
          router.push(href);
        }),
      now: now1997,
      cache: new Map(),
      player: {},
      menu: (request: MenuRequest) =>
        new Promise<number | null>((resolve) => {
          const last = Math.max(0, request.items.length - 1);
          typedNumberRef.current = { text: '', at: 0 };
          setMenu({
            title: request.title,
            items: request.items,
            selected: Math.min(Math.max(0, request.selected ?? 0), last),
            resolve: (choice) => {
              setMenu(null);
              resolve(choice);
            },
          });
        }),
      sound: {
        enabled: () => soundRef.current?.enabled ?? false,
        set: (on) => soundRef.current?.setEnabled(on),
        lofi: (audio) => soundRef.current?.lofi(audio) ?? null,
      },
      pause: (message = PAUSE_MESSAGE) =>
        new Promise<void>((resolve) => {
          setPause({
            message,
            resolve: () => {
              setPause(null);
              resolve();
            },
          });
        }),
    };
  }
  // Keep the context's live values current between renders.
  ctxRef.current.firestore = firestore;
  ctxRef.current.exit = () => powerOff();
  ctxRef.current.open = (href) =>
    powerOff(() => {
      desktop.open();
      router.push(href);
    });

  // Power-on, then the BIOS memory check and the boot messages. Any key skips it.
  useEffect(() => {
    // Already booted (the dev server's hot reload re-runs effects): don't boot twice.
    if (linesRef.current.length) {
      setBooted(true);
      return;
    }
    let cancelled = false;
    const step = async (ms: number) => {
      if (!skipBootRef.current) await wait(ms);
      return !cancelled;
    };
    (async () => {
      if (!(await step((startedWithGlitch.current ? GLITCH_MS : 0) + POWER_ON_MS))) return;
      // C:\> arrives BOOT_SECONDS after the CRT comes on (it has used
      // POWER_ON_MS of that). The startup sound carries on underneath, and
      // the hum loops once it has finished (see DosSound.powerOn).
      const total = BOOT_SECONDS * 1000 - POWER_ON_MS;
      // Each stage's share of the boot.
      const share = (fraction: number) => step(total * fraction);

      // 1. The BIOS's power-on self test, on its own screen (about 2/3 of the boot).
      const postLines: Line[] = [];
      const showPost = () => setPost([...postLines]);
      const postPrint = (text: string, tone?: Tone) => {
        postLines.push({ text, tone });
        showPost();
        return postLines.length - 1;
      };
      const postUpdate = (i: number, text: string) => {
        postLines[i] = { ...postLines[i], text };
        showPost();
      };

      // Indented past the pixel icon, as the original sat beside its mascot.
      postPrint('    JackBIOS Modular v4.51PG, A Pixel Perfect Ally');
      postPrint('    Copyright (C) 1991-97, jackie_poot Ltd.');
      postPrint('');
      postPrint('Version JD1997');
      postPrint('');
      postPrint('PENTIUM-MMX CPU at 200MHz');
      const memRow = postPrint('Memory Test :      0K');
      const memSteps = 32;
      for (let i = 1; i <= memSteps; i++) {
        if (!(await share(0.26 / memSteps))) return;
        postUpdate(memRow, `Memory Test : ${String(1024 * i).padStart(6)}K${i === memSteps ? ' OK' : ''}`);
      }
      if (!(await share(0.05))) return;
      postPrint('');
      postPrint('JackBIOS Plug and Play BIOS Extension  v1.0A');
      postPrint('Copyright (C) 1997, jackie_poot Ltd.');
      if (!(await share(0.04))) return;
      // Each drive is "searched for" before its answer appears.
      const drives: [string, string][] = [
        ['Primary Master  ', 'JACKIEPOOT 2111MB'],
        ['Primary Slave   ', 'None'],
        ['Secondary Master', 'CD-ROM 4X'],
        ['Secondary Slave ', 'None'],
      ];
      for (const [slot, found] of drives) {
        const row = postPrint(`  Detecting IDE ${slot}...`);
        if (!(await share(0.055))) return;
        postUpdate(row, `  Detecting IDE ${slot}... ${found}`);
        if (!(await share(0.015))) return;
      }
      if (!(await share(0.05))) return;

      // 2. The screen clears and DOS loads.
      setPost(null);
      if (!(await share(0.03))) return;
      print('Starting JackDOS...');
      if (!(await share(0.1))) return;
      print(['', 'HIMEM is testing extended memory...done.']);
      if (!(await share(0.06))) return;
      print('MOUSE.COM: Mouse driver installed');
      if (!(await share(0.04))) return;
      print('CDROM.SYS: Drive D: = CD-ROM unit 0');
      if (!(await share(0.04))) return;
      print([
        '',
        { text: `Welcome to ${eraDateLabel(1997)}.`, tone: 'bright' },
        { text: 'Type HELP for a list of commands. Type EXIT to travel back to 2026.', tone: 'warn' },
        '',
      ]);
      if (pressedSetupRef.current) {
        print([
          { text: 'CMOS checksum error - Defaults loaded.', tone: 'error' },
          'SETUP is password protected, and nobody remembers the password.',
          '',
        ]);
      }
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [print]);

  // Sound: interference while 2026 breaks up, then the startup sound and the
  // hum as the CRT comes on.
  useEffect(() => {
    const sound = new DosSound();
    soundRef.current = sound;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (startedWithGlitch.current) {
      sound.interference(GLITCH_MS / 1000);
      timer = setTimeout(() => {
        setPower((p) => (p === 'glitch' ? 'on' : p));
        void sound.powerOn();
      }, GLITCH_MS);
    } else {
      void sound.powerOn();
    }
    return () => {
      clearTimeout(timer);
      sound.dispose();
      if (soundRef.current === sound) soundRef.current = null;
    };
  }, []);

  // Leaving DOS any other way (closing the desktop) still stops the music.
  useEffect(
    () => () => {
      if (ctxRef.current) stopAllMusic(ctxRef.current);
    },
    [],
  );

  // Newest output always in view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  // Typing goes to the hidden input wherever you click (menus and "press any
  // key" read from it too).
  useEffect(() => {
    if (booted) inputRef.current?.focus({ preventScroll: true });
  }, [booted, busy, menu, pause]);

  // Menu keys: arrows, Home/End, Page Up/Down, typed numbers, Enter, Esc.
  const menuKey = (e: React.KeyboardEvent, m: NonNullable<typeof menu>) => {
    e.preventDefault();
    const last = m.items.length - 1;
    const move = (to: number) => setMenu({ ...m, selected: Math.min(Math.max(0, to), last) });
    if (e.key === 'ArrowDown') move(m.selected + 1);
    else if (e.key === 'ArrowUp') move(m.selected - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(last);
    else if (e.key === 'PageDown') move(m.selected + MENU_ROWS);
    else if (e.key === 'PageUp') move(m.selected - MENU_ROWS);
    else if (e.key === 'Enter') m.resolve(m.selected);
    else if (e.key === 'Escape') m.resolve(null);
    else if (/^\d$/.test(e.key)) {
      const typed = typedNumberRef.current;
      const now = Date.now();
      // Carry on the number being typed, or start a new one if that's too high.
      let text = now - typed.at < NUMBER_TYPING_MS ? typed.text + e.key : e.key;
      if (Number(text) > m.items.length || Number(text) < 1) text = e.key;
      typedNumberRef.current = { text, at: now };
      const n = Number(text);
      if (n >= 1 && n <= m.items.length) move(n - 1);
    }
  };

  const submit = async () => {
    const command = input;
    print(`${PROMPT}${command}`);
    setInput('');
    setCaret(0);
    historyAt.current = -1;
    if (command.trim()) {
      historyRef.current = [command, ...historyRef.current.filter((h) => h !== command)].slice(0, 50);
      setBusy(true);
      try {
        await runCommand(command, ctxRef.current!);
      } finally {
        setBusy(false);
      }
      // A blank line after output, as DOS did before the next prompt.
      if (linesRef.current.length && linesRef.current.at(-1)?.text !== '') print('');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!booted) {
      // Any key hurries the boot along; DEL (during the BIOS test) "enters SETUP".
      if (e.key === 'Delete' && post) pressedSetupRef.current = true;
      skipBootRef.current = true;
      e.preventDefault();
      return;
    }
    if (pause) {
      // Any key, but not the bare modifiers on their own.
      e.preventDefault();
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) pause.resolve();
      return;
    }
    if (menu) {
      menuKey(e, menu);
      return;
    }
    if (busy) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const history = historyRef.current;
      if (!history.length) return;
      historyAt.current =
        e.key === 'ArrowUp' ? Math.min(history.length - 1, historyAt.current + 1) : Math.max(-1, historyAt.current - 1);
      const value = historyAt.current === -1 ? '' : history[historyAt.current];
      setInput(value);
      setCaret(value.length);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const [word, ...rest] = input.split(' ');
      if (rest.length) return;
      const matches = completions(word);
      if (matches.length === 1) {
        setInput(`${matches[0]} `);
        setCaret(matches[0].length + 1);
      } else if (matches.length > 1) {
        print([`${PROMPT}${input}`, matches.join('  ')]);
      }
    } else if (e.key === 'Escape') {
      // DOS's Esc wiped the line you were typing.
      e.preventDefault();
      setInput('');
      setCaret(0);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      ctxRef.current?.clear();
    }
  };

  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? input.length);

  const screenStyle: CSSProperties = {
    fontFamily: '"VT323", "Lucida Console", "Courier New", monospace',
    // Sized so 80 columns fill the width, capped so 26 rows still fit the height.
    fontSize: `min(calc((100vw - 64px) / ${SCREEN_EM}), calc((100vh - 48px) / 26 / 1.12), 30px)`,
    lineHeight: 1.12,
  };

  const lines = linesRef.current;
  const before = input.slice(0, caret);
  const under = input[caret] ?? ' ';
  const after = input.slice(caret + 1);

  return (
    <div
      role="application"
      aria-label="JackDOS, 1997. Type HELP for commands, EXIT to return."
      // See-through while 2026 glitches, black once the CRT takes over.
      className={cn('fixed inset-0 z-[90]', power !== 'glitch' && 'bg-black')}
      onPointerDown={(e) => {
        // Keep focus on the typing line, but let people select text to copy.
        if (e.button === 0 && !window.getSelection()?.toString()) setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {power === 'glitch' && <TimeGlitch />}
      {power !== 'glitch' && (
      <div
        className={cn(
          'relative h-full w-full overflow-hidden bg-[#0a0a0a]',
          power === 'on'
            ? 'motion-safe:animate-[crt-on_700ms_ease-out_both,crt-flicker_120ms_steps(2)_infinite_700ms]'
            : 'motion-safe:animate-[crt-off_450ms_ease-in_both] motion-reduce:opacity-0',
        )}
      >
        {post && (
          // The BIOS self test has the whole screen to itself.
          <div className="h-full px-8 py-6" style={screenStyle}>
            <div className="mx-auto h-full" style={{ width: `${SCREEN_EM}em`, maxWidth: '100%' }}>
              <DosPost lines={post} tones={TONES} />
            </div>
          </div>
        )}
        {menu && (
          // A menu takes over the whole screen, as DOS menus did.
          <div className="h-full px-8 py-6" style={screenStyle}>
            <div className="mx-auto h-full" style={{ width: `${SCREEN_EM}em`, maxWidth: '100%' }}>
              <DosMenu
                title={menu.title}
                items={menu.items}
                selected={menu.selected}
                colors={{ normal: TONES.normal, bright: TONES.bright, dim: TONES.dim, background: '#0a0a0a' }}
                onHover={(i) => setMenu({ ...menu, selected: i })}
                onChoose={(i) => menu.resolve(i)}
              />
            </div>
          </div>
        )}
        <div
          ref={scrollRef}
          className={cn(
            'h-full overflow-y-auto px-8 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            (menu || post) && 'hidden',
          )}
          style={screenStyle}
        >
          <div className="mx-auto" style={{ width: `${SCREEN_EM}em`, maxWidth: '100%' }}>
            {lines.map((line, i) => (
              <div
                key={i}
                className="min-h-[1.12em] whitespace-pre"
                style={{
                  color: TONES[line.tone ?? 'normal'],
                  textShadow: '0 0 2px currentColor, 0 0 10px rgba(170,170,170,0.25)',
                }}
              >
                {line.text}
              </div>
            ))}

            {pause && (
              <div className="whitespace-pre" style={{ color: TONES.warn, textShadow: '0 0 2px currentColor' }}>
                {pause.message}
                <span
                  aria-hidden="true"
                  className="ml-[0.1em] inline-block h-[0.18em] w-[0.4em] bg-current align-baseline motion-safe:animate-[dos-cursor_1060ms_steps(1)_infinite]"
                />
              </div>
            )}

            {booted && !busy && (
              <div className="whitespace-pre" style={{ color: TONES.normal, textShadow: '0 0 2px currentColor' }}>
                {PROMPT}
                {before}
                <span className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-[0.08em] h-[0.18em] bg-current motion-safe:animate-[dos-cursor_1060ms_steps(1)_infinite]"
                  />
                  {under}
                </span>
                {after}
              </div>
            )}
          </div>
        </div>

        {/* The glass: scanlines and a darker rim, over the text but never in the way. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.28) 3px)',
              'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)',
            ].join(', '),
          }}
        />
      </div>
      )}

      <input
        ref={inputRef}
        aria-label="Command"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="absolute left-0 top-0 h-px w-px opacity-0"
        value={input}
        onChange={(e) => {
          // Menus and "press any key" read keys, not text (a paste mustn't land on the prompt).
          if (menu || pause) return;
          setInput(e.target.value.slice(0, COLS - PROMPT.length - 1));
          setCaret(e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
        onBlur={() => booted && setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)}
      />
    </div>
  );
}
