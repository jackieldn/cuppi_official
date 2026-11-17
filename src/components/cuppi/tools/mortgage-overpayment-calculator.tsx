'use client';

import { useEffect, useState } from 'react';
import { balanceSeries } from '@/lib/tools/amortise';
import { evaluateOverpayment, OVERPAYMENT_DEFAULTS, type OverpaymentResult } from '@/lib/tools/evaluate';
import { gbp, monthYearAfter, monthsToText } from '@/lib/tools/format';
import { BAR, ComparisonCharts, ComparisonSection, type CompareRow } from './comparison';
import { NumberField } from './fields';
import { CalculatorFrame, DataTable, HeadlineResult, Note, ResultCard, ToolActions, WaitingResult } from './parts';
import { RepaymentCharts } from './repayment-charts';
import { ScenarioBar, ScenarioTag, scenarioColour } from './scenario-bar';
import { ScheduleTable } from './schedule-table';
import { useScenarios } from './use-scenarios';

export function MortgageOverpaymentCalculator() {
  const sc = useScenarios(OVERPAYMENT_DEFAULTS, { label: 'Plan' });
  const v = sc.values;
  // "Mortgage-free by" needs today's date, which the server cannot know for the visitor, so it appears after the page loads.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const { reads, problems, result } = evaluateOverpayment(v);
  const evals = sc.all.map((s) => evaluateOverpayment(s));
  const columns = evals.flatMap((e, i) => (e.result ? [{ index: i, name: sc.names[i], result: e.result }] : []));
  const notShown = evals.flatMap((e, i) => (e.result ? [] : [sc.names[i]]));

  const rows: CompareRow<OverpaymentResult>[] = [
    { label: 'Your normal payment', text: (r) => gbp(r.baseline.payment, { pence: true }) },
    { label: 'Extra each month', text: (r) => gbp(r.withOver.rows.length ? r.withOver.rows[0].overpayment : 0, { pence: true }), skip: (a) => a.every((r) => r.nothing) },
    { label: 'Paid off in', text: (r) => monthsToText(r.withOver.months), value: (r) => r.withOver.months },
    { label: 'Sooner by', text: (r) => (r.monthsSaved > 0 ? monthsToText(r.monthsSaved) : '–'), value: (r) => r.monthsSaved, best: 'highest', skip: (a) => a.every((r) => r.monthsSaved === 0) },
    { label: 'Interest, in all', text: (r) => gbp(r.withOver.totalInterest), value: (r) => r.withOver.totalInterest, gap: (n) => gbp(n) },
    { label: 'Interest saved', text: (r) => gbp(r.interestSaved), value: (r) => r.interestSaved, best: 'highest', gap: (n) => gbp(n), skip: (a) => a.every((r) => r.interestSaved < 0.5) },
    { label: 'Overpaid in the first year', text: (r) => gbp(r.firstYear), skip: (a) => a.every((r) => r.firstYear === 0) },
    { label: 'Against the yearly allowance', text: (r) => (r.firstYear === 0 ? '–' : r.firstYear > r.limit + 0.005 ? 'Over it' : 'Within it'), skip: (a) => a.every((r) => r.firstYear === 0) },
  ];
  const best = columns.length > 1 ? columns.reduce((a, b) => (b.result.interestSaved > a.result.interestSaved ? b : a)) : null;
  const worst = columns.length > 1 ? columns.reduce((a, b) => (b.result.interestSaved < a.result.interestSaved ? b : a)) : null;
  const summary = best && worst ? (best.result.interestSaved - worst.result.interestSaved < 0.5 ? 'They save the same interest.' : `${best.name} saves the most interest: ${gbp(best.result.interestSaved)}, which is ${gbp(best.result.interestSaved - worst.result.interestSaved)} more than ${worst.name}, and clears the mortgage ${monthsToText(Math.max(0, worst.result.withOver.months - best.result.withOver.months))} sooner.`) : undefined;

  return (
    <CalculatorFrame
      inputs={
        <>
          <ScenarioBar names={sc.names} active={sc.active} onSelect={sc.select} onAdd={sc.add} onRemove={sc.remove} onRename={sc.rename} noun="plan" />
          <NumberField label="What you still owe" prefix="£" money value={v.balance} onChange={(x) => sc.set('balance', x)} error={reads.balance.error} hint="The mortgage balance today." />
          <NumberField label="Interest rate" suffix="%" value={v.rate} onChange={(x) => sc.set('rate', x)} error={reads.rate.error} hint="Your current yearly rate." />
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Years left" suffix="years" value={v.years} onChange={(x) => sc.set('years', x)} error={reads.years.error} />
            <NumberField label="And months" suffix="months" value={v.months} onChange={(x) => sc.set('months', x)} error={reads.months.error} />
          </div>
          <NumberField label="Extra each month" prefix="£" money value={v.extra} onChange={(x) => sc.set('extra', x)} error={reads.extra.error} hint="On top of your normal payment." />
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="One-off lump sum" prefix="£" money value={v.lump} onChange={(x) => sc.set('lump', x)} error={reads.lump.error} hint="Leave at 0 for none." />
            <NumberField label="Paid after" suffix="months" value={v.lumpAfter} onChange={(x) => sc.set('lumpAfter', x)} error={reads.lump.value > 0 ? reads.lumpAfter.error : null} hint="0 is straight away." />
          </div>
          <NumberField label="Yearly overpayment allowance" suffix="%" value={v.allowance} onChange={(x) => sc.set('allowance', x)} error={reads.allowance.error} hint="Many deals let you overpay about 10% of the balance a year without a charge. Check yours." />
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
              label="Interest you could save"
              value={gbp(result.interestSaved)}
              note={result.nothing ? 'Add a monthly overpayment or a lump sum to see what it saves.' : `Mortgage-free ${monthsToText(result.monthsSaved)} sooner${today ? `, by ${monthYearAfter(today, result.withOver.months)}` : ''}.`}
              stats={[
                { label: 'Time left now', value: monthsToText(result.baseline.months) },
                { label: 'Time left if you overpay', value: monthsToText(result.withOver.months) },
                { label: 'Interest now', value: gbp(result.baseline.totalInterest) },
                { label: 'Interest if you overpay', value: gbp(result.withOver.totalInterest) },
                { label: 'Your normal payment', value: gbp(result.baseline.payment, { pence: true }) },
                { label: 'Overpaid in the first year', value: gbp(result.firstYear) },
              ]}
            />
            {result.firstYear > result.limit + 0.005 ? (
              <Note tone="warn">
                In the first year you would overpay {gbp(result.firstYear)}, which is more than {v.allowance}% of what you owe ({gbp(result.limit)}). Overpaying more than your allowance can mean an early repayment charge, so check your mortgage terms or ask your lender first.
              </Note>
            ) : (
              result.firstYear > 0 && <Note>{gbp(result.firstYear)} in the first year is within a {v.allowance}% allowance ({gbp(result.limit)}). Your own deal’s allowance may be different.</Note>
            )}
            <ResultCard title="Your mortgage over time">
              <RepaymentCharts
                series={[
                  { label: 'With overpayments', points: balanceSeries(result.withOver, reads.balance.value), colour: scenarioColour(sc.active) },
                  { label: 'As it is', points: balanceSeries(result.baseline, reads.balance.value), colour: 'lake' },
                ]}
                schedule={result.withOver}
                description={`A chart comparing the mortgage balance with and without overpayments: paid off in ${monthsToText(result.withOver.months)} with them, and ${monthsToText(result.baseline.months)} without.`}
              />
            </ResultCard>
            <ResultCard title="What different amounts a month would do">
              <DataTable
                head={['Extra a month', 'Paid off in', 'Sooner by', 'Interest saved']}
                highlight={result.compareIndex}
                rows={result.compare.map((c) => [gbp(c.extra), monthsToText(c.months), c.saved > 0 ? monthsToText(c.saved) : '–', c.interestSaved > 0.5 ? gbp(c.interestSaved) : '–'])}
              />
              <p className="mt-3 text-xs text-cuppi-ink-soft">Monthly overpayments only; the lump sum is not included in this table.</p>
            </ResultCard>
            <ResultCard title="Year by year, with your overpayments">
              <ScheduleTable schedule={result.withOver} fileName="mortgage-overpayments" />
            </ResultCard>
          </>
        )
      }
      below={
        sc.count > 1 && (
          <ComparisonSection summary={summary} columns={columns} rows={rows} active={sc.active} onSelect={sc.select} notShown={notShown} footnote="The tick marks the best in each row, and the small figure is how far each of the others is from it. Click a name to see that plan in full above.">
            <ComparisonCharts
              series={columns.map((c) => ({ label: c.name, points: balanceSeries(c.result.withOver, c.result.balance), colour: scenarioColour(c.index) }))}
              description={`A chart comparing how fast each of ${columns.length} plans clears the mortgage: ${columns.map((c) => `${c.name} in ${monthsToText(c.result.withOver.months)}`).join(', ')}.`}
              bars={columns.map((c) => {
                const owed = c.result.balance;
                const total = owed + c.result.withOver.totalInterest;
                return { index: c.index, name: c.name, total, totalText: gbp(total), parts: [{ label: 'What you owe', value: owed, bar: BAR.debt }, { label: 'Interest', value: c.result.withOver.totalInterest, bar: BAR.interest }], caption: `${gbp(owed)} owed + ${gbp(c.result.withOver.totalInterest)} interest` };
              })}
            />
          </ComparisonSection>
        )
      }
    />
  );
}
