'use client';

// The Time Machine's 2006: 2026 glitches out, a Poot XP PC boots,
// says "welcome", and lands on a dark-skinned desktop with a taskbar in
// place of the Dock. The browser opens on the portfolio as a 2006
// fan-portal homepage. Turning the computer off (or the clock's Time Machine)
// travels back to 2026.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { eraDateLabel, inYear, useDesktop, type Era } from '../desktop-context';
import { dosSoundEnabled, saveDosSoundEnabled, unlockDosAudio } from '../dos/dos-sound';
import { GLITCH_MS, TimeGlitch } from '../dos/time-glitch';
import { usePortalData } from './portal-data';
import { type PortalPage } from './portal-site';
import { DocumentsFolder, JournalApp, PictureViewer, PicturesFolder, pictureTitle } from './xp-apps';
import { XpBrowser, browserTitle } from './xp-browser';
import { DesktopIcons, type DesktopIconItem } from './xp-desktop-icons';
import { PootAmp } from './xp-player';
import type { XpPicture } from '@/lib/poot-xp-types';
import {
  BrandMark,
  BrowserIcon,
  ClockIcon,
  ComputerIcon,
  DiskIcon,
  FloppyIcon,
  FolderIcon,
  InfoIcon,
  JournalIcon,
  LogOffIcon,
  NotepadIcon,
  PicturesIcon,
  PlayerIcon,
  PowerIcon,
  RestartIcon,
  SpeakerIcon,
} from './xp-icons';
import { playDing, playShutdown, playStartup } from './xp-sound';
import { TASKBAR_HEIGHT, XpWindow, type XpRect } from './xp-window';
import styles from './xp.module.css';

type Phase = 'glitch' | 'boot' | 'welcome' | 'desktop' | 'saving';
type WinId = 'browser' | 'notepad' | 'computer' | 'documents' | 'pictures' | 'viewer' | 'journal' | 'player' | 'message';

const BOOT_MS = 3200;
const WELCOME_MS = 1800;
const SAVING_MS = 1700;

// Plain colour backgrounds, the ones you got with no wallpaper picked.
const BACKGROUNDS = [
  { id: 'blue', name: 'Blue', color: '#004e98' },
  { id: 'slate', name: 'Slate', color: '#3a6ea5' },
  { id: 'teal', name: 'Teal', color: '#008080' },
  { id: 'grey', name: 'Grey', color: '#808080' },
  { id: 'black', name: 'Black', color: '#000000' },
] as const;
type BackgroundId = (typeof BACKGROUNDS)[number]['id'];
const BACKGROUND_KEY = 'xp-background';

function useBackground() {
  const [id, setId] = useState<BackgroundId>('blue');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BACKGROUND_KEY);
      if (BACKGROUNDS.some((b) => b.id === saved)) setId(saved as BackgroundId);
    } catch {
      // Storage blocked: keep the default.
    }
  }, []);
  const choose = useCallback((next: BackgroundId) => {
    setId(next);
    try {
      localStorage.setItem(BACKGROUND_KEY, next);
    } catch {
      // Not remembered, but still applied for this visit.
    }
  }, []);
  return [id, choose] as const;
}

