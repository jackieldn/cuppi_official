import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import type { PlansPrices } from '@/lib/plans-settings';
import {
  APP_IDS,
  APP_NAMES,
  SNAPSHOTS_PATH,
  dateLabel,
  formatPounds,
  isExternalUrl,
  parsePounds,
  type AppId,
  type CompareContent,
  type Reason,
} from '@/lib/compare-data';
import { TINTS } from '../blocks/tints';
import { SourceRefs, type Cite } from './source-refs';
import { ReasonTile } from './reason-tile';
import { TiltCard } from './tilt-card';

/** Four short reasons, in the site's tints, each with its glass squircle icon. */
export function WhyCuppi({ reasons }: { reasons: Reason[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {reasons.map((r) => {
        const t = TINTS[r.tint];
        return (
          <Reveal key={r.id} stagger={80}>
            <TiltCard className={cn('rounded-[2rem] p-6', t.surface, t.text)}>
              <ReasonTile tile={r.tile} icon={r.icon} iconUrl={r.iconUrl} className="h-14 w-14" />
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
export function DataSection({ content, cite }: { content: CompareContent; cite: Cite }) {
  return (
    <section aria-labelledby="data-title" className="relative overflow-hidden rounded-[2.5rem] bg-cuppi-lake px-5 py-10 text-cuppi-cream sm:px-10 sm:py-14">
      <h2 id="data-title" className="text-center font-headline text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
        {content.privacyTitle}
      </h2>
      {content.privacyIntro && <p className="mx-auto mt-3 max-w-2xl text-center text-lg leading-relaxed text-cuppi-cream/75">{content.privacyIntro}</p>}
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {APP_IDS.map((app: AppId) => {
          const p = content.panels[app];
          return (
            <Reveal key={app} stagger={80}>
              {/* Cuppi Home's card sits in a wrapper with no background, which carries the slow travelling glow round its edge. */}
              <div className={cn('h-full rounded-[1.75rem]', app === 'cuppi' && 'cuppi-glow')}>
              <div className={cn('flex h-full flex-col rounded-[1.75rem] p-5 sm:p-6', app === 'cuppi' ? 'bg-cuppi-cream text-cuppi-espresso' : 'bg-cuppi-cream/10')}>
                <h3 className="font-headline text-2xl font-normal">
                  {APP_NAMES[app]}
                  {app !== 'cuppi' && <SourceRefs ids={p.sources} cite={cite} onDark />}
                </h3>
                <h4 className={cn('mt-5', LABEL, app === 'cuppi' ? 'text-cuppi-espresso' : 'text-cuppi-cream')}>{content.privacyLabels.tracking}</h4>
                {p.tracking.length === 0 ? (
                  <p className="mt-2 self-start rounded-full bg-cuppi-moss-deep px-3 py-1 text-sm font-semibold text-cuppi-cream">{content.privacyLabels.nothing}</p>
                ) : (
                  <Chips items={p.tracking} />
                )}
                {p.identifiers.length > 0 && (
                  <>
                    <h4 className={cn('mt-5', LABEL, 'text-cuppi-cream')}>{content.privacyLabels.identifiers}</h4>
                    <p className="mt-1 text-sm leading-snug">{p.identifiers.join('. ')}</p>
                  </>
                )}
                <Plain label={content.privacyLabels.linked} items={p.linked} onLight={app === 'cuppi'} />
                <Plain label={content.privacyLabels.notLinked} items={p.notLinked} onLight={app === 'cuppi'} />
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
export function PriceSection({ content, prices, cite }: { content: CompareContent; prices: PlansPrices; cite: Cite }) {
  const cuppi = parsePounds(prices.monthly);
  const { familywall, hartley } = content.prices;
  const max = Math.max(cuppi ?? 0, familywall.monthly, hartley.monthly) || 1;
  const pct = (n: number | undefined) => (n === undefined ? undefined : (n / max) * 100);
  return (
    <div className="rounded-[2rem] border border-cuppi-line bg-cuppi-card p-5 sm:p-8">
      <div className="space-y-6">
        <Bar
          label="Cuppi Pro"
          price={prices.monthly}
          width={pct(cuppi)}
          className="bg-cuppi-moss"
          note={`Generous free tier, optional upgrade${prices.annualNote ? `, ${prices.annualNote.toLowerCase()} on the yearly plan` : ''}. ${content.trial}`}
        />
        <Bar
          label="FamilyWall Premium"
          price={formatPounds(familywall.monthly)}
          width={pct(familywall.monthly)}
          className="bg-cuppi-honey"
          note={familywall.funding}
          refs={<SourceRefs ids={familywall.sources} cite={cite} />}
        />
        <Bar
          label="Hartley"
          price={formatPounds(hartley.monthly)}
          width={pct(hartley.monthly)}
          className="bg-cuppi-sky"
          note={hartley.funding}
          refs={<SourceRefs ids={hartley.sources} cite={cite} />}
        />
      </div>
    </div>
  );
}

/** Where every claim came from, in the order the page cites them, with the date each was checked. */
export function SourcesList({ content, cite }: { content: CompareContent; cite: Cite }) {
  const cited = content.sources.flatMap((s) => (cite.numbers.has(s.id) ? [{ s, n: cite.numbers.get(s.id)! }] : [])).sort((a, b) => a.n - b.n);
  const hasSnapshots = content.snapshots.some((s) => APP_IDS.some((app) => s.apps[app].shots.length > 0));
  const link = 'inline-flex items-center gap-1 font-medium text-cuppi-brand-deep underline-offset-2 hover:underline';
  return (
    <div className="mx-auto max-w-2xl">
      <ol className="space-y-2.5">
        {cited.map(({ s, n }) => (
          <li key={s.id} id={`source-${n}`} className="scroll-mt-28 flex gap-3 text-sm leading-snug">
            <span className="w-5 shrink-0 text-right font-semibold text-cuppi-ink-soft">{n}.</span>
            <span>
              {s.url && isExternalUrl(s.url) ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={link}>
                  {s.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : s.url ? (
                <Link href={s.url} className={link}>
                  {s.label}
                </Link>
              ) : (
                <span className="font-medium">{s.label}</span>
              )}
              <span className="text-cuppi-ink-soft">, checked {dateLabel(s.checkedOn)}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-cuppi-ink-soft">
        Facts about other apps were checked on {dateLabel(content.checkedOn)} from their UK App Store pages, websites, policies and Companies House, and describe what they say, not what they might change tomorrow. Cuppi isn’t
        affiliated with Hartley or FamilyWall, and their names belong to their owners. Spotted something out of date? Tell us on the{' '}
        <Link href="/support" className="font-medium text-cuppi-brand-deep underline-offset-2 hover:underline">
          support page
        </Link>
        .
      </p>
      <p className="mt-3 text-xs leading-relaxed text-cuppi-ink-soft">
        {content.testNote}
        {hasSnapshots && (
          <>
            {' '}
            <Link href={SNAPSHOTS_PATH} className="font-medium text-cuppi-brand-deep underline-offset-2 hover:underline">
              See the snapshots
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
