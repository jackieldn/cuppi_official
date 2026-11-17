// "How much could I borrow?" A rule of thumb, not an offer: lenders mostly multiply income by a figure
// between about four and five and a half, then test the payments against spending and a higher rate.
//
// Pure functions. Imports use the .ts extension so the unit tests can load them from Node.

import { INCOME_MULTIPLES } from './rates.ts';
import { monthlyRateFromNominal, paymentFor } from './amortise.ts';

export type BorrowInput = {
  /** Yearly pay before tax. */
  incomeA: number;
  /** A second applicant's yearly pay before tax (0 for none). */
  incomeB: number;
  /** How many times income the lender would lend. */
  multiple: number;
  deposit: number;
  /** The yearly interest rate on the mortgage, in per cent. */
  ratePct: number;
  termYears: number;
  /** What is paid out each month on loans, cards and the like. */
  monthlyDebts: number;
};

export type BorrowScenario = {
  multiple: number;
  borrowing: number;
  /** What the borrowing plus the deposit buys. */
  maxPrice: number;
  /** The loan as a share of that price, in per cent. */
  ltv: number;
  monthlyPayment: number;
};

export type BorrowResult = BorrowScenario & {
  combinedIncome: number;
  /** The mortgage payment as a share of monthly pay before tax, in per cent. */
  paymentShare: number;
  /** The same with the monthly debts added. */
  paymentAndDebtsShare: number;
  /** The usual range of multiples, lowest to highest, each worked out the same way. */
  scenarios: BorrowScenario[];
};

function scenario(income: number, multiple: number, input: BorrowInput): BorrowScenario {
  const borrowing = Math.max(0, income * multiple);
  const maxPrice = borrowing + Math.max(0, input.deposit);
  const monthlyPayment = paymentFor(borrowing, monthlyRateFromNominal(input.ratePct), Math.round(input.termYears * 12));
  return { multiple, borrowing, maxPrice, ltv: maxPrice > 0 ? (borrowing / maxPrice) * 100 : 0, monthlyPayment };
}

export function estimateBorrowing(input: BorrowInput): BorrowResult {
  const combinedIncome = Math.max(0, input.incomeA || 0) + Math.max(0, input.incomeB || 0);
  const main = scenario(combinedIncome, input.multiple, input);
  const monthlyIncome = combinedIncome / 12;
  return {
    ...main,
    combinedIncome,
    paymentShare: monthlyIncome > 0 ? (main.monthlyPayment / monthlyIncome) * 100 : 0,
    paymentAndDebtsShare: monthlyIncome > 0 ? ((main.monthlyPayment + Math.max(0, input.monthlyDebts || 0)) / monthlyIncome) * 100 : 0,
    scenarios: INCOME_MULTIPLES.map((m) => scenario(combinedIncome, m, input)),
  };
}
