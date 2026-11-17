'use client';

import { Children, Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { rollDirection, tokenise } from '@/lib/tools/rolling';

/** How long a digit takes to roll (the CSS in globals.css), plus the longest ripple delay, before the old digit is dropped. */
const ROLL_MS = 380;
const MAX_RIPPLE = 8;
const RIPPLE_MS = 28;

type Dir = 'up' | 'down';

/**
 * One digit. When its character changes, the old one stays in the same cell and rolls away (fading and blurring)
 * while the new one rolls in. A digit that appears after the page has loaded (the number got longer) rolls in too.
 */
function Digit({ ch, dir, delay, enter }: { ch: string; dir: Dir; delay: number; enter: boolean }) {
  const [s, setS] = useState<{ cur: string; prev: string | null; n: number }>({ cur: ch, prev: null, n: 0 });
  // Adjusting state while rendering (React's own pattern for "the prop changed"): no extra paint with the old digit.
  if (ch !== s.cur) setS({ cur: ch, prev: s.cur, n: s.n + 1 });
  const { cur, prev, n } = s;

  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setS((x) => (x.n === n ? { ...x, prev: null } : x)), ROLL_MS + delay);
    return () => clearTimeout(t);
  }, [n, prev, delay]);

  const style = { '--roll-delay': `${delay}ms` } as React.CSSProperties;
  return (
    <span className="cuppi-digit" data-dir={dir}>
      {prev !== null && (
        // `key` restarts the animation each time the digit changes, even in the middle of another roll.
        <span key={`o${n}`} aria-hidden className="cuppi-digit-out" style={style}>
          {prev}
        </span>
      )}
      <span key={`i${n}`} className={n > 0 || enter ? 'cuppi-digit-in' : undefined} style={style}>
        {cur}
      </span>
    </span>
  );
}

/**
 * Text whose digits roll when it changes: "£1,389.58" becoming "£1,535.22" rolls each digit that differs, upwards
 * because the figure went up. Everything that is not a digit is plain text. Works for any text (a whole sentence, a
 * time such as "18 years 10 months"), and the first time it is shown nothing moves.
 */
export function AnimatedText({ text }: { text: string }) {
  const [state, setState] = useState<{ text: string; dir: Dir }>({ text, dir: 'up' });
  if (text !== state.text) setState({ text, dir: rollDirection(state.text, text) });
  const loaded = useRef(false);
  useEffect(() => {
    loaded.current = true;
  }, []);

  return (
    <>
      {tokenise(text).map((t) =>
        t.kind === 'digit' ? (
          <Digit key={`d${t.ordinal}`} ch={t.ch} dir={state.dir} delay={Math.min(t.ordinal, MAX_RIPPLE) * RIPPLE_MS} enter={loaded.current} />
        ) : (
          <Fragment key={`t${t.ordinal}`}>{t.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Wraps any plain text or number among `children` in AnimatedText, and leaves elements as they are. */
export function Roll({ children }: { children?: ReactNode }) {
  return <>{Children.map(children, (c) => (typeof c === 'string' || typeof c === 'number' ? <AnimatedText text={String(c)} /> : c))}</>;
}
