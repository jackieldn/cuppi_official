'use client';
/* eslint-disable @next/next/no-img-element -- pictures from Storage at their own size, in a 2006 viewer. */

// Poot XP's folders and apps: My Documents, My Pictures (with a picture
// viewer) and the Journal. Pictures and journal posts are their own content,
// managed at /admin/xp-pictures and /admin/journal, and live only here.

import { useEffect, useState, type ReactNode } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import {
  JOURNAL_POSTS,
  XP_PICTURES,
  journalDate,
  sortJournal,
  type JournalPost,
  type XpPicture,
} from '@/lib/poot-xp-types';
import { ArrowIcon, JournalIcon, NotepadIcon } from './xp-icons';
import styles from './xp.module.css';

type Load<T> = { items: T[] | null; failed: boolean };

/** Reads a collection once, when the folder or app first opens. */
function useOnce<T>(read: (db: NonNullable<ReturnType<typeof useFirestore>>) => Promise<T[]>): Load<T> {
  const firestore = useFirestore();
  const [state, setState] = useState<Load<T>>({ items: null, failed: false });
  useEffect(() => {
    if (!firestore) return;
    let live = true;
    read(firestore)
      .then((items) => live && setState({ items, failed: false }))
      .catch((err) => {
        console.warn('Poot XP: could not read the folder.', err);
        if (live) setState({ items: [], failed: true });
      });
    return () => {
      live = false;
    };
    // `read` is a module-level function per caller; reading once is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);
  return state;
}

export const usePictures = () =>
  useOnce<XpPicture>((db) =>
    getDocs(query(collection(db, XP_PICTURES), orderBy('order'))).then((s) =>
      s.docs.map((d) => ({ ...(d.data() as XpPicture), id: d.id })),
    ),
  );

// Only published posts can be read by visitors, so the query has to ask for
// just those. Sorted here, not in the query, so it needs no extra index.
export const useJournal = () =>
  useOnce<JournalPost>((db) =>
    getDocs(query(collection(db, JOURNAL_POSTS), where('published', '==', true))).then((s) =>
      sortJournal(s.docs.map((d) => ({ ...(d.data() as JournalPost), id: d.id }))),
    ),
  );

// ---------------------------------------------------------------- folders

interface FolderItem {
  id: string;
  name: string;
  note?: string;
  icon: ReactNode;
  open: () => void;
}

function FolderView({ items, empty }: { items: FolderItem[]; empty: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className={styles.darkPane} onPointerDown={() => setSelected(null)}>
      {items.length === 0 ? (
        <p className={styles.folderEmpty}>{empty}</p>
      ) : (
        <div className={styles.folderGrid}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(styles.folderItem, selected === item.id && styles.folderItemSelected)}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelected(item.id);
              }}
              onDoubleClick={item.open}
              onKeyDown={(e) => e.key === 'Enter' && item.open()}
            >
              <span className={styles.folderThumb}>{item.icon}</span>
              <span className={styles.folderName}>{item.name}</span>
              {item.note && <small>{item.note}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusLine({ children }: { children: ReactNode }) {
  return (
    <div className={styles.statusBar}>
      <span className={styles.statusCell}>{children}</span>
    </div>
  );
}

export function DocumentsFolder({ onReadme, onJournal }: { onReadme: () => void; onJournal: () => void }) {
  const items: FolderItem[] = [
    { id: 'journal', name: 'Journal', note: 'Application', icon: <JournalIcon />, open: onJournal },
    { id: 'readme', name: 'readme.txt', note: 'Text Document', icon: <NotepadIcon />, open: onReadme },
  ];
  return (
    <>
      <FolderView items={items} empty="This folder is empty." />
      <StatusLine>{items.length} objects</StatusLine>
    </>
  );
}

export function PicturesFolder({ onOpen }: { onOpen: (pictures: XpPicture[], index: number) => void }) {
  const { items, failed } = usePictures();
  if (!items) {
    return (
      <>
        <div className={styles.darkPane}>
          <p className={styles.folderEmpty}>Loading...</p>
        </div>
        <StatusLine>Reading folder...</StatusLine>
      </>
    );
  }
  return (
    <>
      <FolderView
        empty={failed ? 'This folder could not be read. Try again later.' : 'This folder is empty.'}
        items={items.map((p, i) => ({
          id: p.id,
          name: p.title,
          icon: <img src={p.imageUrl} alt="" loading="lazy" className={styles.folderImage} />,
          open: () => onOpen(items, i),
        }))}
      />
      <StatusLine>{items.length} objects</StatusLine>
    </>
  );
}

interface PictureViewerProps {
  pictures: XpPicture[];
  /** The picture showing; the window's title follows it. */
  start: number;
  onIndex: (index: number) => void;
}

export function PictureViewer({ pictures, start: index, onIndex }: PictureViewerProps) {
  const picture = pictures[index];
  if (!picture) return null;
  const many = pictures.length > 1;
  const step = (by: number) => onIndex((index + by + pictures.length) % pictures.length);

  return (
    <>
      <div
        className={styles.viewerStage}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        <img src={picture.imageUrl} alt={picture.title} className={styles.viewerImage} />
      </div>
      {many && (
        <div className={styles.viewerBar}>
          <button type="button" className={styles.toolButton} aria-label="Previous picture" onClick={() => step(-1)}>
            <ArrowIcon dir="left" />
          </button>
          <span>
            {index + 1} of {pictures.length}
          </span>
          <button type="button" className={styles.toolButton} aria-label="Next picture" onClick={() => step(1)}>
            <ArrowIcon dir="right" />
          </button>
        </div>
      )}
    </>
  );
}

export const pictureTitle = (pictures: XpPicture[], index: number) =>
  `${pictures[index]?.title ?? 'Picture'} - Picture Viewer`;

// ---------------------------------------------------------------- journal

export function JournalApp() {
  const { items, failed } = useJournal();
  const [openId, setOpenId] = useState<string | null>(null);
  const post = items?.find((p) => p.id === openId) ?? items?.[0];

  return (
    <div className={styles.journal}>
      <aside className={styles.journalList} aria-label="Entries">
        {!items && <p className={styles.folderEmpty}>Loading...</p>}
        {items?.length === 0 && (
          <p className={styles.folderEmpty}>{failed ? 'The journal could not be opened.' : 'No entries yet.'}</p>
        )}
        {items?.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(styles.journalEntry, post?.id === p.id && styles.journalEntryActive)}
            aria-current={post?.id === p.id}
            onClick={() => setOpenId(p.id)}
          >
            <b>{p.title}</b>
            <small>{journalDate(p.date)}</small>
          </button>
        ))}
      </aside>
      <article className={styles.journalPage}>
        {post ? (
          <>
            <h1>{post.title}</h1>
            <p className={styles.journalDate}>{journalDate(post.date)}</p>
            {post.body
              .split(/\n\s*\n/)
              .filter((para) => para.trim())
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </>
        ) : (
          items && !failed && <p className={styles.journalDate}>Nothing to read yet. Come back soon!</p>
        )}
      </article>
    </div>
  );
}
