// The words on each tool's page, under the calculator: what it does, how it works, what it leaves out, a worked
// example, and the questions people ask. Written once here as typed data. The worked examples are not typed out:
// they are worked out by the same functions as the calculators, so the page can never disagree with its own tool.
//
// Imports use the .ts extension so the unit tests can load this from Node.

import { buildSchedule, interestOnlyPayment, monthlyRateFromNominal, paymentFor } from './amortise.ts';
import { estimateBorrowing } from './borrowing.ts';
import { gbp, monthsToText, share } from './format.ts';
import { analyseLoan } from './loan.ts';
import { calculateStampDuty } from './stamp-duty.ts';

export type ToolContent = {
  /** The page's H1. */
  heading: string;
  intro: string;
  /** "How it works": a paragraph each. */
  how: string[];
  /** "What it does not include": a line each. */
  limits: string[];
  /** A worked example with real numbers, from the same maths. */
  example: () => { heading: string; body: string[] };
  faqs: { q: string; a: string }[];
  /** Other tools worth a look, by slug. */
  related: string[];
  /** The Cuppi feature this tool leads to (its slug on /features), and the words that lead there. */
  cuppi: { feature: string; title: string; body: string };
};

export const TOOL_CONTENT: Record<string, ToolContent> = {
  'mortgage-calculator': {
    heading: 'Mortgage calculator',
    intro: 'Enter what you want to borrow, the interest rate and how long you want to take, and see your monthly payment, the interest you would pay in all, and what happens to the payment if rates move.',
    how: [
      'On a repayment mortgage you pay a level amount each month. At first most of it is interest; as the debt falls, more of it goes towards the debt itself, until you owe nothing at the end of the term. Each month the interest is worked out on what you still owe, at your yearly rate divided by twelve.',
      'On an interest-only mortgage you pay only the interest, so the payment is lower, but you still owe everything you borrowed at the end. You would need a separate plan to pay that off.',
      'The Stress-test view shows your payment if your rate were a little lower or higher, which is handy when a fixed deal is about to end.',
      'Open Advanced to choose a 2-year or 5-year fixed deal and the rate you expect it to move to afterwards. The calculator then shows the payment when the fix ends and a more realistic cost over the whole term.',
      'Comparing deals? Press “Compare with another deal” above the boxes. Each new deal starts as a copy of the one you are on, so change only what differs, such as the rate or the fee. You can compare up to five side by side, with the cost over the first few years of each deal.',
    ],
    limits: [
      'Fees (arrangement, valuation, legal) are not included. Add them to the amount if you are borrowing them.',
      'The rate is held the same for the whole term. In practice most mortgages have a fixed or discounted rate for a few years, then change.',
      'It does not check whether a lender would offer you the mortgage. See “How much can I borrow?” for a rough idea of that.',
    ],
    example: () => {
      const r = monthlyRateFromNominal(4.5);
      const s = buildSchedule({ principal: 250_000, monthlyRate: r, termMonths: 300 });
      const higher = paymentFor(250_000, monthlyRateFromNominal(5.5), 300);
      return {
        heading: '£250,000 over 25 years at 4.5%',
        body: [
          `The monthly payment is ${gbp(s.payment, { pence: true })}. Over the 25 years you would pay ${gbp(s.totalInterest)} in interest, ${gbp(s.totalPaid)} in all.`,
          `If the rate were 5.5% instead, the payment would be ${gbp(higher, { pence: true })}, which is ${gbp(higher - s.payment, { pence: true })} more every month.`,
          `Interest-only at 4.5% would be ${gbp(interestOnlyPayment(250_000, r), { pence: true })} a month, with the full £250,000 still owed at the end.`,
        ],
      };
    },
    faqs: [
      { q: 'How is a monthly mortgage payment worked out?', a: 'The yearly rate is divided by twelve to give a monthly rate. The payment is then the one level amount that, with interest added each month on what is still owed, brings the debt to nothing at the end of the term. This calculator uses that standard method.' },
      { q: 'What is the difference between repayment and interest-only?', a: 'With a repayment mortgage, each payment covers the interest and some of the debt, so you owe nothing at the end. With interest-only, you pay just the interest and still owe the whole amount at the end of the term, so you need another way to repay it.' },
      { q: 'How much deposit do I need?', a: 'It depends on the lender. Many offer mortgages from a 5% deposit, and the rates they charge are usually better the bigger your deposit is as a share of the price. The “price and deposit” option shows your loan-to-value, the loan as a share of the price.' },
      { q: 'What happens when my fixed rate ends?', a: 'Most people are moved to their lender’s standard variable rate unless they choose a new deal first, and that rate is often higher. Use the rate table to see what your payment could be, and look at your options a few months before the end.' },
      { q: 'Does this include fees or insurance?', a: 'No. It covers the loan itself: the debt, the interest and the term. Fees, buildings insurance and any life cover are extra.' },
    ],
    related: ['mortgage-overpayment-calculator', 'how-much-can-i-borrow', 'stamp-duty-calculator'],
    cuppi: { feature: 'budget', title: 'Fit the payment into your month', body: 'Once you know the payment, Cuppi’s Budget helps you plan around payday so the mortgage, bills and the fun bits all have a place.' },
  },

  'mortgage-overpayment-calculator': {
    heading: 'Mortgage overpayment calculator',
    intro: 'See what paying a little extra each month, or a lump sum, could save you: how much sooner the mortgage ends and how much less interest you pay.',
    how: [
      'Interest is charged each month on what you still owe. Anything extra you pay goes straight towards the debt, so next month’s interest is a little smaller, and the saving builds on itself over the years.',
      'This calculator keeps your normal monthly payment the same and uses the overpayments to finish the mortgage sooner. (Some lenders let you lower the payment instead; that saves less interest overall.)',
      'Open Advanced to add a one-off lump sum and to change the yearly allowance. The allowance box checks your first year of overpayments against the share of your balance that you can usually overpay without a charge. Many fixed and discounted deals allow about 10% a year; yours may differ, so check your terms.',
      'To weigh up different plans, press “Compare with another plan” above the boxes and give each plan its own overpayment. You can compare up to five side by side.',
    ],
    limits: [
      'The rate is held the same for the rest of the term. If it changes, the savings will too.',
      'Early repayment charges are not worked out. The allowance check only warns you when you may be over it.',
      'Whether overpaying is right for you also depends on your savings, other debts and plans. It is not financial advice.',
    ],
    example: () => {
      const r = monthlyRateFromNominal(4.5);
      const base = buildSchedule({ principal: 180_000, monthlyRate: r, termMonths: 22 * 12 });
      const over = buildSchedule({ principal: 180_000, monthlyRate: r, termMonths: 22 * 12, monthlyOverpayment: 150 });
      return {
        heading: '£180,000 left, 22 years to go, 4.5%, overpaying £150 a month',
        body: [
          `Without overpaying, the payment is ${gbp(base.payment, { pence: true })} and the mortgage costs ${gbp(base.totalInterest)} in interest.`,
          `Paying £150 more each month, it would be paid off in ${monthsToText(over.months)} instead of ${monthsToText(base.months)}, which is ${monthsToText(base.months - over.months)} sooner, and you would save about ${gbp(base.totalInterest - over.totalInterest)} in interest.`,
        ],
      };
    },
    faqs: [
      { q: 'Can I overpay my mortgage?', a: 'Most lenders allow it. Many let you overpay up to a set share of the balance each year, often around 10%, without charge during a fixed or discounted period. Paying more than that can mean an early repayment charge. Your mortgage documents or your lender will tell you the exact rule.' },
      { q: 'Should I overpay or reduce my monthly payment?', a: 'Overpaying and keeping the same payment shortens the mortgage and saves the most interest. Lowering the payment instead gives you more breathing room each month. Some lenders let you choose; tell them which you want when you overpay.' },
      { q: 'Is a lump sum or a monthly overpayment better?', a: 'The sooner money goes in, the more interest it saves, so a lump sum early on saves more than the same amount spread over years. A regular overpayment is easier to keep up. Try both in the calculator.' },
      { q: 'How do I make sure it counts as an overpayment?', a: 'Tell your lender it is an overpayment and say whether you want to shorten the term or lower the payment. Otherwise it may just be held against next month’s payment.' },
      { q: 'Is overpaying better than saving the money?', a: 'It depends on your mortgage rate compared with the interest you would earn after tax, and on keeping enough savings for emergencies. This calculator only shows what overpaying saves; it cannot tell you what is best for you.' },
    ],
    related: ['mortgage-calculator', 'loan-repayment-calculator', 'how-much-can-i-borrow'],
    cuppi: { feature: 'budget', title: 'Find the money to overpay', body: 'Cuppi’s Budget shows what is left after your bills each payday, so you can see what you could put towards the mortgage.' },
  },

  'stamp-duty-calculator': {
    heading: 'Stamp Duty calculator',
    intro: 'Work out the tax on buying a home in England, Northern Ireland, Scotland or Wales, with first-time buyer relief and the higher rates for additional homes.',
    how: [
      'The tax is charged in slices. Only the part of the price inside each band is taxed at that band’s rate, so a price just over a threshold does not suddenly cost much more.',
      'England and Northern Ireland pay Stamp Duty Land Tax (SDLT). Scotland pays Land and Buildings Transaction Tax (LBTT). Wales pays Land Transaction Tax (LTT). Each has its own bands and its own extras, so choose where the home is.',
      'The result shows each band, so you can see where the tax comes from. The tax authorities round the total down to the pound, and so does this calculator.',
      'To compare, press “Compare with another option” above the boxes: try a different price, a different part of the UK, or buying as a first-time buyer against a second home. You can compare up to five side by side.',
    ],
    limits: [
      'It covers a residential home bought outright or with a mortgage. It does not cover shared ownership, leasehold rent, company purchases, mixed-use or non-residential property.',
      'Rules for who counts as a first-time buyer, replacing a main home, and non-UK residents are detailed. This calculator applies the headline rules, so check the official guidance or ask your solicitor before you rely on it.',
      'Rates change, usually at a Budget or in April. The page shows when they were last checked.',
    ],
    example: () => {
      const standard = calculateStampDuty({ price: 300_000, region: 'england', buyer: 'standard' });
      const first = calculateStampDuty({ price: 300_000, region: 'england', buyer: 'first-time' });
      const extra = calculateStampDuty({ price: 300_000, region: 'england', buyer: 'additional' });
      const scot = calculateStampDuty({ price: 300_000, region: 'scotland', buyer: 'standard' });
      return {
        heading: 'A £300,000 home',
        body: [
          `In England: ${gbp(standard.tax)} for most buyers, ${gbp(first.tax)} for a first-time buyer, and ${gbp(extra.tax)} for someone buying an additional home.`,
          `The same price in Scotland is ${gbp(scot.tax)} of LBTT for most buyers.`,
        ],
      };
    },
    faqs: [
      { q: 'Who pays Stamp Duty, and when?', a: 'The buyer. Your solicitor or conveyancer normally files the return and pays it for you around completion, and will ask you for the money along with the rest of the purchase costs. The deadlines differ between the three taxes.' },
      { q: 'Is it different in Scotland and Wales?', a: 'Yes. Scotland has LBTT and Wales has LTT, each with its own bands. Scotland has relief for first-time buyers and an Additional Dwelling Supplement; Wales has no first-time buyer relief but has higher rates for additional homes.' },
      { q: 'Who counts as a first-time buyer?', a: 'In England, Northern Ireland and Scotland, everyone buying must never have owned a residential property anywhere in the world. In England and Northern Ireland the relief is lost entirely above £500,000.' },
      { q: 'What counts as an additional property?', a: 'Broadly, buying a home when you will own another one at the end of the day, such as a second home or buy-to-let. There are rules when you are replacing your main home and may be able to claim some back if you sell the old one in time. Check the official guidance for your situation.' },
      { q: 'Why is the answer different from another calculator?', a: 'Rates change, and some calculators are out of date. This page shows when its rates were last checked against the official ones. If in doubt, trust the official calculator on GOV.UK, Revenue Scotland or the Welsh Revenue Authority.' },
    ],
    related: ['how-much-can-i-borrow', 'mortgage-calculator', 'mortgage-overpayment-calculator'],
    cuppi: { feature: 'receipts', title: 'Moving house? Keep the paperwork', body: 'Cuppi’s Receipts keeps every receipt and warranty for the new place in one tidy home.' },
  },

  'how-much-can-i-borrow': {
    heading: 'How much can I borrow for a mortgage?',
    intro: 'A quick estimate from your income and deposit: roughly what a lender might offer, the most you could pay for a home, and what the monthly payments would be.',
    how: [
      'Most lenders start with a multiple of your yearly income before tax. Four to four and a half times is common, and some go higher in certain cases. With two people, the incomes are added together.',
      'They then check that you could really afford the payments, looking at your other spending, debts and credit record, and whether you could still manage if rates rose. So your real figure can be lower or higher than this estimate.',
      'This calculator multiplies your income, adds your deposit to show the most you could pay for a home, and works out the monthly payment at the rate and term you choose. Drag the “Times income” scale between 4× and 7× in half steps; the table shows the usual range of multiples side by side, plus the one you picked.',
      'To compare situations, press “Compare with another scenario” above the boxes: a bigger deposit, a second income, or a different rate. You can compare up to five side by side.',
    ],
    limits: [
      'It is a rule of thumb, not an offer or a decision. Only a lender can tell you what it would actually lend.',
      'Your debts are shown against your income, but they are not used to reduce the estimate. Lenders do take them into account.',
      'Pay before tax is used. Bonuses, overtime, self-employment and benefits are treated differently by different lenders.',
    ],
    example: () => {
      const r = estimateBorrowing({ incomeA: 45_000, incomeB: 30_000, multiple: 4.5, deposit: 40_000, ratePct: 4.5, termYears: 25, monthlyDebts: 0 });
      return {
        heading: 'Two earners on £45,000 and £30,000, with a £40,000 deposit',
        body: [
          `Together that is ${gbp(r.combinedIncome)}. At 4.5 times income, that suggests borrowing of about ${gbp(r.borrowing)}.`,
          `With the deposit, that points to a home of up to about ${gbp(r.maxPrice)}, and a loan-to-value of ${share(r.ltv)}. At 4.5% over 25 years, the monthly payment would be about ${gbp(r.monthlyPayment)}, which is ${share(r.paymentShare)} of your pay before tax.`,
        ],
      };
    },
    faqs: [
      { q: 'How do lenders decide how much to lend?', a: 'They look at your income, your regular spending, debts and credit record, the size of your deposit, and whether you could afford the payments if rates went up. A multiple of income is a starting point, not the whole answer.' },
      { q: 'What is a typical income multiple?', a: 'Around four to four and a half times income is common, and some lenders will go higher for certain borrowers. It varies, which is why the calculator shows a range.' },
      { q: 'Does a bigger deposit help?', a: 'It lowers the loan as a share of the price (the loan-to-value), which usually means a wider choice of deals and better rates. It also adds directly to the price you can afford.' },
      { q: 'What is an agreement in principle?', a: 'A lender’s early indication of what it might lend you, based on a few details. It is not a guarantee, but it shows sellers you are serious. Many lenders will give one before you find a home.' },
      { q: 'Will this affect my credit score?', a: 'No. This calculator runs entirely in your browser and does not contact any lender or credit agency.' },
    ],
    related: ['stamp-duty-calculator', 'mortgage-calculator', 'mortgage-overpayment-calculator'],
    cuppi: { feature: 'budget', title: 'See what is left each month', body: 'Cuppi’s Budget shows where your money goes each payday, which helps you check a mortgage payment would sit comfortably.' },
  },

  'loan-repayment-calculator': {
    heading: 'Loan repayment calculator',
    intro: 'Work out the monthly payment on a personal or car loan, then see what paying extra, a lump sum, or settling the loan early would save.',
    how: [
      'A loan is paid back in equal monthly payments. The interest each month is worked out on what you still owe, so most of the early payments go on interest and more goes on the debt as time passes.',
      'Loans are advertised with an APR, the yearly cost of borrowing as a single rate. This calculator turns your APR into the matching monthly rate.',
      'Paying early cuts the interest because you owe less for less time. Open Advanced to try extra each month, a lump sum, or settling in full, which usually has a fee. The fee is counted before it shows what you would save.',
      'To compare loans, or a loan with and without paying early, press “Compare with another loan” above the boxes. Each starts as a copy of the one you are on. You can compare up to five side by side, with the arrangement fee counted in the cost.',
    ],
    limits: [
      'Fees other than an early settlement fee, such as an arrangement fee, are not included, and nor are payment protection or other add-ons.',
      'Some lenders work out interest differently, or add the whole cost to the loan at the start. The figures on your agreement are the ones that count.',
      'It does not cover credit cards, overdrafts or a loan with a changing rate.',
    ],
    example: () => {
      const r = analyseLoan({ amount: 8_000, aprPct: 8.9, termMonths: 48, early: { kind: 'lump', amount: 1_500, afterMonth: 12 } });
      return {
        heading: '£8,000 over 4 years at 8.9% APR, with a £1,500 lump sum after a year',
        body: [
          `The payment is ${gbp(r.payment, { pence: true })} a month, and the loan costs ${gbp(r.baseline.totalInterest)} in interest in all.`,
          `Putting in £1,500 after 12 payments clears the loan ${monthsToText(r.early!.monthsSaved)} sooner and saves about ${gbp(r.early!.interestSaved)} in interest.`,
        ],
      };
    },
    faqs: [
      { q: 'Can I repay a loan early?', a: 'Usually yes. For most regulated consumer loans you have the right to repay early, in part or in full. The lender may charge a fee for it, and must give you a figure on request. Check your agreement.' },
      { q: 'What is APR?', a: 'The annual percentage rate is the yearly cost of the loan as one rate, including the interest and some fees, so you can compare loans. A “representative” APR only has to be offered to more than half of the people who are accepted, so your rate may differ.' },
      { q: 'What does an early settlement fee look like?', a: 'It is often a month or two of interest, but it varies, and some loans have none. Put what your agreement says into the calculator to see whether settling still saves money.' },
      { q: 'Is paying extra each month or a lump sum better?', a: 'Money paid sooner saves more interest, so an early lump sum does more than the same amount spread out. Regular extra payments are easier to keep up. Try both.' },
      { q: 'Does this work for a mortgage?', a: 'Not exactly. Mortgages quote a yearly rate and have longer terms. Use the mortgage calculators for those.' },
    ],
    related: ['mortgage-overpayment-calculator', 'mortgage-calculator', 'how-much-can-i-borrow'],
    cuppi: { feature: 'budget', title: 'Plan the repayments', body: 'Cuppi’s Budget helps you plan for payday, so loan payments and any extra you want to put in have a place.' },
  },
};
