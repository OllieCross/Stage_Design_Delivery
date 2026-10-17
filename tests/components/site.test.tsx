// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const { Footer } = await import("@/components/footer");
const { CsvTableClient } = await import("@/components/public/csv-table-client");

describe("Footer", () => {
  it("links the socials in new tabs and the release notes", () => {
    render(<Footer />);
    for (const name of ["Instagram", "LinkedIn", "GitHub"]) {
      const link = screen.getByRole("link", { name });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
    expect(screen.getByRole("link", { name: "Release notes" }).getAttribute("href")).toBe(
      "/changelog",
    );
  });
});

describe("CsvTableClient", () => {
  const rows = Array.from({ length: 5 }, (_, i) => [`r${i}`, `${i}`]);

  it("renders only the first rows until asked for all", () => {
    render(<CsvTableClient header={["Name", "Value"]} rows={rows} initialLimit={2} />);
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
    fireEvent.click(screen.getByRole("button", { name: "Show all 5 rows" }));
    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(screen.queryByRole("button", { name: /show all/i })).toBeNull();
  });

  it("has no toggle when everything already fits", () => {
    render(<CsvTableClient header={["Name", "Value"]} rows={rows} initialLimit={10} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
