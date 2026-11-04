'use client';
/* eslint-disable @next/next/no-img-element -- a 2006 homepage: plain <img> tags, sized by hand. */

// The 2006 portal: the portfolio as a home-made fan-portal homepage, the
// kind built on free site builders back then. News posts are the works,
// the guestbook is the testimonials, the CV is the career history. "More..."
// links travel back to 2026 and open the real page.

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { cn } from '@/lib/utils';
import { clip, plain, projectImage, type PortalData } from './portal-data';
import styles from './portal.module.css';

export type PortalPage = 'home' | 'works' | 'about' | 'cv' | 'guestbook';

export const PORTAL_HOST = 'www.jackiepoot.co.uk';

export const PAGE_TITLES: Record<PortalPage, string> = {
  home: 'Home',
  works: '*NEW* My works!',
  about: 'About me',
  cv: 'CV',
  guestbook: 'Guestbook',
};

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';

/** Same number every visit for the same text: fake dates and poll votes stay put. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const two = (n: number) => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;
const daysBefore = (d: Date, days: number) => new Date(d.getTime() - days * DAY_MS);
const at = (d: Date, hours: number, minutes: number) => {
  const t = new Date(d);
  t.setHours(hours, minutes);
  return t;
};
/** 2006.11.04., as the portals wrote dates. */
const day = (d: Date) => `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}.`;
/** 2006.11.03. 14:36 */
const stamp = (d: Date) =>
  `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}. ${two(d.getHours())}:${two(d.getMinutes())}`;

/** News dates walking back from `from`, one post every week or two. */
function backDates(keys: string[], from: Date): Date[] {
  let t = from.getTime();
  return keys.map((k) => {
    const h = hash(k);
    const d = new Date(t);
    d.setHours(9 + (h % 13), (h >>> 4) % 60);
    t -= (5 + ((h >>> 8) % 11)) * DAY_MS;
    return d;
  });
}

const SMILEYS = ['😀', '😁', '😂', '😉', '😎', '😍', '😜', '😮', '😢', '😡', '🤔', '😴'];

interface Shout {
  name: string;
  text: string;
  at: string;
}

/** 11.04. 19:20, as the shoutboxes wrote it. */
const shoutTime = (d: Date) => `${two(d.getMonth() + 1)}.${two(d.getDate())}. ${two(d.getHours())}:${two(d.getMinutes())}`;

// The last few days of Jack talking to himself, ending this morning.
const seedShouts = (now: Date): Shout[] => [
  { name: 'Jack', text: '2006 rulez!!!', at: shoutTime(at(daysBefore(now, 2), 0, 4)) },
  { name: 'Jack', text: 'new design is up, blue is the new black ;)', at: shoutTime(at(daysBefore(now, 1), 19, 20)) },
  { name: 'Jack', text: 'brb, mum needs the phone line', at: shoutTime(at(daysBefore(now, 1), 21, 47)) },
  { name: 'Jack', text: 'pls sign my guestbook :P', at: shoutTime(at(now, Math.min(now.getHours(), 8), 0)) },
];

interface Signature {
  name: string;
  text: string;
  at: string;
}

interface PortalSiteProps {
  data: PortalData;
  page: PortalPage;
  go: (page: PortalPage) => void;
  /** Back to 2026, opening this page of the real site. */
  travel: (href: string) => void;
  now: Date;
}

