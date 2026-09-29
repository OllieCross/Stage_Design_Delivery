// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HdriSection } from "@/components/viewer/hdri-panel";
import { LightSection } from "@/components/viewer/light-panel";
import { Switch } from "@/components/viewer/switch";
import { DEFAULT_HDRI_SETTINGS, DEFAULT_LIGHT_SETTINGS } from "@/components/viewer/types";

describe("Switch", () => {
  it("is an accessible switch that reports the next state", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Thing" />);
    const sw = screen.getByRole("switch", { name: "Thing" });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("can be disabled", () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} label="Thing" disabled />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("HdriSection", () => {
  it("toggles the sky", () => {
    const onChange = vi.fn();
    render(<HdriSection settings={DEFAULT_HDRI_SETTINGS} onChange={onChange} hasDay hasNight />);
    fireEvent.click(screen.getByRole("switch", { name: "Sky environment" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_HDRI_SETTINGS, enabled: true });
  });

  it("offers the day/night crossfade only when both skies exist", () => {
    const { rerender } = render(
      <HdriSection settings={DEFAULT_HDRI_SETTINGS} onChange={vi.fn()} hasDay hasNight />,
    );
    expect(screen.getByText("Night")).toBeTruthy();
    rerender(
      <HdriSection settings={DEFAULT_HDRI_SETTINGS} onChange={vi.fn()} hasDay hasNight={false} />,
    );
    expect(screen.queryByText("Night")).toBeNull();
  });

  it("disables its sliders while the sky is off", () => {
    render(<HdriSection settings={DEFAULT_HDRI_SETTINGS} onChange={vi.fn()} hasDay hasNight />);
    for (const slider of screen.getAllByRole("slider"))
      expect(slider).toHaveProperty("disabled", true);
  });

  it("reports slider changes as numbers", () => {
    const onChange = vi.fn();
    const on = { ...DEFAULT_HDRI_SETTINGS, enabled: true };
    render(<HdriSection settings={on} onChange={onChange} hasDay hasNight />);
    fireEvent.change(screen.getByLabelText(/intensity/i), { target: { value: "2.5" } });
    expect(onChange).toHaveBeenCalledWith({ ...on, intensity: 2.5 });
  });
});

describe("LightSection", () => {
  it("shows the fixture count and toggles beams", () => {
    const onChange = vi.fn();
    render(
      <LightSection
        settings={DEFAULT_LIGHT_SETTINGS}
        onChange={onChange}
        fixtureCount={55}
        kindCounts={[
          ["bar", 24],
          ["beam", 12],
        ]}
      />,
    );
    expect(screen.getByText("(55)")).toBeTruthy();
    expect(screen.getByText("bar")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: "Beams" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_LIGHT_SETTINGS, enabled: false });
  });
});
