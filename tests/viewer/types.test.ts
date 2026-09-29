import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERSON_HEIGHT,
  EYE_HEIGHT_RATIO,
  PERSON_HEIGHT_MAX,
  PERSON_HEIGHT_MIN,
  eyeHeightFor,
} from "@/components/viewer/types";

describe("person height", () => {
  it("offers 1.40 m to 2.00 m, defaulting to 1.80 m", () => {
    expect(PERSON_HEIGHT_MIN).toBe(1.4);
    expect(PERSON_HEIGHT_MAX).toBe(2);
    expect(DEFAULT_PERSON_HEIGHT).toBe(1.8);
  });

  it("puts the eyes a little below the top of the head", () => {
    expect(eyeHeightFor(1.8)).toBeCloseTo(1.6848);
    expect(eyeHeightFor(1.4)).toBeCloseTo(1.4 * EYE_HEIGHT_RATIO);
    expect(eyeHeightFor(2)).toBeLessThan(2);
  });

  it("clamps out-of-range heights", () => {
    expect(eyeHeightFor(0.5)).toBe(eyeHeightFor(1.4));
    expect(eyeHeightFor(3)).toBe(eyeHeightFor(2));
  });
});
