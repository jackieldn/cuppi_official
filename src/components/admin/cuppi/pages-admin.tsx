'use client';

import { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Lock } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ALWAYS_LIVE, SECTIONS, resolvePageStatus, type SectionKey, type SectionStatus } from '@/lib/page-status';
import { describeError } from './errors';

/**
 * Switches parts of the Cuppi site between live and "refresh in progress" while they are being
 * updated. A switch saves as soon as it is flipped (one document, cuppi_pages/status), and the
 * site picks it up within a couple of minutes. The legal pages are listed, locked, so it is clear
 * they stay reachable whatever is switched.
 */
export function PagesAdmin() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const ref = useMemo(() => (firestore ? doc(firestore, 'cuppi_pages', 'status') : null), [firestore]);
  const { data, isLoading } = useDoc<Record<string, unknown>>(ref);
  const [saving, setSaving] = useState<SectionKey | null>(null);

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  const status = resolvePageStatus(data ?? null);

  const set = async (key: SectionKey, next: SectionStatus) => {
    if (!ref) return;
    setSaving(key);
    try {
      await setDoc(ref, { [key]: next, updatedAt: serverTimestamp() }, { merge: true });
      const label = SECTIONS.find((s) => s.key === key)!.label;
      toast({ title: next === 'live' ? `${label} is live` : `${label} shows "refresh in progress"`, description: 'Visitors see the change within a couple of minutes.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: describeError(e) });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>
            Switch a section off while you update it. Visitors see a friendly &ldquo;a little refresh is under way&rdquo; page, with the menu and footer, and links to the parts that are live. Search engines are told to skip it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SECTIONS.map((s) => {
            const live = status[s.key] === 'live';
            return (
              <div key={s.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {s.label}
                    <Badge variant={live ? 'secondary' : 'outline'}>{live ? 'Live' : 'Refresh in progress'}</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.covers} <span className="text-xs">({s.path})</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id={`live-${s.key}`} checked={live} disabled={saving === s.key} onCheckedChange={(v) => set(s.key, v ? 'live' : 'refresh')} />
                  <Label htmlFor={`live-${s.key}`} className="text-sm">
                    Live
                  </Label>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Always reachable</CardTitle>
          <CardDescription>These cannot be switched off, so people can always find them.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ALWAYS_LIVE.map((p) => (
            <Badge key={p.path} variant="outline" className="gap-1.5 py-1">
              <Lock className="h-3 w-3" /> {p.label}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        The menu and footer still list the feature pages while they are switched off; they lead to the refresh page. To hide them from the menu as well, use the &ldquo;In menu&rdquo; switches on Cuppi features.
      </p>
    </div>
  );
}
