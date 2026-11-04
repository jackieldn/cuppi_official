'use client';

// A full-screen pick list in the style of MS-DOS 6.22's startup menu: a
// title with a double rule under it, numbered rows with the chosen one in
// inverse video, "Enter a choice:", and the keys along the bottom line.
// The keys themselves are handled by DosScreen (see `menuKey` there).

import { padLeft } from '@/lib/dos-text';

/** Rows shown at once; longer lists scroll, keeping the highlight in view. */
export const MENU_ROWS = 15;

export interface MenuState {
  title: string;
  items: string[];
  selected: number;
}

/** The first row shown, so the highlight sits mid-window where it can. */
export function menuWindowStart(selected: number, count: number): number {
  return Math.min(Math.max(0, selected - Math.floor(MENU_ROWS / 2)), Math.max(0, count - MENU_ROWS));
}

interface DosMenuProps extends MenuState {
  colors: { normal: string; bright: string; dim: string; background: string };
  onHover: (index: number) => void;
  onChoose: (index: number) => void;
}

export function DosMenu({ title, items, selected, colors, onHover, onChoose }: DosMenuProps) {
  const start = menuWindowStart(selected, items.length);
  const shown = items.slice(start, start + MENU_ROWS);
  const numberWidth = String(items.length).length;
  const glow = { textShadow: '0 0 2px currentColor, 0 0 10px rgba(170,170,170,0.25)' };

  return (
    <div className="flex h-full flex-col whitespace-pre" style={{ color: colors.normal, ...glow }}>
      <div style={{ color: colors.bright }}>{title}</div>
      <div style={{ color: colors.bright }}>{'═'.repeat(title.length)}</div>
      <div>{start > 0 ? `    ▲ ${start} more` : ' '}</div>

      <ol role="listbox" aria-label={title} aria-activedescendant={`dos-menu-${selected}`}>
        {shown.map((item, i) => {
          const index = start + i;
          const current = index === selected;
          return (
            <li
              key={index}
              id={`dos-menu-${index}`}
              role="option"
              aria-selected={current}
              className="cursor-default"
              onPointerEnter={() => onHover(index)}
              onClick={() => onChoose(index)}
            >
              {'    '}
              <span
                // Inverse video: grey block, black text, no glow.
                style={current ? { background: colors.normal, color: colors.background, textShadow: 'none' } : undefined}
              >
                {`${padLeft(String(index + 1), numberWidth)}. ${item}`}
              </span>
            </li>
          );
        })}
      </ol>

      <div>{start + MENU_ROWS < items.length ? `    ▼ ${items.length - start - MENU_ROWS} more` : ' '}</div>
      <div> </div>
      <div>
        {' Enter a choice: '}
        <span className="underline decoration-[0.12em] underline-offset-[0.15em]">{selected + 1}</span>
        <span style={{ color: colors.dim }}>{`        Item ${selected + 1} of ${items.length}`}</span>
      </div>

      <div className="mt-auto" style={{ color: colors.bright }}>
        {'↑↓=Select  Enter=Open  1-9=Jump to number  Esc=Back to C:\\>'}
      </div>
    </div>
  );
}
