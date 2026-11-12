'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { describeError } from './errors';
import { APP_STORE_URL } from '@/lib/invite';
import { MAX_CUSTOM_LINKS, MAX_LABEL, defaultMenu, newCustomKey, resolveMenu, validateMenu, type MenuSettings } from '@/lib/menu-settings';

/**
 * Edits the top menu of the Cuppi site: the order, names, addresses and on/off switches of the
 * links, and the Download button. Saved as one document (cuppi_menu/main). What is stored is
 * read back through resolveMenu, the same function the website uses, so this form always
 * shows exactly what visitors will get.
 */
export function MenuAdmin() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_menu', 'main') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);

  const [menu, setMenu] = useState<MenuSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  // Fill the form once, when the stored menu arrives; later edits are the user's own.
  useEffect(() => {
    if (!isLoading && menu === null) setMenu(resolveMenu(data ?? null, APP_STORE_URL));
  }, [isLoading, data, menu]);

  if (!menu) return <Skeleton className="h-96 w-full" />;

  const setLink = (i: number, patch: Partial<MenuSettings['links'][number]>) =>
    setMenu({ ...menu, links: menu.links.map((l, n) => (n === i ? { ...l, ...patch } : l)) });
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= menu.links.length) return;
    const links = [...menu.links];
    [links[i], links[j]] = [links[j], links[i]];
    setMenu({ ...menu, links });
  };
  const customCount = menu.links.filter((l) => l.custom).length;

  const save = async () => {
    const found = validateMenu(menu);
    setProblems(found);
    if (found.length > 0 || !ref) return;
    setSaving(true);
    try {
      await setDoc(ref, {
        links: menu.links.map(({ key, label, href, visible }) => ({ key, label: label.trim(), href: href.trim(), visible })),
        download: { label: menu.download.label.trim(), href: menu.download.href.trim(), visible: menu.download.visible },
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Menu saved', description: 'The site picks it up within a minute.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save the menu', description: describeError(error) });
    } finally {
      setSaving(false);
    }
  };

  const shown = menu.links.filter((l) => l.visible);

  return (
    <div className="space-y-6">
      {/* A rough picture of the bar, so the order and switches are easy to see. */}
      <div aria-label="Preview of the menu" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-full border bg-muted/40 px-6 py-3 text-sm">
        <span className="font-semibold">Cuppi Home</span>
        {shown.map((l) => (
          <span key={l.key}>
            {l.label}
            {l.panel && ' ▾'}
          </span>
        ))}
        {menu.download.visible && <span className="ml-auto rounded-full bg-orange-600 px-3 py-1 font-semibold text-white">{menu.download.label}</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu links</CardTitle>
          <CardDescription>
            Reorder with the arrows, rename, or switch a link off to hide it. The two with a panel open the list of features; the features in them are chosen on the Cuppi Features page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {menu.links.map((l, i) => (
            <div key={l.key} className="grid items-center gap-3 rounded-lg border p-3 md:grid-cols-[auto_1fr_1.4fr_auto_auto]">
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label={`Move ${l.label} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Move ${l.label} down`} disabled={i === menu.links.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <Input aria-label="Name" value={l.label} maxLength={MAX_LABEL} onChange={(e) => setLink(i, { label: e.target.value })} />
              {l.panel ? (
                <p className="text-sm text-muted-foreground">Opens the panel of features</p>
              ) : (
                <Input aria-label="Address" value={l.href} placeholder="/page or https://…" onChange={(e) => setLink(i, { href: e.target.value })} />
              )}
              <div className="flex items-center gap-2">
                <Switch id={`show-${l.key}`} checked={l.visible} onCheckedChange={(v) => setLink(i, { visible: v })} />
                <Label htmlFor={`show-${l.key}`} className="text-sm">
                  Show
                </Label>
              </div>
              {l.custom ? (
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${l.label}`} onClick={() => setMenu({ ...menu, links: menu.links.filter((_, n) => n !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <span className="w-10" />
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={customCount >= MAX_CUSTOM_LINKS}
            onClick={() => setMenu({ ...menu, links: [...menu.links, { key: newCustomKey(menu.links), label: 'New link', href: '/', visible: true, custom: true }] })}
          >
            <Plus className="mr-2 h-4 w-4" /> Add a link {customCount >= MAX_CUSTOM_LINKS && `(up to ${MAX_CUSTOM_LINKS})`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Download button</CardTitle>
          <CardDescription>The orange button at the right of the menu. Point it at the App Store, TestFlight or any page.</CardDescription>
        </CardHeader>
        <CardContent className="grid items-end gap-3 md:grid-cols-[1fr_2fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="dl-label">Name</Label>
            <Input id="dl-label" value={menu.download.label} maxLength={MAX_LABEL} onChange={(e) => setMenu({ ...menu, download: { ...menu.download, label: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl-href">Link</Label>
            <Input id="dl-href" value={menu.download.href} placeholder="https://apps.apple.com/…" onChange={(e) => setMenu({ ...menu, download: { ...menu.download, href: e.target.value } })} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="dl-show" checked={menu.download.visible} onCheckedChange={(v) => setMenu({ ...menu, download: { ...menu.download, visible: v } })} />
            <Label htmlFor="dl-show">Show</Label>
          </div>
        </CardContent>
      </Card>

      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg border border-destructive/50 bg-destructive/5 p-4 pl-8 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save menu'}
        </Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => setMenu(defaultMenu(APP_STORE_URL))}>
          Start again from the defaults
        </Button>
      </div>
    </div>
  );
}
