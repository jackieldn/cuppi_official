import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BORROW_DEFAULTS, LOAN_DEFAULTS, MORTGAGE_DEFAULTS, OVERPAYMENT_DEFAULTS, STAMP_DUTY_DEFAULTS, evaluateBorrow, evaluateLoan, evaluateMortgage, evaluateOverpayment, evaluateStampDuty } from '../../src/lib/tools/evaluate.ts';
import { paymentFor, monthlyRateFromNominal, buildSchedule } from '../../src/lib/tools/amortise.ts';

const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

describe('every calculator starts from boxes that give an answer', () => {
  test('the defaults are all good', () => {
    assert.ok(evaluateMortgage(MORTGAGE_DEFAULTS).result);
    assert.ok(evaluateOverpayment(OVERPAYMENT_DEFAULTS).result);
    assert.ok(evaluateStampDuty(STAMP_DUTY_DEFAULTS).result);
    assert.ok(evaluateBorrow(BORROW_DEFAULTS).result);
    assert.ok(evaluateLoan(LOAN_DEFAULTS).result);
  });
  test('a spoilt box gives its message and no answer', () => {
    const m = evaluateMortgage({ ...MORTGAGE_DEFAULTS, rate: 'x', years: '' });
    assert.equal(m.result, null);
    assert.equal(m.problems.length, 2);
    assert.match(m.reads.rate.error, /should be a number/);
    assert.equal(evaluateStampDuty({ ...STAMP_DUTY_DEFAULTS, price: '' }).result, null);
    assert.equal(evaluateLoan({ ...LOAN_DEFAULTS, apr: '-1' }).result, null);
    assert.equal(evaluateBorrow({ ...BORROW_DEFAULTS, incomeA: '0' }).result, null);
    assert.equal(evaluateOverpayment({ ...OVERPAYMENT_DEFAULTS, years: '0', months: '0' }).result, null);
  });
});

describe('mortgage', () => {
  test('a repayment mortgage has the standard payment', () => {
    const { result: r } = evaluateMortgage(MORTGAGE_DEFAULTS);
    close(r.payment, paymentFor(250_000, monthlyRateFromNominal(4.5), 300));
    close(r.totalCost, r.totalInterest);
    close(r.totalPaid, 250_000 + r.totalInterest, 0.01);
    assert.equal(r.stillOwedAtEnd, 0);
    assert.equal(r.ltv, null);
    assert.equal(r.period, null);
  });
  test('price and deposit give the loan and the loan to value; a deposit that eats the price is refused', () => {
    const { result: r } = evaluateMortgage({ ...MORTGAGE_DEFAULTS, mode: 'price' });
    assert.equal(r.loan, 250_000);
    close(r.ltv, (250_000 / 300_000) * 100, 1e-9);
    const bad = evaluateMortgage({ ...MORTGAGE_DEFAULTS, mode: 'price', deposit: '300,000' });
    assert.equal(bad.result, null);
    assert.ok(bad.depositTooBig);
  });
  test('a fee is part of the cost either way; added to the loan it is borrowed, and costs interest', () => {
    const paid = evaluateMortgage({ ...MORTGAGE_DEFAULTS, fee: '1,499' }).result;
    const added = evaluateMortgage({ ...MORTGAGE_DEFAULTS, fee: '1,499', feeAdded: 'yes' }).result;
    close(paid.totalCost, paid.totalInterest + 1499);
    close(paid.totalPaid, 250_000 + paid.totalInterest + 1499, 0.01);
    assert.equal(added.principal, 251_499);
    assert.ok(added.payment > paid.payment);
    close(added.totalPaid, 251_499 + added.totalInterest, 0.01);
  });
  test('interest-only: the payment is the interest, and the loan is still owed at the end', () => {
    const { result: r } = evaluateMortgage({ ...MORTGAGE_DEFAULTS, type: 'interest-only' });
    close(r.payment, 937.5);
    assert.equal(r.schedule, null);
    assert.equal(r.stillOwedAtEnd, 250_000);
    close(r.totalPaid, r.totalInterest + 250_000, 1e-6);
  });
  test('over a comparison period: interest and fee, and what is still owed', () => {
    const { result: r } = evaluateMortgage({ ...MORTGAGE_DEFAULTS, fee: '1,000' }, 60);
    const rows = r.schedule.rows.slice(0, 60);
    close(r.period.interest, rows.reduce((s, x) => s + x.interest, 0), 1e-6);
    close(r.period.cost, r.period.interest + 1000, 1e-6);
    close(r.period.balance, rows[59].balance, 1e-6);
    const io = evaluateMortgage({ ...MORTGAGE_DEFAULTS, type: 'interest-only' }, 60).result;
    close(io.period.interest, io.payment * 60, 1e-6);
    assert.equal(io.period.balance, 250_000);
  });
  test('a period longer than the term is the whole term', () => {
    const { result: r } = evaluateMortgage({ ...MORTGAGE_DEFAULTS, years: '2' }, 120);
    assert.equal(r.period.months, 24);
    assert.equal(r.period.balance, 0);
  });
  test('the rate table has the current rate in it', () => {
    const { result: r } = evaluateMortgage(MORTGAGE_DEFAULTS);
    assert.deepEqual(r.rateTable.map((x) => x.rate), [3.5, 4.5, 5.5, 6.5]);
  });
});

