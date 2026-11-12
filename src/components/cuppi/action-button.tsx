import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// The main action on a page: the one thing we most want you to press (Download,
// Message us). It is built like the app's own icons: a flat fill, a 1px deeper
// outline, and a thin bright shine at the top and bottom that curves into the
// pill's ends. One definition, so every main action on the site is the same.
// Secondary buttons ("Explore features", "All features") stay plain on purpose.
const ACCENT = {
  fill: '#D65A1F', // the app's AccentColor
  edge: '#DD6525', // a touch lighter, easing in just inside the top and bottom
  shine: '#FF9D63', // the brighter, more saturated band at the very top and bottom
  line: '#B8461A', // the 1px outline
};

const OUTLINE = '1px';
const SHINE = '1.25px'; // the bright band, sitting just inside the outline

const SIZES = {
  md: 'px-5 py-2.5 text-[0.95rem]',
  lg: 'px-8 py-3.5 text-lg',
};

type Common = { size?: keyof typeof SIZES; className?: string; children: React.ReactNode };
type AsLink = Common & { href: string; /** Open in a new tab. */ external?: boolean; /** A plain link with no routing, for app deep links such as cuppi://. */ plain?: boolean } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>;
type AsButton = Common & { href?: undefined; external?: undefined; plain?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;
type Props = AsLink | AsButton;

/** A link (internal or external) or a button, depending on whether it has an href. Forwards its ref, so it works as a dialog trigger. */
export const ActionButton = React.forwardRef<HTMLElement, Props>(function ActionButton(
  { size = 'md', className, children, href, external, plain, ...rest },
  ref,
) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold text-cuppi-card',
    'transition-transform duration-300 [transition-timing-function:var(--ease-spring)] hover:-translate-y-0.5 hover:scale-[1.03] active:scale-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cuppi-brand focus-visible:ring-offset-2 focus-visible:ring-offset-cuppi-paper',
    SIZES[size],
    className,
  );
  const style: React.CSSProperties = {
    background: `linear-gradient(to bottom, ${ACCENT.edge} 0%, ${ACCENT.fill} 30%, ${ACCENT.fill} 70%, ${ACCENT.edge} 100%)`,
    // The outline first (it paints on top), then the two shine bands sitting just inside it.
    boxShadow: [
      `inset 0 0 0 ${OUTLINE} ${ACCENT.line}`,
      `inset 0 calc(${OUTLINE} + ${SHINE}) 0 0 ${ACCENT.shine}`,
      `inset 0 calc(-1 * (${OUTLINE} + ${SHINE})) 0 0 ${ACCENT.shine}`,
    ].join(', '),
  };

  if (href === undefined) {
    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={classes} style={style} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }
  if (external || plain) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={classes}
        style={style}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }
  return (
    <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={classes} style={style} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </Link>
  );
});
