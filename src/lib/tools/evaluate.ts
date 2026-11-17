// Each calculator's boxes -> its answer, in one place. A calculator holds up to five scenarios (each its own set of
// boxes), so working an answer out is a function of one scenario's boxes: the selected scenario's answer is shown in
// full, and every scenario's answer goes into the comparison. Each function returns what was wrong with the boxes (the
// message for each, and a list of all of them) or the answer.
//
// Pure functions. Imports use the .ts extension so the unit tests can load them from Node.

import { buildSchedule, interestOnlyPayment, monthlyRateFromNominal, paymentFor, type Schedule } from './amortise.ts';
import { estimateBorrowing, type BorrowResult } from './borrowing.ts';
import { analyseLoan, type EarlyOutcome, type EarlyRepayment, type LoanResult } from './loan.ts';
import { INCOME_MULTIPLES, PROPERTY_TAX, type Region } from './rates.ts';
import { calculateStampDuty, type BuyerType, type StampDutyResult } from './stamp-duty.ts';
import { problemsOf, readNumber, type Read } from './validate.ts';

const orZero = (text: string) => (text.trim() === '' ? '0' : text);

// ---------------------------------------------------------------- mortgage

export const MORTGAGE_DEFAULTS = { mode: 'amount', amount: '250,000', price: '300,000', deposit: '50,000', rate: '4.5', years: '25', type: 'repayment', fee: '0', feeAdded: 'no' };
export type MortgageFields = Record<keyof typeof MORTGAGE_DEFAULTS, string>;

export type MortgageResult = {
  /** What the home is borrowed against: the amount, or the price less the deposit. */
  loan: number;
  /** What is borrowed in all: the loan, plus the fee if it is added to it. */
  principal: number;
  months: number;
  interestOnly: boolean;
  /** The monthly payment (the interest, for interest-only). */
  payment: number;
  totalInterest: number;
  fee: number;
  /** The cost of borrowing: interest plus the fee. */
  totalCost: number;
  /** Everything paid, fee included (and, for interest-only, the loan itself at the end). */
  totalPaid: number;
  /** For interest-only, what is still owed at the end. */
  stillOwedAtEnd: number;
  /** The loan as a share of the price, when a price was given. */
  ltv: number | null;
  /** Null for interest-only. */
  schedule: Schedule | null;
  rateTable: { rate: number; payment: number }[];
  /** Over the first `periodMonths` months, for comparing deals: the interest, interest plus fee, and what is still owed. */
  period: { months: number; interest: number; cost: number; balance: number } | null;
};

/** `periodMonths`: how many months to work out the "cost over the first so many years" for (0: leave it out). */
export function evaluateMortgage(v: MortgageFields, periodMonths = 0) {
  const byPrice = v.mode === 'price';
  const reads = {
    amount: readNumber(v.amount, { label: 'the mortgage amount', min: 1, max: 10_000_000 }),
    price: readNumber(v.price, { label: 'the property price', min: 1, max: 20_000_000 }),
    deposit: readNumber(v.deposit, { label: 'the deposit', min: 0, max: 20_000_000 }),
    rate: readNumber(v.rate, { label: 'the interest rate', min: 0, max: 25 }),
    years: readNumber(v.years, { label: 'the term in years', min: 1, max: 40 }),
    fee: readNumber(orZero(v.fee), { label: 'the fee', min: 0, max: 1_000_000 }),
  };
  const depositTooBig = byPrice && Number.isFinite(reads.price.value) && Number.isFinite(reads.deposit.value) && reads.deposit.value >= reads.price.value;
  const problems = problemsOf(byPrice ? reads.price : reads.amount, byPrice ? reads.deposit : null, reads.rate, reads.years, reads.fee, depositTooBig ? { value: NaN, error: 'The deposit needs to be less than the price.' } : null);
  const loan = byPrice ? reads.price.value - reads.deposit.value : reads.amount.value;
  if (problems.length || !(loan > 0)) return { reads, problems, depositTooBig, result: null as MortgageResult | null };

  const interestOnly = v.type === 'interest-only';
  const fee = reads.fee.value;
  const feeAdded = v.feeAdded === 'yes';
  const principal = loan + (feeAdded ? fee : 0);
  const months = Math.round(reads.years.value * 12);
  const r = monthlyRateFromNominal(reads.rate.value);
  const schedule = interestOnly ? null : buildSchedule({ principal, monthlyRate: r, termMonths: months });
  const payment = interestOnly ? interestOnlyPayment(principal, r) : schedule!.payment;
  const totalInterest = interestOnly ? payment * months : schedule!.totalInterest;
  const rates = [...new Set([Math.max(0, reads.rate.value - 1), reads.rate.value, reads.rate.value + 1, reads.rate.value + 2].map((x) => +x.toFixed(4)))].sort((a, b) => a - b);

  let period: MortgageResult['period'] = null;
  if (periodMonths > 0) {
    const h = Math.min(periodMonths, interestOnly ? months : schedule!.months);
    const interest = interestOnly ? payment * h : schedule!.rows.slice(0, h).reduce((s, x) => s + x.interest, 0);
    const balance = interestOnly ? principal : h >= schedule!.months ? 0 : schedule!.rows[h - 1].balance;
    period = { months: h, interest, cost: interest + fee, balance };
  }

  return {
    reads,
    problems,
    depositTooBig,
    result: {
      loan,
      principal,
      months,
      interestOnly,
      payment,
      totalInterest,
      fee,
      totalCost: totalInterest + fee,
      totalPaid: totalInterest + (interestOnly ? principal : (schedule!.totalPaid - totalInterest)) + (feeAdded ? 0 : fee),
      stillOwedAtEnd: interestOnly ? principal : 0,
      ltv: byPrice && reads.price.value > 0 ? (loan / reads.price.value) * 100 : null,
      schedule,
      rateTable: rates.map((x) => ({ rate: x, payment: interestOnly ? interestOnlyPayment(principal, monthlyRateFromNominal(x)) : paymentFor(principal, monthlyRateFromNominal(x), months) })),
      period,
    } as MortgageResult | null,
  };
}

