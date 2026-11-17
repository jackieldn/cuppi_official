import type { Metadata } from 'next';
import { Lock, PiggyBank, Sparkles } from 'lucide-react';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { DownloadStrip } from '@/components/cuppi/blocks/download-strip';
import { PageHero } from '@/components/cuppi/page-hero';
import { ToolCard } from '@/components/cuppi/tools/tool-card';
import { Reveal } from '@/components/ui/reveal';
import { getTools } from '@/lib/cuppi-site-data';
import { GROUP_LABELS, type ToolGroup } from '@/lib/tools/registry';
import { liveTools } from '@/lib/tools/settings';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Free Home & Mortgage Tools',
  description: 'Free, private calculators for UK home life: mortgage repayments and overpayments, Stamp Duty, how much you can borrow, and loan repayments. No sign-up, nothing saved.',
  alternates: { canonical: '/tools' },
};

export default async function ToolsPage() {
  const tools = liveTools(await getTools());
  const groups = (Object.keys(GROUP_LABELS) as ToolGroup[]).map((group) => ({ group, items: tools.filter((t) => t.group === group) })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CuppiHeader />
      <main className="flex-grow">
        <PageHero
          tint="honey"
          align="center"
          title="Little tools for home life"
          intro="Calculators for the big numbers at home: your mortgage, buying a home, and loans. Free, private, and no sign-up."
          pattern={{ name: 'springGarden', focus: '50% 50%', shape: 'ellipse' }}
        >
          <ul className="flex flex-wrap justify-center gap-2 text-sm font-medium">
            {[
              { icon: Lock, text: 'Nothing you type leaves your device' },
              { icon: PiggyBank, text: 'Free, no sign-up' },
              { icon: Sparkles, text: 'UK rules, checked and dated' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-2 rounded-full bg-cuppi-paper/90 px-4 py-2 text-cuppi-ink">
                <Icon className="h-4 w-4" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        </PageHero>

        {groups.length === 0 && <p className="mx-auto max-w-xl px-6 py-20 text-center text-lg text-cuppi-ink-soft">The tools are being polished and will be back soon.</p>}

        {groups.map(({ group, items }) => (
          <section key={group} className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
            <Reveal className="px-4 pb-4 sm:px-2">
              <h2 className="font-headline text-2xl font-normal">{GROUP_LABELS[group].title}</h2>
              <p className="mt-1 text-cuppi-ink-soft">{GROUP_LABELS[group].blurb}</p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((t) => (
                <Reveal key={t.slug} stagger={100}>
                  <ToolCard tool={t} />
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        <DownloadStrip />
      </main>
      <CuppiFooter />
    </div>
  );
}
