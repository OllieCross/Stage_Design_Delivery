// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock("@simplewebauthn/browser", () => ({ startAuthentication: vi.fn() }));

const { startAuthentication } = await import("@simplewebauthn/browser");
const { PasskeyLogin } = await import("@/components/passkey-login");
const { LogoutButton } = await import("@/components/logout-button");
const { Footer } = await import("@/components/footer");
const { CsvTableClient } = await import("@/components/public/csv-table-client");

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response;

beforeEach(() => {
  refresh.mockReset();
  push.mockReset();
});

describe("PasskeyLogin", () => {
  it("runs the passkey ceremony and refreshes into the admin view", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ challenge: "c" }))
      .mockResolvedValueOnce(json({ verified: true }));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(startAuthentication).mockResolvedValue({ id: "cred" } as never);

    render(<PasskeyLogin />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/auth/login/options",
      "/api/auth/login/verify",
    ]);
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: "c" } });
  });

  it("shows the server's error and re-enables the button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ error: "No passkey registered" }, false)),
    );
    render(<PasskeyLogin />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("No passkey registered")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Login" })).toHaveProperty("disabled", false);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("LogoutButton", () => {
  it("logs out and returns home", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });
});

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
