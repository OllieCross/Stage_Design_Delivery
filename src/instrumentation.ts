export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { purgeExpiredTrash } = await import("@/server/purge");

  const run = () => purgeExpiredTrash().catch((e) => console.error("[purge] failed", e));
  run();
  setInterval(run, 60 * 60 * 1000); // hourly
}
