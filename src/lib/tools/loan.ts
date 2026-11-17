// A personal or car loan, and what paying it off early does. A loan quotes an APR (the effective yearly
// rate), so the monthly rate is worked out from that. Repaying early either shortens the loan (extra each
// month, or a lump sum) or ends it (settling in full, which usually carries a fee).
//
// Pure functions. Imports use the .ts extension so the unit tests can load them from Node.

import { buildSchedule, monthlyRateFromApr, type Schedule } from './amortise.ts';

export type EarlyRepayment =
  | { kind: 'none' }
  | { kind: 'monthly'; extra: number }
  | { kind: 'lump'; amount: number; afterMonth: number }
  /** Settle everything after `afterMonth` payments, paying a fee of `feeMonthsOfInterest` months of interest on what is left. */
  | { kind: 'settle'; afterMonth: number; feeMonthsOfInterest: number };

export type LoanInput = {
  amount: number;
  aprPct: number;
  termMonths: number;
  early: EarlyRepayment;
};

export type EarlyOutcome = {
  kind: 'monthly' | 'lump' | 'settle';
  /** How many payments it takes now. */
  months: number;
  monthsSaved: number;
  /** Interest paid in all (not counting any fee). */
  totalInterest: number;
  interestSaved: number;
  /** A fee for settling early (0 for the other kinds). */
  fee: number;
  /** What is saved once the fee is taken off. */
  netSaving: number;
  /** Everything paid in all, fee included. */
  totalPaid: number;
  /** For settling: what has to be paid on the day to clear the loan (what is owed, plus the fee). */
  settlementFigure: number | null;
};

export type LoanResult = {
  monthlyRate: number;
  payment: number;
  baseline: Schedule;
  /** The schedule once any monthly or lump-sum repayment is in. Equal to the baseline for none or settling. */
  schedule: Schedule;
  early: EarlyOutcome | null;
};

export function analyseLoan(input: LoanInput): LoanResult {
  const monthlyRate = monthlyRateFromApr(input.aprPct);
  const base = { principal: input.amount, monthlyRate, termMonths: input.termMonths };
  const baseline = buildSchedule(base);
  const { early } = input;

  if (early.kind === 'monthly' || early.kind === 'lump') {
    const schedule = buildSchedule(
      early.kind === 'monthly' ? { ...base, monthlyOverpayment: early.extra } : { ...base, lumpSum: { amount: early.amount, afterMonth: early.afterMonth } },
    );
    return {
      monthlyRate,
      payment: baseline.payment,
      baseline,
      schedule,
      early: {
        kind: early.kind,
        months: schedule.months,
        monthsSaved: baseline.months - schedule.months,
        totalInterest: schedule.totalInterest,
        interestSaved: baseline.totalInterest - schedule.totalInterest,
        fee: 0,
        netSaving: baseline.totalInterest - schedule.totalInterest,
        totalPaid: schedule.totalPaid,
        settlementFigure: null,
      },
    };
  }

  if (early.kind === 'settle' && baseline.months > 1) {
    // Settling after the last payment is not early, so the latest it can happen is one payment before the end.
    const after = Math.min(Math.max(0, Math.floor(early.afterMonth)), baseline.months - 1);
    const owed = after === 0 ? input.amount : baseline.rows[after - 1].balance;
    const interestSoFar = baseline.rows.slice(0, after).reduce((s, r) => s + r.interest, 0);
    const paidSoFar = baseline.rows.slice(0, after).reduce((s, r) => s + r.payment, 0);
    const fee = Math.max(0, early.feeMonthsOfInterest) * owed * monthlyRate;
    return {
      monthlyRate,
      payment: baseline.payment,
      baseline,
      schedule: baseline,
      early: {
        kind: 'settle',
        months: after,
        monthsSaved: baseline.months - after,
        totalInterest: interestSoFar,
        interestSaved: baseline.totalInterest - interestSoFar,
        fee,
        netSaving: baseline.totalInterest - interestSoFar - fee,
        totalPaid: paidSoFar + owed + fee,
        settlementFigure: owed + fee,
      },
    };
  }

  return { monthlyRate, payment: baseline.payment, baseline, schedule: baseline, early: null };
}
