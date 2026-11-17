'use client';

import { gbp, share } from '@/lib/tools/format';
import { BORROW_DEFAULTS, evaluateBorrow } from '@/lib/tools/evaluate';
import { INCOME_MULTIPLES } from '@/lib/tools/rates';
import type { BorrowResult } from '@/lib/tools/borrowing';
import { ComparisonSection, MetricBars, type CompareRow } from './comparison';
import { NumberField, Segmented } from './fields';
import { CalculatorFrame, DataTable, HeadlineResult, Note, ResultCard, ToolActions, WaitingResult } from './parts';
import { ScenarioBar, ScenarioTag } from './scenario-bar';
import { useScenarios } from './use-scenarios';

export function HowMuchCanIBorrow() {
  const sc = useScenarios(BORROW_DEFAULTS, { label: 'Scenario' });
  const v = sc.values;
  const { reads, problems, result: r, multiple } = evaluateBorrow(v);

  const evals = sc.all.map((s) => evaluateBorrow(s));
  const columns = evals.flatMap((e, i) => (e.result ? [{ index: i, name: sc.names[i], result: e.result, multiple: e.multiple }] : []));
  const notShown = evals.flatMap((e, i) => (e.result ? [] : [sc.names[i]]));
  type Col = BorrowResult & { multiple: number };
  const rows: CompareRow<Col>[] = [
    { label: 'Income, together', text: (x) => gbp(x.combinedIncome) },
    { label: 'Times income', text: (x) => `${x.multiple}×` },
    { label: 'Could borrow', text: (x) => gbp(x.borrowing), value: (x) => x.borrowing, best: 'highest', gap: (n) => gbp(n) },
    { label: 'Most you could pay for a home', text: (x) => gbp(x.maxPrice), value: (x) => x.maxPrice, best: 'highest', gap: (n) => gbp(n) },
    { label: 'Loan to value', text: (x) => share(x.ltv) },
    { label: 'Monthly payment', text: (x) => gbp(x.monthlyPayment) },
    { label: 'Payment as a share of pay', text: (x) => share(x.paymentShare), value: (x) => x.paymentShare, skip: (a) => a.every((x) => x.paymentShare === 0) },
    { label: 'With monthly debts added', text: (x) => share(x.paymentAndDebtsShare), skip: (a) => a.every((x) => x.paymentAndDebtsShare === x.paymentShare) },
  ];
  const data = columns.map((c) => ({ ...c, result: { ...c.result, multiple: c.multiple } }));
  const high = data.length > 1 ? data.reduce((a, b) => (b.result.borrowing > a.result.borrowing ? b : a)) : null;
  const low = data.length > 1 ? data.reduce((a, b) => (b.result.borrowing < a.result.borrowing ? b : a)) : null;
  const summary = high && low ? (high.result.borrowing - low.result.borrowing < 1 ? 'They all come to the same amount.' : `${high.name} could borrow the most: ${gbp(high.result.borrowing)}, which is ${gbp(high.result.borrowing - low.result.borrowing)} more than ${low.name}.`) : undefined;

  return (
    <CalculatorFrame
      inputs={
        <>
          <ScenarioBar names={sc.names} active={sc.active} onSelect={sc.select} onAdd={sc.add} onRemove={sc.remove} onRename={sc.rename} noun="scenario" />
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Your income" prefix="£" money value={v.incomeA} onChange={(x) => sc.set('incomeA', x)} error={reads.incomeA.error} hint="Yearly, before tax." />
            <NumberField label="Second income" prefix="£" money value={v.incomeB} onChange={(x) => sc.set('incomeB', x)} error={reads.incomeB.error} hint="A partner’s yearly pay, or 0." />
          </div>
          <NumberField label="Deposit" prefix="£" money value={v.deposit} onChange={(x) => sc.set('deposit', x)} error={reads.deposit.error} hint="What you have saved towards the home." />
          <Segmented label="Times income" value={String(multiple)} onChange={(x) => sc.set('multiple', x)} options={INCOME_MULTIPLES.map((m) => ({ value: String(m), label: `${m}×` }))} />
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Interest rate" suffix="%" value={v.rate} onChange={(x) => sc.set('rate', x)} error={reads.rate.error} hint="For the monthly payment." />
            <NumberField label="Term" suffix="years" value={v.years} onChange={(x) => sc.set('years', x)} error={reads.years.error} />
          </div>
          <NumberField label="Monthly debts" prefix="£" money value={v.debts} onChange={(x) => sc.set('debts', x)} error={reads.debts.error} hint="Loans, credit cards and finance you pay each month. Lenders count these." />
          <ToolActions changed={sc.changed} onReset={sc.reset} />
        </>
      }
      results={
        !r ? (
          <WaitingResult problems={problems} />
        ) : (
          <>
            {sc.count > 1 && <ScenarioTag index={sc.active} name={sc.names[sc.active]} />}
            <HeadlineResult
              label={`You could borrow around (${multiple}× income)`}
              value={gbp(r.borrowing)}
              note={`Lenders commonly use between ${r.scenarios[0].multiple}× and ${r.scenarios.at(-1)!.multiple}×, which here is ${gbp(r.scenarios[0].borrowing)} to ${gbp(r.scenarios.at(-1)!.borrowing)}.`}
              stats={[
                { label: 'Most you could pay for a home', value: gbp(r.maxPrice) },
                { label: 'Loan to value', value: share(r.ltv) },
                { label: 'Monthly payment', value: gbp(r.monthlyPayment) },
                { label: 'Payment as a share of your pay', value: share(r.paymentShare) },
              ]}
            />
            {reads.debts.value > 0 && (
              <Note>
                With your {gbp(reads.debts.value)} of monthly debts, your payments would be {share(r.paymentAndDebtsShare)} of your pay before tax. Lenders look closely at this, so the real amount offered may be lower.
              </Note>
            )}
            <ResultCard title="At different multiples">
              <DataTable
                head={['Times income', 'You borrow', 'Home up to', 'A month']}
                highlight={r.scenarios.findIndex((s) => s.multiple === multiple)}
                rows={r.scenarios.map((s) => [`${s.multiple}×`, gbp(s.borrowing), gbp(s.maxPrice), gbp(s.monthlyPayment)])}
              />
            </ResultCard>
            <Note>This is a rule of thumb, not an offer. A lender will also check your spending, debts and credit record, and whether you could afford the payments if rates rose.</Note>
          </>
        )
      }
      below={
        sc.count > 1 && (
          <ComparisonSection summary={summary} columns={data} rows={rows} active={sc.active} onSelect={sc.select} notShown={notShown} footnote="The tick marks the highest in each row. Click a name to see that scenario in full above.">
            <ResultCard title="How much each could borrow">
              <MetricBars items={data.map((c) => ({ index: c.index, name: c.name, value: c.result.borrowing, text: gbp(c.result.borrowing) }))} />
            </ResultCard>
          </ComparisonSection>
        )
      }
    />
  );
}
