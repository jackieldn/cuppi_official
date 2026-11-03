import { useRef, type CSSProperties, type PointerEvent, type RefObject } from 'react';

/** Degrees of tilt at the edge of the card. */
export const TILT_DEG = 9;

/** The tilting element's transform: perspective, cursor tilt and a small lift. */
export const TILT_TRANSFORM =
  'perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(calc(1 + var(--lift, 0) * 0.025))';

/** A soft highlight that tracks the cursor, strongest while hovered. */
export const SHINE_STYLE: CSSProperties = {
  background:
    'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)',
  mixBlendMode: 'overlay',
  opacity: 'var(--lift, 0)',
  transition: 'opacity 300ms ease-out',
};

/**
 * The works-page card effect: tilt and shine follow the cursor through CSS
 * variables set straight on the element (no React state, so moving the mouse
 * doesn't re-render anything). Measured on `wrapperRef`'s element, which must not
 * tilt itself, so the maths can't feed back on itself. Mouse only.
 * Pass your own ref if the wrapper is already referenced elsewhere.
 */
export function useCursorTilt<T extends HTMLElement = HTMLElement>(
  externalWrapperRef?: RefObject<HTMLDivElement>
) {
  const ownWrapperRef = useRef<HTMLDivElement>(null);
  const wrapperRef = externalWrapperRef ?? ownWrapperRef;
  const tiltRef = useRef<T>(null);

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const wrapper = wrapperRef.current;
    const tilt = tiltRef.current;
    if (!wrapper || !tilt) return;
    const r = wrapper.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    tilt.style.setProperty('--rx', `${-y * TILT_DEG}deg`);
    tilt.style.setProperty('--ry', `${x * TILT_DEG}deg`);
    tilt.style.setProperty('--px', String(x));
    tilt.style.setProperty('--py', String(y));
    tilt.style.setProperty('--mx', `${(x + 1) * 50}%`);
    tilt.style.setProperty('--my', `${(y + 1) * 50}%`);
    tilt.style.setProperty('--lift', '1');
  };

  const onPointerLeave = () => {
    const tilt = tiltRef.current;
    if (!tilt) return;
    ['--rx', '--ry'].forEach((v) => tilt.style.setProperty(v, '0deg'));
    ['--px', '--py', '--lift'].forEach((v) => tilt.style.setProperty(v, '0'));
  };

  return { wrapperRef, tiltRef, onPointerMove, onPointerLeave };
}
