/** Projects with no event date yet are presented as concepts. */
export const NO_DATE_LABEL = "Concept";

/**
 * Dates are always shown as DD.MM.YYYY. Event dates are stored at midnight UTC,
 * so they are formatted in UTC too - formatting them in the viewer's zone would
 * shift the day for anyone west of Greenwich.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return NO_DATE_LABEL;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return NO_DATE_LABEL;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getUTCFullYear()}`;
}

/** Value for an <input type="date">, which always expects YYYY-MM-DD. */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
