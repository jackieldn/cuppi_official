import { ExternalLink, Home, MapPin, ShieldCheck, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { PlansPrices } from '@/lib/plans-settings';
import {
  APP_IDS,
  APP_NAMES,
  CHECKED_ON_LABEL,
  CUPPI_TRIAL,
  DATA_PANELS,
  REASONS,
  RIVAL_PRICES,
  SOURCES,
  TEST_NOTE,
  parsePounds,
  type AppId,
  type Reason,
} from '@/lib/compare-data';
import { TINTS } from '../blocks/tints';
import { SourceRefs } from './source-refs';
import { TiltCard } from './tilt-card';

const ICONS: Record<Reason['icon'], typeof Home> = { home: Home, shield: ShieldCheck, phone: Smartphone, map: MapPin };

/** Four short reasons, in the site's tints. */
export function WhyCuppi() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {REASONS.map((r) => {
        const t = TINTS[r.tint];
        const Icon = ICONS[r.icon];
        return (
          <Reveal key={r.id} stagger={80}>
            <TiltCard className={cn('rounded-[2rem] p-6', t.surface, t.text)}>
              <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', t.chip)}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-headline text-2xl font-normal leading-tight">{r.title}</h3>
              <p className={cn('mt-1.5 leading-snug', t.muted)}>{r.text}</p>
            </TiltCard>
          </Reveal>
        );
      })}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-cuppi-cream/15 px-3 py-1 text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** The bold label above each group of data types on a card, so a card of small text has clear boundaries. */
const LABEL = 'text-[0.95rem] font-bold leading-snug tracking-tight';

function Plain({ label, items, onLight }: { label: string; items: string[]; onLight?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <h4 className={cn(LABEL, onLight ? 'text-cuppi-espresso' : 'text-cuppi-cream')}>{label}</h4>
      <p className="mt-1 text-sm leading-snug">{items.join(', ')}</p>
    </div>
  );
}

/** What each app's App Store label and policy say it may use to track you, type by type. */
export function DataSection({ numbers }: { numbers: Map<string, number> }) {
  return (
    <section aria-labelledby="data-title" className="relative overflow-hidden rounded-[2.5rem] bg-cuppi-lake px-5 py-10 text-cuppi-cream sm:px-10 sm:py-14">
      <h2 id="data-title" className="text-center font-headline text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
        Privacy hygiene
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-lg leading-relaxed text-cuppi-cream/75">
        What each app’s App Store label says it may use to track you, type by type, and what its own policy names.
      </p>
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {APP_IDS.map((app: AppId) => {
          const p = DATA_PANELS[app];
          return (
            <Reveal key={app} stagger={80}>
              {/* Cuppi Home's card sits in a wrapper with no background, which carries the slow travelling glow round its edge. */}
              <div className={cn('h-full rounded-[1.75rem]', app === 'cuppi' && 'cuppi-glow')}>
              <div className={cn('flex h-full flex-col rounded-[1.75rem] p-5 sm:p-6', app === 'cuppi' ? 'bg-cuppi-cream text-cuppi-espresso' : 'bg-cuppi-cream/10')}>
                <h3 className="font-headline text-2xl font-normal">
                  {APP_NAMES[app]}
                  {app !== 'cuppi' && <SourceRefs ids={p.sources} numbers={numbers} onDark />}
                </h3>
                <h4 className={cn('mt-5', LABEL, app === 'cuppi' ? 'text-cuppi-espresso' : 'text-cuppi-cream')}>Used to track you</h4>
                {p.tracking.length === 0 ? (
                  <p className="mt-2 self-start rounded-full bg-cuppi-moss-deep px-3 py-1 text-sm font-semibold text-cuppi-cream">Nothing</p>
                ) : (
                  <Chips items={p.tracking} />
                )}
                {p.identifiers.length > 0 && (
                  <>
                    <h4 className={cn('mt-5', LABEL, 'text-cuppi-cream')}>Advertising identifiers named in its policy</h4>
                    <p className="mt-1 text-sm leading-snug">{p.identifiers.join('. ')}</p>
                  </>
                )}
                <Plain label="Linked to you" items={p.linked} onLight={app === 'cuppi'} />
                <Plain label="Not linked to you" items={p.notLinked} onLight={app === 'cuppi'} />
                {/* The explainer under the divider is pushed to the foot of the card, so the three line up whatever is above them. */}
                {p.note && (
                  <div className="mt-auto pt-4">
                    <p className={cn('border-t pt-3 text-sm leading-snug', app === 'cuppi' ? 'border-cuppi-espresso/15 text-cuppi-espresso/70' : 'border-cuppi-cream/20 text-cuppi-cream/80')}>{p.note}</p>
                  </div>
                )}
              </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Bar({ label, price, width, className, note, refs }: { label: string; price: string; width: number | undefined; className: string; note: string; refs?: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <span className="font-headline text-xl font-normal sm:text-2xl">{label}</span>
        <span className="font-headline text-xl font-normal sm:text-2xl">
          {price} <span className="text-sm text-cuppi-ink-soft">a month</span>
        </span>
      </div>
      {width !== undefined && (
        <div className="mt-1.5 h-3 rounded-full bg-cuppi-paper-deep" role="img" aria-label={`${label}: ${price} a month`}>
          <div className={cn('h-full rounded-full', className)} style={{ width: `${Math.max(width, 1.5)}%` }} />
        </div>
      )}
      <p className="mt-1.5 text-sm leading-snug text-cuppi-ink-soft">
        {note}
        {refs}
      </p>
    </div>
  );
}

/** What it costs a month, as bars, and how each app pays its way. Cuppi's figures are the Plans page's own. */
export function PriceSection({ prices, numbers }: { prices: PlansPrices; numbers: Map<string, number> }) {
  const cuppi = parsePounds(prices.monthly);
  const max = Math.max(cuppi ?? 0, RIVAL_PRICES.familywall.monthly, RIVAL_PRICES.hartley.monthly) || 1;
  const pct = (n: number | undefined) => (n === undefined ? undefined : (n / max) * 100);
  return (
    <div className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-5 sm:p-8">
      <div className="space-y-6">
        <Bar
          label="Cuppi Pro"
          price={prices.monthly}
          width={pct(cuppi)}
          className="bg-cuppi-honey"
          note={`Generous free tier, optional upgrade${prices.annualNote ? `, ${prices.annualNote.toLowerCase()} on the yearly plan` : ''}. ${CUPPI_TRIAL}`}
        />
        <Bar
          label="FamilyWall Premium"
          price={RIVAL_PRICES.familywall.label}
          width={pct(RIVAL_PRICES.familywall.monthly)}
          className="bg-cuppi-moss"
          note={RIVAL_PRICES.familywall.funding}
          refs={<SourceRefs ids={RIVAL_PRICES.familywall.sources} numbers={numbers} />}
        />
        <Bar
          label="Hartley"
          price={RIVAL_PRICES.hartley.label}
          width={pct(RIVAL_PRICES.hartley.monthly)}
          className="bg-cuppi-sky"
          note={RIVAL_PRICES.hartley.funding}
          refs={<SourceRefs ids={RIVAL_PRICES.hartley.sources} numbers={numbers} />}
        />
      </div>
    </div>
  );
}

/** Where every claim came from, in the order the page cites them, with the date each was checked. */
export function SourcesList({ numbers }: { numbers: Map<string, number> }) {
  const cited = SOURCES.flatMap((s) => (numbers.has(s.id) ? [{ s, n: numbers.get(s.id)! }] : [])).sort((a, b) => a.n - b.n);
  return (
    <div className="mx-auto max-w-2xl">
      <ol className="space-y-2.5">
        {cited.map(({ s, n }) => (
          <li key={s.id} id={`source-${n}`} className="scroll-mt-28 flex gap-3 text-sm leading-snug">
            <span className="w-5 shrink-0 text-right font-semibold text-cuppi-ink-soft">{n}.</span>
            <span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-cuppi-brand-deep underline-offset-2 hover:underline">
                  {s.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : (
                <span className="font-medium">{s.label}</span>
              )}
              <span className="text-cuppi-ink-soft">, checked {new Date(s.checkedOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-cuppi-ink-soft">
        Facts about other apps were checked on {CHECKED_ON_LABEL} from their UK App Store pages, websites, policies and Companies House, and describe what they say, not what they might change tomorrow. Cuppi isn’t
        affiliated with Hartley or FamilyWall, and their names belong to their owners. Spotted something out of date? Tell us on the{' '}
        <a href="/support" className="font-medium text-cuppi-brand-deep underline-offset-2 hover:underline">
          support page
        </a>
        .
      </p>
      <p className="mt-3 text-xs leading-relaxed text-cuppi-ink-soft">{TEST_NOTE}</p>
    </div>
  );
}
