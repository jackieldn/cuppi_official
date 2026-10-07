// Run with `npm run test:rules` (starts the Firestore and Storage emulators;
// needs Java). Guards the two things that must never regress: a signed-in
// stranger cannot make themselves an admin, and only admins can change data
// or files.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { ref, uploadString, getBytes } from 'firebase/storage';

let env, anon, stranger, admin;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
  // Seed (bypassing the rules): "admin" has a roles_admin record.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'roles_admin/admin'), { createdAt: 1 });
    await setDoc(doc(ctx.firestore(), 'projects/p1'), { title: 'x' });
    await setDoc(doc(ctx.firestore(), 'beta_signups/s1'), { email: 'a@b.c' });
    await uploadString(ref(ctx.storage(), 'projects/existing.txt'), 'hi');
  });
  anon = env.unauthenticatedContext();
  stranger = env.authenticatedContext('stranger');
  admin = env.authenticatedContext('admin');
});

after(async () => { await env?.cleanup(); });

describe('Firestore rules', () => {
  test('anyone can read and list public content', async () => {
    await assertSucceeds(getDoc(doc(anon.firestore(), 'projects/p1')));
    await assertSucceeds(getDocs(collection(anon.firestore(), 'projects')));
  });

  test('a signed-in stranger cannot create their own roles_admin record', async () => {
    await assertFails(setDoc(doc(stranger.firestore(), 'roles_admin/stranger'), { a: 1 }));
  });

  test('not even an admin can create roles_admin records from a client', async () => {
    await assertFails(setDoc(doc(admin.firestore(), 'roles_admin/other'), { a: 1 }));
  });

  test('strangers and anonymous visitors cannot write content', async () => {
    await assertFails(setDoc(doc(stranger.firestore(), 'projects/p2'), { title: 'y' }));
    await assertFails(setDoc(doc(anon.firestore(), 'projects/p2'), { title: 'y' }));
  });

  test('admins can write content', async () => {
    await assertSucceeds(setDoc(doc(admin.firestore(), 'projects/p2'), { title: 'y' }));
  });

  test('a user can read only their own roles_admin record, and nobody can list them', async () => {
    await assertSucceeds(getDoc(doc(admin.firestore(), 'roles_admin/admin')));
    await assertFails(getDoc(doc(stranger.firestore(), 'roles_admin/admin')));
    await assertFails(getDocs(collection(admin.firestore(), 'roles_admin')));
  });

  test('signup emails are never readable from a client', async () => {
    await assertFails(getDoc(doc(admin.firestore(), 'beta_signups/s1')));
    await assertFails(getDoc(doc(anon.firestore(), 'beta_signups/s1')));
  });
});

describe('Storage rules', () => {
  test('anyone can read public files', async () => {
    await assertSucceeds(getBytes(ref(anon.storage(), 'projects/existing.txt')));
  });

  test('anonymous and signed-in strangers cannot upload or overwrite', async () => {
    await assertFails(uploadString(ref(anon.storage(), 'projects/a.txt'), 'x'));
    await assertFails(uploadString(ref(stranger.storage(), 'projects/a.txt'), 'x'));
    await assertFails(uploadString(ref(stranger.storage(), 'projects/existing.txt'), 'x'));
  });

  test('admins can upload to the known folders', async () => {
    await assertSucceeds(uploadString(ref(admin.storage(), 'projects/a.txt'), 'x'));
    await assertSucceeds(uploadString(ref(admin.storage(), 'apps/a.txt'), 'x'));
  });

  test('nobody can upload outside the known folders', async () => {
    await assertFails(uploadString(ref(admin.storage(), 'random/a.txt'), 'x'));
  });
});
