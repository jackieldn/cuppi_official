// JackDOS commands. Each one prints text to the DOS screen; the content
// commands read the site's own data from Firestore (once, then cached).
// Images can't be shown in text mode, so they become text-art frames.

import {
  collection,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';

import type { AboutProfile, App, Fact, TechnicalSkill, Testimonial, WorkExperience } from '@/lib/about-types';
import type { Project } from '@/lib/projects';
import { KIND_LABEL, STATUS_LABEL, normalizeApp, sortApps } from '@/lib/showcase';
import { PLAYER_TRACKS, formatTime, type PlayerTrack } from '@/lib/music-player-types';
import {
  BANNER,
  CASSETTE,
  FLOPPY,
  PORTRAIT,
  TEXT_WIDTH,
  bar,
  box,
  bytes,
  dosDate,
  dosTime,
  padLeft,
  padRight,
  picture,
  sideBySide,
  stripHtml,
  table,
  truncate,
  wrap,
} from '@/lib/dos-text';

export type Tone = 'normal' | 'bright' | 'dim' | 'accent' | 'good' | 'warn' | 'error';
export type Line = { text: string; tone?: Tone };
export type Printable = string | Line | (string | Line)[];

export interface DosContext {
  firestore: Firestore | null;
  /** Prints lines; returns the index of the first, for `update`. */
  print: (out: Printable, tone?: Tone) => number;
  /** Rewrites a printed line in place (progress bars). */
  update: (index: number, line: Line) => void;
  clear: () => void;
  /** Back to 2026. */
  exit: () => void;
  /** Back to 2026, opening this page in the desktop's window. */
  open: (href: string) => void;
  /** The time machine's clock: today's date and time, in 1997. */
  now: () => Date;
  cache: Map<string, Promise<unknown>>;
  /** Owned by the screen, cleaned up when DOS closes. */
  player: { audio?: HTMLAudioElement; timer?: ReturnType<typeof setInterval>; unplug?: () => void };
  /**
   * A full-screen pick list, like MS-DOS 6.22's startup menu. Resolves with
   * the chosen item's index, or null if Esc was pressed.
   */
  menu: (request: MenuRequest) => Promise<number | null>;
  /** "Press any key..." and waits for one. */
  pause: (message?: string) => Promise<void>;
  /** The PC's sound (startup chime and fan hum), which visitors can mute. */
  sound: {
    enabled: () => boolean;
    set: (on: boolean) => void;
    /** Routes a track through the lo-fi "sound card"; returns how to unplug it, or null. */
    lofi: (audio: HTMLAudioElement) => (() => void) | null;
  };
}

export interface MenuRequest {
  title: string;
  items: string[];
  /** Which item starts highlighted (0-based). */
  selected?: number;
}

interface Command {
  name: string;
  aliases?: string[];
  usage?: string;
  summary: string;
  /** Left out of HELP: easter eggs within the easter egg. */
  hidden?: boolean;
  run: (args: string[], ctx: DosContext) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Data

type WithId<T> = T & { id: string };

async function load<T>(ctx: DosContext, name: string, ...constraints: QueryConstraint[]): Promise<WithId<T>[]> {
  const key = `${name}:${constraints.length}`;
  if (!ctx.cache.has(key)) {
    if (!ctx.firestore) throw new Error('no drive');
    const firestore = ctx.firestore;
    const promise = getDocs(query(collection(firestore, name), ...constraints)).then((snap) =>
      snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
    );
    // A failed read shouldn't stick: let the next try go to the drive again.
    promise.catch(() => ctx.cache.delete(key));
    ctx.cache.set(key, promise);
  }
  return ctx.cache.get(key) as Promise<WithId<T>[]>;
}

async function count(ctx: DosContext, name: string): Promise<number> {
  const key = `count:${name}`;
  if (!ctx.cache.has(key)) {
    if (!ctx.firestore) throw new Error('no drive');
    const promise = getCountFromServer(collection(ctx.firestore, name)).then((s) => s.data().count);
    promise.catch(() => ctx.cache.delete(key));
    ctx.cache.set(key, promise);
  }
  return ctx.cache.get(key) as Promise<number>;
}

const projects = (ctx: DosContext) => load<Project>(ctx, 'projects', orderBy('title'));
// Same order as the Apps & Websites page, so "APPS 1" is the first card there too.
const apps = async (ctx: DosContext): Promise<App[]> =>
  sortApps((await load<Record<string, any>>(ctx, 'apps')).map((d) => normalizeApp(d)));
const tracks = (ctx: DosContext) => load<PlayerTrack>(ctx, PLAYER_TRACKS, orderBy('order'));

/** "3" picks the third; anything else matches a title. */
function pick<T extends { title: string }>(items: T[], arg: string): { item: T; index: number } | null {
  const n = Number.parseInt(arg, 10);
  if (String(n) === arg && n >= 1 && n <= items.length) return { item: items[n - 1], index: n - 1 };
  const needle = arg.toLowerCase();
  const index = items.findIndex((i) => i.title.toLowerCase().includes(needle));
  return index === -1 ? null : { item: items[index], index };
}

const isLocked = (p: Project) => !!p.privacy?.isPasswordProtected;

const year = (p: Project) => p.deliveryYear ?? '';

/** "2021-05-01" or "May 2021" -> "May 2021"; anything unparseable is shown as it is. */
function monthYear(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function readError(ctx: DosContext) {
  ctx.print(
    [
      { text: 'General failure reading drive C', tone: 'error' },
      { text: 'Abort, Retry, Fail? F', tone: 'error' },
      { text: '(Check your connection and try the command again.)', tone: 'dim' },
    ],
  );
}

/** Runs a content command, turning a failed read into DOS's famous question. */
const reading =
  (run: (args: string[], ctx: DosContext) => Promise<void>) =>
  async (args: string[], ctx: DosContext) => {
    try {
      await run(args, ctx);
    } catch (err) {
      console.warn('JackDOS: read failed.', err);
      readError(ctx);
    }
  };

/** Menu rows are indented four columns and numbered "27. ", leaving this much. */
const MENU_ITEM_WIDTH = TEXT_WIDTH - 10;

/**
 * Shows a menu; opening an item prints it, then "Press any key" goes back to
 * the menu, still on that item. Esc leaves for the C:\> prompt.
 */
async function browse<T>(
  ctx: DosContext,
  title: string,
  items: T[],
  label: (item: T) => string,
  show: (item: T, index: number) => void,
) {
  let selected = 0;
  for (;;) {
    const choice = await ctx.menu({ title, items: items.map((i) => truncate(label(i), MENU_ITEM_WIDTH)), selected });
    if (choice === null) return;
    selected = choice;
    show(items[choice], choice);
    await ctx.pause();
  }
}

/** `/A` (all), as DOS commands took switches: print the lot instead of a menu. */
const wantsAll = (args: string[]) => args.some((a) => /^[/-]a(ll)?$/i.test(a));

function showProject(ctx: DosContext, p: WithId<Project>, index: number) {
  ctx.print(box(p.title.trim(), 60), 'bright');
  if (isLocked(p)) {
    ctx.print([
      '',
      { text: 'ACCESS DENIED. This project is password protected.', tone: 'warn' },
      `Type OPEN WORKS ${index + 1} to unlock it in 2026.`,
    ]);
    return;
  }
  const delivered = [p.deliveryMonth, year(p)].filter(Boolean).join(' ');
  ctx.print([
    `CLIENT    : ${p.client?.trim() || '-'}`,
    ...(delivered ? [`DELIVERED : ${delivered}`] : []),
    ...(p.timeframe?.trim() ? [`TIMEFRAME : ${p.timeframe.trim()}`] : []),
    ...(p.software?.length
      ? wrap(p.software.join(', '), TEXT_WIDTH, '            ').map((l, i) => (i ? l : `SOFTWARE  : ${l.trimStart()}`))
      : []),
    ...(p.tags?.length ? [`TAGS      : ${truncate(p.tags.join(', '), TEXT_WIDTH - 12)}`] : []),
    '',
    ...wrap(stripHtml(p.overview || p.description || 'No description.')),
    '',
  ]);
  ctx.print(
    sideBySide(
      [
        picture(truncate(`${p.title.trim()}.PCX`, 26)),
        ['', '', 'Pictures need a', 'graphics card from', 'the future.', '', `Type OPEN WORKS ${index + 1}`, 'to see it in 2026.'],
      ],
      3,
    ),
    'dim',
  );
}

const jobDates = (job: WorkExperience) =>
  `${monthYear(job.startDate)} - ${job.isCurrent ? 'now' : monthYear(job.endDate) || '?'}`;

function showJob(ctx: DosContext, job: WorkExperience) {
  ctx.print(box(`${job.position.trim()} @ ${job.companyName.trim()}`, 60), 'bright');
  ctx.print([`WHEN      : ${jobDates(job)}`, '']);
  ctx.print(job.description ? wrap(stripHtml(job.description)) : 'No description.');
}

const quoteBy = (t: Testimonial) => [t.role, t.company].filter(Boolean).join(' @ ');

function showQuote(ctx: DosContext, t: Testimonial) {
  ctx.print(wrap(`"${stripHtml(t.text)}"`, TEXT_WIDTH, '  '));
  ctx.print('');
  ctx.print({ text: `      -- ${[t.name, quoteBy(t)].filter(Boolean).join(', ')}`, tone: 'accent' });
  if (t.date) ctx.print({ text: `         ${monthYear(t.date)}`, tone: 'dim' });
}

const careerOrder = (list: WorkExperience[]) =>
  [...list].sort((a, b) =>
    a.order !== undefined && b.order !== undefined ? a.order - b.order : (b.startDate ?? '').localeCompare(a.startDate ?? ''),
  );

function stopMusic(ctx: DosContext) {
  ctx.player.audio?.pause();
  if (ctx.player.timer) clearInterval(ctx.player.timer);
  ctx.player.unplug?.();
  ctx.player.audio = undefined;
  ctx.player.timer = undefined;
  ctx.player.unplug = undefined;
}

/**
 * Loads a track to play through the "1997 sound card" (lo-fi). That needs
 * the file served with CORS for this site's address; where the bucket
 * doesn't allow it, the track plays as normal instead (muted if SOUND is OFF,
 * since it then bypasses the PC's volume).
 */
async function loadTrack(ctx: DosContext, url: string): Promise<{ audio: HTMLAudioElement; lofi: boolean }> {
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  audio.src = url;
  const loaded = await new Promise<boolean>((resolve) => {
    audio.addEventListener('canplay', () => resolve(true), { once: true });
    audio.addEventListener('error', () => resolve(false), { once: true });
  });
  if (loaded) {
    const unplug = ctx.sound.lofi(audio);
    if (unplug) {
      ctx.player.unplug = unplug;
      return { audio, lofi: true };
    }
    return { audio, lofi: false };
  }
  const plain = new Audio(url);
  plain.muted = !ctx.sound.enabled();
  return { audio: plain, lofi: false };
}

// ---------------------------------------------------------------------------
// Commands

// The About page's names for skill levels 1 to 5.
const SKILL_LEVELS = ['', 'Beginner', 'Intermediate', 'Experienced', 'Advanced', 'Professional'];

const SECTIONS: Record<string, string> = {
  HOME: '/',
  WORKS: '/works',
  APPS: '/apps',
  ABOUT: '/about',
  SNAPS: '/snaps',
  FREETIME: '/free-time',
};

export const COMMANDS: Command[] = [
  {
    name: 'HELP',
    usage: 'HELP [command]',
    summary: 'Lists the commands, or explains one',
    run: (args, ctx) => {
      const wanted = args[0] && findCommand(args[0]);
      if (wanted) {
        ctx.print([
          { text: wanted.summary + '.', tone: 'bright' },
          '',
          `Usage: ${wanted.usage ?? wanted.name}`,
          ...(wanted.aliases?.length ? [`Also: ${wanted.aliases.join(', ')}`] : []),
        ]);
        return;
      }
      if (args[0]) {
        ctx.print(`No help for ${args[0].toUpperCase()}. Type HELP for a list of commands.`);
        return;
      }
      ctx.print([
        { text: 'JackDOS commands. Type HELP <command> for more on one.', tone: 'bright' },
        '',
        { text: ' THE WEBSITE', tone: 'accent' },
        ...listCommands(['WORKS', 'APPS', 'ABOUT', 'SKILLS', 'CAREER', 'QUOTES', 'FACTS', 'SNAPS', 'FREETIME']),
        '',
        { text: ' MUSIC', tone: 'accent' },
        ...listCommands(['MUSIC', 'PLAY', 'STOP']),
        '',
        { text: ' SYSTEM', tone: 'accent' },
        ...listCommands(['DIR', 'OPEN', 'CLS', 'SOUND', 'DATE', 'TIME', 'VER', 'MEM', 'ECHO', 'EXIT']),
        '',
        { text: 'Tip: Up/Down recall earlier commands, Tab completes a command name.', tone: 'dim' },
      ]);
    },
  },
  {
    name: 'DIR',
    summary: "What's on drive C:",
    run: (_args, ctx) => {
      const stamp = `${dosDate(ctx.now())}  ${padLeft(dosTime(ctx.now()), 6)}`;
      const entry = (name: string, ext: string, size: number | null) =>
        `${padRight(name, 8)} ${padRight(ext, 3)} ${size === null ? padRight('<DIR>', 12) : padLeft(bytes(size), 12)} ${stamp}`;
      const entries = [
        entry('WORKS', '', null),
        entry('APPS', '', null),
        entry('SNAPS', '', null),
        entry('FREETIME', '', null),
        entry('MUSIC', '', null),
        entry('ABOUT', 'TXT', 2_048),
        entry('SKILLS', 'DAT', 1_337),
        entry('CAREER', 'TXT', 4_096),
        entry('QUOTES', 'TXT', 3_072),
        entry('FACTS', 'TXT', 1_024),
        entry('COMMAND', 'COM', 54_645),
        entry('AUTOEXEC', 'BAT', 128),
      ];
      ctx.print([
        ' Volume in drive C is JACKIEPOOT',
        ' Volume Serial Number is 1997-0716',
        ' Directory of C:\\',
        '',
        ...entries,
        `       ${entries.length} file(s)         66,350 bytes`,
        '                       640,000 bytes free',
        '',
        { text: 'Type a name to look inside, e.g. WORKS or ABOUT (or CD WORKS, TYPE ABOUT.TXT).', tone: 'dim' },
      ]);
    },
  },
  {
    name: 'WORKS',
    usage: 'WORKS [number | /A]',
    summary: 'Motion design projects, as a menu',
    run: reading(async (args, ctx) => {
      const list = await projects(ctx);
      if (!list.length) return void ctx.print('File not found');
      if (args.length && !wantsAll(args)) {
        const found = pick(list, args.join(' '));
        if (!found) return void ctx.print(`No project matching "${args.join(' ')}". Type WORKS for the list.`);
        return showProject(ctx, found.item, found.index);
      }
      if (!wantsAll(args)) {
        return browse(
          ctx,
          'JackDOS 6.22 Works Menu',
          list,
          (p) => `${padRight(`${p.title.trim()}${isLocked(p) ? ' [LOCKED]' : ''}`, 38)} ${padRight((p.client ?? '').trim(), 22)} ${year(p)}`,
          (p, i) => showProject(ctx, p, i),
        );
      }
      ctx.print([
        { text: ` Directory of C:\\WORKS   (${list.length} projects)`, tone: 'bright' },
        '',
        ...table(
          [
            { header: '#', width: 3, align: 'right' },
            { header: 'TITLE', width: 40 },
            { header: 'CLIENT', width: 24 },
            { header: 'YEAR', width: 4 },
          ],
          list.map((p, i) => [String(i + 1), `${p.title.trim()}${isLocked(p) ? ' [LOCKED]' : ''}`, (p.client ?? '').trim(), year(p)]),
        ),
        '',
        { text: 'Type WORKS for the menu, or WORKS <number> for one project.', tone: 'dim' },
      ]);
    }),
  },
  {
    name: 'APPS',
    usage: 'APPS [number or name]',
    summary: 'iOS apps and websites. APPS 1 opens one',
    run: reading(async (args, ctx) => {
      const list = await apps(ctx);
      if (!list.length) return void ctx.print('File not found');
      if (args.length) {
        const found = pick(list, args.join(' '));
        if (!found) return void ctx.print(`No app matching "${args.join(' ')}". Type APPS for the list.`);
        const { item: a, index } = found;
        ctx.print(box(a.title, 60), 'bright');
        ctx.print([
          `STATUS    : ${STATUS_LABEL[a.status]} ${KIND_LABEL[a.kind].toLowerCase()}`,
          ...(a.kind === 'app' ? [`PLATFORMS : ${a.platforms.join(', ') || '-'}`] : []),
          ...(a.releaseDate ? [`RELEASED  : ${monthYear(a.releaseDate)}`] : []),
          ...(a.tags?.length ? [`TAGS      : ${truncate(a.tags.join(', '), TEXT_WIDTH - 12)}`] : []),
          ...(a.link ? [`LINK      : ${truncate(a.link, TEXT_WIDTH - 12)}`] : []),
          '',
          ...wrap(stripHtml(a.description || 'No description.')),
          '',
        ]);
        if (a.updateHistory?.length) {
          ctx.print({ text: 'LATEST UPDATES', tone: 'accent' });
          for (const u of a.updateHistory.slice(0, 3)) {
            ctx.print(wrap(`v${u.version} (${monthYear(u.date)}): ${stripHtml(u.description)}`, TEXT_WIDTH, '  '));
          }
          ctx.print('');
        }
        ctx.print({ text: `Type OPEN APPS ${index + 1} to see the screenshots in 2026.`, tone: 'dim' });
        return;
      }
      ctx.print([
        { text: ` Directory of C:\\APPS   (${list.length})`, tone: 'bright' },
        '',
        ...table(
          [
            { header: '#', width: 3, align: 'right' },
            { header: 'NAME', width: 30 },
            { header: 'KIND', width: 22 },
            { header: 'STATUS', width: 15 },
          ],
          list.map((a, i) => [
            String(i + 1),
            a.title,
            a.kind === 'app' ? ['App', ...a.platforms].join(', ') : KIND_LABEL.website,
            STATUS_LABEL[a.status],
          ]),
        ),
        '',
        { text: 'Type APPS <number> for one, e.g. APPS 1.', tone: 'dim' },
      ]);
    }),
  },
  {
    name: 'ABOUT',
    summary: "Who's Jack?",
    run: reading(async (_args, ctx) => {
      const [profile] = await load<AboutProfile>(ctx, 'about_profile');
      ctx.print(BANNER, 'accent');
      ctx.print('');
      // The portrait sits on the left, the text wraps in the space beside it.
      const text = wrap(stripHtml(profile?.aboutText ?? ''), TEXT_WIDTH - PORTRAIT[0].length - 3);
      ctx.print(sideBySide([PORTRAIT, [(profile?.name ?? 'Jack').toUpperCase(), '', ...text]], 3));
      ctx.print(['', { text: 'More: SKILLS, CAREER, QUOTES, FACTS.', tone: 'dim' }]);
    }),
  },
  {
    name: 'SKILLS',
    summary: 'Technical skills, as a bar chart',
    run: reading(async (_args, ctx) => {
      const list = await load<TechnicalSkill>(ctx, 'technical_skills', orderBy('order'));
      if (!list.length) return void ctx.print('File not found');
      ctx.print([{ text: 'SKILLS.DAT', tone: 'bright' }, '']);
      // Levels run 1 to 5, named as on the About page.
      ctx.print(
        list.map((s) => {
          const level = Math.min(5, Math.max(0, Math.round(s.level ?? 0)));
          return `${padRight(s.name, 22)} ${bar(level / 5, 30)}  ${SKILL_LEVELS[level] ?? ''}`;
        }),
      );
    }),
  },
  {
    name: 'CAREER',
    usage: 'CAREER [number | /A]',
    summary: 'Work experience, newest first, as a menu',
    run: reading(async (args, ctx) => {
      const list = careerOrder(await load<WorkExperience>(ctx, 'work_experience'));
      if (!list.length) return void ctx.print('File not found');
      const n = Number.parseInt(args[0] ?? '', 10);
      if (n >= 1 && n <= list.length) return showJob(ctx, list[n - 1]);
      if (!wantsAll(args)) {
        return browse(
          ctx,
          'JackDOS 6.22 Career Menu',
          list,
          (job) => `${padRight(jobDates(job), 21)} ${job.position.trim()} @ ${job.companyName.trim()}`,
          (job) => showJob(ctx, job),
        );
      }
      ctx.print([{ text: 'CAREER.TXT', tone: 'bright' }, '']);
      for (const job of list) {
        ctx.print({ text: `${padRight(jobDates(job), 22)} ${job.position.trim()} @ ${job.companyName.trim()}`, tone: 'accent' });
        if (job.description) ctx.print(wrap(stripHtml(job.description), TEXT_WIDTH, ' '.repeat(23)));
        ctx.print('');
      }
    }),
  },
  {
    name: 'QUOTES',
    aliases: ['TESTIMONIALS'],
    usage: 'QUOTES [number | /A]',
    summary: 'What people say about Jack, as a menu',
    run: reading(async (args, ctx) => {
      const list = await load<Testimonial>(ctx, 'testimonials', orderBy('order'));
      if (!list.length) return void ctx.print('File not found');
      const n = Number.parseInt(args[0] ?? '', 10);
      if (n >= 1 && n <= list.length) return showQuote(ctx, list[n - 1]);
      if (!wantsAll(args)) {
        return browse(
          ctx,
          'JackDOS 6.22 Quotes Menu',
          list,
          (t) => `${padRight(t.name?.trim() ?? '', 26)} ${t.company?.trim() ?? ''}`,
          (t) => showQuote(ctx, t),
        );
      }
      ctx.print([{ text: 'QUOTES.TXT', tone: 'bright' }, '']);
      for (const t of list) {
        showQuote(ctx, t);
        ctx.print('');
      }
    }),
  },
  {
    name: 'FACTS',
    summary: 'Random facts about Jack',
    run: reading(async (_args, ctx) => {
      const list = await load<Fact>(ctx, 'facts', orderBy('order'));
      if (!list.length) return void ctx.print('File not found');
      ctx.print([{ text: 'FACTS.TXT', tone: 'bright' }, '']);
      list.forEach((f, i) => {
        ctx.print({ text: `${padLeft(String(i + 1), 2)}. ${f.title.trim()}`, tone: 'accent' });
        ctx.print(wrap(stripHtml(f.description), TEXT_WIDTH, '    '));
        ctx.print('');
      });
    }),
  },
  {
    name: 'SNAPS',
    summary: 'Photos. Well... sort of',
    run: reading(async (_args, ctx) => {
      const n = await count(ctx, 'snaps');
      ctx.print([{ text: ` Directory of C:\\SNAPS   (${n} pictures)`, tone: 'bright' }, '']);
      ctx.print(sideBySide([picture('SNAP0001.PCX', 24), picture('SNAP0002.PCX', 24), picture('SNAP0003.PCX', 24)]), 'dim');
      ctx.print(['', `...and ${Math.max(0, n - 3)} more. This 1997 monitor can't show them. Type OPEN SNAPS.`]);
    }),
  },
  {
    name: 'FREETIME',
    aliases: ['FREE-TIME'],
    summary: 'What Jack gets up to outside work',
    run: reading(async (_args, ctx) => {
      const n = await count(ctx, 'hobby_images');
      ctx.print([{ text: ` Directory of C:\\FREETIME   (${n} pictures)`, tone: 'bright' }, '']);
      ctx.print(sideBySide([picture('WEEKEND.PCX', 24), picture('HOLIDAY.PCX', 24), FLOPPY]), 'dim');
      ctx.print(['', `${n} pictures on this floppy. Type OPEN FREETIME to see them in 2026.`]);
    }),
  },
  {
    name: 'MUSIC',
    summary: 'The playlist from the desktop music player',
    run: reading(async (_args, ctx) => {
      const list = await tracks(ctx);
      ctx.print(CASSETTE, 'accent');
      ctx.print('');
      if (!list.length) return void ctx.print('The tape is blank.');
      ctx.print(
        table(
          [
            { header: '#', width: 3, align: 'right' },
            { header: 'TRACK', width: 30 },
            { header: 'ARTIST', width: 22 },
            { header: 'YEAR', width: 4 },
            { header: 'TIME', width: 5, align: 'right' },
          ],
          list.map((t, i) => [
            String(i + 1),
            t.title,
            t.artist,
            t.year ? String(t.year) : '',
            t.durationSec !== undefined ? formatTime(t.durationSec) : '',
          ]),
        ),
      );
      ctx.print(['', { text: 'Type PLAY <number> to play one through the PC speaker.', tone: 'dim' }]);
    }),
  },
  {
    name: 'PLAY',
    usage: 'PLAY [number or name]',
    summary: 'Plays a track from MUSIC',
    run: reading(async (args, ctx) => {
      const list = await tracks(ctx);
      if (!list.length) return void ctx.print('The tape is blank.');
      const found = pick(list, args.join(' ') || '1');
      if (!found) return void ctx.print(`No track matching "${args.join(' ')}". Type MUSIC for the list.`);
      const t = found.item;
      stopMusic(ctx);
      const { audio, lofi } = await loadTrack(ctx, t.audioUrl);
      ctx.player.audio = audio;
      ctx.print({ text: `Now playing: ${t.title} - ${t.artist}`, tone: 'bright' });
      if (lofi) ctx.print({ text: 'Sound Blaster detected: 8-bit, mono. Sounds about right for 1997.', tone: 'dim' });
      const row = ctx.print('');
      const draw = () => {
        const total = Number.isFinite(audio.duration) ? audio.duration : (t.durationSec ?? 0);
        const fraction = total ? audio.currentTime / total : 0;
        ctx.update(row, {
          text: `[${bar(fraction, 40)}] ${formatTime(audio.currentTime)} / ${formatTime(total)}`,
          tone: 'good',
        });
      };
      draw();
      ctx.player.timer = setInterval(draw, 150);
      audio.onended = () => {
        draw();
        stopMusic(ctx);
        ctx.print({ text: 'End of track.', tone: 'dim' });
      };
      await audio.play().catch(() => {
        stopMusic(ctx);
        ctx.print({ text: 'Sound card not responding. Press a key, then try PLAY again.', tone: 'error' });
      });
    }),
  },
  {
    name: 'STOP',
    summary: 'Stops the music',
    run: (_args, ctx) => {
      if (!ctx.player.audio) return void ctx.print('Nothing is playing.');
      stopMusic(ctx);
      ctx.print('Stopped.');
    },
  },
  {
    name: 'OPEN',
    usage: 'OPEN <page> [number]',
    summary: 'Back to 2026, on that page (e.g. OPEN WORKS 2)',
    run: reading(async (args, ctx) => {
      const section = args[0]?.toUpperCase().replace('-', '');
      const href = section && SECTIONS[section];
      if (!href) return void ctx.print(`Usage: OPEN <${Object.keys(SECTIONS).join('|')}> [number]`);
      if (args[1] && (section === 'WORKS' || section === 'APPS')) {
        const list = section === 'WORKS' ? await projects(ctx) : await apps(ctx);
        const found = pick<{ title: string; slug?: string }>(list, args.slice(1).join(' '));
        if (!found?.item.slug) return void ctx.print(`Nothing matching "${args.slice(1).join(' ')}" in ${section}.`);
        return void ctx.open(`${href}/${found.item.slug}`);
      }
      ctx.open(href);
    }),
  },
  {
    name: 'CLS',
    summary: 'Clears the screen',
    run: (_args, ctx) => ctx.clear(),
  },
  {
    name: 'DATE',
    summary: 'Shows the date',
    run: (_args, ctx) => {
      const d = ctx.now();
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      ctx.print([`Current date is ${day} ${dosDate(d).replace(/-(\d\d)$/, `-${d.getFullYear()}`)}`, 'The time machine is stuck in 1997. Type EXIT to leave.']);
    },
  },
  {
    name: 'TIME',
    summary: 'Shows the time',
    run: (_args, ctx) => {
      const d = ctx.now();
      const two = (n: number) => String(n).padStart(2, '0');
      const cs = two(Math.floor(d.getMilliseconds() / 10));
      ctx.print(`Current time is ${dosTime(d).replace(/([ap])$/, `:${two(d.getSeconds())}.${cs}$1`)}`);
    },
  },
  {
    name: 'VER',
    summary: 'Shows the JackDOS version',
    run: (_args, ctx) => {
      ctx.print(BANNER, 'accent');
      ctx.print(['', 'JackDOS Version 6.22', '(C) Copyright Jack 1997-2026.']);
    },
  },
  {
    name: 'MEM',
    summary: 'Shows memory use',
    run: (_args, ctx) => {
      ctx.print([
        'Memory Type        Total  =   Used  +   Free',
        '----------------  -------   -------   -------',
        'Conventional         640K       27K      613K',
        'Upper                155K      155K        0K',
        'Render cache        4096K     4095K        1K',
        'Creativity             ∞K        ∞K        ∞K',
        '----------------  -------   -------   -------',
        '',
        '640K ought to be enough for anybody.',
      ]);
    },
  },
  {
    name: 'SOUND',
    usage: 'SOUND [ON | OFF]',
    summary: 'Turns the PC hum and sounds on or off',
    run: (args, ctx) => {
      const want = args[0]?.toUpperCase();
      if (want === 'ON' || want === 'OFF') ctx.sound.set(want === 'ON');
      else if (want) return void ctx.print('Usage: SOUND [ON | OFF]');
      ctx.print(`Sound is ${ctx.sound.enabled() ? 'ON' : 'OFF'}.`);
    },
  },
  {
    name: 'ECHO',
    usage: 'ECHO <text>',
    summary: 'Prints the text back',
    run: (args, ctx) => ctx.print(args.join(' ') || 'ECHO is on.'),
  },
  {
    name: 'EXIT',
    aliases: ['WIN', 'QUIT'],
    summary: 'Travels back to 2026',
    run: (_args, ctx) => {
      stopMusic(ctx);
      ctx.exit();
    },
  },
  {
    name: 'CD',
    aliases: ['TYPE'],
    usage: 'CD <folder> or TYPE <file>',
    summary: 'Looks inside a folder or file from DIR',
    hidden: true,
    run: (args, ctx) => {
      const name = (args[0] ?? '').toUpperCase().replace(/^C:\\?/, '').replace(/\\$/, '').split('.')[0];
      if (!name || name === '..' || name === '\\') return void ctx.print('C:\\');
      const target = findCommand(name);
      if (target && ['WORKS', 'APPS', 'SNAPS', 'FREETIME', 'MUSIC', 'ABOUT', 'SKILLS', 'CAREER', 'QUOTES', 'FACTS'].includes(target.name)) {
        return target.run(args.slice(1), ctx);
      }
      if (name === 'AUTOEXEC') return void ctx.print(['@ECHO OFF', 'PROMPT $P$G', 'ECHO Type HELP for a list of commands.']);
      if (name === 'COMMAND') return void ctx.print({ text: 'Cannot TYPE a program. Nice try.', tone: 'warn' });
      ctx.print(args[0] && /^(CD|TYPE)$/i.test(args[0]) ? 'Invalid directory' : 'File not found');
    },
  },
  {
    name: 'FORMAT',
    summary: 'Formats a disk',
    hidden: true,
    run: (_args, ctx) =>
      void ctx.print([{ text: 'WARNING: ALL DATA ON NON-REMOVABLE DISK DRIVE C: WILL BE LOST!', tone: 'warn' }, 'Proceed with Format (Y/N)? N', 'Phew.']),
  },
  {
    name: 'DEL',
    aliases: ['DELETE', 'ERASE', 'RM'],
    summary: 'Deletes files',
    hidden: true,
    run: (_args, ctx) => void ctx.print({ text: "Access denied - you can't delete the future from 1997.", tone: 'warn' }),
  },
];

function listCommands(names: string[]): string[] {
  return names.flatMap((name) => {
    const c = findCommand(name);
    return c ? [`   ${padRight(c.usage ?? c.name, 26)} ${c.summary}`] : [];
  });
}

export function findCommand(name: string): Command | undefined {
  const upper = name.toUpperCase();
  return COMMANDS.find((c) => c.name === upper || c.aliases?.includes(upper));
}

/** Tab completion: the visible command names that start with what's typed. */
export function completions(prefix: string): string[] {
  const upper = prefix.toUpperCase();
  return COMMANDS.filter((c) => !c.hidden && c.name.startsWith(upper)).map((c) => c.name);
}

export async function runCommand(input: string, ctx: DosContext): Promise<void> {
  const [word, ...args] = input.trim().split(/\s+/);
  if (!word) return;
  // "CD\" and "CD.." with no space, as people really typed them.
  const glued = /^(cd|type)([\\.].*)$/i.exec(word);
  const command = glued ? findCommand(glued[1]) : findCommand(word);
  if (!command) {
    ctx.print('Bad command or file name');
    return;
  }
  await command.run(glued ? [glued[2], ...args] : args, ctx);
}

export function stopAllMusic(ctx: DosContext) {
  stopMusic(ctx);
}