/** Today's date and time, in 2006. */
const now2006 = () => inYear(2006);
const longDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function useClock2006() {
  const [now, setNow] = useState(now2006);
  useEffect(() => {
    const t = setInterval(() => setNow(now2006()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const readme = (date: string) => `Hi!

You've travelled back to ${date}.

This is what my computer looked like back then, when I made my first websites on free site builders and spent my evenings reading fan portals. Yes, the skin is black. I was very edgy.

  * Double-click Internet to open my 2006 homepage.
  * My Documents has my Journal, where I write about coding and things I find interesting.
  * Poot Amp plays the songs I had on this computer.
  * Drag the icons wherever you like.
  * "More..." links take you back to 2026, to the real page.
  * Right-click the desktop to change the background colour.
  * Click the clock (bottom right) to travel through time.
  * Start > Turn Off Computer takes you home to 2026.

Don't forget to sign my guestbook!!!

- Jack`;

interface Message {
  title: string;
  text: ReactNode;
}

export function XpScreen() {
  const desktop = useDesktop();
  const router = useRouter();
  const now = useClock2006();
  // Starts loading the portal while the PC boots.
  const { data } = usePortalData();
  const [background, setBackground] = useBackground();

  const [phase, setPhase] = useState<Phase>(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'boot' : 'glitch',
  );
  // Front-to-back order, for stacking. Changes on every click.
  const [stack, setStack] = useState<WinId[]>([]);
  // Order the windows were opened in, for the taskbar. Stays put.
  const [opened, setOpened] = useState<WinId[]>([]);
  const addOpened = (id: WinId) => setOpened((o) => (o.includes(id) ? o : [...o, id]));
  const [minimised, setMinimised] = useState<WinId[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [balloon, setBalloon] = useState(false);
  const [shutdownOpen, setShutdownOpen] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [sound, setSound] = useState(dosSoundEnabled);
  const [browserTitleText, setBrowserTitleText] = useState(browserTitle('home'));
  const [viewing, setViewing] = useState<{ pictures: XpPicture[]; index: number } | null>(null);
  const leavingRef = useRef(false);

  // Glitch, boot, welcome, desktop. A click or key skips the boot screen.
  useEffect(() => {
    if (phase === 'glitch') {
      const t = setTimeout(() => setPhase('boot'), GLITCH_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'boot') {
      const t = setTimeout(() => setPhase('welcome'), BOOT_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'welcome') {
      playStartup();
      const t = setTimeout(() => setPhase('desktop'), WELCOME_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'desktop') {
      const open = setTimeout(() => {
        setStack((s) => (s.includes('browser') ? s : [...s, 'browser']));
        setOpened((o) => (o.includes('browser') ? o : [...o, 'browser']));
      }, 700);
      const tip = setTimeout(() => setBalloon(true), 1600);
      const untip = setTimeout(() => setBalloon(false), 16_000);
      return () => {
        clearTimeout(open);
        clearTimeout(tip);
        clearTimeout(untip);
      };
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'boot') return;
    const skip = () => setPhase('welcome');
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [phase]);

  // Escape closes whichever menu is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setStartOpen(false);
      setClockOpen(false);
      setMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closeMenus = () => {
    setStartOpen(false);
    setClockOpen(false);
    setMenu(null);
  };

  /** "Saving your settings...", then back to another era. */
  const leave = useCallback(
    (era: Era, then?: () => void) => {
      if (leavingRef.current) return;
      if (era === '1997') {
        unlockDosAudio();
        desktop.setEra('1997');
        return;
      }
      leavingRef.current = true;
      setStartOpen(false);
      setClockOpen(false);
      setMenu(null);
      setShutdownOpen(false);
      setPhase('saving');
      playShutdown();
      setTimeout(() => {
        desktop.setEra(era);
        then?.();
      }, SAVING_MS);
    },
    [desktop],
  );

  const travel = useCallback(
    (href: string) =>
      leave('now', () => {
        desktop.open();
        router.push(href);
      }),
    [leave, desktop, router],
  );

  const focus = (id: WinId) => {
    closeMenus();
    setStack((s) => (s[s.length - 1] === id ? s : [...s.filter((w) => w !== id), id]));
    addOpened(id);
    setMinimised((m) => m.filter((w) => w !== id));
  };
  const openWin = (id: WinId) => focus(id);
  const closeWin = (id: WinId) => {
    setStack((s) => s.filter((w) => w !== id));
    setOpened((o) => o.filter((w) => w !== id));
    setMinimised((m) => m.filter((w) => w !== id));
  };
  const minimiseWin = (id: WinId) => setMinimised((m) => (m.includes(id) ? m : [...m, id]));

  const showMessage = (m: Message) => {
    playDing();
    setMessage(m);
    openWin('message');
  };

  const visible = stack.filter((w) => !minimised.includes(w));
  const active = visible[visible.length - 1];
  const z = (id: WinId) => 10 + stack.indexOf(id);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    saveDosSoundEnabled(next);
  };

  if (phase === 'glitch') {
    return (
      <div className={styles.screen} aria-hidden="true">
        <TimeGlitch />
      </div>
    );
  }

  if (phase === 'boot') {
    return (
      <div className={styles.screen} role="status" aria-label="Poot XP is starting">
        <div className={styles.boot}>
          <div className={styles.bootLogo}>
            <BrandMark width={72} height={72} />
            <div>
              <div className={styles.bootWord}>
                Poot<sup>XP</sup>
              </div>
              <div className={styles.bootEdition}>Dark Edition</div>
            </div>
          </div>
          <div className={styles.bootBar}>
            <div className={styles.bootBlocks}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className={styles.bootFooter}>
            <span>Copyright © 1992-2006 jackie_poot Ltd.</span>
            <span>jackie_poot</span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'welcome' || phase === 'saving') {
    return (
      <div className={styles.screen} role="status">
        <div className={styles.welcome}>
          <div className={styles.welcomeMid}>
            {phase === 'welcome' ? (
              <span className={styles.welcomeWord}>welcome</span>
            ) : (
              <span className={styles.savingWord}>Saving your settings...</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight - TASKBAR_HEIGHT;
  const centred = (w: number, h: number, nudge = 0): XpRect => ({
    x: Math.round((vw - w) / 2) + nudge,
    y: Math.round((vh - h) / 3) + nudge,
    w,
    h,
  });

  const titles: Record<WinId, string> = {
    browser: browserTitleText,
    notepad: 'readme.txt - Notepad',
    computer: 'My Computer',
    documents: 'My Documents',
    pictures: 'My Pictures',
    viewer: viewing ? pictureTitle(viewing.pictures, viewing.index) : 'Picture Viewer',
    journal: 'Journal',
    player: 'Poot Amp',
    message: message?.title ?? 'Poot XP',
  };
  const icons: Record<WinId, ReactNode> = {
    browser: <BrowserIcon />,
    notepad: <NotepadIcon />,
    computer: <ComputerIcon />,
    documents: <FolderIcon />,
    pictures: <PicturesIcon />,
    viewer: <PicturesIcon />,
    journal: <JournalIcon />,
    player: <PlayerIcon />,
    message: <InfoIcon />,
  };

  const desktopIcons: DesktopIconItem[] = [
    { id: 'computer', label: 'My Computer', icon: <ComputerIcon />, open: () => openWin('computer') },
    { id: 'documents', label: 'My Documents', icon: <FolderIcon />, open: () => openWin('documents') },
    { id: 'browser', label: 'Internet', icon: <BrowserIcon />, open: () => openWin('browser') },
    { id: 'player', label: 'Poot Amp', icon: <PlayerIcon />, open: () => openWin('player') },
  ];

  const backgroundColor = BACKGROUNDS.find((b) => b.id === background)?.color ?? BACKGROUNDS[0].color;

  return (
    <div
      className={styles.screen}
      role="application"
      aria-label={`Poot XP, ${longDate(now)}. Start, Turn Off Computer returns to 2026.`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={styles.desktop}
        style={{ backgroundColor }}
        onPointerDown={() => {
          closeMenus();
          setSelectedIcon(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setStartOpen(false);
          setClockOpen(false);
          setMenu({ x: Math.min(e.clientX, vw - 190), y: Math.min(e.clientY, vh - 150) });
        }}
      >
        <DesktopIcons
          items={desktopIcons}
          selected={selectedIcon}
          onSelect={(id) => {
            closeMenus();
            setSelectedIcon(id);
          }}
        />
      </div>

      {menu && (
        <div
          className={styles.contextMenu}
          role="menu"
          aria-label="Background"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className={styles.contextLabel}>Background</div>
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="menuitemradio"
              aria-checked={b.id === background}
              className={styles.contextItem}
              autoFocus={b.id === background}
              onClick={() => {
                setBackground(b.id);
                setMenu(null);
              }}
            >
              <span className={styles.check}>{b.id === background ? '✓' : ''}</span>
              <span className={styles.swatch} style={{ background: b.color }} />
              {b.name}
            </button>
          ))}
        </div>
      )}

      {opened.map((id) => {
        const common = {
          title: titles[id],
          icon: icons[id],
          minimised: minimised.includes(id),
          active: active === id,
          z: z(id),
          onFocus: () => focus(id),
          onClose: () => closeWin(id),
        };
        switch (id) {
          case 'browser':
            return (
              <XpWindow
                key={id}
                {...common}
                initial={{ x: 104, y: 14, w: Math.min(1180, vw - 130), h: vh - 34 }}
                minW={520}
                minH={320}
                onMinimise={() => minimiseWin(id)}
              >
                <XpBrowser travel={travel} now={now} onPage={(p: PortalPage, projectTitle?: string) => setBrowserTitleText(browserTitle(p, projectTitle))} />
              </XpWindow>
            );
          case 'notepad':
            return (
              <XpWindow key={id} {...common} initial={centred(540, 400, 30)} onMinimise={() => minimiseWin(id)}>
                <pre className={styles.notepad}>{readme(longDate(now))}</pre>
              </XpWindow>
            );
          case 'computer':
            return (
              <XpWindow key={id} {...common} initial={centred(560, 340)} onMinimise={() => minimiseWin(id)}>
                <div className={styles.darkPane}>
                  <div className={styles.pane}>
                    <div className={styles.paneGroup}>Hard Disk Drives</div>
                    <div className={styles.paneItems}>
                      <PaneItem icon={<DiskIcon />} name="Local Disk (C:)" note="My Documents" onOpen={() => openWin('documents')} />
                    </div>
                    <div className={styles.paneGroup}>Devices with Removable Storage</div>
                    <div className={styles.paneItems}>
                      <PaneItem icon={<FloppyIcon />} name="3½ Floppy (A:)" note="JackDOS boot disk, 1997" onOpen={() => leave('1997')} />
                      <PaneItem
                        icon={<DiskIcon />}
                        name="CD Drive (D:)"
                        note="Empty"
                        onOpen={() => showMessage({ title: 'D:\\', text: 'Please insert a disk into drive D:.' })}
                      />
                    </div>
                  </div>
                </div>
              </XpWindow>
            );
          case 'documents':
            return (
              <XpWindow key={id} {...common} initial={centred(520, 330, -20)} onMinimise={() => minimiseWin(id)}>
                <DocumentsFolder onReadme={() => openWin('notepad')} onJournal={() => openWin('journal')} />
              </XpWindow>
            );
          case 'pictures':
            return (
              <XpWindow key={id} {...common} initial={centred(620, 420, 10)} onMinimise={() => minimiseWin(id)}>
                <PicturesFolder
                  onOpen={(pictures, index) => {
                    setViewing({ pictures, index });
                    openWin('viewer');
                  }}
                />
              </XpWindow>
            );
          case 'viewer':
            return viewing ? (
              <XpWindow key={id} {...common} initial={centred(760, 560, 40)} minW={320} minH={240} onMinimise={() => minimiseWin(id)}>
                <PictureViewer
                  pictures={viewing.pictures}
                  start={viewing.index}
                  onIndex={(index) => setViewing((v) => (v ? { ...v, index } : v))}
                />
              </XpWindow>
            ) : null;
          case 'journal':
            return (
              <XpWindow
                key={id}
                {...common}
                initial={centred(Math.min(900, vw - 160), Math.min(620, vh - 60), 0)}
                minW={480}
                minH={300}
                onMinimise={() => minimiseWin(id)}
              >
                <JournalApp />
              </XpWindow>
            );
          case 'player':
            return (
              <XpWindow
                key={id}
                {...common}
                initial={{ x: Math.max(20, vw - 420), y: 40, w: 390, h: Math.min(440, vh - 60) }}
                minW={360}
                minH={380}
                onMinimise={() => minimiseWin(id)}
              >
                <PootAmp muted={!sound} />
              </XpWindow>
            );
          case 'message':
            return message ? (
              <XpWindow key={id} {...common} initial={centred(360, 150)} resizable={false}>
                <div className={styles.dialog}>
                  <InfoIcon width={32} height={32} style={{ flexShrink: 0 }} />
                  <div>{message.text}</div>
                </div>
                <div className={styles.dialogButtons}>
                  <button type="button" className={styles.xpButton} autoFocus onClick={() => closeWin('message')}>
                    OK
                  </button>
                </div>
              </XpWindow>
            ) : null;
          default:
            return null;
        }
      })}

      {startOpen && (
        <StartMenu
          name={data?.profile?.name?.trim().split(' ')[0]?.toLowerCase() || 'jack'}
          avatar={data?.profile?.profilePictureUrl}
          onOpen={openWin}
          onHelp={() => {
            setStartOpen(false);
            showMessage({
              title: 'Help and Support',
              text: (
                <>
                  It&apos;s {longDate(now)}. Double-click <b>Internet</b> for my homepage, or click the clock to travel
                  through time. <b>Turn Off Computer</b> takes you back to 2026.
                </>
              ),
            });
          }}
          onLogOff={() => leave('now')}
          onTurnOff={() => {
            setStartOpen(false);
            setShutdownOpen(true);
          }}
        />
      )}

      <div className={styles.taskbar} onPointerDown={() => setSelectedIcon(null)}>
        <button
          type="button"
          className={cn(styles.start, startOpen && styles.startOpen)}
          aria-expanded={startOpen}
          aria-haspopup="menu"
          onClick={() => {
            setClockOpen(false);
            setMenu(null);
            setStartOpen((o) => !o);
          }}
        >
          <BrandMark />
          start
        </button>
        <div className={styles.tasks}>
          {opened.map((id) => (
            <button
              key={id}
              type="button"
              className={cn(styles.task, active === id && styles.taskActive)}
              onClick={() => (active === id ? minimiseWin(id) : focus(id))}
            >
              {icons[id]}
              <span>{titles[id]}</span>
            </button>
          ))}
        </div>
        <div className={styles.tray}>
          <button
            type="button"
            className={styles.trayButton}
            aria-label={sound ? 'Sound on. Click to mute.' : 'Sound off. Click to unmute.'}
            title="Volume"
            onClick={toggleSound}
          >
            <SpeakerIcon muted={!sound} />
          </button>
          <button
            type="button"
            className={cn(styles.trayButton, styles.clock)}
            aria-haspopup="menu"
            aria-expanded={clockOpen}
            aria-label={`Time Machine. It's ${longDate(now)}`}
            title={longDate(now)}
            onClick={() => {
              setStartOpen(false);
              setMenu(null);
              setBalloon(false);
              setClockOpen((o) => !o);
            }}
          >
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </button>

          {balloon && (
            <div className={styles.balloon} role="status">
              <div className={styles.balloonTitle}>
                <ClockIcon width={16} height={16} />
                Welcome to 2006!
                <button type="button" className={styles.balloonClose} aria-label="Close" onClick={() => setBalloon(false)}>
                  ×
                </button>
              </div>
              It&apos;s {longDate(now)}. Click the clock to travel through time, or Start, Turn Off Computer to go back
              to 2026.
            </div>
          )}

          {clockOpen && <TimeMachineMenu onPick={(era) => (era === '2006' ? setClockOpen(false) : leave(era))} />}
        </div>
      </div>

      {shutdownOpen && (
        <div className={styles.shutdownShade}>
          <div className={styles.shutdown} role="dialog" aria-label="Turn off computer">
            <div className={styles.shutdownHead}>
              Turn off computer
              <BrandMark width={26} height={26} />
            </div>
            <div className={styles.shutdownChoices}>
              <button
                type="button"
                className={styles.shutdownChoice}
                onClick={() => {
                  setShutdownOpen(false);
                  setStack([]);
                  setOpened([]);
                  setMinimised([]);
                  setPhase('boot');
                }}
              >
                <RestartIcon />
                Restart
              </button>
              <button type="button" className={styles.shutdownChoice} autoFocus onClick={() => leave('now')}>
                <PowerIcon />
                Turn Off
              </button>
              <button type="button" className={styles.shutdownChoice} onClick={() => leave('1997')}>
                <LogOffIcon />
                Go to 1997
              </button>
            </div>
            <div className={styles.shutdownFoot}>
              <button type="button" className={styles.xpButton} onClick={() => setShutdownOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaneItem({ icon, name, note, onOpen }: { icon: ReactNode; name: string; note: string; onOpen: () => void }) {
  return (
    <button type="button" className={styles.paneItem} onDoubleClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <span style={{ width: 32, height: 32, flexShrink: 0 }}>{icon}</span>
      <span>
        {name}
        <small>{note}</small>
      </span>
    </button>
  );
}

interface StartMenuProps {
  name: string;
  avatar?: string;
  onOpen: (id: WinId) => void;
  onHelp: () => void;
  onLogOff: () => void;
  onTurnOff: () => void;
}

function StartMenu({ name, avatar, onOpen, onHelp, onLogOff, onTurnOff }: StartMenuProps) {
  return (
    <div className={styles.startMenu} role="menu" aria-label="Start menu">
      <div className={styles.startHeader}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a tiny avatar in a 2006 start menu */}
        {avatar ? <img src={avatar} alt="" className={styles.avatar} /> : <span className={styles.avatar} />}
        {name}
      </div>
      <div className={styles.startColumns}>
        <div className={styles.startLeft}>
          <button type="button" role="menuitem" className={styles.startItem} onClick={() => onOpen('browser')}>
            <BrowserIcon />
            <span>
              <b>Internet</b>
              <small>Jackie&apos;s portal</small>
            </span>
          </button>
          <button type="button" role="menuitem" className={styles.startItem} onClick={() => onOpen('player')}>
            <PlayerIcon />
            <span>
              <b>Poot Amp</b>
              <small>Music player</small>
            </span>
          </button>
          <button type="button" role="menuitem" className={styles.startItem} onClick={() => onOpen('journal')}>
            <JournalIcon />
            <span>
              <b>Journal</b>
              <small>Notes from my coding sessions</small>
            </span>
          </button>
        </div>
        <div className={styles.startRight}>
          <button type="button" role="menuitem" className={styles.startItem} onClick={() => onOpen('documents')}>
            <FolderIcon />
            My Documents
          </button>
          <button type="button" role="menuitem" className={styles.startItem} onClick={() => onOpen('pictures')}>
            <PicturesIcon />
            My Pictures
          </button>
          <button type="button" role="menuitem" className={styles.startItem} onClick={() => onOpen('computer')}>
            <ComputerIcon />
            My Computer
          </button>
          <div className={styles.startSep} />
          <button type="button" role="menuitem" className={styles.startItem} onClick={onHelp}>
            <InfoIcon />
            Help and Support
          </button>
        </div>
      </div>
      <div className={styles.startFooter}>
        <button type="button" role="menuitem" className={styles.footerButton} onClick={onLogOff}>
          <LogOffIcon />
          Log Off
        </button>
        <button type="button" role="menuitem" className={styles.footerButton} onClick={onTurnOff}>
          <PowerIcon />
          Turn Off Computer
        </button>
      </div>
    </div>
  );
}

const ERAS: { id: Era; label: () => string }[] = [
  { id: 'now', label: () => 'Today (2026)' },
  { id: '2006', label: () => eraDateLabel(2006) },
  { id: '1997', label: () => eraDateLabel(1997) },
];

function TimeMachineMenu({ onPick }: { onPick: (era: Era) => void }) {
  return (
    <div
      className={styles.startMenu}
      role="menu"
      aria-label="Time Machine"
      style={{ left: 'auto', right: 0, width: 240, animation: 'none', zIndex: 60 }}
    >
      <div className={styles.startHeader} style={{ height: 34, fontSize: 13 }}>
        <ClockIcon width={20} height={20} />
        Time Machine
      </div>
      <div className={styles.startColumns}>
        <div className={styles.startLeft}>
          {ERAS.map((e) => (
            <button
              key={e.id}
              type="button"
              role="menuitemradio"
              aria-checked={e.id === '2006'}
              className={styles.startItem}
              onClick={() => onPick(e.id)}
            >
              <span style={{ width: 14 }}>{e.id === '2006' ? '✓' : ''}</span>
              {e.label()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
