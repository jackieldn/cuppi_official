import { FadeImage } from '@/components/cuppi/fade-image';
import { Reveal } from '@/components/ui/reveal';
import { APP_IDS, APP_NAMES, allRows, dateLabel, type AppId, type CompareContent, type Shot, type SnapApp } from '@/lib/compare-data';
import { cn } from '@/lib/utils';

/** A screenshot as it was taken, with the site's soft rounded corners and a hairline edge, and no phone around it. */
export function ShotImage({ shot, sizes, className }: { shot: Shot; sizes: string; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-[1.5rem] border border-cuppi-line bg-cuppi-paper-deep shadow-[0_8px_18px_rgb(var(--c-shadow)/0.1)] sm:rounded-[1.75rem]', className)}>
      <FadeImage soft src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes={sizes} className="block h-auto w-full" />
    </div>
  );
}

/** What was recorded about a set of screenshots: the app's version, the phone and the day, then what was done. */
function meta(a: SnapApp): string {
  return [a.version && `Version ${a.version}`, a.device, a.testedOn && dateLabel(a.testedOn)].filter(Boolean).join(' · ');
}

function AppRow({ app, snap }: { app: AppId; snap: SnapApp }) {
  const info = meta(snap);
  return (
    <div className="grid gap-3 border-t border-cuppi-line py-5 first:border-t-0 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6">
      <div>
        <h4 className="font-headline text-xl font-normal">{APP_NAMES[app]}</h4>
        {info && <p className="mt-1 text-sm text-cuppi-ink-soft">{info}</p>}
        {snap.what && <p className="mt-1 text-sm leading-snug">{snap.what}</p>}
      </div>
      {snap.shots.length > 0 ? (
        <div className="grid max-w-2xl grid-cols-3 items-start gap-2.5 sm:gap-4">
          {snap.shots.map((shot, i) => (
            <ShotImage key={i} shot={shot} sizes="(max-width: 768px) 30vw, 220px" />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-cuppi-line px-4 py-6 text-sm text-cuppi-ink-soft">No screenshot for this one.</p>
      )}
    </div>
  );
}

/**
 * The snapshots page body: for each row of the comparison that has screenshots, the proof, app by app (up to three
 * screenshots each, the way they were taken). It draws what it is given and knows nothing about the database.
 */
export function SnapshotsView({ content }: { content: CompareContent }) {
  const rowById = new Map(allRows(content).map((r) => [r.id, r]));
  const shown = new Set(content.snapshots.filter((s) => APP_IDS.some((a) => s.apps[a].shots.length > 0)).map((s) => s.rowId));
  const groups = content.groups
    .map((g) => ({ group: g, rows: g.rows.filter((r) => shown.has(r.id)) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-10 pt-8 sm:px-6">
      {groups.length === 0 && <p className="py-16 text-center text-lg text-cuppi-ink-soft">The screenshots are on their way.</p>}
      {groups.map(({ group, rows }) => (
        <section key={group.id} aria-labelledby={`g-${group.id}`} className="pt-8 first:pt-0">
          <Reveal className="pb-4 text-center">
            <h2 id={`g-${group.id}`} className="font-headline text-3xl font-normal tracking-tight sm:text-4xl">
              {group.title}
            </h2>
          </Reveal>
          <div className="space-y-4">
            {rows.map((row) => {
              const snap = content.snapshots.find((s) => s.rowId === row.id)!;
              return (
                <Reveal key={row.id}>
                  <article id={row.id} className="scroll-mt-28 rounded-[2rem] border border-cuppi-line bg-cuppi-card px-5 py-6 sm:px-8">
                    <h3 className="font-headline text-2xl font-normal sm:text-3xl">{rowById.get(row.id)?.label}</h3>
                    {snap.note && <p className="mt-1 max-w-2xl text-cuppi-ink-soft">{snap.note}</p>}
                    <div className="mt-3">
                      {APP_IDS.map((app) => (
                        <AppRow key={app} app={app} snap={snap.apps[app]} />
                      ))}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