// ------------------------------------------------------------ overpayment

export const OVERPAYMENT_DEFAULTS = { balance: '200,000', rate: '4.5', years: '25', months: '0', extra: '200', lump: '0', lumpAfter: '12', allowance: '10' };
export type OverpaymentFields = Record<keyof typeof OVERPAYMENT_DEFAULTS, string>;
export const OVERPAYMENT_COMPARE = [0, 50, 100, 250, 500];

export type OverpaymentResult = {
  /** What is owed today. */
  balance: number;
  baseline: Schedule;
  withOver: Schedule;
  interestSaved: number;
  monthsSaved: number;
  /** What would be overpaid in the first year, and the most the allowance lets through. */
  firstYear: number;
  limit: number;
  compare: { extra: number; months: number; saved: number; interestSaved: number }[];
  compareIndex: number;
  nothing: boolean;
};

export function evaluateOverpayment(v: OverpaymentFields) {
  const reads = {
    balance: readNumber(v.balance, { label: 'what you still owe', min: 1, max: 10_000_000 }),
    rate: readNumber(v.rate, { label: 'the interest rate', min: 0, max: 25 }),
    years: readNumber(v.years, { label: 'the years left', min: 0, max: 40, integer: true }),
    months: readNumber(v.months, { label: 'the months left', min: 0, max: 11, integer: true }),
    extra: readNumber(v.extra, { label: 'the monthly overpayment', min: 0, max: 1_000_000 }),
    lump: readNumber(v.lump, { label: 'the lump sum', min: 0, max: 10_000_000 }),
    lumpAfter: readNumber(v.lumpAfter, { label: 'the month for the lump sum', min: 0, max: 480, integer: true }),
    allowance: readNumber(v.allowance, { label: 'the yearly allowance', min: 0, max: 100 }),
  };
  const termMonths = reads.years.value * 12 + reads.months.value;
  const noTerm = Number.isFinite(termMonths) && termMonths < 1;
  const problems = problemsOf(reads.balance, reads.rate, reads.years, reads.months, reads.extra, reads.lump, reads.lump.value > 0 ? reads.lumpAfter : null, reads.allowance, noTerm ? { value: NaN, error: 'There needs to be at least a month left.' } : null);
  if (problems.length) return { reads, problems, result: null as OverpaymentResult | null };

  const r = monthlyRateFromNominal(reads.rate.value);
  const base = { principal: reads.balance.value, monthlyRate: r, termMonths };
  const lumpSum = reads.lump.value > 0 ? { amount: reads.lump.value, afterMonth: reads.lumpAfter.value } : undefined;
  const baseline = buildSchedule(base);
  const withOver = buildSchedule({ ...base, monthlyOverpayment: reads.extra.value, lumpSum });
  const firstYear = withOver.upfrontLump + withOver.rows.slice(0, 12).reduce((s, row) => s + row.overpayment, 0);
  const amounts = OVERPAYMENT_COMPARE.includes(reads.extra.value) ? OVERPAYMENT_COMPARE : [...OVERPAYMENT_COMPARE, reads.extra.value].sort((a, b) => a - b);
  const compare = amounts.map((x) => {
    const s = buildSchedule({ ...base, monthlyOverpayment: x });
    return { extra: x, months: s.months, saved: baseline.months - s.months, interestSaved: baseline.totalInterest - s.totalInterest };
  });
  return {
    reads,
    problems,
    result: {
      balance: reads.balance.value,
      baseline,
      withOver,
      interestSaved: baseline.totalInterest - withOver.totalInterest,
      monthsSaved: baseline.months - withOver.months,
      firstYear,
      limit: (reads.balance.value * reads.allowance.value) / 100,
      compare,
      compareIndex: amounts.indexOf(reads.extra.value),
      nothing: reads.extra.value === 0 && !(reads.lump.value > 0),
    } as OverpaymentResult | null,
  };
}

