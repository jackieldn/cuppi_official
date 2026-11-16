// One-off: switches on authenticator-app (TOTP) two-step verification for the Firebase project.
// The console's "Multi-factor authentication" card can only toggle SMS, so TOTP is enabled
// through the Admin SDK. The admin login page (src/app/(portfolio)/admin/login/page.tsx) shows
// "Two-step verification is not switched on for this project yet" until this has run.
//
// Dry run by default (reads only: prints the current multi-factor settings):
//
//   node scripts/enable-totp-mfa.mjs
//
// Then, to switch TOTP on:
//
//   node scripts/enable-totp-mfa.mjs --apply
//
// It turns multi-factor on with TOTP as the only second factor. SMS is not carried over
// (SMS codes can be hijacked with a SIM swap, and cost money per message); pass --keep-sms to
// leave SMS enabled alongside TOTP. Safe to run more than once.
//
// Credentials: Application Default Credentials (`gcloud auth application-default login`)
// or a service account JSON in FIREBASE_SERVICE_ACCOUNT, like src/firebase/server.ts.
import { readFileSync } from 'node:fs';

async function main() {
  const apply = process.argv.includes('--apply');
  const keepSms = process.argv.includes('--keep-sms');
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
  const options = { projectId: config.projectId };
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    options.credential = cert(sa);
  }
  const manager = getAuth(initializeApp(options, 'enable-totp-mfa')).projectConfigManager();

  console.log(`${apply ? 'APPLYING' : 'DRY RUN (pass --apply to switch TOTP on)'} on project ${config.projectId}\n`);
  const before = (await manager.getProjectConfig()).multiFactorConfig ?? null;
  console.log('Before:', JSON.stringify(before));
  if (!apply) return;

  const multiFactorConfig = {
    state: 'ENABLED',
    // `factorIds: ['phone']` is how SMS is switched on; leaving it out leaves SMS off.
    ...(keepSms ? { factorIds: ['phone'] } : {}),
    // Accept the code before and after the current 30-second one, for a phone clock that is a little off.
    providerConfigs: [{ state: 'ENABLED', totpProviderConfig: { adjacentIntervals: 1 } }],
  };
  const after = (await manager.updateProjectConfig({ multiFactorConfig })).multiFactorConfig ?? null;
  console.log('After: ', JSON.stringify(after));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
