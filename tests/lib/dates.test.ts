import { describe, expect, it } from "vitest";
import { NO_DATE_LABEL, formatDate, toDateInputValue } from "@/lib/dates";

describe("formatDate", () => {
  it("formats as DD.MM.YYYY", () => {
    expect(formatDate(new Date("2026-09-04T00:00:00Z"))).toBe("04.09.2026");
  });

  it("formats in UTC so a midnight-UTC event date never shifts a day", () => {
    // 23:30 on the 3rd in UTC-10 is still the 4th in UTC.
    expect(formatDate("2026-09-04T00:00:00Z")).toBe("04.09.2026");
    expect(formatDate(new Date("2026-12-31T23:59:59Z"))).toBe("31.12.2026");
  });

  it("shows undated or invalid dates as Concept", () => {
    expect(NO_DATE_LABEL).toBe("Concept");
    expect(formatDate(null)).toBe("Concept");
    expect(formatDate(undefined)).toBe("Concept");
    expect(formatDate("not a date")).toBe("Concept");
  });
});

describe("toDateInputValue", () => {
  it("returns YYYY-MM-DD or empty", () => {
    expect(toDateInputValue(new Date("2026-03-07T00:00:00Z"))).toBe("2026-03-07");
    expect(toDateInputValue(null)).toBe("");
  });
});
