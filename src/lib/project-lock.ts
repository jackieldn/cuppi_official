// Password-protected ("locked") projects.
//
// A locked project is split in two:
// - `projects/{id}` (public): only what the works grid and featured cards need:
//   title, slug, description, tags, cover images, featured, privacy.isPasswordProtected.
// - `project_secrets/{id}` (admin-only, see firestore.rules): the password hash and
//   everything the project page shows once unlocked (LOCKED_FIELDS).
//
// The browser never sees the hash. The project page sends the key to a server
// action (src/app/actions/unlock-project.ts), which checks it and only then returns
// the locked content.
//
// Pure functions using Web Crypto, so the same code runs in the admin form (browser),
// the server action and Node's test runner. Keep imports relative.

/** Fields only shown once a locked project is unlocked. Never stored on the public doc of a locked project. */
export const LOCKED_FIELDS = [
  'overview',
  'client',
  'timeframe',
  'software',
  'galleryImages',
  'videoUrls',
  'deliveryYear',
  'deliveryMonth',
  'noAi',
  'aiDisclaimer',
] as const;

export type LockedField = (typeof LOCKED_FIELDS)[number];

export const PROJECT_SECRETS_COLLECTION = 'project_secrets';

export type PasswordHash = {
  algo: 'PBKDF2-SHA256';
  iterations: number;
  /** base64 */
  salt: string;
  /** base64 */
  hash: string;
};

/** Shape of `project_secrets/{projectId}`. */
export type ProjectSecret = {
  password?: PasswordHash;
  content?: Record<string, unknown>;
};

// OWASP's 2023 recommendation for PBKDF2-HMAC-SHA256.
export const PBKDF2_ITERATIONS = 600_000;
// Upper bound accepted when verifying, so a tampered record cannot make the server spin.
const MAX_ITERATIONS = 2_000_000;

const toBase64 = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Salted, slow hash of a project key, safe to store. */
export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return { algo: 'PBKDF2-SHA256', iterations, salt: toBase64(salt), hash: toBase64(hash) };
}

/** True when `password` matches the stored hash. Constant-time compare; false on any malformed record. */
export async function verifyPassword(password: string, stored: PasswordHash | null | undefined): Promise<boolean> {
  if (!stored || stored.algo !== 'PBKDF2-SHA256') return false;
  const { iterations } = stored;
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) return false;
  let salt: Uint8Array, expected: Uint8Array;
  try {
    salt = fromBase64(stored.salt);
    expected = fromBase64(stored.hash);
  } catch {
    return false;
  }
  if (expected.length !== 32) return false;
  const actual = await derive(password, salt, iterations);
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

/**
 * Splits project data into what may sit on the public doc and the locked content.
 * Also drops any `privacy.password`, so a plain-text key can never be written back.
 */
export function splitLockedFields<T extends Record<string, unknown>>(data: T): {
  publicData: Record<string, unknown>;
  content: Record<string, unknown>;
} {
  const publicData: Record<string, unknown> = {};
  const content: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if ((LOCKED_FIELDS as readonly string[]).includes(key)) {
      if (value !== undefined) content[key] = value;
    } else {
      publicData[key] = value;
    }
  }
  const privacy = publicData.privacy as Record<string, unknown> | undefined;
  if (privacy && typeof privacy === 'object') {
    publicData.privacy = { isPasswordProtected: Boolean(privacy.isPasswordProtected) };
  }
  return { publicData, content };
}

/** Only the locked fields of `content`, so a secrets doc cannot inject title, slug or anything else. */
export function pickLockedContent(content: unknown): Record<string, unknown> {
  if (!content || typeof content !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const key of LOCKED_FIELDS) {
    const value = (content as Record<string, unknown>)[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