// ------------------------------------------------------------ stamp duty

export const STAMP_DUTY_DEFAULTS = { price: '300,000', region: 'england', buyer: 'standard', nonUk: 'no' };
export type StampDutyFields = Record<keyof typeof STAMP_DUTY_DEFAULTS, string>;
export const REGIONS: Region[] = ['england', 'scotland', 'wales'];

export type StampDutyAnswer = {
  region: Region;
  buyer: BuyerType;
  nonUk: boolean;
  price: number;
  sd: StampDutyResult;
  elsewhere: { region: Region; tax: number }[];
};

export function evaluateStampDuty(v: StampDutyFields) {
  const region = (REGIONS.includes(v.region as Region) ? v.region : 'england') as Region;
  const buyer = (['standard', 'first-time', 'additional'].includes(v.buyer) ? v.buyer : 'standard') as BuyerType;
  const nonUk = region === 'england' && v.nonUk === 'yes';
  const reads = { price: readNumber(v.price, { label: 'the property price', min: 1, max: 100_000_000 }) };
  const problems = problemsOf(reads.price);
  if (problems.length) return { reads, problems, region, buyer, nonUk, result: null as StampDutyAnswer | null };
  const price = reads.price.value;
  return {
    reads,
    problems,
    region,
    buyer,
    nonUk,
    result: {
      region,
      buyer,
      nonUk,
      price,
      sd: calculateStampDuty({ price, region, buyer, nonUkResident: nonUk }),
      elsewhere: REGIONS.map((r) => ({ region: r, tax: calculateStampDuty({ price, region: r, buyer, nonUkResident: r === 'england' && nonUk }).tax })),
    } as StampDutyAnswer | null,
  };
}

export const taxShort = (region: Region): string => PROPERTY_TAX[region].short;

// ------------------------------------------------------------ how much can I borrow

export const BORROW_DEFAULTS = { incomeA: '45,000', incomeB: '0', deposit: '30,000', multiple: '4.5', rate: '4.5', years: '25', debts: '0' };
export type BorrowFields = Record<keyof typeof BORROW_DEFAULTS, string>;

export function evaluateBorrow(v: BorrowFields) {
  const reads = {
    incomeA: readNumber(v.incomeA, { label: 'your yearly income', min: 1, max: 10_000_000 }),
    incomeB: readNumber(v.incomeB, { label: 'the second income', min: 0, max: 10_000_000 }),
    deposit: readNumber(v.deposit, { label: 'the deposit', min: 0, max: 20_000_000 }),
    rate: readNumber(v.rate, { label: 'the interest rate', min: 0, max: 25 }),
    years: readNumber(v.years, { label: 'the term in years', min: 1, max: 40 }),
    debts: readNumber(v.debts, { label: 'the monthly debts', min: 0, max: 1_000_000 }),
  };
  const multiple = INCOME_MULTIPLES.find((m) => String(m) === v.multiple) ?? 4.5;
  const problems = problemsOf(reads.incomeA, reads.incomeB, reads.deposit, reads.rate, reads.years, reads.debts);
  if (problems.length) return { reads, problems, multiple, result: null as BorrowResult | null };
  return {
    reads,
    problems,
    multiple,
    result: estimateBorrowing({ incomeA: reads.incomeA.value, incomeB: reads.incomeB.value, multiple, deposit: reads.deposit.value, ratePct: reads.rate.value, termYears: reads.years.value, monthlyDebts: reads.debts.value }) as BorrowResult | null,
  };
}

