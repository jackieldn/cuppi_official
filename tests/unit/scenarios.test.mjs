import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { addScenario, defaultName, initialState, MAX_SCENARIOS, readScenarios, removeScenario, renameScenario, setField, writeScenarios } from '../../src/lib/tools/scenario-params.ts';
import { bestIndexes } from '../../src/lib/tools/best.ts';

const D = { rate: '4.5', years: '25', amount: '250,000' };
const SHARED = { horizon: '5' };
const read = (search) => readScenarios(search, D, SHARED, 'Deal');
const write = (state, shared = SHARED) => writeScenarios(state, D, shared, SHARED, 'Deal');

describe('reading scenarios from the address', () => {
  test('an empty address is one scenario with the defaults', () => {
    const { state, shared } = read('');
    assert.deepEqual(state, { list: [D], names: ['Deal A'], active: 0 });
    assert.deepEqual(shared, SHARED);
  });
  test('the first scenario uses the plain box names, so an old single-calculator link still works', () => {
    assert.equal(read('?rate=5.5').state.list[0].rate, '5.5');
    assert.equal(read('rate=5.5').state.list[0].rate, '5.5');
  });
  test('further scenarios carry a number, and keep the defaults for what is missing', () => {
    const { state } = read('?n=3&rate_2=4.1&years_3=30&name_2=Cheap&a=2');
    assert.equal(state.list.length, 3);
    assert.equal(state.list[1].rate, '4.1');
    assert.equal(state.list[1].years, '25');
    assert.equal(state.list[2].years, '30');
    assert.deepEqual(state.names, ['Deal A', 'Cheap', 'Deal C']);
    assert.equal(state.active, 1);
  });
  test('the count and the selection are kept within bounds, and rubbish gives the default', () => {
    assert.equal(read('?n=99').state.list.length, MAX_SCENARIOS);
    assert.equal(read('?n=0').state.list.length, 1);
    assert.equal(read('?n=x').state.list.length, 1);
    assert.equal(read('?n=2&a=9').state.active, 1);
    assert.equal(read('?a=-4').state.active, 0);
  });
  test('over-long values are ignored, and shared boxes are read', () => {
    assert.equal(read(`?rate=${'9'.repeat(200)}`).state.list[0].rate, '4.5');
    assert.equal(read('?horizon=3').shared.horizon, '3');
  });
});

describe('writing scenarios into the address', () => {
  test('the starting point writes nothing', () => assert.equal(write(initialState(D, 'Deal')), ''));
  test('only what differs is written, in the numbered form for the others', () => {
    let s = initialState(D, 'Deal');
    s = setField(s, 'rate', '5.5');
    s = addScenario(s, 'Deal');
    s = setField(s, 'years', '30');
    const q = new URLSearchParams(write(s));
    assert.equal(q.get('n'), '2');
    assert.equal(q.get('a'), '2');
    assert.equal(q.get('rate'), '5.5');
    assert.equal(q.get('rate_2'), '5.5'); // copied from the first
    assert.equal(q.get('years_2'), '30');
    assert.equal(q.get('years'), null);
    assert.equal(q.get('amount'), null);
  });
  test('whatever is written reads back as the same scenarios', () => {
    let s = initialState(D, 'Deal');
    s = setField(s, 'amount', '300,000');
    s = addScenario(s, 'Deal');
    s = setField(s, 'rate', '3.9');
    s = renameScenario(s, 1, 'Fixed 5');
    s = addScenario(s, 'Deal');
    s = renameScenario(s, 2, '');
    const back = read(write(s, { horizon: '10' }));
    assert.deepEqual(back.state.list, s.list);
    assert.equal(back.state.active, s.active);
    assert.deepEqual(back.state.names.slice(0, 2), s.names.slice(0, 2));
    assert.equal(back.shared.horizon, '10');
  });
  test('a name that is the default is not written, and one that is not, is', () => {
    let s = addScenario(initialState(D, 'Deal'), 'Deal');
    assert.ok(!write(s).includes('name'));
    s = renameScenario(s, 0, 'Current');
    assert.equal(new URLSearchParams(write(s)).get('name'), 'Current');
  });
});

describe('changing the list', () => {
  test('adding copies the selected scenario, selects the new one, and stops at five', () => {
    let s = setField(initialState(D, 'Plan'), 'rate', '6');
    for (let i = 0; i < 9; i++) s = addScenario(s, 'Plan');
    assert.equal(s.list.length, MAX_SCENARIOS);
    assert.equal(s.active, MAX_SCENARIOS - 1);
    assert.ok(s.list.every((v) => v.rate === '6'));
    assert.deepEqual(s.names, ['Plan A', 'Plan B', 'Plan C', 'Plan D', 'Plan E']);
  });
  test('editing changes only the selected scenario', () => {
    let s = addScenario(initialState(D, 'Deal'), 'Deal');
    s = setField(s, 'rate', '3');
    assert.deepEqual(s.list.map((v) => v.rate), ['4.5', '3']);
  });
  test('removing keeps at least one, and keeps the selection on the same scenario where it can', () => {
    let s = initialState(D, 'Deal');
    assert.equal(removeScenario(s, 0), s);
    s = addScenario(addScenario(s, 'Deal'), 'Deal'); // 3, selected the last
    s = setField(s, 'rate', '1');
    const after = removeScenario(s, 0);
    assert.equal(after.list.length, 2);
    assert.equal(after.active, 1);
    assert.equal(after.list[after.active].rate, '1');
    const last = removeScenario(after, 1);
    assert.equal(last.active, 0);
    assert.equal(last.list.length, 1);
  });
  test('names are capped', () => assert.equal(renameScenario(initialState(D, 'Deal'), 0, 'x'.repeat(80)).names[0].length, 24));
  test('default names', () => {
    assert.equal(defaultName('Loan', 0), 'Loan A');
    assert.equal(defaultName('Loan', 4), 'Loan E');
  });
});

describe('bestIndexes', () => {
  test('the lowest wins by default, the highest when asked; a tie shares it', () => {
    assert.deepEqual([...bestIndexes([300, 100, 200])], [1]);
    assert.deepEqual([...bestIndexes([300, 100, 200], 'highest')], [0]);
    assert.deepEqual([...bestIndexes([100, 100.2, 200])].sort(), [0, 1]);
  });
  test('nothing is picked out for one figure, or when all are the same', () => {
    assert.equal(bestIndexes([5]).size, 0);
    assert.equal(bestIndexes([7, 7, 7]).size, 0);
  });
});
