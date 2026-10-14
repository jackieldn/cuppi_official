import type { SectionConfig } from './faq-model';

// The FAQ pages. Each section is one page (/faq/<id>) and gathers one or more
// Sanity categories: answers that sit alone in a category (Anniversaries, Bank
// holidays) would make pages too thin to be useful, so they share a page.
// A category that is not listed here still gets its own page automatically.
export const FAQ_SECTIONS: SectionConfig[] = [
  { id: 'basics', label: 'The basics', group: 'Set up & manage', categories: ['general'], blurb: 'The Home feed, notifications, your PIN and blocked users.' },
  { id: 'account', label: 'Your account', group: 'Set up & manage', categories: ['personal-account'], blurb: 'Your profile, signing in and out, child accounts and your data.' },
  { id: 'household', label: 'Your household', group: 'Set up & manage', categories: ['household-management'], blurb: 'Add people, transfer ownership, suspend members or delete a household.' },
  { id: 'pro', label: 'Cuppi Pro & rewards', group: 'Set up & manage', categories: ['subscription', 'referral-programme'], blurb: 'Free and Pro plans, cancelling, and the referral programme for free months and Lifetime Pro.' },
  { id: 'shopping', label: 'Shopping', group: 'Features', categories: ['shopping'], blurb: 'Lists, Shopping Mode, aisle sorting and sharing.' },
  { id: 'bin-day', label: 'Bin Day', group: 'Features', categories: ['bin-day'], blurb: 'Set up collections, find your council and fix notifications.' },
  { id: 'budget', label: 'Budget', group: 'Features', categories: ['budget'], blurb: 'Approving the monthly budget, reviews, reminders and renewals.' },
  { id: 'receipts', label: 'Receipts', group: 'Features', categories: ['receipts'], blurb: 'Scan or upload receipts, enhance them, search and track spending.' },
  { id: 'pets', label: 'Pets', group: 'Features', categories: ['pets'], blurb: 'Pet profiles, vaccinations, medications, vets and emergencies.' },
  { id: 'birthdays-celebrations', label: 'Birthdays & celebrations', group: 'Features', categories: ['birthday', 'celebrations', 'anniversaries', 'bank-holidays'], blurb: 'Birthdays, In Memoriam profiles, celebrations, anniversaries and bank holidays.' },
];

export const FAQ_GROUP_ORDER = ['Set up & manage', 'Features'];

// Path segments under /faq that are not sections.
export const FAQ_RESERVED_SECTION_IDS = ['search'];
