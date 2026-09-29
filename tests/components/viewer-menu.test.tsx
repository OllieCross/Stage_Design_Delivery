// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ViewerMenu } from "@/components/viewer/viewer-menu";

const fakeCanvas = () =>
  ({
    toBlob: (cb: BlobCallback, type?: string) => cb(new Blob(["jpeg"], { type })),
  }) as unknown as HTMLCanvasElement;

function setup(overrides: Partial<Parameters<typeof ViewerMenu>[0]> = {}) {
  const props = {
    mode: "bird" as const,
    onModeChange: vi.fn(),
    personHeight: 1.8,
    onPersonHeightChange: vi.fn(),
    gyro: null,
    sky: null,
    lights: null,
    capture: vi.fn(() => vi.fn(fakeCanvas)),
    name: "Main Stage.glb",
    canPrint: true,
    ...overrides,
  };
  render(<ViewerMenu {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /menu/i }));
  return props;
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:render");
  URL.revokeObjectURL = vi.fn();
});

describe("ViewerMenu", () => {
  it("starts collapsed and expands on click", () => {
    render(
      <ViewerMenu
        mode="bird"
        onModeChange={vi.fn()}
        personHeight={1.8}
        onPersonHeightChange={vi.fn()}
        gyro={null}
        sky={null}
        lights={null}
        capture={() => null}
        name="x"
        canPrint
      />,
    );
    const toggle = screen.getByRole("button", { name: /menu/i });
    expect(toggle).toHaveProperty("ariaExpanded", "false");
    expect(screen.queryByRole("switch", { name: "Person view" })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveProperty("ariaExpanded", "true");
    expect(screen.getByRole("switch", { name: "Person view" })).toBeTruthy();
  });

  it("switches between bird and person with the toggle or the labels", () => {
    const props = setup();
    const toggle = screen.getByRole("switch", { name: "Person view" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(props.onModeChange).toHaveBeenLastCalledWith("person");
    fireEvent.click(screen.getByRole("button", { name: "Bird" }));
    expect(props.onModeChange).toHaveBeenLastCalledWith("bird");
  });

  it("shows the switch as on in person mode", () => {
    setup({ mode: "person" });
    expect(screen.getByRole("switch", { name: "Person view" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("adjusts the person height between 1.40 m and 2.00 m", () => {
    const props = setup();
    const slider = screen.getByLabelText(/person height 1\.80 m/i) as HTMLInputElement;
    expect(slider.min).toBe("1.4");
    expect(slider.max).toBe("2");
    fireEvent.change(slider, { target: { value: "1.62" } });
    expect(props.onPersonHeightChange).toHaveBeenCalledWith(1.62);
  });

  it("only offers Print where printing is allowed (desktop)", () => {
    setup({ canPrint: false });
    expect(screen.getByRole("button", { name: "Render" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
  });

  it("shows gyro, sky and lights sections only when provided", () => {
    setup({
      gyro: { enabled: false, onToggle: vi.fn() },
      sky: <p>sky controls</p>,
      lights: <p>light controls</p>,
    });
    expect(screen.getByRole("switch", { name: "Gyro look" })).toBeTruthy();
    expect(screen.getByText("sky controls")).toBeTruthy();
    expect(screen.getByText("light controls")).toBeTruthy();
  });

  it("closes on Escape and on a click outside", () => {
    setup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("switch", { name: "Person view" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("switch", { name: "Person view" })).toBeNull();
  });

  it("Render captures the view and downloads a timestamped JPEG", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const shot = vi.fn(fakeCanvas);
    setup({ capture: () => shot });
    fireEvent.click(screen.getByRole("button", { name: "Render" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(shot).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^main-stage_\d{4}-\d{2}-\d{2}_\d{4}\.jpg$/);
  });

  it("Render does nothing if the Save dialog is cancelled", async () => {
    vi.stubGlobal(
      "showSaveFilePicker",
      vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
    );
    const shot = vi.fn(fakeCanvas);
    setup({ capture: () => shot });
    fireEvent.click(screen.getByRole("button", { name: "Render" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Render" })).toHaveProperty("disabled", false),
    );
    expect(shot).not.toHaveBeenCalled();
  });

  it("Render reports an error if the viewer isn't ready", async () => {
    setup({ capture: () => null });
    fireEvent.click(screen.getByRole("button", { name: "Render" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "The viewer isn't ready yet",
    );
  });

  it("Print opens a tab with the 4K render and the print dialog", async () => {
    const doc = document.implementation.createHTMLDocument("");
    const win = {
      document: doc,
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    };
    const open = vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    const shot = vi.fn(fakeCanvas);
    setup({ capture: () => shot });

    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(open).toHaveBeenCalledWith("", "_blank");
    await waitFor(() => expect(doc.querySelector("img")).not.toBeNull());
    expect(shot).toHaveBeenCalledTimes(1);
    expect(doc.querySelector("p")!.textContent).toContain("Main Stage.glb");
    doc.querySelector("img")!.dispatchEvent(new Event("load"));
    expect(win.print).toHaveBeenCalled();
  });

  it("Print explains a blocked pop-up instead of failing silently", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const shot = vi.fn(fakeCanvas);
    setup({ capture: () => shot });
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/pop-ups/);
    expect(shot).not.toHaveBeenCalled();
  });
});
