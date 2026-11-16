// Two-step verification for the admin (Firebase Auth multi-factor, authenticator app / TOTP).
//
// The admin edits Firestore and Storage straight from the browser, so the check that
// matters lives in firestore.rules and storage.rules: they only treat someone as an admin
// when their sign-in token says a second factor was used (`sign_in_second_factor`). Anything
// in the pages is only there to send people to the right screen. Pure functions, so Node's
// test runner can load this file.

/** The value Firebase puts in `firebase.sign_in_second_factor` after an authenticator-app sign-in. */
export const SECOND_FACTOR_TOTP = 'totp';

/** The name the authenticator app shows for this site's entry. */
export const AUTHENTICATOR_ISSUER = 'Cuppi Admin';

/** True when the ID token's claims show the sign-in used an authenticator-app code. */
export function hasSecondFactor(claims: unknown): boolean {
  if (!claims || typeof claims !== 'object') return false;
  const firebase = (claims as { firebase?: unknown }).firebase;
  if (!firebase || typeof firebase !== 'object') return false;
  return (firebase as { sign_in_second_factor?: unknown }).sign_in_second_factor === SECOND_FACTOR_TOTP;
}

/** A six-digit code as typed (spaces and dashes are common when copying one). Null when it cannot be a code. */
export function cleanCode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** The secret key in groups of four, which is easier to read and type into an authenticator app. */
export function groupSecret(secret: string): string {
  return secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

const GENERIC_SIGN_IN_ERROR = 'That email or password is not right.';

/**
 * What to tell the person for a Firebase Auth error code. Wrong email and wrong password
 * get the same words, so the form cannot be used to find out which addresses have accounts.
 */
export function authErrorMessage(code: unknown): string {
  switch (code) {
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes before trying again.';
    case 'auth/invalid-verification-code':
    case 'auth/invalid-multi-factor-session':
      return 'That code is not right. Check the latest code in your authenticator app.';
    case 'auth/code-expired':
    case 'auth/multi-factor-auth-required':
      return 'That sign-in timed out. Start again.';
    case 'auth/network-request-failed':
      return 'Could not reach the server. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Two-step verification is not switched on for this project yet. See the README.';
    case 'auth/unverified-email':
      return 'Verify your email address first, then try again.';
    default:
      return GENERIC_SIGN_IN_ERROR;
  }
}
