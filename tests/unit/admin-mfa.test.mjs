import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hasSecondFactor, cleanCode, groupSecret, authErrorMessage } from '../../src/lib/admin-mfa.ts';

describe('hasSecondFactor', () => {
  test('true only when the token says an authenticator code was used', () => {
    assert.equal(hasSecondFactor({ firebase: { sign_in_provider: 'password', sign_in_second_factor: 'totp' } }), true);
  });
  test('false for a password-only sign-in', () => {
    assert.equal(hasSecondFactor({ firebase: { sign_in_provider: 'password' } }), false);
  });
  test('false for any other second factor or a look-alike value', () => {
    for (const value of ['phone', 'TOTP', 'totp ', '', true, 1, null]) {
      assert.equal(hasSecondFactor({ firebase: { sign_in_second_factor: value } }), false, String(value));
    }
  });
  test('a top-level claim of the same name does not count: only the one Firebase sets', () => {
    assert.equal(hasSecondFactor({ sign_in_second_factor: 'totp' }), false);
  });
  test('false for missing or malformed claims', () => {
    for (const claims of [undefined, null, 'x', 5, [], {}, { firebase: null }, { firebase: 'totp' }]) {
      assert.equal(hasSecondFactor(claims), false, JSON.stringify(claims));
    }
  });
});

describe('cleanCode', () => {
  test('accepts six digits, with the spaces or dashes people copy in', () => {
    assert.equal(cleanCode('123456'), '123456');
    assert.equal(cleanCode(' 123 456 '), '123456');
    assert.equal(cleanCode('123-456'), '123456');
  });
  test('rejects anything else', () => {
    for (const input of ['', '12345', '1234567', 'abcdef', '12345a', '１２３４５６', '123\n456x']) {
      assert.equal(cleanCode(input), null, JSON.stringify(input));
    }
  });
});

describe('groupSecret', () => {
  test('groups the key in fours', () => {
    assert.equal(groupSecret('ABCDEFGHIJKLMNOP'), 'ABCD EFGH IJKL MNOP');
    assert.equal(groupSecret('ABCDEFG'), 'ABCD EFG');
  });
});

describe('authErrorMessage', () => {
  test('wrong email and wrong password read the same, so accounts cannot be guessed', () => {
    const wrongPassword = authErrorMessage('auth/wrong-password');
    assert.equal(authErrorMessage('auth/user-not-found'), wrongPassword);
    assert.equal(authErrorMessage('auth/invalid-credential'), wrongPassword);
    assert.equal(authErrorMessage('auth/invalid-email'), wrongPassword);
    assert.equal(authErrorMessage(undefined), wrongPassword);
  });
  test('throttling and code errors say what to do', () => {
    assert.match(authErrorMessage('auth/too-many-requests'), /wait/i);
    assert.match(authErrorMessage('auth/invalid-verification-code'), /code/i);
  });
});
