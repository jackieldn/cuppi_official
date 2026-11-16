// Recovery: removes the authenticator (second factor) from an admin account, for when the
// app entry is lost or was never set up. The next sign-in then shows the QR code screen again
// (see src/app/(portfolio)/admin/login/page.tsx). It also signs the account out everywhere.
//
// Dry run by default (reads only: prints the admin accounts and whether each has a second factor):
//
//   node scripts/reset-admin-mfa.mjs
//
// Then, to reset one:
//
//   node scripts/reset-admin-mfa.mjs --apply [--email admin@example.com]
//
// --email is optional when there is exactly one admin (a document in `roles_admin`). Only an
// account that is in `roles_admin` can be reset with this.
//
// Credentials: Application Default Credentials (`gcloud auth application-default login`)
// or a service account JSON in FIREBASE_SERVICE_ACCOUNT, like src/firebase/server.ts.
// Safe to run more than once. Run the sign-in again straight after: until a new authenticator
// is added, anyone who knows the password could add their own.
import { readFileSync } from 'node:fs';

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const wantedEmail = argValue('--email')?.trim().toLowerCase();
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');

  const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
  const options = { projectId: config.projectId };
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    options.credential = cert(sa);
  }
  const app = initializeApp(options, 'reset-admin-mfa');
  const auth = getAuth(app);

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to reset)'} on project ${config.projectId}\n`);

  // Admins are the documents in roles_admin, whose id is the user's uid.
  const adminRefs = await getFirestore(app).collection('roles_admin').listDocuments();
  const admins = [];
  for (const ref of adminRefs) {
    try {
      const user = await auth.getUser(ref.id);
      admins.push(user);
      const factors = user.multiFactor?.enrolledFactors ?? [];
      console.log(
        `- ${user.email ?? '(no email)'}  uid ${user.uid}  email verified: ${user.emailVerified}  ` +
          `second factors: ${factors.length === 0 ? 'none' : factors.map((f) => `${f.factorId} "${f.displayName ?? ''}"`).join(', ')}`,
      );
    } catch (err) {
      console.log(`- roles_admin/${ref.id}: no matching user (${err.code ?? err.message})`);
    }
  }
  if (admins.length === 0) throw new Error('No admin accounts found.');
  if (!apply) return;

  const targets = wantedEmail ? admins.filter((u) => u.email?.toLowerCase() === wantedEmail) : admins;
  if (targets.length !== 1) {
    throw new Error(
      wantedEmail
        ? `No admin with the email ${wantedEmail}.`
        : `${targets.length} admins found: say which one with --email.`,
    );
  }
  const [target] = targets;
  // `null` removes every enrolled second factor; revoking tokens ends sessions that already exist.
  await auth.updateUser(target.uid, { multiFactor: { enrolledFactors: null } });
  await auth.revokeRefreshTokens(target.uid);
  const after = await auth.getUser(target.uid);
  console.log(`\nReset ${target.email}: second factors now ${after.multiFactor?.enrolledFactors?.length ?? 0}. Sign in at /admin/login to add a new authenticator.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
