// One-off: moves project keys (and the content they protect) out of the public
// `projects` collection into the admin-only `project_secrets` collection.
// See src/lib/project-lock.ts for the layout.
//
// For each project:
// - Password protected: the plain-text `privacy.password` is hashed into
//   project_secrets/{id}.password, the locked fields (overview, client, gallery,
//   videos, ...) are moved into project_secrets/{id}.content, and both are deleted
//   from the public doc.
// - Not protected: any leftover `privacy.password` is deleted. Nothing else changes.
//
// Dry run by default (prints what it would do, writes nothing):
//
//   node --experimental-transform-types --no-warnings scripts/migrate-project-secrets.mjs
//
// Then, to write:
//
//   node --experimental-transform-types --no-warnings scripts/migrate-project-secrets.mjs --apply
//
// Credentials: Application Default Credentials (`gcloud auth application-default login`)
// or a service account JSON in FIREBASE_SERVICE_ACCOUNT, like src/firebase/server.ts.
// Safe to run more than once: already-migrated projects are left as they are.
//
// Deploy the new firestore.rules and the new site code before or together with
// running this: the old project page compares the key in the browser, so after
// migration it cannot unlock anything.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { hashPassword, LOCKED_FIELDS, PROJECT_SECRETS_COLLECTION } from '../src/lib/project-lock.ts';

/**
 * What to do with one project. Pure apart from hashing, so it can be tested.
 * Returns null when nothing needs to change.
 */
export async function planProjectMigration(data, existingSecret) {
  const privacy = data.privacy && typeof data.privacy === 'object' ? data.privacy : {};
  const isProtected = privacy.isPasswordProtected === true;
  const legacyPassword = typeof privacy.password === 'string' && privacy.password !== '' ? privacy.password : null;
  const hasPasswordField = 'password' in privacy;
  const lockedOnPublic = LOCKED_FIELDS.filter((f) => data[f] !== undefined);

  if (!isProtected) {
    return hasPasswordField ? { removeFromPublic: ['privacy.password'], secret: null, warnings: [] } : null;
  }
  if (!hasPasswordField && lockedOnPublic.length === 0) return null;

  const warnings = [];
  let password = existingSecret?.password ?? null;
  if (!password && legacyPassword) password = await hashPassword(legacyPassword);
  if (!password) warnings.push('protected but has no key: set one in the admin form, or the page cannot be unlocked');
  if (existingSecret?.password && legacyPassword) warnings.push('already had a hashed key; kept it and dropped the plain-text one');

  // Values on the public doc win over an older copy in secrets.
  const content = { ...(existingSecret?.content ?? {}) };
  for (const f of lockedOnPublic) content[f] = data[f];

  return {
    removeFromPublic: [...(hasPasswordField ? ['privacy.password'] : []), ...lockedOnPublic],
    secret: { ...(password ? { password } : {}), content },
    warnings,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

  const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
  const options = { projectId: config.projectId };
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    options.credential = cert(sa);
  }
  const db = getFirestore(initializeApp(options, 'migrate-project-secrets'));

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to write)'} on project ${config.projectId}\n`);
  const snapshot = await db.collection('projects').get();
  let changed = 0;
  for (const projectDoc of snapshot.docs) {
    const secretRef = db.collection(PROJECT_SECRETS_COLLECTION).doc(projectDoc.id);
    const existing = (await secretRef.get()).data();
    const plan = await planProjectMigration(projectDoc.data(), existing);
    if (!plan) continue;
    changed++;
    const label = `${projectDoc.id} (${projectDoc.get('title') ?? 'untitled'})`;
    console.log(`- ${label}: remove ${plan.removeFromPublic.join(', ')}${plan.secret ? `; write ${PROJECT_SECRETS_COLLECTION}/${projectDoc.id}` : ''}`);
    for (const w of plan.warnings) console.log(`    warning: ${w}`);
    if (!apply) continue;
    // One batch per project, so its public doc and secrets never disagree.
    const batch = db.batch();
    if (plan.secret) batch.set(secretRef, plan.secret);
    batch.update(projectDoc.ref, Object.fromEntries(plan.removeFromPublic.map((f) => [f, FieldValue.delete()])));
    await batch.commit();
  }
  console.log(`\n${changed} of ${snapshot.size} projects ${apply ? 'migrated' : 'would change'}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