export function PortalSite({ data, page, go, travel, now }: PortalSiteProps) {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_URL}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    document.head.appendChild(link);
  }, []);

  const name = data.profile?.name?.trim() || 'Jackie';

  return (
    <div className={styles.site}>
      <div className={styles.marquee} aria-hidden="true">
        <span>
          *** Welcome to my homepage!!! *** Updated: {day(now)} *** New design for {now.getFullYear()} *** Sign my guestbook!!! ***
          Vote in the poll *** Copying the pictures is FORBIDDEN *** Best viewed at 1024x768 ***
        </span>
      </div>

      <div className={styles.columns}>
        <LeftColumn data={data} page={page} go={go} travel={travel} now={now} />
        <main className={styles.center}>
          <div className={styles.pageHead}>-&gt;{page === 'home' ? `${name}'s portal` : PAGE_TITLES[page]}</div>
          {page === 'home' && <HomePage data={data} go={go} travel={travel} now={now} />}
          {page === 'works' && <WorksPage data={data} travel={travel} />}
          {page === 'about' && <AboutPage data={data} travel={travel} />}
          {page === 'cv' && <CvPage data={data} travel={travel} />}
          {page === 'guestbook' && <GuestbookPage data={data} now={now} />}
        </main>
        <RightColumn data={data} now={now} />
      </div>

      <footer className={styles.footer}>
        <div className={styles.badges}>
          <Badge top="Best viewed" bottom="in the dark" bg="#111" fg="#6fd3ff" />
          <Badge top="Made with" bottom="NOTEPAD" bg="#ffef9e" fg="#333" />
          <Badge top="1024 x 768" bottom="resolution" bg="#000" fg="#7fff00" />
          <Badge top="Valid" bottom="HTML 4.01" bg="#eee" fg="#a00" />
          <Badge top="jackiepoot" bottom=".co.uk" bg="#2d62c9" fg="#fff" />
        </div>
        <div>
          © 2004-{now.getFullYear()} {name}. All rights reserved. Copying anything from this site is FORBIDDEN!!!
          <br />
          <button type="button" className={styles.link} onClick={() => travel('/')}>
            Get me out of {now.getFullYear()} »
          </button>
        </div>
      </footer>
    </div>
  );
}

