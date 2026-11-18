'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FONTS =
  'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=DM+Serif+Display:ital@0;1&display=swap';

// A page of its own: the marker lets the mount tell this document from the blank one a frame starts with.
const SHELL = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body data-preview></body></html>';

/**
 * Gives the frame the colour mode the stylesheet reads off the root element (`data-theme`, and the `dark` class for Tailwind's dark:).
 * With a `theme` the frame is set to that, whatever the admin page is in; without one it follows the admin page.
 */
function setRootLook(from: HTMLElement, to: HTMLElement, theme?: 'light' | 'dark') {
  for (const name of ['class', 'data-theme', 'style']) {
    const value = from.getAttribute(name);
    if (value === null) to.removeAttribute(name);
    else to.setAttribute(name, value);
  }
  if (theme) {
    to.setAttribute('data-theme', theme);
    to.classList.toggle('dark', theme === 'dark');
  }
}

/**
 * Draws its children on a screen `width` pixels wide: in a frame of that width, with the site's stylesheets copied into it. The frame
 * has a viewport of its own, so the hero's breakpoints (md, lg, and the ones in globals.css) fire exactly as they do on a phone, a
 * tablet or a desktop, which scaling a desktop-width drawing down never could. The children are still part of this page's React tree
 * (a portal), so they see the same data and contexts as anything else here, and they update live as the form changes.
 * The frame is `screenHeight` tall (more if its content is taller) but only as much of it is shown as the content fills, and the whole thing is
 * shrunk to fit the column when the column is narrower than `width`.
 */
export function DevicePreview({ width, screenHeight, theme, children }: { width: number; screenHeight: number; theme?: 'light' | 'dark'; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  /** The styles have arrived, so the first thing seen is the hero rather than unstyled text. */
  const [styled, setStyled] = useState(false);
  const [available, setAvailable] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // Once the frame's own page is there: copy the site's styles in, add the fonts, and mount point for the children.
  const mount = useCallback(() => {
    const d = frame.current?.contentDocument;
    if (!d?.body?.hasAttribute('data-preview') || d.body.dataset.mounted) return;
    d.body.dataset.mounted = 'true';
    d.body.className = 'theme-cuppi font-body bg-cuppi-paper text-cuppi-ink';
    d.body.style.margin = '0';
    // A picture of the hero, not the page: its button must not take the admin away from the form (the site's links go through this
    // page's router, so it would be the admin that moved).
    d.addEventListener('click', (e) => {
      if ((e.target as Element | null)?.closest?.('a')) e.preventDefault();
    }, true);

    const waits: Promise<void>[] = [];
    const add = (source: Element) => {
      const copy = source.cloneNode(true) as HTMLElement;
      if (copy instanceof HTMLLinkElement) waits.push(new Promise((resolve) => ((copy.onload = copy.onerror = () => resolve()), undefined)));
      d.head.appendChild(copy);
    };
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(add);
    const fonts = d.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = FONTS;
    waits.push(new Promise((resolve) => ((fonts.onload = fonts.onerror = () => resolve()), undefined)));
    d.head.appendChild(fonts);

    // Never left hidden: after 3 seconds it shows whatever has arrived.
    Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 3000))]).then(() => setStyled(true));
    setDoc(d);
  }, []);

  useEffect(() => {
    // The frame may have loaded before this page finished starting up, so its load event was missed.
    mount();
  }, [mount]);

  // The frame is in the colour mode it was asked for, or follows the admin page's as it changes.
  useEffect(() => {
    if (!doc) return;
    const root = document.documentElement;
    const sync = () => setRootLook(root, doc.documentElement, theme);
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    return () => mo.disconnect();
  }, [doc, theme]);

  // The frame is as tall as its page. Watched from inside the frame, where its size is known.
  useEffect(() => {
    if (!doc?.defaultView) return;
    const view = doc.defaultView as Window & typeof globalThis;
    const measure = () => setContentHeight(doc.body.offsetHeight);
    measure();
    const ro = new view.ResizeObserver(measure);
    ro.observe(doc.body);
    return () => ro.disconnect();
  }, [doc]);

  // The room there is, to scale into.
  useEffect(() => {
    const o = outer.current;
    if (!o) return;
    const measure = () => setAvailable(o.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    return () => ro.disconnect();
  }, []);

  const scale = available > 0 ? Math.min(1, available / width) : 1;
  return (
    <div ref={outer} className="w-full">
      <div className="mx-auto overflow-hidden rounded-xl border bg-cuppi-paper" style={{ width: width * scale, height: contentHeight * scale || undefined, visibility: styled && available > 0 ? 'visible' : 'hidden' }}>
        <iframe
          ref={frame}
          title="Hero preview"
          srcDoc={SHELL}
          onLoad={mount}
          scrolling="no"
          className="block border-0"
          // The frame is a whole screen tall (or its content, if that is taller), so a height set against the screen (100svh) has a real screen
          // to be measured against; the box around it shows only as much as the hero takes.
          style={{ width, height: Math.max(screenHeight, contentHeight), transform: `scale(${scale})`, transformOrigin: 'top left' }}
        />
      </div>
      {doc && createPortal(children, doc.body)}
    </div>
  );
}
