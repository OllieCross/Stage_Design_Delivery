/**
 * The site has no authentication: every visitor is treated as the admin and can
 * open /edit, upload, delete and see hidden projects. Passkey login was removed
 * in v0.1.27.
 *
 * The admin-only paths (/edit, server actions, uploads, hidden projects) still
 * go through this function, so access control can be reinstated here. The home
 * page's project list no longer checks it and would need its guard back too.
 */
export async function isAdmin(): Promise<boolean> {
  return true;
}
