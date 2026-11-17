import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { estimateBorrowing } from '../../src/lib/tools/borrowing.ts';
import { analyseLoan } from '../../src/lib/tools/loan.ts';
import { paymentFor, monthlyRateFromNominal } from '../../src/lib/tools/amortise.ts';

const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

describe('estimateBorrowing', () => {
  const base = { incomeA: 40_000, incomeB: 20_000, multiple: 4.5, deposit: 30_000, ratePct: 5, termYears: 25, monthlyDebts: 200 };

  test('joint income times the multiple, plus the deposit, is the most you could pay', () => {
    const r = estimateBorrowing(base);
    assert.equal(r.combinedIncome, 60_000);
    assert.equal(r.borrowing, 270_000);
    assert.equal(r.maxPrice, 300_000);
    assert.equal(r.ltv, 90);
  });
  test('the monthly payment is the ordinary repayment payment', () => {
    close(estimateBorrowing(base).monthlyPayment, paymentFor(270_000, monthlyRateFromNominal(5), 300));
  });
  test('the share of income, with and without debts', () => {
    const r = estimateBorrowing(base);
    close(r.paymentShare, (r.monthlyPayment / 5_000) * 100, 1e-9);
    close(r.paymentAndDebtsShare, ((r.monthlyPayment + 200) / 5_000) * 100, 1e-9);
  });
  test('the range runs from four to five and a half times income', () => {
    const r = estimateBorrowing(base);
    assert.deepEqual(r.scenarios.map((s) => s.multiple), [4, 4.5, 5, 5.5]);
    assert.equal(r.scenarios[0].borrowing, 240_000);
    assert.equal(r.scenarios[3].borrowing, 330_000);
  });
  test('no income gives zeros, not NaN', () => {
    const r = estimateBorrowing({ ...base, incomeA: 0, incomeB: 0 });
    assert.equal(r.borrowing, 0);
    assert.equal(r.paymentShare, 0);
    assert.equal(r.ltv, 0);
  });
});

describe('analyseLoan', () => {
  const loan = { amount: 10_000, aprPct: 9.9, termMonths: 60 };

  test('with no early repayment there is nothing to compare', () => {
    const r = analyseLoan({ ...loan, early: { kind: 'none' } });
    assert.equal(r.early, null);
    assert.equal(r.baseline.months, 60);
    close(r.baseline.totalPaid, r.payment * 60, 0.01);
  });

  test('extra each month ends the loan sooner and saves interest', () => {
    const r = analyseLoan({ ...loan, early: { kind: 'monthly', extra: 50 } });
    assert.ok(r.early.monthsSaved > 0);
    close(r.early.interestSaved, r.baseline.totalInterest - r.schedule.totalInterest, 1e-9);
    assert.equal(r.early.fee, 0);
    assert.equal(r.early.netSaving, r.early.interestSaved);
  });

  test('a lump sum saves interest', () => {
    const r = analyseLoan({ ...loan, early: { kind: 'lump', amount: 2_000, afterMonth: 12 } });
    assert.ok(r.early.interestSaved > 0);
    assert.ok(r.early.months < 60);
  });

  test('settling in full: the figure is what is owed plus the fee, and the saving is net of it', () => {
    const r = analyseLoan({ ...loan, early: { kind: 'settle', afterMonth: 24, feeMonthsOfInterest: 1 } });
    const owed = r.baseline.rows[23].balance;
    close(r.early.fee, owed * r.monthlyRate, 1e-9);
    close(r.early.settlementFigure, owed + r.early.fee, 1e-9);
    close(r.early.netSaving, r.early.interestSaved - r.early.fee, 1e-9);
    assert.equal(r.early.months, 24);
    assert.equal(r.early.monthsSaved, 36);
  });

  test('settling with no fee costs what is owed, and everything paid is the payments so far plus that', () => {
    const r = analyseLoan({ ...loan, early: { kind: 'settle', afterMonth: 30, feeMonthsOfInterest: 0 } });
    close(r.early.totalPaid, r.payment * 30 + r.baseline.rows[29].balance, 0.01);
  });

  test('settling can never be after the last payment', () => {
    const r = analyseLoan({ ...loan, early: { kind: 'settle', afterMonth: 500, feeMonthsOfInterest: 0 } });
    assert.equal(r.early.months, 59);
  });
});
