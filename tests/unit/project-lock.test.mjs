import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword, verifyPassword, splitLockedFields, pickLockedContent, LOCKED_FIELDS,
} from '../../src/lib/project-lock.ts';
import { planProjectMigration } from '../../scripts/migrate-project-secrets.mjs';

// Few iterations keep the tests fast; the format is the same.
const FAST = 1000;

describe('hashPassword / verifyPassword', () => {
  test('accepts the right key and rejects others', async () => {
    const stored = await hashPassword('open sesame', FAST);
    assert.equal(stored.algo, 'PBKDF2-SHA256');
    assert.notEqual(stored.hash, 'open sesame');
    assert.equal(await verifyPassword('open sesame', stored), true);
    assert.equal(await verifyPassword('open sesame ', stored), false);
    assert.equal(await verifyPassword('', stored), false);
  });

  test('salts each hash', async () => {
    const a = await hashPassword('same', FAST);
    const b = await hashPassword('same', FAST);
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.hash, b.hash);
  });

  test('rejects missing or malformed records', async () => {
    const good = await hashPassword('k', FAST);
    assert.equal(await verifyPassword('k', null), false);
    assert.equal(await verifyPassword('k', undefined), false);
    assert.equal(await verifyPassword('k', { ...good, algo: 'md5' }), false);
    assert.equal(await verifyPassword('k', { ...good, iterations: 0 }), false);
    assert.equal(await verifyPassword('k', { ...good, iterations: 1e9 }), false);
    assert.equal(await verifyPassword('k', { ...good, hash: 'not base64!' }), false);
    assert.equal(await verifyPassword('k', { ...good, hash: btoa('short') }), false);
  });
});

describe('splitLockedFields', () => {
  test('moves locked fields out and strips any plain-text key', () => {
    const { publicData, content } = splitLockedFields({
      title: 'T', slug: 's', tags: ['a'], imageUrl: 'i',
      overview: 'o', client: 'c', galleryImages: ['g'], videoUrls: ['v'], noAi: true,
      privacy: { isPasswordProtected: true, password: 'plain' },
    });
    assert.deepEqual(publicData, { title: 'T', slug: 's', tags: ['a'], imageUrl: 'i', privacy: { isPasswordProtected: true } });
    assert.deepEqual(content, { overview: 'o', client: 'c', galleryImages: ['g'], videoUrls: ['v'], noAi: true });
    for (const f of LOCKED_FIELDS) assert.ok(!(f in publicData));
  });

  test('pickLockedContent ignores anything that is not a locked field', () => {
    assert.deepEqual(pickLockedContent({ client: 'c', title: 'evil', slug: 'x' }), { client: 'c' });
    assert.deepEqual(pickLockedContent(null), {});
  });
});

describe('planProjectMigration', () => {
  test('hashes a legacy key and moves locked content', async () => {
    const plan = await planProjectMigration({
      title: 'T', overview: 'o', client: 'c', privacy: { isPasswordProtected: true, password: 'k' },
    }, undefined);
    assert.deepEqual(plan.removeFromPublic.sort(), ['client', 'overview', 'privacy.password']);
    assert.deepEqual(plan.secret.content, { overview: 'o', client: 'c' });
    assert.equal(await verifyPassword('k', plan.secret.password), true);
    assert.deepEqual(plan.warnings, []);
  });

  test('leaves already-migrated and unprotected projects alone', async () => {
    assert.equal(await planProjectMigration({ title: 'T', privacy: { isPasswordProtected: true } }, { password: {}, content: {} }), null);
    assert.equal(await planProjectMigration({ title: 'T', overview: 'o' }, undefined), null);
  });

  test('drops a stray key from an unprotected project without moving content', async () => {
    const plan = await planProjectMigration({ overview: 'o', privacy: { isPasswordProtected: false, password: 'k' } }, undefined);
    assert.deepEqual(plan, { removeFromPublic: ['privacy.password'], secret: null, warnings: [] });
  });

  test('keeps an existing hash and warns when a project has no key at all', async () => {
    const existing = await hashPassword('old', FAST);
    const kept = await planProjectMigration({ privacy: { isPasswordProtected: true, password: 'new' } }, { password: existing });
    assert.equal(kept.secret.password, existing);
    assert.equal(kept.warnings.length, 1);

    const none = await planProjectMigration({ client: 'c', privacy: { isPasswordProtected: true } }, undefined);
    assert.equal(none.secret.password, undefined);
    assert.match(none.warnings[0], /no key/);
  });
});
