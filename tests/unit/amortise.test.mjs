import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { paymentFor, buildSchedule, yearlySummary, totalsSplit, balanceSeries, interestOnlyPayment, monthlyRateFromNominal, monthlyRateFromApr } from '../../src/lib/tools/amortise.ts';
import { monthsToText, parseNumber, gbp } from '../../src/lib/tools/format.ts';

const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
/** How many payments of `pay` clear `balance` at monthly rate r: the closed form, worked out independently of buildSchedule. */
const monthsToClear = (balance, r, pay) => -Math.log(1 - (r * balance) / pay) / Math.log(1 + r);

describe('paymentFor', () => {
  test('£200,000 at 5% over 25 years is £1,169.18 a month', () => {
    close(paymentFor(200_000, monthlyRateFromNominal(5), 300), 1169.18);
  });
  test('£10,000 at 0% over 20 months is £500', () => {
    assert.equal(paymentFor(10_000, 0, 20), 500);
  });
  test('nothing borrowed, or no term, is no payment', () => {
    assert.equal(paymentFor(0, 0.004, 300), 0);
    assert.equal(paymentFor(1000, 0.004, 0), 0);
  });
});

describe('rates', () => {
  test('a mortgage divides its yearly rate by twelve', () => close(monthlyRateFromNominal(6), 0.005, 1e-12));
  test('an APR compounds: twelve months of it make the APR', () => close(Math.pow(1 + monthlyRateFromApr(12.68), 12) - 1, 0.1268, 1e-9));
});

describe('buildSchedule', () => {
  const base = { principal: 200_000, monthlyRate: monthlyRateFromNominal(5), termMonths: 300 };

  test('a plain repayment mortgage runs the whole term and clears to nothing', () => {
    const s = buildSchedule(base);
    assert.equal(s.months, 300);
    assert.equal(s.rows.at(-1).balance, 0);
    close(s.payment, 1169.18);
    close(s.totalInterest, 150_754.45, 0.5);
  });

  test('everything paid is the debt plus the interest', () => {
    const s = buildSchedule({ ...base, monthlyOverpayment: 150, lumpSum: { amount: 8_000, afterMonth: 24 } });
    close(s.totalPaid, 200_000 + s.totalInterest, 0.01);
  });

  test('every month, interest + principal repaid = the payment, and the balance falls by principal and overpayment', () => {
    const s = buildSchedule({ ...base, monthlyOverpayment: 100 });
    let balance = 200_000;
    for (const r of s.rows) {
      close(r.interest + r.principal, r.payment, 1e-6);
      close(balance - r.principal - r.overpayment, r.balance, 1e-6);
      balance = r.balance;
    }
  });

  test('a monthly overpayment ends the loan when the closed-form says it should', () => {
    const extra = 200;
    const s = buildSchedule({ ...base, monthlyOverpayment: extra });
    const n = monthsToClear(200_000, base.monthlyRate, paymentFor(200_000, base.monthlyRate, 300) + extra);
    assert.equal(s.months, Math.ceil(n));
    assert.ok(s.months < 300);
    // and it is cheaper than not overpaying
    assert.ok(s.totalInterest < buildSchedule(base).totalInterest);
  });

  test('a lump sum straight away is the same as borrowing less on the same payment', () => {
    const s = buildSchedule({ ...base, lumpSum: { amount: 50_000, afterMonth: 0 } });
    const pay = paymentFor(200_000, base.monthlyRate, 300);
    assert.equal(s.months, Math.ceil(monthsToClear(150_000, base.monthlyRate, pay)));
    assert.equal(s.upfrontLump, 50_000);
  });

  test('a lump sum later in the term lands in that month', () => {
    const s = buildSchedule({ ...base, lumpSum: { amount: 10_000, afterMonth: 12 } });
    assert.equal(s.rows[11].overpayment, 10_000);
    assert.equal(s.rows[10].overpayment, 0);
  });

  test('a lump sum bigger than the balance only clears the balance', () => {
    const s = buildSchedule({ ...base, lumpSum: { amount: 999_999, afterMonth: 6 } });
    assert.equal(s.months, 6);
    assert.equal(s.rows.at(-1).balance, 0);
  });

  test('a loan at 0% is paid in equal parts with no interest', () => {
    const s = buildSchedule({ principal: 1200, monthlyRate: 0, termMonths: 12 });
    assert.equal(s.months, 12);
    assert.equal(s.totalInterest, 0);
    close(s.totalPaid, 1200, 1e-9);
  });

  test('nothing borrowed gives an empty schedule', () => {
    const s = buildSchedule({ principal: 0, monthlyRate: 0.004, termMonths: 60 });
    assert.equal(s.months, 0);
    assert.equal(s.totalPaid, 0);
  });
});

