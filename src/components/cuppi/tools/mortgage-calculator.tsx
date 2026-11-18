'use client';

import { useId, useState } from 'react';
import { balanceSeries } from '@/lib/tools/amortise';
import { evaluateMortgage, MORTGAGE_DEFAULTS, type MortgageResult } from '@/lib/tools/evaluate';
import { gbp, monthsToText, percent, share, yearsToMonths } from '@/lib/tools/format';
import { readNumber } from '@/lib/tools/validate';
import { BAR, ComparisonCharts, ComparisonSection, cheapestSentence, type CompareRow } from './comparison';
import { CheckField, NumberField, Segmented } from './fields';
import { AdvancedSection, CalculatorFrame, DataTable, HeadlineResult, Note, ResultCard, ToolActions, ViewToggle, WaitingResult } from './parts';
import { RepaymentCharts } from './repayment-charts';
import { ScenarioBar, ScenarioTag, scenarioColour } from './scenario-bar';
import { ScheduleTable } from './schedule-table';
import { useScenarios } from './use-scenarios';

const SHARED = { horizon: '5' };

type View = 'overview' | 'stress' | 'years';

export function MortgageCalculator() {
  const sc = useScenarios(MORTGAGE_DEFAULTS, { label: 'Deal', shared: SHARED });
  const v = sc.values;
  const [viewAsked, setView] = useState<View>('overview');
  const viewId = useId();
  const usesFix = sc.all.some((s) => s.fixed !== 'none');
  const fixYears = v.fixed === '2' ? 2 : v.fixed === '5' ? 5 : 0;
  const byPrice = v.mode === 'price';
  const interestOnly = v.type === 'interest-only';
  const { reads, problems, result } = evaluateMortgage(v);
  // Interest-only has no year-by-year table, so a view that is not there falls back to the overview.
  const view: View = viewAsked === 'years' && !result?.schedule ? 'overview' : viewAsked;

  // The comparison: every scenario's answer, with costs over the first so many years.
  const horizon = readNumber(sc.shared.horizon.trim() === '' ? '0' : sc.shared.horizon, { label: 'the comparison period', min: 0, max: 40 });
  const periodMonths = yearsToMonths(sc.shared.horizon);
  const evals = sc.all.map((s) => evaluateMortgage(s, periodMonths));
  const columns = evals.flatMap((e, i) => (e.result ? [{ index: i, name: sc.names[i], result: e.result }] : []));
  const notShown = evals.flatMap((e, i) => (e.result ? [] : [sc.names[i]]));
  const overPeriod = periodMonths > 0;
  const periodText = monthsToText(periodMonths);

  const rows: CompareRow<MortgageResult>[] = [
    { label: 'Mortgage', text: (r) => gbp(r.loan) },
    { label: 'Monthly payment', text: (r) => gbp(r.payment, { pence: true }), value: (r) => r.payment },
    { label: 'Payment when the fix ends', text: (r) => (r.paymentAfter === null ? '–' : gbp(r.paymentAfter, { pence: true })), value: (r) => r.paymentAfter ?? r.payment, skip: (a) => a.every((r) => r.paymentAfter === null) },
    ...(overPeriod
      ? ([
          { label: `Interest and fees, first ${periodText}`, text: (r) => gbp(r.period!.cost), value: (r) => r.period!.cost, gap: (n) => gbp(n) },
          { label: `Still owed after ${periodText}`, text: (r) => gbp(r.period!.balance), value: (r) => r.period!.balance },
        ] as CompareRow<MortgageResult>[])
      : []),
    { label: 'Interest, whole term', text: (r) => gbp(r.totalInterest), value: (r) => r.totalInterest },
    { label: 'Fee', text: (r) => gbp(r.fee), value: (r) => r.fee, skip: (a) => a.every((r) => r.fee === 0) },
    { label: 'Total cost of borrowing', text: (r) => gbp(r.totalCost), value: (r) => r.totalCost, gap: (n) => gbp(n) },
    { label: 'Total paid back', text: (r) => gbp(r.totalPaid), value: (r) => r.totalPaid },
    { label: 'Paid off in', text: (r) => (r.interestOnly ? 'Not repaid' : monthsToText(r.months)), skip: (a) => a.every((r) => r.interestOnly) },
    { label: 'Loan to value', text: (r) => (r.ltv === null ? '–' : share(r.ltv)), value: (r) => r.ltv ?? 0, skip: (a) => a.some((r) => r.ltv === null) },
  ];
  const withSchedules = columns.filter((c) => c.result.schedule);

  return (
    <CalculatorFrame
      inputs={
        <>
          <ScenarioBar names={sc.names} active={sc.active} onSelect={sc.select} onAdd={sc.add} onRemove={sc.remove} onRename={sc.rename} noun="deal" />
          <Segmented label="You know" hideLabel value={v.mode as 'amount' | 'price'} onChange={(x) => sc.set('mode', x)} options={[{ value: 'amount', label: 'The mortgage amount' }, { value: 'price', label: 'Price and deposit' }]} />
          {byPrice ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField label="Property price" prefix="£" money value={v.price} onChange={(x) => sc.set('price', x)} error={reads.price.error} />
              <NumberField label="Deposit" prefix="£" money value={v.deposit} onChange={(x) => sc.set('deposit', x)} error={reads.deposit.error} hint={Number.isFinite(reads.price.value) && Number.isFinite(reads.deposit.value) && reads.price.value > 0 ? `${share((reads.deposit.value / reads.price.value) * 100)} of the price` : undefined} />
            </div>
          ) : (
            <NumberField label="Mortgage amount" prefix="£" money value={v.amount} onChange={(x) => sc.set('amount', x)} error={reads.amount.error} hint="How much you want to borrow." />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Interest rate" suffix="%" value={v.rate} onChange={(x) => sc.set('rate', x)} error={reads.rate.error} hint={fixYears ? `The fixed rate for the first ${fixYears} years.` : 'The yearly rate on your deal.'} />
            <NumberField label="Term" suffix="years" value={v.years} onChange={(x) => sc.set('years', x)} error={reads.years.error} hint="How long to pay it off." />
          </div>
          <Segmented label="Type of mortgage" value={v.type as 'repayment' | 'interest-only'} onChange={(x) => sc.set('type', x)} options={[{ value: 'repayment', label: 'Repayment' }, { value: 'interest-only', label: 'Interest only' }]} />
          <NumberField label="Fee" prefix="£" money value={v.fee} onChange={(x) => sc.set('fee', x)} error={reads.fee.error} hint="Arrangement and product fees. Leave at 0 for none." />
          {Number(v.fee.replace(/,/g, '')) > 0 && <CheckField label="Add the fee to the mortgage" hint="Borrowed with the rest, so it costs interest too." checked={v.feeAdded === 'yes'} onChange={(c) => sc.set('feeAdded', c ? 'yes' : 'no')} />}
          <AdvancedSection inUse={usesFix} summary={fixYears > 0 ? `${fixYears}-year fixed on` : undefined}>
            <Segmented
              label="Type of rate"
              value={v.fixed as 'none' | '2' | '5'}
              onChange={(x) => sc.set('fixed', x)}
              options={[
                { value: 'none', label: 'Variable' },
                { value: '2', label: '2-year fixed' },
                { value: '5', label: '5-year fixed' },
              ]}
            />
            {fixYears > 0 ? (
              <NumberField
                label="Rate when the fix ends"
                suffix="%"
                value={v.rateAfter}
                onChange={(x) => sc.set('rateAfter', x)}
                error={reads.years.value > fixYears ? reads.rateAfter.error : null}
                hint={reads.years.value > fixYears ? 'Most lenders move you to their standard variable rate, which is often higher. Use your best guess to see a more realistic cost.' : 'Your term is no longer than the fix, so this is not used.'}
              />
            ) : (
              <p className="text-xs leading-relaxed text-cuppi-ink-soft">With a variable rate, the rate above is used for the whole term. Choose a fixed deal to see what happens when it ends.</p>
            )}
          </AdvancedSection>
          <ToolActions changed={sc.changed} onReset={sc.reset} />
        </>
      }
      results={
        !result ? (
          <WaitingResult problems={problems} />
        ) : (
          <>
            <ViewToggle
              panelId={viewId}
              value={view}
              onChange={setView}
              views={[
                { value: 'overview', label: 'Overview' },
                { value: 'stress', label: 'Stress-test' },
                ...(result.schedule ? [{ value: 'years' as const, label: 'Year by year' }] : []),
              ]}
            />
            <div role="tabpanel" id={`${viewId}-panel`} aria-labelledby={`${viewId}-${view}`} className="space-y-5">
              {sc.count > 1 && <ScenarioTag index={sc.active} name={sc.names[sc.active]} />}
              {view === 'overview' && (
                <>
                  <HeadlineResult
                    label={interestOnly ? 'Monthly interest payment' : result.fixMonths ? `Monthly payment for the first ${result.fixMonths / 12} years` : 'Monthly payment'}
                    value={gbp(result.payment, { pence: true })}
                    note={
                      <>
                        {interestOnly ? `You would still owe ${gbp(result.principal)} at the end of the ${monthsToText(result.months)}, so you would need another way to pay it off.` : `Paid off in ${monthsToText(result.months)}.`}
                        {result.paymentAfter !== null && result.rateAfter !== null && ` Then ${gbp(result.paymentAfter, { pence: true })} a month if the rate moves to ${percent(result.rateAfter)}.`}
                      </>
                    }
                    stats={[
                      { label: 'Total interest', value: gbp(result.totalInterest) },
                      { label: interestOnly ? 'Total paid, plus the loan' : 'Total paid back', value: gbp(result.totalPaid) },
                      { label: 'Borrowing', value: gbp(result.principal) },
                      ...(result.fee > 0 ? [{ label: 'Fee', value: gbp(result.fee) }] : []),
                      ...(result.ltv !== null ? [{ label: 'Loan to value', value: share(result.ltv) }] : []),
                    ]}
                  />
                  {result.schedule && (
                    <ResultCard title="Your mortgage over time">
                      <RepaymentCharts series={[{ label: 'Still owed', points: balanceSeries(result.schedule, result.principal), colour: scenarioColour(sc.active) }]} schedule={result.schedule} description={`A chart of the mortgage balance falling from ${gbp(result.principal)} to nothing over ${monthsToText(result.months)}.`} />
                    </ResultCard>
                  )}
                  {interestOnly && <Note>With interest only, the balance stays at {gbp(result.principal)} for the whole term. Lenders will ask how you plan to repay it.</Note>}
                </>
              )}
              {view === 'stress' && (
                <ResultCard title="Stress-test">
                  <p className="mb-4 text-sm leading-relaxed text-cuppi-ink-soft">
                    {result.rateTableFor === 'after-fix' ? `What your payment could be once the fix ends and the rate moves, on the ${gbp(result.owedAtFix ?? result.principal)} you would still owe then.` : 'What your payment would be if your rate were a little lower or higher.'}
                  </p>
                  <DataTable
                    head={[result.rateTableFor === 'after-fix' ? 'Rate after the fix' : 'Rate', 'Monthly payment', result.rateTableFor === 'after-fix' ? 'Compared with your guess' : 'Compared with yours']}
                    highlight={result.rateTable.findIndex((t) => Math.abs(t.rate - result.rateTableAt) < 1e-9)}
                    rows={result.rateTable.map((t) => {
                      const mine = result.rateTableFor === 'after-fix' ? result.paymentAfter ?? result.payment : result.payment;
                      return [percent(t.rate), gbp(t.payment, { pence: true }), Math.abs(t.payment - mine) < 0.005 ? (result.rateTableFor === 'after-fix' ? 'Your guess' : 'Your rate') : `${t.payment > mine ? '+' : '−'}${gbp(Math.abs(t.payment - mine), { pence: true })}`];
                    })}
                  />
                </ResultCard>
              )}
              {view === 'years' && result.schedule && (
                <ResultCard title="Year by year">
                  <ScheduleTable schedule={result.schedule} fileName="mortgage-repayments" />
                </ResultCard>
              )}
            </div>
          </>
        )
      }
      below={
        sc.count > 1 && (
          <ComparisonSection
            summary={cheapestSentence(columns, (r) => (overPeriod ? r.period!.cost : r.totalCost), overPeriod ? `over the first ${periodText}` : 'overall', (n) => gbp(n))}
            controls={<NumberField label="Compare costs over the first" suffix="years" value={sc.shared.horizon} onChange={(x) => sc.setShared('horizon', x)} error={horizon.error} hint="How long you expect to keep the deal. 0 compares the whole term." />}
            columns={columns}
            rows={rows}
            active={sc.active}
            onSelect={sc.select}
            notShown={notShown}
            footnote="The tick marks the best in each row, and the small figure is how far each of the others is from it. Click a name to see that one in full above."
          >
            <ComparisonCharts
              series={withSchedules.map((c) => ({ label: c.name, points: balanceSeries(c.result.schedule!, c.result.principal), colour: scenarioColour(c.index) }))}
              description={`A chart comparing how fast each of ${withSchedules.length} mortgages is paid off: ${withSchedules.map((c) => `${c.name} in ${monthsToText(c.result.months)}`).join(', ')}.`}
              bars={columns.map((c) => ({
                index: c.index,
                name: c.name,
                total: c.result.loan + c.result.totalInterest + c.result.fee,
                totalText: gbp(c.result.loan + c.result.totalInterest + c.result.fee),
                parts: [
                  { label: 'Borrowed', value: c.result.loan, bar: BAR.debt },
                  { label: 'Interest', value: c.result.totalInterest, bar: BAR.interest },
                  { label: 'Fees', value: c.result.fee, bar: BAR.fee },
                ],
                caption: `${gbp(c.result.loan)} borrowed + ${gbp(c.result.totalInterest)} interest${c.result.fee > 0 ? ` + ${gbp(c.result.fee)} fees` : ''}`,
              }))}
            />
          </ComparisonSection>
        )
      }
    />
  );
}
