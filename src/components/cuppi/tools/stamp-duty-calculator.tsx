'use client';

import { gbp, percent } from '@/lib/tools/format';
import { evaluateStampDuty, REGIONS, STAMP_DUTY_DEFAULTS, type StampDutyAnswer } from '@/lib/tools/evaluate';
import { PROPERTY_TAX, type Region } from '@/lib/tools/rates';
import { ComparisonSection, MetricBars, type CompareRow } from './comparison';
import { CheckField, NumberField, Segmented } from './fields';
import { CalculatorFrame, DataTable, HeadlineResult, Note, ResultCard, ToolActions, WaitingResult } from './parts';
import { ScenarioBar, ScenarioTag } from './scenario-bar';
import { useScenarios } from './use-scenarios';

const REGION_NAME: Record<Region, string> = { england: 'England & N. Ireland', scotland: 'Scotland', wales: 'Wales' };
const BUYER_NAME = { standard: 'Moving home', 'first-time': 'First-time buyer', additional: 'Second home or buy-to-let' } as const;

const monthYear = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
/** The slice of the price a band covers, as far as the price reaches. */
const slice = (from: number, inBand: number) => `${gbp(from)} to ${gbp(from + inBand)}`;

export function StampDutyCalculator() {
  const sc = useScenarios(STAMP_DUTY_DEFAULTS, { label: 'Option' });
  const v = sc.values;
  const { reads, problems, result, region, buyer, nonUk } = evaluateStampDuty(v);
  const rules = PROPERTY_TAX[region];

  const evals = sc.all.map((s) => evaluateStampDuty(s));
  const columns = evals.flatMap((e, i) => (e.result ? [{ index: i, name: sc.names[i], result: e.result }] : []));
  const notShown = evals.flatMap((e, i) => (e.result ? [] : [sc.names[i]]));
  const rows: CompareRow<StampDutyAnswer>[] = [
    { label: 'Price', text: (r) => gbp(r.price) },
    { label: 'Where', text: (r) => REGION_NAME[r.region] },
    { label: 'Buyer', text: (r) => BUYER_NAME[r.buyer] },
    { label: 'Tax to pay', text: (r) => gbp(r.sd.tax) },
    { label: 'As a share of the price', text: (r) => percent(r.sd.effectiveRate) },
    { label: 'Includes', text: (r) => (r.sd.applied.length ? r.sd.applied.map((a) => a.replace(/ \(.*\)$/, '')).join(', ') : 'Usual rates'), skip: (a) => a.every((r) => r.sd.applied.length === 0) },
  ];
  const taxes = columns.map((c) => c.result.sd.tax);
  const summary = columns.length > 1 ? (Math.max(...taxes) - Math.min(...taxes) < 1 ? 'They all come to the same tax.' : `The tax runs from ${gbp(Math.min(...taxes))} (${columns[taxes.indexOf(Math.min(...taxes))].name}) to ${gbp(Math.max(...taxes))} (${columns[taxes.indexOf(Math.max(...taxes))].name}).`) : undefined;

  return (
    <CalculatorFrame
      inputs={
        <>
          <ScenarioBar names={sc.names} active={sc.active} onSelect={sc.select} onAdd={sc.add} onRemove={sc.remove} onRename={sc.rename} noun="option" />
          <NumberField label="Property price" prefix="£" money value={v.price} onChange={(x) => sc.set('price', x)} error={reads.price.error} />
          <Segmented label="Where is the property?" value={region} onChange={(x) => sc.set('region', x)} options={REGIONS.map((r) => ({ value: r, label: REGION_NAME[r] }))} />
          <Segmented
            label="Who is buying?"
            value={buyer}
            onChange={(x) => sc.set('buyer', x)}
            options={[
              { value: 'standard', label: BUYER_NAME.standard },
              { value: 'first-time', label: BUYER_NAME['first-time'] },
              { value: 'additional', label: BUYER_NAME.additional },
            ]}
          />
          {region === 'england' && (
            <CheckField label="Buyer is not a UK resident" checked={nonUk} onChange={(c) => sc.set('nonUk', c ? 'yes' : 'no')} hint="Adds 2% to each band for people who have not been in the UK enough of the last two years." />
          )}
          <ToolActions changed={sc.changed} onReset={sc.reset} />
        </>
      }
      results={
        !result ? (
          <WaitingResult problems={problems} />
        ) : (
          <>
            {sc.count > 1 && <ScenarioTag index={sc.active} name={sc.names[sc.active]} />}
            <HeadlineResult
              label={`${result.sd.taxName} (${result.sd.taxShort}) to pay`}
              value={gbp(result.sd.tax)}
              note={result.sd.applied.length ? result.sd.applied.join(' · ') : 'The usual rates for a home you will live in.'}
              stats={[
                { label: 'As a share of the price', value: percent(result.sd.effectiveRate) },
                { label: 'Price', value: gbp(result.price) },
              ]}
            />
            {result.sd.notes.map((n) => (
              <Note key={n} tone="warn">
                {n}
              </Note>
            ))}
            <ResultCard title="How it adds up">
              <DataTable
                head={['Part of the price', 'Rate', 'Tax']}
                rows={[
                  ...result.sd.bands.map((b) => [slice(b.from, b.inBand), percent(b.rate), gbp(b.tax, { pence: b.tax % 1 !== 0 })]),
                  ...(result.sd.supplement ? [[`${result.sd.supplement.label}: on the whole price`, percent(result.sd.supplement.rate), gbp(result.sd.supplement.amount, { pence: result.sd.supplement.amount % 1 !== 0 })]] : []),
                ]}
              />
              <p className="mt-3 text-xs text-cuppi-ink-soft">The total is rounded down to the pound, as the tax authorities do.</p>
            </ResultCard>
            <ResultCard title="The same price elsewhere in the UK">
              <DataTable head={['Where', 'Tax', 'Tax to pay']} highlight={REGIONS.indexOf(region)} rows={result.elsewhere.map((e) => [REGION_NAME[e.region], PROPERTY_TAX[e.region].short, gbp(e.tax)])} />
            </ResultCard>
            <p className="px-2 text-xs leading-relaxed text-cuppi-ink-soft">
              Rates for {rules.short} last checked {monthYear(rules.reviewed)} against{' '}
              <a href={rules.source} target="_blank" rel="noopener noreferrer" className="font-medium text-cuppi-brand-deep underline underline-offset-2">
                the official page
              </a>{' '}
              ({rules.authority}). Always check the official figure before you rely on it.
            </p>
          </>
        )
      }
      below={
        sc.count > 1 && (
          <ComparisonSection summary={summary} columns={columns} rows={rows} active={sc.active} onSelect={sc.select} notShown={notShown} footnote="Click a name to see that option in full above. Nothing is marked best here, because a lower tax usually just means a cheaper home.">
            <ResultCard title="The tax for each">
              <MetricBars items={columns.map((c) => ({ index: c.index, name: c.name, value: c.result.sd.tax, text: gbp(c.result.sd.tax) }))} />
            </ResultCard>
          </ComparisonSection>
        )
      }
    />
  );
}
