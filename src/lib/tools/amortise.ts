// The maths behind every repayment calculator: a loan that is paid off in equal monthly payments
// (an "annuity"), with the interest worked out each month on what is still owed.
//
// Pure functions with no imports from the app, so the unit tests can load them from Node.
// Money is held as plain numbers of pounds and only rounded where it is shown.

/** The money is paid off when less than this is left (half a penny). */
const PAID_OFF = 0.005;

/** A mortgage quotes its yearly rate and divides it by twelve. */
export const monthlyRateFromNominal = (annualPct: number): number => annualPct / 100 / 12;

/** A loan quotes an APR, which is the effective yearly rate, so the monthly rate is its twelfth root. */
export const monthlyRateFromApr = (aprPct: number): number => Math.pow(1 + aprPct / 100, 1 / 12) - 1;

/** The level monthly payment that clears `principal` in `months` at `monthlyRate`. */
export function paymentFor(principal: number, monthlyRate: number, months: number): number {
  if (!(principal > 0) || !(months > 0)) return 0;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

/** What an interest-only mortgage costs each month (the debt itself stays as it is). */
export const interestOnlyPayment = (principal: number, monthlyRate: number): number => Math.max(0, principal) * monthlyRate;

export type ScheduleRow = {
  /** 1 is the first payment. */
  month: number;
  /** The interest charged this month. */
  interest: number;
  /** The scheduled payment (interest plus the part that reduces the debt). */
  payment: number;
  /** The part of the scheduled payment that reduces the debt. */
  principal: number;
  /** Anything extra paid this month: the monthly overpayment and a lump sum that lands this month. */
  overpayment: number;
  /** What is still owed after this month. */
  balance: number;
};

export type Schedule = {
  rows: ScheduleRow[];
  /** How many monthly payments it takes. */
  months: number;
  /** The scheduled monthly payment at the start (what the lender asks for, before any overpayment). */
  payment: number;
  totalInterest: number;
  /** Everything paid: interest, the debt, and any lump sum. */
  totalPaid: number;
  /** A lump sum paid before the first payment (after month 0). */
  upfrontLump: number;
};

export type ScheduleInput = {
  principal: number;
  monthlyRate: number;
  termMonths: number;
  /** Paid on top of the scheduled payment every month. */
  monthlyOverpayment?: number;
  /** A one-off payment made after `afterMonth` payments (0 means straight away). */
  lumpSum?: { amount: number; afterMonth: number };
};

/**
 * Every payment, month by month. Overpayments do not change the payment the lender asks for; they
 * clear the debt faster, so the loan finishes sooner and costs less interest. (That is the usual
 * "keep the payment, shorten the term" choice.)
 */
export function buildSchedule(input: ScheduleInput): Schedule {
  const r = input.monthlyRate;
  const principal = Math.max(0, input.principal);
  const termMonths = Math.max(0, Math.round(input.termMonths));
  const extra = Math.max(0, input.monthlyOverpayment ?? 0);
  const lump = input.lumpSum && input.lumpSum.amount > 0 ? { amount: input.lumpSum.amount, at: Math.max(0, Math.floor(input.lumpSum.afterMonth)) } : null;
  const payment = paymentFor(principal, r, termMonths);

  const rows: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  let upfrontLump = 0;

  if (lump && lump.at === 0) {
    upfrontLump = Math.min(lump.amount, balance);
    balance -= upfrontLump;
    totalPaid += upfrontLump;
  }

  for (let month = 1; month <= termMonths && balance > PAID_OFF; month++) {
    const interest = balance * r;
    const owing = balance + interest;
    const scheduled = Math.min(payment, owing);
    const monthlyExtra = Math.min(extra, owing - scheduled);
    balance = owing - scheduled - monthlyExtra;

    let lumpPaid = 0;
    if (lump && lump.at === month && balance > PAID_OFF) {
      lumpPaid = Math.min(lump.amount, balance);
      balance -= lumpPaid;
    }
    if (balance < PAID_OFF) balance = 0;

    totalInterest += interest;
    totalPaid += scheduled + monthlyExtra + lumpPaid;
    rows.push({ month, interest, payment: scheduled, principal: scheduled - interest, overpayment: monthlyExtra + lumpPaid, balance });
  }

  return { rows, months: rows.length, payment, totalInterest, totalPaid, upfrontLump };
}

export type YearSummary = {
  year: number;
  interest: number;
  /** The debt cleared by the scheduled payments. */
  principal: number;
  /** Everything paid on top of the scheduled payments: monthly overpayments and lump sums (one paid before the first payment counts in year 1). */
  overpayment: number;
  /** Debt cleared in all: `principal` plus `overpayment`. */
  paidOff: number;
  /** Everything paid this year. */
  payments: number;
  endBalance: number;
};

/** The schedule a year at a time (year 1 is months 1 to 12), for the table and charts. */
export function yearlySummary(schedule: Schedule): YearSummary[] {
  const years: YearSummary[] = [];
  for (const row of schedule.rows) {
    const year = Math.ceil(row.month / 12);
    let y = years[year - 1];
    if (!y) years[year - 1] = y = { year, interest: 0, principal: 0, overpayment: 0, paidOff: 0, payments: 0, endBalance: 0 };
    y.interest += row.interest;
    y.principal += row.principal;
    y.overpayment += row.overpayment;
    y.paidOff += row.principal + row.overpayment;
    y.payments += row.payment + row.overpayment;
    y.endBalance = row.balance;
  }
  // A lump sum paid straight away is not in any month's row; it belongs to the first year.
  if (schedule.upfrontLump > 0 && years[0]) {
    years[0].overpayment += schedule.upfrontLump;
    years[0].paidOff += schedule.upfrontLump;
    years[0].payments += schedule.upfrontLump;
  }
  return years;
}

/** Where all the money goes, in total: interest, the debt cleared by the scheduled payments, and anything extra. */
export function totalsSplit(schedule: Schedule): { interest: number; principal: number; extra: number; total: number } {
  const interest = schedule.totalInterest;
  const extra = schedule.rows.reduce((s, r) => s + r.overpayment, 0) + schedule.upfrontLump;
  const total = schedule.totalPaid;
  return { interest, extra, principal: Math.max(0, total - interest - extra), total };
}

/** The debt after each month, starting from what was borrowed at month 0. */
export function balanceSeries(schedule: Schedule, principal: number): { month: number; balance: number }[] {
  return [{ month: 0, balance: Math.max(0, principal) - schedule.upfrontLump }, ...schedule.rows.map((r) => ({ month: r.month, balance: r.balance }))];
}
