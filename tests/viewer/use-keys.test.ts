// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isEditableTarget, useKeys } from "@/components/viewer/use-keys";

describe("isEditableTarget", () => {
  it("is true for form controls and contenteditable", () => {
    expect(isEditableTarget(document.createElement("input"))).toBe(true);
    expect(isEditableTarget(document.createElement("textarea"))).toBe(true);
    expect(isEditableTarget(document.createElement("select"))).toBe(true);
    const div = document.createElement("div");
    div.contentEditable = "true";
    // jsdom doesn't compute isContentEditable; emulate a browser.
    Object.defineProperty(div, "isContentEditable", { value: true });
    expect(isEditableTarget(div)).toBe(true);
  });

  it("is false for everything else", () => {
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
    expect(isEditableTarget(window)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("useKeys", () => {
  it("tracks held keys and clears them on blur", () => {
    const { result } = renderHook(() => useKeys());
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    });
    expect(result.current.current.has("KeyW")).toBe(true);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    });
    expect(result.current.current.has("KeyW")).toBe(false);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA" }));
      window.dispatchEvent(new Event("blur"));
    });
    expect(result.current.current.size).toBe(0);
  });

  it("ignores keys typed into a slider or input", () => {
    const { result } = renderHook(() => useKeys());
    const slider = document.createElement("input");
    slider.type = "range";
    document.body.appendChild(slider);
    act(() => {
      slider.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", bubbles: true }));
    });
    expect(result.current.current.has("ArrowUp")).toBe(false);
    slider.remove();
  });
});
