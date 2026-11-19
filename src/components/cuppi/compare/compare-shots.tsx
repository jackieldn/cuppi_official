import { FadeImage } from '@/components/cuppi/fade-image';
import { PhoneMockup } from '@/components/cuppi/blocks/phone-mockup';
import { MOCKUPS } from '@/lib/phone-mockups';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/utils';
import { APP_NAMES, CHECKED_ON_LABEL, SHOTS, type AppId, type Shot } from '@/lib/compare-data';

/**
 * An older phone, drawn in CSS: thick bezel, a notch, a chin. It frames a rival's screenshot (or stands empty until
 * there is one). The screenshot is shown whole and unaltered, cropped only by the screen.
 */
function OldPhone({ shot, name }: { shot?: Shot; name: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[9.5rem] rounded-[2.1rem] bg-neutral-900 p-[3.5%] shadow-[0_14px_22px_rgb(var(--c-shadow)/0.16)]" style={{ aspectRatio: '9 / 19.5' }}>
      <div className="relative h-full w-full overflow-hidden rounded-[1.65rem] bg-cuppi-paper-deep">
        {shot ? (
          <FadeImage src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(max-width: 768px) 40vw, 150px" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="grid h-full w-full place-items-center px-2 text-center text-xs text-cuppi-ink-soft">{name} screenshot to come</div>
        )}
      </div>
      <div aria-hidden className="absolute left-1/2 top-[3.5%] h-[3.4%] w-[40%] -translate-x-1/2 rounded-b-[0.7rem] bg-neutral-900" />
    </div>
  );
}

/** A current phone, in the site's own render. With no screenshot yet, the same frame with an empty screen. */
function NewPhone({ shot }: { shot?: Shot }) {
  if (shot) return <PhoneMockup kind="front" src={shot.src} alt={shot.alt} imageWidth={shot.width} imageHeight={shot.height} bg="#FBF4E6" sizes="(max-width: 768px) 44vw, 220px" className="mx-auto w-full max-w-[12rem]" />;
  const m = MOCKUPS.front;
  const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;
  return (
    <div className="relative mx-auto w-full max-w-[12rem]" style={{ aspectRatio: `${m.width} / ${m.height}` }}>
      <div
        className="absolute grid place-items-center bg-cuppi-paper-deep px-2 text-center text-xs text-cuppi-ink-soft"
        style={{ left: pct(m.screen.tl[0], m.width), top: pct(m.screen.tl[1], m.height), right: pct(m.width - m.screen.tr[0], m.width), bottom: pct(m.height - m.screen.bl[1], m.height), borderRadius: '14%/6.5%' }}
      >
        Cuppi screenshot to come
      </div>
      <FadeImage soft src={m.src} alt="" width={m.width} height={m.height} sizes="220px" className="pointer-events-none absolute inset-0 h-full w-full select-none" />
    </div>
  );
}

function Column({ app, className, caption }: { app: AppId; className: string; caption: string }) {
  const shots = SHOTS[app];
  const Frame = app === 'cuppi' ? NewPhone : OldPhone;
  return (
    <Reveal>
      <figure className={cn('flex h-full flex-col rounded-[2rem] px-4 pb-5 pt-6 sm:px-6', className)}>
        <div className="grid flex-1 grid-cols-2 items-start gap-3 sm:gap-4">
          {[0, 1].map((i) => (
            <div key={i} className={cn(i === 1 && 'mt-6')}>
              <Frame shot={shots[i]} name={APP_NAMES[app]} />
            </div>
          ))}
        </div>
        <figcaption className="mt-5 text-center">
          <span className="font-headline text-xl font-normal">{APP_NAMES[app]}</span>
          <span className="block text-sm text-cuppi-ink-soft">{caption}</span>
        </figcaption>
      </figure>
    </Reveal>
  );
}

/** Two screenshots of each app, so a visitor gets the feel of Cuppi next to the others. */
export function CompareShots() {
  return (
    <div className="grid gap-4 md:grid-cols-[1.15fr_1fr_1fr]">
      <Column app="cuppi" className="bg-cuppi-honey-soft" caption="Cuppi Home on iPhone" />
      <Column app="hartley" className="border border-cuppi-line bg-cuppi-card" caption={`Hartley, captured ${CHECKED_ON_LABEL}`} />
      <Column app="familywall" className="border border-cuppi-line bg-cuppi-card" caption={`FamilyWall, captured ${CHECKED_ON_LABEL}`} />
    </div>
  );
}
