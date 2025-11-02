import { afterEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimits } from "@/lib/rate";

describe("rate limiter", () => {
  afterEach(() => {
    resetRateLimits();
  });

  it("allows requests under the limit", () => {
    const identifier = "plan:127.0.0.1";
    expect(checkRateLimit({ identifier, limit: 2, windowMs: 1_000, now: 0 })).toBe(true);
    expect(checkRateLimit({ identifier, limit: 2, windowMs: 1_000, now: 100 })).toBe(true);
  });

  it("blocks when the limit is exceeded", () => {
    const identifier = "generate:127.0.0.1";
    expect(checkRateLimit({ identifier, limit: 1, windowMs: 1_000, now: 0 })).toBe(true);
    expect(checkRateLimit({ identifier, limit: 1, windowMs: 1_000, now: 100 })).toBe(false);
  });

  it("resets after the window elapses", () => {
    const identifier = "plan:10.0.0.2";
    expect(checkRateLimit({ identifier, limit: 1, windowMs: 1_000, now: 0 })).toBe(true);
    expect(checkRateLimit({ identifier, limit: 1, windowMs: 1_000, now: 100 })).toBe(false);
    expect(checkRateLimit({ identifier, limit: 1, windowMs: 1_000, now: 1_500 })).toBe(true);
  });
});
