import { afterEach } from "vitest";

// Session signing needs a real-looking secret; lib/session refuses "changeme".
process.env.SESSION_SECRET ??= "test-session-secret-0123456789abcdef";

// Testing Library only needs cleanup when a DOM exists (jsdom test files).
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
