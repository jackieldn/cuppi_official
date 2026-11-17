import type { ComponentType } from 'react';
import { HowMuchCanIBorrow } from './how-much-can-i-borrow';
import { LoanRepaymentCalculator } from './loan-repayment-calculator';
import { MortgageCalculator } from './mortgage-calculator';
import { MortgageOverpaymentCalculator } from './mortgage-overpayment-calculator';
import { StampDutyCalculator } from './stamp-duty-calculator';

/** The calculator for each tool in lib/tools/registry.ts, by slug. A tool with no entry here has no page. */
export const CALCULATORS: Record<string, ComponentType> = {
  'mortgage-calculator': MortgageCalculator,
  'mortgage-overpayment-calculator': MortgageOverpaymentCalculator,
  'stamp-duty-calculator': StampDutyCalculator,
  'how-much-can-i-borrow': HowMuchCanIBorrow,
  'loan-repayment-calculator': LoanRepaymentCalculator,
};
