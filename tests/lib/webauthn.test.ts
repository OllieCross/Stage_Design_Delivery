import { describe, expect, it, vi } from "vitest";
import { adminUserName, rpID, rpName, rpOrigin } from "@/lib/webauthn";

describe("relying party config", () => {
  it("derives RP ID and origin from APP_URL", () => {
    vi.stubEnv("APP_URL", "https://wp.olliecross.com");
    expect(rpID()).toBe("wp.olliecross.com");
    expect(rpOrigin()).toBe("https://wp.olliecross.com");
  });

  it("falls back to localhost for development", () => {
    vi.stubEnv("APP_URL", undefined);
    expect(rpID()).toBe("localhost");
    expect(rpOrigin()).toBe("http://localhost:3000");
  });

  it("has fixed names", () => {
    expect(rpName).toBe("White Production");
    expect(adminUserName).toBe("admin");
  });
});
