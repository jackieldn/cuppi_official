'use client';

import { balanceSeries } from '@/lib/tools/amortise';
import { evaluateMortgage, MORTGAGE_DEFAULTS, type MortgageResult } from '@/lib/tools/evaluate';
import { gbp, monthsToText, percent, share, yearsToMonths } from '@/lib/tools/format';
import { readNumber } from '@/lib/tools/validate';
import { BAR, ComparisonCharts, ComparisonSection, cheapestSentence, type CompareRow } from './comparison';
import { CheckField, NumberField, Segmented } from './fields';
import { CalculatorFrame, DataTable, HeadlineResult, Note, ResultCard, ToolActions, WaitingResult } from './parts';
import { RepaymentCharts } from './repayment-charts';
import { ScenarioBar, ScenarioTag, scenarioColour } from './scenario-bar';
import { ScheduleTable } from './schedule-table';
import { useScenarios } from './use-scenarios';

const SHARED = { horizon: '5' };

export function MortgageCalculator() {
  const sc = useScenarios(MORTGAGE_DEFAULTS, { label: 'Deal', shared: SHARED });
  const v = sc.values;
  const byPrice = v.mode === 'price';
  const interestOnly = v.type === 'interest-only';
  const { reads, problems, result } = evaluateMortgage(v);

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
          <Segmented label="You know" value={v.mode as 'amount' | 'price'} onChange={(x) => sc.set('mode', x)} options={[{ value: 'amount', label: 'The mortgage amount' }, { value: 'price', label: 'Price and deposit' }]} />
          {byPrice ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField label="Property price" prefix="£" money value={v.price} onChange={(x) => sc.set('price', x)} error={reads.price.error} />
              <NumberField label="Deposit" prefix="£" money value={v.deposit} onChange={(x) => sc.set('deposit', x)} error={reads.deposit.error} hint={Number.isFinite(reads.price.value) && Number.isFinite(reads.deposit.value) && reads.price.value > 0 ? `${share((reads.deposit.value / reads.price.value) * 100)} of the price` : undefined} />
            </div>
          ) : (
            <NumberField label="Mortgage amount" prefix="£" money value={v.amount} onChange={(x) => sc.set('amount', x)} error={reads.amount.error} hint="How much you want to borrow." />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Interest rate" suffix="%" value={v.rate} onChange={(x) => sc.set('rate', x)} error={reads.rate.error} hint="The yearly rate on your deal." />
            <NumberField label="Term" suffix="years" value={v.years} onChange={(x) => sc.set('years', x)} error={reads.years.error} hint="How long to pay it off." />
          </div>
          <Segmented label="Type of mortgage" value={v.type as 'repayment' | 'interest-only'} onChange={(x) => sc.set('type', x)} options={[{ value: 'repayment', label: 'Repayment' }, { value: 'interest-only', label: 'Interest only' }]} />
          <NumberField label="Fee" prefix="£" money value={v.fee} onChange={(x) => sc.set('fee', x)} error={reads.fee.error} hint="Arrangement and product fees. Leave at 0 for none." />
          {Number(v.fee.replace(/,/g, '')) > 0 && <CheckField label="Add the fee to the mortgage" hint="Borrowed with the rest, so it costs interest too." checked={v.feeAdded === 'yes'} onChange={(c) => sc.set('feeAdded', c ? 'yes' : 'no')} />}
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
              label={interestOnly ? 'Monthly interest payment' : 'Monthly payment'}
              value={gbp(result.payment, { pence: true })}
              note={interestOnly ? `You would still owe ${gbp(result.principal)} at the end of the ${monthsToText(result.months)}, so you would need another way to pay it off.` : `Paid off in ${monthsToText(result.months)}.`}
              stats={[
                { label: 'Total interest', value: gbp(result.totalInterest) },
                { label: interestOnly ? 'Total paid, plus the loan' : 'Total paid back', value: gbp(result.totalPaid) },
                { label: 'Borrowing', value: gbp(result.principal) },
                ...(result.fee > 0 ? [{ label: 'Fee', value: gbp(result.fee) }] : []),
                ...(result.ltv !== null ? [{ label: 'Loan to value', value: share(result.ltv) }] : []),
              ]}
            />
            <ResultCard title="If the rate were different">
              <DataTable
                head={['Rate', 'Monthly payment', 'Compared with yours']}
                highlight={result.rateTable.findIndex((t) => Math.abs(t.rate - reads.rate.value) < 1e-9)}
                rows={result.rateTable.map((t) => [percent(t.rate), gbp(t.payment, { pence: true }), Math.abs(t.payment - result.payment) < 0.005 ? 'Your rate' : `${t.payment > result.payment ? '+' : '−'}${gbp(Math.abs(t.payment - result.payment), { pence: true })}`])}
              />
            </ResultCard>
            {result.schedule && (
              <>
                <ResultCard title="Your mortgage over time">
                  <RepaymentCharts series={[{ label: 'Still owed', points: balanceSeries(result.schedule, result.principal), colour: scenarioColour(sc.active) }]} schedule={result.schedule} description={`A chart of the mortgage balance falling from ${gbp(result.principal)} to nothing over ${monthsToText(result.months)}.`} />
                </ResultCard>
                <ResultCard title="Year by year">
                  <ScheduleTable schedule={result.schedule} fileName="mortgage-repayments" />
                </ResultCard>
              </>
            )}
            {interestOnly && <Note>With interest only, the balance stays at {gbp(result.principal)} for the whole term. Lenders will ask how you plan to repay it.</Note>}
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