describe('summaries', () => {
  const s = buildSchedule({ principal: 200_000, monthlyRate: monthlyRateFromNominal(5), termMonths: 300 });
  test('a year at a time: 25 rows for a 25-year term, ending at nothing owed', () => {
    const years = yearlySummary(s);
    assert.equal(years.length, 25);
    assert.equal(years.at(-1).endBalance, 0);
    close(years.reduce((t, y) => t + y.interest, 0), s.totalInterest, 1e-6);
  });
  test('the balance series starts at what was borrowed', () => {
    const series = balanceSeries(s, 200_000);
    assert.deepEqual(series[0], { month: 0, balance: 200_000 });
    assert.equal(series.length, 301);
  });
  test('each year splits into interest, scheduled debt cleared and extra, which add up to what was paid', () => {
    const o = buildSchedule({ principal: 200_000, monthlyRate: monthlyRateFromNominal(5), termMonths: 300, monthlyOverpayment: 100, lumpSum: { amount: 5_000, afterMonth: 0 } });
    const years = yearlySummary(o);
    for (const y of years) {
      close(y.interest + y.principal + y.overpayment, y.payments, 1e-6);
      close(y.principal + y.overpayment, y.paidOff, 1e-6);
    }
    assert.ok(years[0].overpayment >= 5_000 + 1_200 - 1e-6, 'the up-front lump sum is in year 1');
  });
  test('the total split adds up to everything paid, and interest matches', () => {
    const o = buildSchedule({ principal: 200_000, monthlyRate: monthlyRateFromNominal(5), termMonths: 300, monthlyOverpayment: 100, lumpSum: { amount: 5_000, afterMonth: 0 } });
    const t = totalsSplit(o);
    close(t.interest + t.principal + t.extra, o.totalPaid, 1e-6);
    close(t.principal + t.extra, 200_000, 1e-6);
    assert.ok(t.extra > 5_000);
    const plain = totalsSplit(buildSchedule({ principal: 200_000, monthlyRate: monthlyRateFromNominal(5), termMonths: 300 }));
    assert.equal(plain.extra, 0);
    close(plain.principal, 200_000, 1e-6);
  });
  test('interest-only is just the interest', () => close(interestOnlyPayment(200_000, monthlyRateFromNominal(5)), 833.33));
});

describe('format helpers', () => {
  test('parseNumber accepts commas and a pound sign and rejects the rest', () => {
    assert.equal(parseNumber('£250,000'), 250000);
    assert.equal(parseNumber('4.5'), 4.5);
    assert.equal(parseNumber('.5'), 0.5);
    for (const bad of ['', 'abc', '1.2.3', '12e3', '--1']) assert.ok(Number.isNaN(parseNumber(bad)), bad);
  });
  test('monthsToText', () => {
    assert.equal(monthsToText(303), '25 years 3 months');
    assert.equal(monthsToText(12), '1 year');
    assert.equal(monthsToText(5), '5 months');
    assert.equal(monthsToText(0), '0 months');
    assert.equal(monthsToText(NaN), '–');
  });
  test('gbp', () => {
    assert.equal(gbp(1234.5), '£1,235');
    assert.equal(gbp(1234.5, { pence: true }), '£1,234.50');
    assert.equal(gbp(NaN), '–');
  });
});
