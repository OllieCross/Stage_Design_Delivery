/**
 * Feature flags.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so flipping one needs a
 * rebuild (`docker compose up -d --build`), not just a restart.
 */

/**
 * Beam rendering from MVR lighting rigs. Off by default: the feature works but
 * is held back until the look is signed off. Fixtures are still parsed and
 * stored on upload, so enabling this needs no re-upload.
 */
export const BEAMS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BEAMS === "true";
