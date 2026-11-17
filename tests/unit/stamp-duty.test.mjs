import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStampDuty } from '../../src/lib/tools/stamp-duty.ts';
import { PROPERTY_TAX, oldestReview } from '../../src/lib/tools/rates.ts';

const tax = (price, region, buyer = 'standard', nonUkResident = false) => calculateStampDuty({ price, region, buyer, nonUkResident }).tax;

// The expected figures are worked out by hand from the published bands, so a changed band fails here until the test is changed on purpose.
describe('England and Northern Ireland (SDLT)', () => {
  test('standard rates', () => {
    assert.equal(tax(125_000, 'england'), 0);
    assert.equal(tax(250_000, 'england'), 2_500);
    assert.equal(tax(300_000, 'england'), 5_000); // 2% of 125,000 + 5% of 50,000
    assert.equal(tax(500_000, 'england'), 15_000);
    assert.equal(tax(925_000, 'england'), 36_250);
    assert.equal(tax(1_500_000, 'england'), 36_250 + 57_500);
    assert.equal(tax(2_000_000, 'england'), 36_250 + 57_500 + 60_000);
  });
  test('first-time buyers pay nothing to £300,000, then 5% to £500,000', () => {
    assert.equal(tax(300_000, 'england', 'first-time'), 0);
    assert.equal(tax(500_000, 'england', 'first-time'), 10_000); // GOV.UK's own example
  });
  test('first-time buyer relief is lost above £500,000', () => {
    const r = calculateStampDuty({ price: 500_001, region: 'england', buyer: 'first-time' });
    assert.equal(r.tax, tax(500_001, 'england'));
    assert.equal(r.applied.length, 0);
    assert.equal(r.notes.length, 1);
  });
  test('an additional home pays 5 points more on every band', () => {
    assert.equal(tax(300_000, 'england', 'additional'), 6_250 + 8_750 + 5_000); // 5% of 125k, 7% of 125k, 10% of 50k
  });
  test('a non-UK resident pays 2 points more, on top of any other', () => {
    assert.equal(tax(300_000, 'england', 'standard', true), 5_000 + 6_000);
    assert.equal(tax(300_000, 'england', 'additional', true), 20_000 + 6_000);
  });
  test('the higher rates do not apply below £40,000', () => {
    const r = calculateStampDuty({ price: 39_000, region: 'england', buyer: 'additional' });
    assert.equal(r.tax, 0);
    assert.equal(r.notes.length, 1);
  });
});

describe('Scotland (LBTT)', () => {
  test('standard rates', () => {
    assert.equal(tax(145_000, 'scotland'), 0);
    assert.equal(tax(300_000, 'scotland'), 4_600); // 2% of 105,000 + 5% of 50,000
    assert.equal(tax(750_000, 'scotland'), 2_100 + 3_750 + 42_500);
  });
  test('first-time buyers save £600 by a higher nil-rate band', () => {
    assert.equal(tax(300_000, 'scotland', 'first-time'), 4_000);
    assert.equal(tax(175_000, 'scotland', 'first-time'), 0);
    assert.equal(tax(1_000_000, 'scotland', 'first-time'), tax(1_000_000, 'scotland') - 600);
  });
  test('the Additional Dwelling Supplement is 8% of the whole price, on top', () => {
    const r = calculateStampDuty({ price: 300_000, region: 'scotland', buyer: 'additional' });
    assert.equal(r.tax, 4_600 + 24_000);
    assert.equal(r.supplement.amount, 24_000);
  });
  test('the non-UK resident surcharge does not exist here', () => assert.equal(tax(300_000, 'scotland', 'standard', true), 4_600));
});

describe('Wales (LTT)', () => {
  test('standard rates', () => {
    assert.equal(tax(225_000, 'wales'), 0);
    assert.equal(tax(300_000, 'wales'), 4_500);
    assert.equal(tax(400_000, 'wales'), 10_500);
    assert.equal(tax(750_000, 'wales'), 10_500 + 26_250);
  });
  test('there is no first-time buyer relief, and the buyer is told', () => {
    const r = calculateStampDuty({ price: 300_000, region: 'wales', buyer: 'first-time' });
    assert.equal(r.tax, 4_500);
    assert.equal(r.notes.length, 1);
  });
  test('the higher rates have a table of their own', () => {
    assert.equal(tax(300_000, 'wales', 'additional'), 9_000 + 5_950 + 5_000);
  });
});

describe('results', () => {
  test('the bands add up to the total (before rounding down) and only show slices the price reaches', () => {
    const r = calculateStampDuty({ price: 300_000, region: 'england', buyer: 'standard' });
    assert.equal(r.bands.length, 3);
    assert.equal(r.bands.reduce((s, b) => s + b.inBand, 0), 300_000);
    assert.equal(r.bands.reduce((s, b) => s + b.tax, 0), r.tax);
  });
  test('the effective rate is the tax over the price', () => {
    assert.equal(calculateStampDuty({ price: 500_000, region: 'england', buyer: 'standard' }).effectiveRate, 3);
  });
  test('no price, or rubbish, is no tax', () => {
    assert.equal(tax(0, 'england'), 0);
    assert.equal(tax(NaN, 'wales'), 0);
    assert.equal(tax(-5, 'scotland'), 0);
  });
  test('tax is rounded down to the pound', () => {
    assert.equal(tax(500_001, 'england'), 15_000); // exactly 15,000.05
    assert.equal(tax(130_001, 'england'), 100); // 2% of 5,001 = 100.02
  });
});

describe('the rates themselves', () => {
  test('every set has an official source, a review date, and bands that rise and end open', () => {
    for (const [region, rules] of Object.entries(PROPERTY_TAX)) {
      assert.match(rules.source, /^https:\/\//, region);
      assert.match(rules.reviewed, /^\d{4}-\d{2}-\d{2}$/, region);
      // England's first-time buyer table stops at its £500,000 cap; every other table runs on without limit.
      const all = [rules.standard, rules.firstTime?.maxPrice == null ? rules.firstTime?.bands : null, rules.additional.how.kind === 'own-bands' ? rules.additional.how.bands : null].filter(Boolean);
      for (const bands of all) {
        assert.equal(bands.at(-1).upTo, null, `${region} ends open`);
        const ceilings = bands.slice(0, -1).map((b) => b.upTo);
        assert.deepEqual(ceilings, [...ceilings].sort((a, b) => a - b), `${region} rises`);
      }
    }
    assert.match(oldestReview(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