describe('overpayment', () => {
  test('matches the numbers the calculator has always given', () => {
    const { result: r } = evaluateOverpayment({ ...OVERPAYMENT_DEFAULTS, rate: '5' });
    assert.equal(r.baseline.months, 300);
    assert.equal(r.withOver.months, 226);
    close(r.interestSaved, 41_843, 1);
    assert.equal(r.monthsSaved, 74);
    close(r.firstYear, 2_400);
    close(r.limit, 20_000);
    assert.equal(r.compare[r.compareIndex].extra, 200);
    assert.equal(r.nothing, false);
  });
  test('no overpayment or lump sum saves nothing and says so', () => {
    const { result: r } = evaluateOverpayment({ ...OVERPAYMENT_DEFAULTS, extra: '0' });
    assert.equal(r.nothing, true);
    assert.equal(r.monthsSaved, 0);
  });
});

describe('stamp duty, borrowing and loans', () => {
  test('stamp duty: the same price in each part of the UK, and the non-UK surcharge only in England', () => {
    const r = evaluateStampDuty({ ...STAMP_DUTY_DEFAULTS, nonUk: 'yes' }).result;
    assert.equal(r.sd.tax, 11_000);
    assert.deepEqual(r.elsewhere.map((e) => e.tax), [11_000, 4_600, 4_500]);
    assert.equal(evaluateStampDuty({ ...STAMP_DUTY_DEFAULTS, region: 'wales', nonUk: 'yes' }).nonUk, false);
  });
  test('an unknown region or buyer falls back to the usual', () => {
    const e = evaluateStampDuty({ ...STAMP_DUTY_DEFAULTS, region: 'mars', buyer: 'x' });
    assert.equal(e.region, 'england');
    assert.equal(e.buyer, 'standard');
  });
  test('borrowing: joint income times the multiple', () => {
    const { result: r, multiple } = evaluateBorrow({ ...BORROW_DEFAULTS, incomeB: '30,000', multiple: '5' });
    assert.equal(multiple, 5);
    assert.equal(r.borrowing, 375_000);
  });
  test('a loan with an early repayment counts it in its months and cost', () => {
    const plain = evaluateLoan({ ...LOAN_DEFAULTS, early: 'none' }).result;
    const over = evaluateLoan(LOAN_DEFAULTS).result;
    assert.equal(plain.months, 60);
    assert.ok(over.months < 60);
    assert.ok(over.totalCost < plain.totalCost);
    assert.equal(over.payment, plain.payment);
  });
  test('an arrangement fee is a cost either way; added, it is borrowed too', () => {
    const none = evaluateLoan({ ...LOAN_DEFAULTS, early: 'none' }).result;
    const paid = evaluateLoan({ ...LOAN_DEFAULTS, early: 'none', fee: '250' }).result;
    const added = evaluateLoan({ ...LOAN_DEFAULTS, early: 'none', fee: '250', feeAdded: 'yes' }).result;
    close(paid.totalCost, none.totalCost + 250);
    close(paid.totalPaid, none.totalPaid + 250);
    assert.equal(added.principal, 10_250);
    assert.ok(added.totalCost > paid.totalCost);
    close(added.totalPaid, 10_250 + added.totalInterest, 0.01);
  });
  test('settling early: months are the settling month, and the fee is in the cost', () => {
    const r = evaluateLoan({ ...LOAN_DEFAULTS, early: 'settle' }).result;
    assert.equal(r.months, 24);
    assert.ok(r.early.fee > 0);
    close(r.totalCost, r.totalInterest + r.early.fee, 1e-9);
    const base = buildSchedule({ principal: 10_000, monthlyRate: Math.pow(1.099, 1 / 12) - 1, termMonths: 60 });
    close(r.payment, base.payment, 1e-9);
  });
});