// ------------------------------------------------------------ loan

export const LOAN_DEFAULTS = { amount: '10,000', apr: '9.9', term: '5', unit: 'years', fee: '0', feeAdded: 'no', early: 'monthly', extra: '50', lump: '2,000', lumpAfter: '12', settleAfter: '24', settleFee: '1' };
export type LoanFields = Record<keyof typeof LOAN_DEFAULTS, string>;
export type EarlyKind = 'none' | 'monthly' | 'lump' | 'settle';

export type LoanAnswer = {
  result: LoanResult;
  early: EarlyOutcome | null;
  /** The loan asked for. */
  amount: number;
  /** The amount borrowed in all: the loan, plus the arrangement fee if it is added to it. */
  principal: number;
  arrangementFee: number;
  /** As the loan will really go, with any early repayment: how many payments, the interest, and everything paid (arrangement and settlement fees included). */
  months: number;
  totalInterest: number;
  /** The cost of borrowing: interest plus every fee. */
  totalCost: number;
  totalPaid: number;
  /** The scheduled monthly payment. */
  payment: number;
};

export function evaluateLoan(v: LoanFields) {
  const early = (['none', 'monthly', 'lump', 'settle'].includes(v.early) ? v.early : 'none') as EarlyKind;
  const inYears = v.unit !== 'months';
  const reads = {
    amount: readNumber(v.amount, { label: 'the loan amount', min: 1, max: 1_000_000 }),
    apr: readNumber(v.apr, { label: 'the APR', min: 0, max: 100 }),
    term: readNumber(v.term, { label: 'the term', min: inYears ? 0.25 : 3, max: inYears ? 40 : 480 }),
    fee: readNumber(orZero(v.fee), { label: 'the arrangement fee', min: 0, max: 100_000 }),
    extra: readNumber(v.extra, { label: 'the extra each month', min: 0, max: 1_000_000 }),
    lump: readNumber(v.lump, { label: 'the lump sum', min: 0, max: 1_000_000 }),
    lumpAfter: readNumber(v.lumpAfter, { label: 'the month for the lump sum', min: 0, max: 480, integer: true }),
    settleAfter: readNumber(v.settleAfter, { label: 'the month you settle', min: 1, max: 480, integer: true }),
    settleFee: readNumber(v.settleFee, { label: 'the settlement fee', min: 0, max: 24 }),
  };
  const problems = problemsOf(reads.amount, reads.apr, reads.term, reads.fee, early === 'monthly' ? reads.extra : null, early === 'lump' ? reads.lump : null, early === 'lump' ? reads.lumpAfter : null, early === 'settle' ? reads.settleAfter : null, early === 'settle' ? reads.settleFee : null);
  if (problems.length) return { reads, problems, early, inYears, result: null as LoanAnswer | null };

  const arrangementFee = reads.fee.value;
  const principal = reads.amount.value + (v.feeAdded === 'yes' ? arrangementFee : 0);
  const termMonths = Math.round(inYears ? reads.term.value * 12 : reads.term.value);
  const choice: EarlyRepayment =
    early === 'monthly' ? { kind: 'monthly', extra: reads.extra.value } : early === 'lump' ? { kind: 'lump', amount: reads.lump.value, afterMonth: reads.lumpAfter.value } : early === 'settle' ? { kind: 'settle', afterMonth: reads.settleAfter.value, feeMonthsOfInterest: reads.settleFee.value } : { kind: 'none' };
  const result = analyseLoan({ amount: principal, aprPct: reads.apr.value, termMonths, early: choice });
  const e = result.early;
  const months = e ? e.months : result.baseline.months;
  const totalInterest = e ? e.totalInterest : result.baseline.totalInterest;
  const settleFee = e?.kind === 'settle' ? e.fee : 0;
  const paid = e?.kind === 'settle' ? e.totalPaid : (e ? e.totalPaid : result.baseline.totalPaid);
  return {
    reads,
    problems,
    early,
    inYears,
    result: { result, early: e, amount: reads.amount.value, principal, arrangementFee, months, totalInterest, totalCost: totalInterest + settleFee + arrangementFee, totalPaid: paid + (v.feeAdded === 'yes' ? 0 : arrangementFee), payment: result.payment } as LoanAnswer | null,
  };
}

export type { Read };