function Badge({ top, bottom, bg, fg }: { top: string; bottom: string; bg: string; fg: string }) {
  return (
    <span className={styles.badge} style={{ background: bg, color: fg }}>
      <span style={{ fontWeight: 'normal' }}>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.box}>
      <div className={styles.boxHead}>{title}</div>
      <div className={styles.boxBody}>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------- columns

function LeftColumn({ data, page, go, travel, now }: Omit<PortalSiteProps, 'data'> & { data: PortalData }) {
  const photo = data.profile?.profilePictureUrl;
  return (
    <aside className={styles.left}>
      <div className={styles.menuArt}>
        {photo && <img src={photo} alt="" />}
        <div className={styles.menuArtWord}>Menü</div>
      </div>
      <Box title="Menu">
        <ul className={styles.menuList}>
          {(Object.keys(PAGE_TITLES) as PortalPage[]).map((p) => (
            <li key={p}>
              <button type="button" className={cn(styles.link, p === page && styles.menuCurrent)} onClick={() => go(p)}>
                {PAGE_TITLES[p]}
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={styles.link} onClick={() => travel('/snaps')}>
              Photos (in 2026)
            </button>
          </li>
        </ul>
      </Box>
      <Shoutbox now={now} />
      <Counter />
      <Poll data={data} />
    </aside>
  );
}

function RightColumn({ data, now }: { data: PortalData; now: Date }) {
  return (
    <aside className={styles.right}>
      <Box title="Exact time:">
        <div className={styles.plugin}>
          <PuzzleIcon />
          Click here to download the plugin.
        </div>
      </Box>
      <Box title="Hi everyone, welcome!">
        <span className={styles.smiley} aria-hidden="true">
          😄
        </span>
      </Box>
      {data.skills.length > 0 && (
        <Box title="What I can do:">
          {data.skills.slice(0, 7).map((s) => (
            <div key={s.id} className={styles.skill}>
              <span>{s.name}</span>
              <span className={styles.skillBar}>
                <span style={{ width: `${Math.min(100, (s.level / 5) * 100)}%` }} />
              </span>
            </div>
          ))}
        </Box>
      )}
      <Box title="Calendar">
        <Calendar now={now} />
      </Box>
      <Box title="Link me!">
        <div className={styles.badges}>
          <Badge top="JACKIE" bottom="link me!!" bg="#ff69b4" fg="#fff" />
        </div>
        <p className={styles.counterNote}>Copy the code to your site:</p>
        <textarea
          readOnly
          className={styles.field}
          rows={3}
          value={`<a href="http://${PORTAL_HOST}"><img src="banner.gif"></a>`}
        />
      </Box>
    </aside>
  );
}

function PuzzleIcon() {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <path
        d="M6 10h6a3 3 0 1 1 6 0h6v6a3 3 0 1 0 0 6v6h-6a3 3 0 1 0-6 0H6v-6a3 3 0 1 1 0-6z"
        fill="#c9c9c9"
        stroke="#9a9a9a"
      />
    </svg>
  );
}

function Calendar({ now }: { now: Date }) {
  // Weeks start on Monday.
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    if (day < 1) return { n: prevDays + day, other: true };
    if (day > days) return { n: day - days, other: true };
    return { n: day, other: false };
  });
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const month = first.toLocaleDateString('en-GB', { month: 'long' });

  return (
    <table className={styles.calendar}>
      <caption>
        {y}. {month}
      </caption>
      <thead>
        <tr>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <th key={i}>{d}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, w) => (
          <tr key={w}>
            {week.map((c, i) => (
              <td
                key={i}
                className={cn(
                  c.other && styles.other,
                  !c.other && i === 6 && styles.sun,
                  !c.other && c.n === now.getDate() && styles.today,
                )}
              >
                {two(c.n)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Shoutbox({ now }: { now: Date }) {
  const [shouts, setShouts] = useState<Shout[]>(() => seedShouts(now));
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [shouts]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setShouts((s) => [
      ...s,
      { name: name.trim() || 'Guest', text: message, at: shoutTime(now) },
    ]);
    setText('');
  };

  return (
    <Box title="Chat, chat, chat!">
      <div ref={listRef} className={styles.shout} aria-live="polite">
        {shouts.map((s, i) => (
          <div key={i}>
            <time>[{s.at}]</time> <b>{s.name}:</b> {s.text}
          </div>
        ))}
      </div>
      <form onSubmit={send}>
        <label>
          Name:
          <input className={styles.field} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Message:
          <textarea className={styles.field} value={text} maxLength={250} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className={styles.counterNote} style={{ textAlign: 'left' }}>
          {text.length} / 250
        </div>
        <div className={styles.smileys}>
          {SMILEYS.map((s) => (
            <button key={s} type="button" aria-label={`Add ${s}`} onClick={() => setText((t) => `${t}${s}`.slice(0, 250))}>
              {s}
            </button>
          ))}
        </div>
        <button type="submit" className={styles.oldButton}>
          Send
        </button>
      </form>
    </Box>
  );
}

const VISITS_KEY = 'xp-portal-visits';

function Counter() {
  const [visits, setVisits] = useState(1);
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(VISITS_KEY) ?? '0') + 1;
      localStorage.setItem(VISITS_KEY, String(n));
      setVisits(n);
    } catch {
      // Not counted, but the counter still shows.
    }
  }, []);
  return (
    <Box title="Counters!">
      <div className={styles.counter}>
        <span title="Visitors">{String(8656 + visits).padStart(6, '0')}</span>
        <span title="Online">1</span>
      </div>
      <div className={styles.counterNote}>Visitors · Online now</div>
      <div className={styles.counterNote}>Opened: 2004-04-09</div>
    </Box>
  );
}

function Poll({ data }: { data: PortalData }) {
  const options = useMemo(
    () => data.projects.filter((p) => !p.privacy?.isPasswordProtected).slice(0, 5),
    [data.projects],
  );
  const [choice, setChoice] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  if (options.length < 2) return null;

  const votes = options.map((p) => 3 + (hash(p.id) % 37) + (voted && choice === p.id ? 1 : 0));
  const total = votes.reduce((a, b) => a + b, 0);

  return (
    <Box title="Vote!">
      <form
        className={styles.poll}
        onSubmit={(e) => {
          e.preventDefault();
          if (choice) setVoted(true);
        }}
      >
        <b>Which of my works do you like best?</b>
        {options.map((p, i) =>
          voted ? (
            <div key={p.id}>
              {p.title} ({Math.round((votes[i] / total) * 100)}%)
              <div className={styles.pollBar} style={{ width: `${(votes[i] / total) * 100}%` }} />
            </div>
          ) : (
            <label key={p.id}>
              <input type="radio" name="poll" checked={choice === p.id} onChange={() => setChoice(p.id)} />
              {p.title}
            </label>
          ),
        )}
        <div className={styles.center1}>
          {voted ? (
            <span>Thanks for voting! Total: {total} votes</span>
          ) : (
            <button type="submit" className={styles.oldButton} disabled={!choice}>
              Vote!
            </button>
          )}
        </div>
      </form>
    </Box>
  );
}

// ------------------------------------------------------------------ pages

function HomePage({
  data,
  go,
  travel,
  now,
}: {
  data: PortalData;
  go: (p: PortalPage) => void;
  travel: (href: string) => void;
  now: Date;
}) {
  const projects = useMemo(
    () => [...data.projects].sort((a, b) => Number(!!b.featured) - Number(!!a.featured)).slice(0, 8),
    [data.projects],
  );
  // Worked out per day, so the dates don't shuffle as the clock ticks.
  const today = day(now);
  const dates = useMemo(
    () => backDates(projects.map((p) => p.id), daysBefore(now, 3)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, today],
  );

  return (
    <>
      <article className={styles.post}>
        <div className={styles.postHead}>
          <h2 className={styles.postTitle}>NEW DESIGN!!!</h2>
          <div className={styles.postMeta}>
            <span>Jack</span>
            <span>{stamp(at(now, Math.min(now.getHours(), 7), 42))}</span>
          </div>
        </div>
        <span className={styles.smiley} style={{ float: 'left', fontSize: 56, margin: '0 10px 0 0' }} aria-hidden="true">
          😃
        </span>
        <p>
          Hi everyone!! The site has a brand new design (blue is the new black). Lots of new works
          below, and there&apos;s a poll on the left. Don&apos;t forget to sign the{' '}
          <button type="button" className={styles.link} onClick={() => go('guestbook')}>
            guestbook
          </button>
          !!! ;)
        </p>
      </article>

      {projects.map((p, i) => {
        const image = projectImage(p);
        const locked = !!p.privacy?.isPasswordProtected;
        return (
          <article key={p.id} className={styles.post}>
            <div className={styles.postHead}>
              <h2 className={styles.postTitle}>*New* {p.title.trim()}!</h2>
              <div className={styles.postMeta}>
                <span>Jack</span>
                <span>{stamp(dates[i])}</span>
              </div>
            </div>
            {image && <img src={image} alt="" className={styles.postImage} loading="lazy" />}
            {locked ? (
              <p className={styles.locked}>This one is password protected. VIP members only!!</p>
            ) : (
              <p>{clip(plain(p.overview || p.description), 320)}</p>
            )}
            <button type="button" className={cn(styles.link, styles.more)} onClick={() => travel(`/works/${p.slug}`)}>
              More...
            </button>
          </article>
        );
      })}

      {data.projects.length > projects.length && (
        <p className={styles.center1}>
          <button type="button" className={styles.link} onClick={() => go('works')}>
            &lt;&lt; Older news
          </button>
        </p>
      )}
    </>
  );
}

function WorksPage({ data, travel }: { data: PortalData; travel: (href: string) => void }) {
  return (
    <>
      <p>
        All my works in one place! Click a picture to see it big. <b>{data.projects.length}</b> works so far.
      </p>
      <div className={styles.gallery}>
        {data.projects.map((p) => {
          const image = projectImage(p);
          return (
            <button key={p.id} type="button" className={styles.thumb} onClick={() => travel(`/works/${p.slug}`)}>
              {image ? <img src={image} alt="" loading="lazy" /> : <span className={styles.thumbBlank} />}
              <span>
                {p.privacy?.isPasswordProtected && '🔒 '}
                {p.title.trim()}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function AboutPage({ data, travel }: { data: PortalData; travel: (href: string) => void }) {
  const profile = data.profile;
  const text = plain(profile?.aboutText);
  return (
    <>
      <article className={styles.post}>
        {profile?.profilePictureUrl && <img src={profile.profilePictureUrl} alt="" className={styles.postImage} />}
        {(text || 'Coming soon!!!').split(/\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </article>
      {data.facts.length > 0 && (
        <article className={styles.post}>
          <h2 className={styles.postTitle}>Did you know...?</h2>
          <ul>
            {data.facts.map((f) => (
              <li key={f.id}>
                <b>{f.title}</b> {plain(f.description)}
              </li>
            ))}
          </ul>
        </article>
      )}
      <button type="button" className={cn(styles.link, styles.more)} onClick={() => travel('/about')}>
        More about me (in 2026)
      </button>
    </>
  );
}

function monthYear(value?: string): string {
  if (!value) return '?';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : `${d.getFullYear()}.${two(d.getMonth() + 1)}.`;
}

function CvPage({ data, travel }: { data: PortalData; travel: (href: string) => void }) {
  return (
    <>
      <p>
        This is from the future, don&apos;t ask how it got here. <b>Don&apos;t tell anyone!!</b>
      </p>
      {data.career.map((job) => (
        <article key={job.id} className={styles.post}>
          <div className={styles.postHead}>
            <h2 className={styles.postTitle}>
              {job.position.trim()} @ {job.companyName.trim()}
            </h2>
            <div className={styles.postMeta}>
              {monthYear(job.startDate)} - {job.isCurrent ? 'now' : monthYear(job.endDate)}
            </div>
          </div>
          {job.logoUrl && <img src={job.logoUrl} alt="" className={cn(styles.postImage, styles.smallImage)} />}
          <p>{clip(plain(job.description), 400)}</p>
        </article>
      ))}
      <button type="button" className={cn(styles.link, styles.more)} onClick={() => travel('/about')}>
        The full CV (in 2026)
      </button>
    </>
  );
}

function GuestbookPage({ data, now }: { data: PortalData; now: Date }) {
  const [mine, setMine] = useState<Signature[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const today = day(now);
  const dates = useMemo(
    () => backDates(data.testimonials.map((t) => t.id), daysBefore(now, 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.testimonials, today],
  );

  const sign = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMine((m) => [{ name: name.trim() || 'Guest', text: text.trim(), at: stamp(now) }, ...m]);
    setText('');
  };

  return (
    <>
      <form className={styles.guestForm} onSubmit={sign}>
        <b style={{ display: 'block', marginBottom: 4 }}>Sign my guestbook!!!</b>
        <label>
          Name:
          <input className={styles.field} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Message:
          <textarea className={styles.field} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="submit" className={styles.oldButton}>
          Sign
        </button>{' '}
        <small>(Only this computer can see it. It&apos;s {now.getFullYear()}, the server is on dial-up.)</small>
      </form>

      {mine.map((s, i) => (
        <GuestEntry key={`mine-${i}`} name={s.name} at={s.at} text={s.text} />
      ))}
      {data.testimonials.map((t, i) => (
        <GuestEntry
          key={t.id}
          name={t.name}
          from={[t.role, t.company].filter(Boolean).join(' @ ')}
          at={stamp(dates[i])}
          text={plain(t.text)}
        />
      ))}
    </>
  );
}

function GuestEntry({ name, from, at, text }: { name: string; from?: string; at: string; text: string }) {
  return (
    <div className={styles.guestEntry}>
      <div className={styles.guestHead}>
        <span>
          <b>{name}</b>
          {from && ` (${from})`}
        </span>
        <i>{at}</i>
      </div>
      <div className={styles.guestText}>{text}</div>
    </div>
  );
}

/** While loading, and when the read fails: the browser's own pages. */
export function PortalLoading() {
  return <div className={styles.loading}>Opening page http://{PORTAL_HOST}/...</div>;
}

export function PortalError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.errorPage}>
      <h1>The page cannot be displayed</h1>
      <p>The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or the phone line might be in use.</p>
      <hr />
      <p>Please try the following:</p>
      <ul>
        <li>
          Click the{' '}
          <button type="button" className={styles.link} onClick={onRetry}>
            Refresh
          </button>{' '}
          button, or try again later.
        </li>
        <li>Check that nobody picked up the phone.</li>
      </ul>
      <p style={{ color: '#666' }}>Cannot find server or DNS Error</p>
    </div>
  );
}
