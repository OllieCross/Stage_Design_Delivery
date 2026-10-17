import { afterEach } from "vitest";

// Testing Library only needs cleanup when a DOM exists (jsdom test files).
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
