'use client';

import { balanceSeries } from '@/lib/tools/amortise';
import { evaluateLoan, LOAN_DEFAULTS, type LoanAnswer } from '@/lib/tools/evaluate';
import { gbp, monthsToText, percent } from '@/lib/tools/format';
import { Roll } from './animated-number';
import { BAR, ComparisonCharts, ComparisonSection, cheapestSentence, type CompareRow } from './comparison';
import { CheckField, NumberField, Segmented } from './fields';
import { CalculatorFrame, HeadlineResult, Note, ResultCard, ToolActions, WaitingResult } from './parts';
import { RepaymentCharts } from './repayment-charts';
import { ScenarioBar, ScenarioTag, scenarioColour } from './scenario-bar';
import { ScheduleTable } from './schedule-table';
import { useScenarios } from './use-scenarios';

export function LoanRepaymentCalculator() {
  const sc = useScenarios(LOAN_DEFAULTS, { label: 'Loan' });
  const v = sc.values;
  const { reads, problems, result: a, early, inYears } = evaluateLoan(v);

  const evals = sc.all.map((s) => evaluateLoan(s));
  const columns = evals.flatMap((e, i) => (e.result ? [{ index: i, name: sc.names[i], result: e.result }] : []));
  const notShown = evals.flatMap((e, i) => (e.result ? [] : [sc.names[i]]));
  const rows: CompareRow<LoanAnswer>[] = [
    { label: 'Borrowing', text: (r) => gbp(r.principal) },
    { label: 'Monthly payment', text: (r) => gbp(r.payment, { pence: true }), value: (r) => r.payment },
    { label: 'Interest', text: (r) => gbp(r.totalInterest), value: (r) => r.totalInterest },
    { label: 'Fees', text: (r) => gbp(r.totalCost - r.totalInterest), value: (r) => r.totalCost - r.totalInterest, skip: (x) => x.every((r) => r.totalCost - r.totalInterest < 0.005) },
    { label: 'Total cost of borrowing', text: (r) => gbp(r.totalCost), value: (r) => r.totalCost, gap: (n) => gbp(n) },
    { label: 'Total paid back', text: (r) => gbp(r.totalPaid), value: (r) => r.totalPaid },
    { label: 'Paid off in', text: (r) => monthsToText(r.months), value: (r) => r.months },
    { label: 'Interest saved by repaying early', text: (r) => (r.early ? gbp(r.early.interestSaved) : '–'), value: (r) => r.early?.interestSaved ?? 0, best: 'highest', skip: (x) => x.every((r) => !r.early) },
  ];
  const line = columns.filter((c) => c.result.early?.kind !== 'settle');
  const e = a?.early ?? null;

  return (
    <CalculatorFrame
      inputs={
        <>
          <ScenarioBar names={sc.names} active={sc.active} onSelect={sc.select} onAdd={sc.add} onRemove={sc.remove} onRename={sc.rename} noun="loan" />
          <NumberField label="Loan amount" prefix="£" money value={v.amount} onChange={(x) => sc.set('amount', x)} error={reads.amount.error} />
          <NumberField label="Interest rate (APR)" suffix="%" value={v.apr} onChange={(x) => sc.set('apr', x)} error={reads.apr.error} hint="The APR on your loan agreement." />
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <NumberField label="Term" value={v.term} onChange={(x) => sc.set('term', x)} error={reads.term.error} />
            <Segmented label="In" value={inYears ? 'years' : 'months'} onChange={(x) => sc.set('unit', x)} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
          <NumberField label="Arrangement fee" prefix="£" money value={v.fee} onChange={(x) => sc.set('fee', x)} error={reads.fee.error} hint="Leave at 0 for none." />
          {Number(v.fee.replace(/,/g, '')) > 0 && <CheckField label="Add the fee to the loan" hint="Borrowed with the rest, so it costs interest too." checked={v.feeAdded === 'yes'} onChange={(c) => sc.set('feeAdded', c ? 'yes' : 'no')} />}
          <Segmented
            label="Paying it off early?"
            value={early}
            onChange={(x) => sc.set('early', x)}
            options={[
              { value: 'none', label: 'No' },
              { value: 'monthly', label: 'Extra each month' },
              { value: 'lump', label: 'Lump sum' },
              { value: 'settle', label: 'Settle in full' },
            ]}
          />
          {early === 'monthly' && <NumberField label="Extra each month" prefix="£" money value={v.extra} onChange={(x) => sc.set('extra', x)} error={reads.extra.error} hint="On top of your normal payment." />}
          {early === 'lump' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField label="Lump sum" prefix="£" money value={v.lump} onChange={(x) => sc.set('lump', x)} error={reads.lump.error} />
              <NumberField label="Paid after" suffix="payments" value={v.lumpAfter} onChange={(x) => sc.set('lumpAfter', x)} error={reads.lumpAfter.error} hint="0 is straight away." />
            </div>
          )}
          {early === 'settle' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField label="Settle after" suffix="payments" value={v.settleAfter} onChange={(x) => sc.set('settleAfter', x)} error={reads.settleAfter.error} hint="How many payments you will have made." />
              <NumberField label="Early settlement fee" suffix="months’ interest" value={v.settleFee} onChange={(x) => sc.set('settleFee', x)} error={reads.settleFee.error} hint="Often a month or two of interest. Check your agreement." />
            </div>
          )}
          <ToolActions changed={sc.changed} onReset={sc.reset} />
        </>
      }
      results={
        !a ? (
          <WaitingResult problems={problems} />
        ) : (
          <>
            {sc.count > 1 && <ScenarioTag index={sc.active} name={sc.names[sc.active]} />}
            <HeadlineResult
              label="Monthly payment"
              value={gbp(a.payment, { pence: true })}
              note={`Paid off in ${monthsToText(a.result.baseline.months)}.`}
              stats={[
                { label: 'Total interest', value: gbp(a.result.baseline.totalInterest) },
                { label: 'Total paid back', value: gbp(a.result.baseline.totalPaid + (v.feeAdded === 'yes' ? 0 : a.arrangementFee)) },
                { label: 'Borrowing', value: gbp(a.principal) },
                { label: 'Rate per month', value: percent(a.result.monthlyRate * 100) },
                ...(a.arrangementFee > 0 ? [{ label: 'Arrangement fee', value: gbp(a.arrangementFee) }] : []),
              ]}
            />
            {e && (
              <ResultCard title={e.kind === 'settle' ? 'If you settle early' : 'If you pay it off early'}>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { label: e.kind === 'settle' ? 'Loan ends after' : 'Paid off in', value: monthsToText(e.months) },
                    { label: 'Sooner by', value: monthsToText(e.monthsSaved) },
                    { label: 'Interest saved', value: gbp(e.interestSaved) },
                    ...(e.kind === 'settle' ? [{ label: 'Early settlement fee', value: gbp(e.fee, { pence: true }) }, { label: 'To clear it on the day', value: gbp(e.settlementFigure ?? 0, { pence: true }) }] : []),
                    { label: e.kind === 'settle' ? 'Saved after the fee' : 'Total paid back', value: gbp(e.kind === 'settle' ? e.netSaving : e.totalPaid) },
                  ].map((s) => (
                    <div key={s.label}>
                      <dt className="text-xs font-semibold text-cuppi-ink-soft">{s.label}</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        <Roll>{s.value}</Roll>
                      </dd>
                    </div>
                  ))}
                </dl>
                {e.kind === 'settle' && e.netSaving <= 0 && (
                  <div className="mt-4">
                    <Note tone="warn">After the fee, settling early would not save you anything. Try a different month, or ask your lender for a settlement figure.</Note>
                  </div>
                )}
              </ResultCard>
            )}
            <ResultCard title="Your loan over time">
              <RepaymentCharts
                series={[
                  ...(e && e.kind !== 'settle' ? [{ label: 'With early repayment', points: balanceSeries(a.result.schedule, a.principal), colour: scenarioColour(sc.active) }] : []),
                  { label: e && e.kind !== 'settle' ? 'As it is' : 'Still owed', points: balanceSeries(a.result.baseline, a.principal), colour: e && e.kind !== 'settle' ? ('lake' as const) : scenarioColour(sc.active) },
                ]}
                schedule={a.result.schedule}
                description={`A chart of the loan balance falling from ${gbp(a.principal)} to nothing over ${monthsToText(a.result.baseline.months)}.`}
              />
            </ResultCard>
            <ResultCard title={e && e.kind !== 'settle' ? 'Year by year, with early repayment' : 'Year by year'}>
              <ScheduleTable schedule={a.result.schedule} fileName="loan-repayments" />
            </ResultCard>
            <Note>This works from the APR, and includes no fees other than the arrangement and settlement fees. The figures on your own agreement are the ones that count.</Note>
          </>
        )
      }
      below={
        sc.count > 1 && (
          <ComparisonSection
            summary={cheapestSentence(columns, (r) => r.totalCost, 'overall', (n) => gbp(n))}
            columns={columns}
            rows={rows}
            active={sc.active}
            onSelect={sc.select}
            notShown={notShown}
            footnote="The tick marks the best in each row, and the small figure is how far each of the others is from it. Click a name to see that loan in full above."
          >
            <ComparisonCharts
              series={line.map((c) => ({ label: c.name, points: balanceSeries(c.result.result.schedule, c.result.principal), colour: scenarioColour(c.index) }))}
              description={`A chart comparing how fast each of ${line.length} loans is paid off: ${line.map((c) => `${c.name} in ${monthsToText(c.result.months)}`).join(', ')}.`}
              bars={columns.map((c) => {
                const fees = c.result.totalCost - c.result.totalInterest;
                const total = c.result.amount + c.result.totalInterest + fees;
                return {
                  index: c.index,
                  name: c.name,
                  total,
                  totalText: gbp(total),
                  parts: [
                    { label: 'Borrowed', value: c.result.amount, bar: BAR.debt },
                    { label: 'Interest', value: c.result.totalInterest, bar: BAR.interest },
                    { label: 'Fees', value: fees, bar: BAR.fee },
                  ],
                  caption: `${gbp(c.result.amount)} borrowed + ${gbp(c.result.totalInterest)} interest${fees > 0.005 ? ` + ${gbp(fees)} fees` : ''}`,
                };
              })}
            />
          </ComparisonSection>
        )
      }
    />
  );
}
