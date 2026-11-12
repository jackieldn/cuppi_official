/** An error from the database or storage, in words for the person editing. */
export function describeError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === 'permission-denied' || e?.code === 'storage/unauthorized' || /insufficient permissions/i.test(e?.message ?? '')) {
    return 'The database refused this. Check you are signed in as an admin, and that the latest firestore.rules and storage.rules have been deployed.';
  }
  return e?.message || 'Something went wrong.';
}
